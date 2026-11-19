# MEMORY — Hoomzo user app (Expo / React Native)

## 1. What this app is
Native Android (iOS-ready) conversion of the **user app** of the Hoomzo MERN web product. One app, two modes exactly like the web:
guest/user mode and **host/partner ("hotel") mode**, switched from inside the app (Post button / "Host Dashboard" / "Switch to Guest View").
The admin panel stays on the web (not converted).
- Web frontend (source of truth): `../frontend` (React 19 + Vite + Tailwind, react-router)
- Backend (unchanged, shared): `../backend` (Node/Express/Mongo), live at the production API below
- Flutter wrapper: **not in the repo** (only `../FLUTTER_INTEGRATION_GUIDE.md`); app name/package/version were given by the user.

## 2. Discovered / given inputs
| Item | Value | Source |
|---|---|---|
| App name | Hoomzo | brand in web (`index.html` title "HoomZo", logo "HOOMZO") |
| Android package | `com.hoomzo.user` (same id for iOS bundle) | user instruction |
| Version | 1.0.0 (versionCode 1) | user instruction |
| API base URL | `https://hoomzo.com/api` | frontend/.env (commented prod URL); verified live (public GETs 200) |
| Socket URL | API URL without `/api` | `src/config.js` |
| Public client keys | Google Maps key + Razorpay *key id* (test) | frontend/.env → `src/config.js` (env-overridable via `EXPO_PUBLIC_*`) |

Secrets are NOT in the app (e.g. `VITE_RAZORPAY_KEY_SECRET` from the web .env is deliberately not copied; the backend sends the Razorpay key id with each order).

## 3. Stack
Expo SDK 58, React Native 0.88, React 19, Node 24 (build machine). JavaScript only. Expo Router (file based, `app/`).
Libraries: `axios` (API), `zustand` (stores, same as web), `socket.io-client` (feature flags realtime), `expo-secure-store` (JWT), `@react-native-async-storage/async-storage` (cache/drafts), `lucide-react-native` + `react-native-svg` (same icon set as web), `expo-image`, `expo-linear-gradient`, `expo-image-picker` + `expo-image-manipulator` (uploads, compress), `expo-location`, `expo-notifications` + `expo-device` (push), `expo-video` (reels), `expo-clipboard`, `react-native-webview` (Razorpay checkout only), `@expo-google-fonts/poppins` (same font as web).

## 4. Folder structure & conventions
- `app/` — routes. `app/index.jsx` Home, `login.jsx`, `signup.jsx`, `search.jsx`, `property/[id]/…`, `checkout.jsx`, `bookings.jsx`, `wallet.jsx`, `reels.jsx`, `profile/edit.jsx`, … and `app/hotel/*` (partner mode, same URLs as web: `/hotel/dashboard`, `/hotel/bookings`, `/hotel/properties`, …).
- `src/services/*` — API layer ported 1:1 from web services (same endpoints/shapes). `apiService.js` is the single axios client.
- `src/store/*` — zustand (`authStore`, `featureFlagsStore`, `toastStore`).
- `src/components/*` — shared UI (`ui.jsx` kit, `PropertyCard`, `GlobalNav`, home sections, partner kit, wizard).
- `src/theme.js` — the single token file (colors/fonts/radius/shadow from web `index.css` + Tailwind palette).
- `src/lib/*` — storage (sync memory cache over SecureStore/AsyncStorage), events, socket, push, imagePicker, draftStore, checkout/wizard hand-off state.
- Add a screen: create `app/<route>.jsx`, default-export a component, use `Text`/`Header` from `src/components/ui`. Nav bars are rendered globally by `GlobalNav` using the same hide/show rules as the web `Layout`.
- Web `navigate(path, {state})` → in-memory hand-off: `lib/checkoutState.js`, `lib/wizardState.js` (state is lost on process death; screens guard for it).

## 5. Auth
Backend contract unchanged: OTP login (`POST /auth/send-otp`, `/auth/verify-otp`) → JWT sent as `Authorization: Bearer`. No refresh endpoint exists. Token → SecureStore (key `token`), user JSON → AsyncStorage (`user`). `lib/storage.js` hydrates both at launch before first render. Logout calls `POST /users/logout` then clears storage. On 401 / blocked account the axios interceptor clears storage and emits `session-expired` → `authStore.expire()` → root guard redirects to `/login`. Partner mode uses the same token/account as web ("unified single-account").

