// Paying a donation (a request for sSCRT) from a browser wallet, the way
// Secret_Dashboard pays an invoice (`src/lib/invoicePayment.ts`): the
// recipient always gets exactly the amount in sSCRT, in one transaction, and
// the payer chooses what it comes out of —
//   - sSCRT, sent as it is;
//   - public SCRT, wrapped into sSCRT first;
//   - any other private token, swapped on ShadeSwap for exactly the amount
//     (the swap's minimum return), then sent.
// The memo travels encrypted with the sSCRT transfer.

import type { Msg, SecretNetworkClient } from 'secretjs';
import { batchQuery, type BatchItem } from './batchQuery';
import { codeHash, lcdUrl, readClient, signingClient } from './client';
import { DENOM, GAS, GAS_PRICE, SSCRT_ADDRESS } from './config';
import { quoteInto, type PaddedQuote } from './quote';
import { findRoutes, listPairs, swapGas, swapMessage } from './shadeSwap';
import { privateSymbol, tokenByAddress } from './tokens';
import { signPermit, type Connection } from './wallet';

export type Source =
	| { kind: 'sscrt'; symbol: 'sSCRT'; balance: bigint; decimals: 6 }
	| { kind: 'scrt'; symbol: 'SCRT'; balance: bigint; decimals: 6 }
	| { kind: 'swap'; token: string; symbol: string; balance: bigint; decimals: number; quote: PaddedQuote };

/** public SCRT kept back for the fee when the payment itself is wrapped from SCRT */
const FEE_RESERVE = 100_000n;

interface BalanceReply {
	balance?: { amount?: string };
}

/**
 * What in the connected wallet can pay `amount` sSCRT. Asks the wallet to sign
 * a query permit (no fee, no transaction) to read its private balances.
 * `amount` in base units.
 */
export async function sourcesFor(c: Connection, amount: bigint): Promise<Source[]> {
	const client = await readClient();
	const pairs = await listPairs(client);

	// the tokens ShadeSwap can turn into sSCRT, with the code hash the pools record
	const hashes = new Map<string, string>();
	for (const p of pairs) for (const t of [p.token0, p.token1]) if (!hashes.has(t.address)) hashes.set(t.address, t.codeHash);
	const swappable = [...hashes.keys()].filter((a) => a !== SSCRT_ADDRESS && tokenByAddress(a) && findRoutes(pairs, a, SSCRT_ADDRESS).length);

	const permit = await signPermit(c, [SSCRT_ADDRESS, ...swappable]);
	const sscrtHash = await codeHash(client, SSCRT_ADDRESS);
	const items: BatchItem[] = [SSCRT_ADDRESS, ...swappable].map((address) => ({
		id: address,
		contract: { address, codeHash: address === SSCRT_ADDRESS ? sscrtHash : hashes.get(address)! },
		query: { with_permit: { permit, query: { balance: {} } } },
	}));
	const [results, bank] = await Promise.all([batchQuery(client, items), client.query.bank.balance({ address: c.address, denom: DENOM })]);
	const held = (address: string): bigint => {
		const r = results.get(address);
		const a = r?.ok ? (r.value as BalanceReply).balance?.amount : undefined;
		return a && /^\d+$/.test(a) ? BigInt(a) : 0n;
	};

	const out: Source[] = [];
	const sscrt = held(SSCRT_ADDRESS);
	if (sscrt >= amount) out.push({ kind: 'sscrt', symbol: 'sSCRT', balance: sscrt, decimals: 6 });
	const scrt = BigInt(bank.balance?.amount ?? '0');
	if (scrt >= amount + FEE_RESERVE) out.push({ kind: 'scrt', symbol: 'SCRT', balance: scrt, decimals: 6 });

	const quoted = await Promise.all(
		swappable
			.filter((t) => held(t) > 0n)
			.map(async (t) => {
				const quote = await quoteInto(client, t, SSCRT_ADDRESS, amount).catch(() => undefined);
				const info = tokenByAddress(t)!;
				return quote && quote.amountIn <= held(t)
					? ({ kind: 'swap', token: t, symbol: privateSymbol(info), balance: held(t), decimals: info.decimals, quote } as Source)
					: undefined;
			}),
	);
	out.push(...quoted.filter((s): s is Source => !!s));
	return out;
}

async function transfer(client: SecretNetworkClient, sender: string, to: string, amount: bigint, memo?: string): Promise<Msg> {
	const { MsgExecuteContract } = await import('secretjs');
	return new MsgExecuteContract({
		sender,
		contract_address: SSCRT_ADDRESS,
		code_hash: await codeHash(client, SSCRT_ADDRESS),
		msg: { transfer: { recipient: to, amount: amount.toString(), ...(memo ? { memo } : {}) } },
		sent_funds: [],
	});
}

/** Signs in the wallet and sends. Resolves with the transaction hash once it is in a block. */
export async function payFrom(c: Connection, source: Source, to: string, amount: bigint, memo?: string): Promise<string> {
	const client = await signingClient(c);
	const { MsgExecuteContract } = await import('secretjs');
	const msgs: Msg[] = [];
	let gas = GAS.snip20Transfer;
	if (source.kind === 'scrt') {
		msgs.push(
			new MsgExecuteContract({
				sender: c.address,
				contract_address: SSCRT_ADDRESS,
				code_hash: await codeHash(client, SSCRT_ADDRESS),
				msg: { deposit: {} },
				sent_funds: [{ denom: DENOM, amount: amount.toString() }],
			}),
		);
		gas += GAS.wrap;
	} else if (source.kind === 'swap') {
		// at least the donation comes back, or the router refuses the trade
		msgs.push(await swapMessage(client, c.address, source.quote.route, source.quote.amountIn, amount));
		gas += swapGas(source.quote.route);
	}
	msgs.push(await transfer(client, c.address, to, amount, memo));

	const tx = await client.tx.broadcast(msgs, { gasLimit: gas, gasPriceInFeeDenom: GAS_PRICE, feeDenom: DENOM });
	if (tx.code !== 0) {
		const log = tx.rawLog || `error code ${tx.code}`;
		throw new Error(/insufficient funds/i.test(log) ? 'Not enough balance for this payment and its fee.' : /expected_return|slippage|minimum/i.test(log) ? 'The swap price moved. Try again for a new quote.' : log.slice(0, 240));
	}
	return tx.transactionHash;
}

export type TxState = 'pending' | 'confirmed' | 'failed' | 'other';

/**
 * A transaction DarkShell reported, checked on chain (Secret_Dashboard
 * `txState`): a private payment must call the sSCRT contract — recipient and
 * amount are encrypted, so that is as far as a public node can tell.
 */
export async function txState(hash: string): Promise<TxState> {
	const r = await fetch(`${await lcdUrl()}/cosmos/tx/v1beta1/txs/${hash}`);
	if (r.status === 404 || r.status === 400) return 'pending';
	if (!r.ok) throw new Error(`LCD ${r.status}`);
	const body = (await r.json()) as { tx_response?: { code?: number }; tx?: { body?: { messages?: Array<{ contract?: string }> } } };
	if (!body.tx_response) return 'pending';
	if (!(body.tx?.body?.messages ?? []).some((m) => m.contract === SSCRT_ADDRESS)) return 'other';
	return body.tx_response.code ? 'failed' : 'confirmed';
}
