# Fairway360 Mobile (Expo / React Native)

A starter mobile app for **members**, built on Expo. It talks to the **same REST
API** as the web portals (`/api/auth/login`, `/api/me/dashboard`, …) — no separate
backend. This is a foundation: a working login → member-dashboard flow plus the
config you need to grow it into the full app and ship to the stores.

> This is a **separate project** from the web monorepo. It is intentionally not
> wired into the pnpm workspace and is not built by the web Docker image.

## Run it (5 minutes)
```bash
cd mobile
npm install
npx expo start            # press i (iOS sim), a (Android), or scan the QR with Expo Go
```
Set your API URL in `app.json` → `expo.extra.apiBaseUrl` (defaults to
`https://fairway360.io`). For local testing against the dev server use your
machine's LAN IP, e.g. `http://192.168.1.20:5000` (not `localhost`, which a phone
can't reach).

Demo login: `james@augustapines.com` / `Password123!`.

## What's here
- `App.tsx` — login + member dashboard (balance, tier, upcoming tee times),
  session via the cookie captured at login.
- `app.json` / `babel.config.js` / `tsconfig.json` — standard Expo config.

## Next steps to a full app
1. **Navigation** — add `expo-router` or `@react-navigation/*` and build the
   Book / Order / Events / Account / Concierge screens (mirror the web member
   portal — same endpoints).
2. **Push** — `expo-notifications`: request permission, get the Expo/FCM token,
   and POST it to `/api/me/push/subscribe` (the backend already accepts
   `platform: "ios" | "android"`).
3. **Session** — swap the cookie capture for a more robust client (or add a
   token-auth endpoint) if you support multiple accounts.

## Shipping to the stores (your accounts required)
- **Apple Developer Program** ($99/yr) and **Google Play Console** ($25 one-time).
- Build with EAS: `npm i -g eas-cli && eas build -p ios` / `-p android`, then
  `eas submit`. Set `ios.bundleIdentifier` / `android.package` in `app.json`
  (currently `io.fairway360.app`).
