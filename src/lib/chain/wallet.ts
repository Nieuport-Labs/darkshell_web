// Browser wallets: Keplr and Leap expose the same injected API (StarShell takes
// over `window.keplr`). After Secret_Dashboard `src/lib/wallet.ts` and
// `src/lib/permit.ts`.

import { CHAIN_ID, DENOM } from './config';

interface AminoSignDoc {
	chain_id: string;
	account_number: string;
	sequence: string;
	fee: { amount: Array<{ denom: string; amount: string }>; gas: string };
	msgs: Array<{ type: string; value: unknown }>;
	memo: string;
}

interface KeplrLike {
	enable(chainId: string): Promise<void>;
	getKey(chainId: string): Promise<{ name: string; bech32Address: string }>;
	getOfflineSigner(chainId: string): unknown;
	getOfflineSignerOnlyAmino(chainId: string): unknown;
	getEnigmaUtils(chainId: string): unknown;
	signAmino(chainId: string, signer: string, doc: AminoSignDoc, options?: { preferNoSetFee?: boolean; preferNoSetMemo?: boolean }): Promise<{ signature: { pub_key: { type: string; value: string }; signature: string } }>;
}

declare global {
	interface Window {
		keplr?: KeplrLike;
		leap?: KeplrLike;
	}
}

export type WalletId = 'keplr' | 'leap';

export const WALLETS: Record<WalletId, { name: string; install: string }> = {
	keplr: { name: 'Keplr', install: 'https://www.keplr.app/get' },
	leap: { name: 'Leap', install: 'https://www.leapwallet.io/download' },
};

const provider = (id: WalletId): KeplrLike | undefined => (id === 'keplr' ? window.keplr : window.leap);

/** Extensions inject a moment after the page loads: wait a little before saying it is missing. */
export function waitFor(id: WalletId, ms = 2500): Promise<boolean> {
	return new Promise((resolve) => {
		const start = Date.now();
		const tick = () => {
			if (provider(id)) return resolve(true);
			if (Date.now() - start > ms) return resolve(false);
			setTimeout(tick, 100);
		};
		tick();
	});
}

export interface Connection {
	id: WalletId;
	address: string;
	name: string;
	signer: unknown;
	encryptionUtils: unknown;
	provider: KeplrLike;
}

export async function connect(id: WalletId): Promise<Connection> {
	if (!(await waitFor(id))) throw new Error(`${WALLETS[id].name} isn’t installed in this browser.`);
	const p = provider(id)!;
	await p.enable(CHAIN_ID);
	const key = await p.getKey(CHAIN_ID);
	return { id, address: key.bech32Address, name: key.name, signer: p.getOfflineSignerOnlyAmino(CHAIN_ID), encryptionUtils: p.getEnigmaUtils(CHAIN_ID), provider: p };
}

export interface Permit {
	params: { permit_name: string; allowed_tokens: string[]; chain_id: string; permissions: string[] };
	signature: { pub_key: { type: string; value: string }; signature: string };
}

/**
 * A SNIP-24 query permit for reading the visitor's own token balances: a
 * signature, not a transaction (zero fee, sequence 0), so nothing is paid and
 * nothing is written on chain.
 */
export async function signPermit(c: Connection, tokens: string[]): Promise<Permit> {
	const params = { permit_name: 'darkshell-donate', allowed_tokens: [...tokens].sort(), chain_id: CHAIN_ID, permissions: ['balance'] };
	// the exact document SNIP-24 specifies: chain_id sits outside the message
	const doc: AminoSignDoc = {
		chain_id: CHAIN_ID,
		account_number: '0',
		sequence: '0',
		fee: { amount: [{ denom: DENOM, amount: '0' }], gas: '1' },
		msgs: [{ type: 'query_permit', value: { permit_name: params.permit_name, allowed_tokens: params.allowed_tokens, permissions: params.permissions } }],
		memo: '',
	};
	const { signature } = await c.provider.signAmino(CHAIN_ID, c.address, doc, { preferNoSetFee: true, preferNoSetMemo: true });
	return { params, signature };
}
