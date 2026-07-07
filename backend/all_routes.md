# API Routes List

## adminRoutes.js (Base Path: `/api/admin`)
- **GET** `/api/admin/notifications`
- **POST** `/api/admin/notifications/send`
- **PUT** `/api/admin/notifications/read-all`
- **DELETE** `/api/admin/notifications`
- **PUT** `/api/admin/fcm-token`
- **GET** `/api/admin/dashboard-stats`
- **GET** `/api/admin/finance`
- **GET** `/api/admin/users`
- **GET** `/api/admin/partners`
- **GET** `/api/admin/hotels`
- **GET** `/api/admin/bookings`
- **GET** `/api/admin/property-requests`
- **PUT** `/api/admin/hotel-status`
- **PUT** `/api/admin/update-hotel-status`
- **GET** `/api/admin/reviews`
- **DELETE** `/api/admin/delete-review`
- **PUT** `/api/admin/update-review-status`
- **PUT** `/api/admin/update-user-status`
- **PUT** `/api/admin/update-partner-status`
- **PUT** `/api/admin/update-partner-approval`
- **DELETE** `/api/admin/delete-user`
- **DELETE** `/api/admin/delete-partner`
- **DELETE** `/api/admin/delete-hotel`
- **GET** `/api/admin/user-details/:id`
- **GET** `/api/admin/partner-details/:id`
- **PUT** `/api/admin/verify-documents`
- **GET** `/api/admin/hotel-details/:id`
- **GET** `/api/admin/booking-details/:id`
- **PUT** `/api/admin/booking-status`
- **PUT** `/api/admin/update-booking-status`
- **GET** `/api/admin/legal-pages`
- **POST** `/api/admin/legal-pages`
- **GET** `/api/admin/contact-messages`
- **PUT** `/api/admin/contact-messages/:id/status`
- **GET** `/api/admin/platform-settings`
- **PUT** `/api/admin/platform-settings`
- **GET** `/api/admin/reel-analysis`

## authRoutes.js (Base Path: `/api/auth`)
- **POST** `/api/auth/send-otp`
- **POST** `/api/auth/verify-otp`
- **POST** `/api/auth/partner/register`
- **POST** `/api/auth/partner/verify-otp`
- **POST** `/api/auth/partner/upload-docs`
- **POST** `/api/auth/partner/upload-docs-base64`
- **POST** `/api/auth/partner/delete-doc`
- **POST** `/api/auth/admin/login`
- **GET** `/api/auth/me`
- **PUT** `/api/auth/update-profile`
- **PUT** `/api/auth/admin/update-profile`
- **PUT** `/api/auth/update-fcm`

## availabilityRoutes.js (Base Path: `/api/availability`)
- **GET** `/api/availability/check`
- **GET** `/api/availability/partner/ledger`
- **POST** `/api/availability/partner/walkin`
- **POST** `/api/availability/partner/external-booking`
- **POST** `/api/availability/partner/block-inventory`
- **DELETE** `/api/availability/partner/ledger/:id`

## bookingRoutes.js (Base Path: `/api/bookings`)
- **POST** `/api/bookings`
- **GET** `/api/bookings/my`
- **GET** `/api/bookings/partner`
- **GET** `/api/bookings/:id/partner-detail`
- **GET** `/api/bookings/:id`
- **PUT** `/api/bookings/:id/mark-paid`
- **PUT** `/api/bookings/:id/no-show`
- **PUT** `/api/bookings/:id/check-in`
- **PUT** `/api/bookings/:id/check-out`
- **PUT** `/api/bookings/:id/inquiry-status`
- **POST** `/api/bookings/:id/cancel`

## categoryRoutes.js (Base Path: `/api/categories`)
- **GET** `/api/categories/active`
- **GET** `/api/categories/all`
- **POST** `/api/categories`
- **PUT** `/api/categories/reorder`
- **PUT** `/api/categories/:id`
- **DELETE** `/api/categories/:id`

## contactRoutes.js (Base Path: `/api/contact`)
- **POST** `/api/contact/:audience`

## faqRoutes.js (Base Path: `/api/faqs`)
- **GET** `/api/faqs`
- **GET** `/api/faqs/admin`
- **POST** `/api/faqs`
- **PUT** `/api/faqs/:id`
- **DELETE** `/api/faqs/:id`

