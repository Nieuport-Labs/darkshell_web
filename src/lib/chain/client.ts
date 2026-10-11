// Talking to Secret Network from the page: the first public node that answers,
// read-only or signing through the visitor's wallet extension.

import { SecretNetworkClient } from 'secretjs';
import { CHAIN_ID, LCD_URLS } from './config';
import type { Connection } from './wallet';

async function probe(url: string): Promise<boolean> {
	const ctl = new AbortController();
	const timer = setTimeout(() => ctl.abort(), 15000);
	try {
		const r = await fetch(`${url}/cosmos/base/tendermint/v1beta1/node_info`, { signal: ctl.signal, headers: { Accept: 'application/json' } });
		if (!r.ok) return false;
		const j = (await r.json()) as { default_node_info?: { network?: string } };
		return j.default_node_info?.network === CHAIN_ID;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}

let resolved: Promise<string> | null = null;

/** The first node that answers for secret-4. */
export function lcdUrl(): Promise<string> {
	return (resolved ??= (async () => {
		try {
			return await Promise.any(LCD_URLS.map(async (url) => ((await probe(url)) ? url : Promise.reject(new Error(url)))));
		} catch {
			resolved = null;
			throw new Error('No Secret Network node is reachable right now. Check your connection.');
		}
	})());
}

export async function readClient(): Promise<SecretNetworkClient> {
	return new SecretNetworkClient({ url: await lcdUrl(), chainId: CHAIN_ID });
}

export async function signingClient(c: Connection): Promise<SecretNetworkClient> {
	return new SecretNetworkClient({
		url: await lcdUrl(),
		chainId: CHAIN_ID,
		wallet: c.signer as never,
		walletAddress: c.address,
		encryptionUtils: c.encryptionUtils as never,
	});
}

// contract code hashes change on migration, so they are read live and kept for this page load
const codeHashes = new Map<string, Promise<string>>();

export function codeHash(client: SecretNetworkClient, contract: string): Promise<string> {
	let p = codeHashes.get(contract);
	if (!p) {
		p = client.query.compute.codeHashByContractAddress({ contract_address: contract }).then((r) => {
			if (!r.code_hash) throw new Error(`no code hash for ${contract}`);
			return r.code_hash;
		});
		p.catch(() => codeHashes.delete(contract));
		codeHashes.set(contract, p);
	}
	return p;
}
