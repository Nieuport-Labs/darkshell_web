// Links and facts used across the site, in one place.

export const GITHUB = 'https://github.com/Nieuport-Labs/darkshell';
export const SECRET_PAY = `${GITHUB}/tree/main/packages/secret-pay`;
export const SPEC = `${GITHUB}/blob/main/packages/secret-pay/SPEC.md`;
export const CHECKOUT_EXAMPLE = `${GITHUB}/blob/main/packages/secret-pay/examples/checkout.html`;
export const DASHBOARD = 'https://dashboard.nieuportlabs.cz';

/**
 * The Android download: the newest signed APK attached to a GitHub release of
 * the wallet repository. PUBLIC_APK_URL (Vercel env) points it elsewhere.
 */
export const APK_URL: string = import.meta.env.PUBLIC_APK_URL || `${GITHUB}/releases/latest/download/DarkShell.apk`;
export const RELEASES = `${GITHUB}/releases`;

export const MIN_ANDROID = 'Android 8.0';

export const NAV = [
	{ href: '/#features', label: 'Features' },
	{ href: '/#pay', label: 'Pay' },
	{ href: '/#security', label: 'Security' },
	{ href: '/developers', label: 'Developers' },
];
