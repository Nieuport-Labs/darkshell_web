// Network constants for paying from a browser wallet (from the wallet's app/src/lib/config.ts).

export const CHAIN_ID = 'secret-4';
export const DENOM = 'uscrt';
/** Gas price in uscrt per gas unit. */
export const GAS_PRICE = 0.1;
export const SSCRT_ADDRESS = 'secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek';

/** Public nodes, tried in order. Also listed in vercel.json's Content-Security-Policy. */
export const LCD_URLS = ['https://lcd-secret.keplr.app', 'https://lcd.mainnet.secretsaturn.net', 'https://lcd.secret.express', 'https://secret-api.lavenderfive.com'];

export function withGasBuffer(gas: number): number {
	return Math.ceil(gas * 1.2);
}

export const GAS = {
	snip20Transfer: withGasBuffer(110_000),
	wrap: withGasBuffer(110_000),
} as const;
