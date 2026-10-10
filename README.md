# darkshell_web

The website of [DarkShell](https://github.com/Nieuport-Labs/darkshell), the private sSCRT wallet for Secret Network.

A static [Astro](https://astro.build) site: no client framework, no cookies, no analytics, no third-party requests. The typeface (Google Sans Flex, SIL OFL 1.1) is self-hosted.

```
src/pages/        index (landing), developers (secret-pay guide), donate (sSCRT: QR, DarkShell sheet, or Keplr/Leap paying from any token), privacy, 404
src/lib/secret-pay/  vendored checkout from the wallet repo (MIT)
src/lib/chain/    browser-wallet payments: ShadeSwap routing and quotes from the wallet, Keplr/Leap, permits
src/components/   nav, footer, phone mockups drawn in CSS, code blocks, icons
src/config.ts     links used across the site (GitHub, download, spec)
public/           fonts, icons, og.png (link preview)
scripts/og.mjs    renders public/og.png
```

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run check      # types
npm run build      # → dist/
```

## Deploy on Vercel

Import the repository in Vercel. It is detected as Astro; `vercel.json` sets the build, clean URLs, security headers (CSP, HSTS, no framing) and long caching for fonts and hashed assets. No server functions.

Environment variables (all optional):

| Name | Default | What |
|---|---|---|
| `SITE_URL` | the project's production URL on Vercel | Canonical links, Open Graph, sitemap. Set it to the real domain. |
| `PUBLIC_APK_URL` | `https://github.com/Nieuport-Labs/darkshell/releases/latest/download/DarkShell.apk` | Where every Download button points. |

## The download

The buttons point to the newest GitHub release of the wallet repository. Each release needs the signed APK attached as an asset named exactly `DarkShell.apk`:

```bash
gh release create v1.0.0 release/DarkShell.apk -R Nieuport-Labs/darkshell --title "DarkShell 1.0.0" --notes "…"
```

## Link preview

`public/og.png` (1200 × 630) is generated; after changing the text in `scripts/og.mjs`:

```bash
npm run og
```
