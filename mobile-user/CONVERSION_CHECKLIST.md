# CONVERSION CHECKLIST — Hoomzo user app

Status legend: **Verified** (ran and saw it work) · **Built, not tested** (code written; needs device test) · **Blocked** (cannot complete; reason given)

## 0. Discovered inputs
- Target app: user app incl. host/partner mode (user instruction; no Flutter wrapper in repo → treated as given).
- Folders: web `../frontend`, backend `../backend`, new app `mobile-user/`.
- Package `com.hoomzo.user`, version `1.0.0` (user). API `https://hoomzo.com/api` (frontend/.env; public GETs verified 200). Google Maps key / Razorpay key id from frontend/.env.
- No Flutter wrapper present → no wrapper icon/splash/google-services; icon/splash generated.

## 1. Preconditions
1. Target app stated — OK (user).
2. Web/back/wrapper present — web + backend yes; **wrapper missing** (proceeded on user's explicit instruction).
3. Deployed HTTPS backend responds — **Verified** (home, categories, properties, info/*, faqs, news, reels, recommended-sellers → 200).
4. Credentials: Razorpay key id (backend supplies per order), Google key present; **`google-services.json` missing → push Blocked**.
5. Test login: OTP bypass `123456` exists in backend (`authController.js`); **login against production was not authorised in this session** → authenticated checks "Built, not tested".
6. Expo logged in — **No** (`eas whoami` → Not logged in) → release build needs `eas login`.

## 2. Screens (web route → app route) — user mode
| Web | App | Status |
|---|---|---|
| /login, /signup (OTP, resend timer) | `login.jsx`, `signup.jsx` | Built, not tested |
| / Home (hero, location, search, tabs, popular, banners, offers, hostel fees, top properties, featured, feeds, reels, bottom sections) | `index.jsx` + `components/home/*` | Built, not tested |
| /search (+filters, near me, sort) | `search.jsx` | Built, not tested |
| /hotel/:id, /property/:id | `property/[id]/index.jsx` | Built, not tested |
| /hotel/:id/amenities, /reviews, /offers | `property/[id]/amenities|reviews|offers.jsx` | Built, not tested |
| /checkout, /payment, /booking-confirmation, /booking/:id | `checkout.jsx`, `payment.jsx`, `booking-confirmation.jsx`, `booking/[id].jsx` | Built, not tested |
| /bookings | `bookings.jsx` | Built, not tested |
| /wallet | `wallet.jsx` | Built, not tested |
| /reels (+upload, comments, my, saved) | `reels.jsx` | Built, not tested |
| /wishlist,/saved,/saved-places | `saved-places.jsx` (+aliases) | Built, not tested |
| /notifications, /settings, /refer, /profile/edit | same names | Built, not tested |
| /about, /contact, /news, /legal, /login/terms, /login/privacy, /login/support, /partner-landing | same names | Built, not tested |
| /listings → /search | `listings.jsx` | Built, not tested |
| /serviced (placeholder text page in web) | not converted (empty placeholder) | n/a |

## 3. Screens — host/partner mode (`/hotel/*`)
| Web | App | Status |
|---|---|---|
| /hotel/join (type picker w/ subscription guard) | `hotel/join.jsx` | Built, not tested |
| /hotel/join-pg | `hotel/join-pg.jsx` (shared `PropertyWizard`) | Built, not tested |
| /hotel/join-dynamic/:categoryId (Rent/Sell/Plot) | `hotel/join-dynamic/[categoryId].jsx` | Built, not tested |
| /hotel/dashboard, /partner-dashboard | `hotel/dashboard.jsx`, `partner-dashboard.jsx` | Built, not tested |
| bookings list/detail (+ check-in/out, mark paid, no-show, inquiry status) | `hotel/bookings/*` | Built, not tested |
| properties list/detail/edit/delete | `hotel/properties/*` | Built, not tested |
| inventory-properties, inventory/:id | `hotel/inventory-properties.jsx`, `inventory/[id].jsx` | Built, not tested |
| wallet, transactions, bank-details | `hotel/wallet|transactions|bank-details.jsx` | Built, not tested |
| reviews (reply, helpful) | `hotel/reviews.jsx` | Built, not tested |
| subscriptions (plans, Razorpay) | `hotel/subscriptions.jsx` | Built, not tested |
| profile, settings, notifications, kyc | `hotel/profile|settings|notifications|kyc.jsx` | Built, not tested |
| support, terms, privacy, about, contact | `hotel/support|terms|privacy|about|contact.jsx` | Built, not tested |
| join-hotel / join-resort / join-hostel / join-villa / join-homestay wizards | **not converted** — not reachable from the web picker (it only offers PG, Rent, Sell, Plot) | Blocked (out of reachable scope; editing such existing listings shows a "use web" message) |

## 4. Left out (confirm scope)
- Admin panel (`/admin/*`) — stays on web (PDF scope rule).
- Legacy partner wizards listed above.
- Web-only: Lenis/GSAP/framer-motion animations, `/serviced` placeholder, `SoftGlowTouchEffect`.

## 5. APIs
All endpoints used by the converted screens are called through the ported services (`src/services/*`): auth (send-otp, verify-otp, update-profile, upload-docs, logout), users (profile, saved-hotels, notifications, fcm-token), properties (public, /my, details, create/update/delete, room-types, publish, reveal-contact), bookings (create, my, partner, detail, cancel, check-in/out, mark-paid, no-show, inquiry-status, view-lead), payments (create-order, verify), wallet (wallet, stats, transactions, withdraw, bank-details, add-money, verify-add-money), hostel-fees, offers, referrals, reviews, availability, subscriptions, reels (feed, upload signature/direct Cloudinary, like/save/comment/share/view/track, duration quote/payment), info/*, faqs, contact, news, home, categories, hotels (upload, location search/address/distance, onboarding notifications, property-drafts).
Public read endpoints: **Verified**. Everything authenticated: Built, not tested.

## 6. Auth / state / persistence
JWT in SecureStore, restored at launch; 401 → logout; zustand stores as in web — **Built, not tested** (persistence across restart not verified on device).

## 7. Flutter-wrapper capabilities (from guide, wrapper absent)
| Capability | Native replacement | Status |
|---|---|---|
| Camera/gallery bridge (`openCamera`, `pickImages`) | expo-image-picker | Built, not tested |
| Push (FCM token `NativeApp.getFcmToken`) | expo-notifications device token | **Blocked** — needs `google-services.json` |
| Back button | root BackHandler + Stack back; wizard steps go back a step | Built, not tested |
| Splash / icon | generated assets, expo-splash-screen | Built, not tested |
| Downloads/deep links | notification `data.url` deep link; no other deep links exist in web | Built, not tested |

## 8. Mobile behaviour (PDF §10)
Timeouts (30 s), retry/pull-to-refresh on lists, keyboard-avoiding forms, double-submit guards, error boundary, permissions on first use, no token/OTP logging — **Built, not tested**.

## 9. Checks (PDF §15)
1. Lint — **Verified**: `npx eslint .` → 0 errors (warnings are advisory React-Compiler/unused-var notes).
2. `npx expo-doctor` — **Verified** 20/20; Expo config resolves.
3. `npx expo export --platform android` — **Verified** (JS bundle builds).
4. API checks with test login — **Not run** (production login not authorised); public GETs **Verified**.
5. Emulator/device — **Not available** (no Android SDK/device) → device tests below.
6. Local Android build — **Skipped** (no Android SDK on this machine).

## 10. Device test list (for you, in order)
1. Install release APK on a clean phone; check icon + splash; open with no network (should show error/retry states, not hang).
2. Login with OTP (existing number), logout, login again; close/reopen app → still logged in; background → foreground.
3. Signup flow with a new number (OTP 123456 only works for test/`role=user` numbers per backend).
4. Home: location permission prompt, location chip, search suggestions, category tabs, banners, offers, reels row, pull to refresh.
5. Search with filters / sort / Near Me; open a property: images, rooms, dates, availability check, coupon, price breakdown.
6. Checkout: Pay at hotel; Pay Now (Razorpay WebView — use test card) incl. wallet partial; booking confirmation, cancel.
7. My Bookings tabs; Wallet add money; Wishlist add/remove; Notifications select/delete; Refer & Earn share; Profile edit incl. photo upload; delete-account dialog (don't confirm).
8. Reels: swipe feed, like/comment/save/share, upload a short video, My/Saved tabs.
9. Host mode: Post (+) → type picker → PG wizard / Rent wizard all steps incl. photo upload → submit; dashboard; enquiries actions; inventory calendar; wallet/bank; reviews reply; subscriptions purchase (test mode); profile.
10. Android back button on every screen: closes sheet/keyboard first, goes back one screen, never logs out.