## 6. API layer
`src/services/apiService.js`: axios, 30 s timeout (`REQUEST_TIMEOUT`), Bearer injection, 413/HTML-error normalising, feature-flag code resync, 401 handling. Services throw `error.response?.data || error.message` (same as web); screens use `errMsg()` from `utils/format.js`. No auto-retry of non-GET calls; list screens show retry / pull-to-refresh.

## 7. Web → native decisions
- localStorage → SecureStore (token) / AsyncStorage (rest) behind a sync cache.
- Tailwind → StyleSheet inline objects + `theme.js`. Fonts Poppins bundled.
- framer-motion / gsap / lenis → not ported (animations omitted; the PDF says add none).
- Razorpay web checkout → `RazorpayHost` (WebView loading checkout.js, `openRazorpay()` promise). WebView used for this flow only. UPI intents open in the installed app.
- File input / Flutter camera bridge → `lib/imagePicker.js` (camera/gallery via expo-image-picker, compressed with expo-image-manipulator). Video → picker + Cloudinary signed direct upload (`reelService`).
- Browser geolocation → `expo-location` foreground, permission asked on first use.
- Web push (Firebase) → native FCM device token via `expo-notifications` (`lib/push.js`), registered with `PUT /users/fcm-token` platform `app`. Tapping a notification with `data.url` deep-links.
- `window.print` receipts → share sheet. Clipboard → expo-clipboard. Date inputs → `DatePickerField` (calendar modal, `YYYY-MM-DD` strings like the web).
- Reels: `<video>` + IntersectionObserver → `expo-video` + paged `FlatList` (only the active reel mounts a player).
- Maps: the web has no map screens (only Google geocoding REST) → no map SDK needed.
- Hostel-fee payment: web falls back to a *simulated* verification if Razorpay is cancelled; the app only simulates for server-created simulated orders (`order_sim_*`/demo key) and never after a cancelled real order.

## 8. Backend changes
**None.** (No additive change was required: `/users/fcm-token` already accepts `platform: 'app'`.)

## 9. Commands
```
cd mobile-user
npm install --legacy-peer-deps
npx expo start                     # dev
npx eslint .                       # lint (0 errors)
npx expo-doctor                    # 20/20
npx expo export --platform android # JS bundle check
npx eas-cli login                  # one time
npx eas-cli build:configure        # first time only (creates EAS project id)
npx eas-cli build --platform android --profile production --non-interactive   # release APK
```
EAS profile `production` → `android.buildType: "apk"`, internal distribution; EAS manages the keystore (nothing signing-related is committed).

## 10. Known issues / not done
See `CONVERSION_CHECKLIST.md` ("Blocked" and "Built, not tested"). Headlines:
- **Push**: needs `google-services.json` for package `com.hoomzo.user` (Firebase project `hoomzo`). Drop it in `mobile-user/` — `app.config.js` picks it up automatically. Without it everything works, push registration silently no-ops.
- **Not converted**: partner Add-Hotel/Resort/Hostel/Villa/Homestay wizards (not reachable from the web's property-type picker; only PG + Rent/Sell/Plot via the dynamic wizard are), admin panel.
- No on-device/emulator run was possible here (no Android SDK / device) → everything is "Built, not tested" except bundling/lint/doctor and public API reads.
- Authenticated API checks with a test login were not run (login to the production backend was not authorised in this session).

## 11. Assumptions
- App name "Hoomzo"; icon/splash generated from the brand wordmark (`assets/icon.png` etc.) because no Flutter wrapper assets exist.
- Web user property page lived at `/hotel/:id`; the app uses `/property/:id` (the web also exposes it) so `/hotel/*` stays partner-only.
- Web `ReviewsPage` is a static sample list; the app shows the property's real reviews. Web `PartnerKYC` is a hard-coded demo list; the app shows the real `partnerApprovalStatus`. Web `PartnerSettings` toggles are non-functional placeholders and were not carried over.