## hotelRoutes.js (Base Path: `/api/partners`)
- **POST** `/api/partners/upload`
- **POST** `/api/partners/upload-base64`
- **POST** `/api/partners/delete-image`
- **POST** `/api/partners/location/address`
- **GET** `/api/partners/location/search`
- **GET** `/api/partners/location/distance`
- **GET** `/api/partners/notifications`
- **PUT** `/api/partners/notifications/read-all`
- **PUT** `/api/partners/notifications/:id/read`
- **DELETE** `/api/partners/notifications`
- **PUT** `/api/partners/fcm-token`

## hotelRoutes.js_partner (Base Path: `/api/partners`)
- **POST** `/api/partners/upload`
- **POST** `/api/partners/upload-base64`
- **POST** `/api/partners/delete-image`
- **POST** `/api/partners/location/address`
- **GET** `/api/partners/location/search`
- **GET** `/api/partners/location/distance`
- **GET** `/api/partners/notifications`
- **PUT** `/api/partners/notifications/read-all`
- **PUT** `/api/partners/notifications/:id/read`
- **DELETE** `/api/partners/notifications`
- **PUT** `/api/partners/fcm-token`

## infoRoutes.js (Base Path: `/api/info`)
- **GET** `/api/info/platform/status`
- **GET** `/api/info/platform/financials`
- **GET** `/api/info/:audience/:slug`

## offerRoutes.js (Base Path: `/api/offers`)
- **GET** `/api/offers`
- **POST** `/api/offers/validate`
- **GET** `/api/offers/all`
- **POST** `/api/offers`
- **PUT** `/api/offers/:id`
- **DELETE** `/api/offers/:id`

## paymentRoutes.js (Base Path: `/api/payments`)
- **POST** `/api/payments/create-order`
- **POST** `/api/payments/verify`
- **POST** `/api/payments/webhook`
- **GET** `/api/payments/:paymentId`
- **POST** `/api/payments/refund/:bookingId`

## propertyRoutes.js (Base Path: `/api/properties`)
- **GET** `/api/properties`
- **GET** `/api/properties/recommended-sellers`
- **GET** `/api/properties/my`
- **GET** `/api/properties/:id/reveal-contact`
- **GET** `/api/properties/:id`
- **POST** `/api/properties`
- **PUT** `/api/properties/:id`
- **DELETE** `/api/properties/:id`
- **POST** `/api/properties/:propertyId/room-types`
- **PUT** `/api/properties/:propertyId/room-types/:roomTypeId`
- **DELETE** `/api/properties/:propertyId/room-types/:roomTypeId`
- **POST** `/api/properties/:propertyId/documents`

## reelRoutes.js (Base Path: `/api/reels`)
- **GET** `/api/reels/feed`
- **GET** `/api/reels/most-viewed`
- **GET** `/api/reels/:id`
- **POST** `/api/reels/like/:id`
- **POST** `/api/reels/comment/:id`
- **GET** `/api/reels/:id/comments`
- **POST** `/api/reels/share/:id`
- **POST** `/api/reels/:id/view`
- **DELETE** `/api/reels/:id`

## referralRoutes.js (Base Path: `/api/referrals`)
- **GET** `/api/referrals/my-stats`
- **GET** `/api/referrals/program/active`
- **POST** `/api/referrals/program`
- **POST** `/api/referrals/code/generate`

## reviewRoutes.js (Base Path: `/api/reviews`)
- **GET** `/api/reviews/partner/stats`
- **GET** `/api/reviews/partner/all`
- **POST** `/api/reviews/:reviewId/reply`
- **POST** `/api/reviews/:reviewId/helpful`
- **GET** `/api/reviews/:propertyId`
- **POST** `/api/reviews`

## subscriptionRoutes.js (Base Path: `/api/subscriptions`)

## userRoutes.js (Base Path: `/api/users`)
- **GET** `/api/users/profile`
- **PUT** `/api/users/profile`
- **PUT** `/api/users/fcm-token`
- **GET** `/api/users/saved-hotels`
- **POST** `/api/users/saved-hotels/:id`
- **GET** `/api/users/notifications`
- **PUT** `/api/users/notifications/read-all`
- **PUT** `/api/users/notifications/:id/read`
- **DELETE** `/api/users/notifications`

## walletRoutes.js (Base Path: `/api/wallet`)
- **GET** `/api/wallet`
- **GET** `/api/wallet/stats`
- **POST** `/api/wallet/add-money`
- **POST** `/api/wallet/verify-add-money`
- **GET** `/api/wallet/transactions`
- **POST** `/api/wallet/withdraw`
- **GET** `/api/wallet/withdrawals`
- **PUT** `/api/wallet/bank-details`
- **DELETE** `/api/wallet/bank-details`

