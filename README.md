# DealKart Combined Storefront

DealKart storefront + secure admin catalog manager.

## Product database architecture

The catalog uses:

- **Supabase PostgreSQL** for product text/options, pricing, rating, Top 10 state and other structured data.
- **`product_images` table** for up to **5 ordered image URLs per product**.
- **Supabase Storage (`product-images`)** for optional direct image uploads from the admin panel.
- The browser only receives public image URLs; the Supabase service-role key stays server-side.

### Product fields

Each product can store:

- Product name
- Brand
- Category
- MRP
- My price
- Rating
- Reviews
- Return policy
- Description
- 4 key points
- Today's Top 10 + rank
- Up to 5 images
- Active/inactive state

### Image workflow

In the admin panel you can either:

1. Paste a public image URL into Image 1–5, or
2. Choose images and upload them to the private admin upload endpoint, which creates a signed upload URL and stores the files in the public `product-images` bucket.

The database stores the resulting URL and position. The image binary is never placed inside PostgreSQL or converted to a base64 string.

## Supabase setup

Run `SUPABASE_SETUP.sql` in the Supabase SQL Editor before using the new image manager.

It creates/updates:

- `products`
- `product_images`
- indexes and read policies
- the public `product-images` Storage bucket

The server API uses the Supabase service-role key, so keep it server-side only.

## Environment variables

### Vercel / server

```env
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-strong-admin-password
ADMIN_SESSION_SECRET=at-least-32-random-characters
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### Browser build

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

The `VITE_*` values are public client credentials. **Never** put `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, or `ADMIN_SESSION_SECRET` in a `VITE_*` variable or frontend source code.

## Deploying

1. Open the Supabase project.
2. Run `SUPABASE_SETUP.sql`.
3. In Supabase → Project Settings → API, copy the Project URL, anon key and service-role key.
4. In Vercel → Project → Settings → Environment Variables, add all six variables above.
5. Redeploy Vercel.
6. Open the DealKart admin page and log in.
7. Add/edit a product and use **Save catalog**.
8. Add up to five image URLs or upload images to Supabase Storage.
9. Refresh the storefront on another device. The same product data and image URLs will be loaded from the global database.

## Image-size recommendation

The Supabase Free plan has limited Storage. For a catalog of roughly 100 products × 5 images, do not keep original 2–3 MB files if you can avoid it. Convert product images to WebP/JPEG and target roughly **300–800 KB per image** while keeping the product readable.

## Local development

```bash
npm install
npm run dev
```

For local development, create `.env.local` from `.env.example`. Do not commit `.env.local`.

## Existing legacy data

The existing `products.image`, `gallery_images` and `images` columns are retained for compatibility. The new `product_images` table becomes the normalized source for the admin-managed five-image gallery. Existing legacy images continue to work until the product is saved again from the admin panel.

## API routes

- `GET /api/catalog` — public active catalog
- `PUT /api/catalog` — authenticated catalog save
- `POST /api/storage-upload-url` — authenticated signed image-upload URL
- `POST /api/admin-login` — admin login
- `GET /api/admin-session` — session check
- `POST /api/admin-logout` — logout

## Admin coupon manager and daily product order

- The admin sidebar now contains only **Products**, **Top Deals**, **Coupons**, and **Logout**.
- Product cards are shuffled using a date-based deterministic order after the remote catalog loads. The sequence changes on each local calendar day; Top Deals keep their manually assigned rank.
- Coupon management uses the `public.coupons` table. Run the updated `SUPABASE_SETUP.sql` in the Supabase SQL Editor before deploying this version. The setup seeds `NEW05`, `FIRSTBUY`, and hidden `AMAN` defaults if they do not already exist.
- In the admin **Coupons** tab, create or edit a fixed-rupee discount, set an optional minimum cart subtotal, activate/deactivate the code, and choose whether it appears in frontend offers. Set **Show in frontend offers** off for `AMAN`; customers can still apply it by typing the code while it remains active.
- The `/api/coupons` API requires the existing admin session for creating, editing, and deleting coupons. Public coupon validation runs server-side, including hidden coupons.

## YouPI-PG UPI checkout add-on

This project includes a **server-side integration scaffold** for the self-hosted YouPI-PG API. It preserves the existing storefront and keeps WhatsApp ordering as a fallback. It does not include your live gateway credentials and is not production-enabled until you deploy/configure YouPI-PG and set the required environment variables.

### Required environment variables

Set these in Vercel Project → Settings → Environment Variables (Production, Preview as needed):

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
YOUPI_API_URL=https://pay.yourdomain.com
YOUPI_MERCHANT_ID=YOUR_CONFIGURED_MERCHANT_UUID
YOUPI_WEBHOOK_SECRET=YOUR_CONFIGURED_WEBHOOK_SECRET
DEALKART_PUBLIC_URL=https://deal-kart.co.in
```

Keep the Supabase service-role key, YouPI merchant secret, and webhook secret server-side. Do not prefix these variables with `VITE_`, do not put them in source files, and do not commit `.env` files.

### Database setup

1. Run your existing `SUPABASE_SETUP.sql` if you have not already done so.
2. Run `YOUPI_SETUP.sql` in the Supabase SQL Editor.
3. Confirm the `orders` and `payment_webhook_events` tables were created. They intentionally have no public RLS policies; server API functions use the service-role key.

### Gateway setup

1. Deploy the upstream YouPI-PG repository as a separate service on a persistent host that meets the current upstream README requirements. The upstream repository is experimental and explicitly not certified, audited, or production-ready.
2. Configure a receiving account/UPI ID in the YouPI merchant admin. Your phone number is not automatically a UPI ID; if your bank/UPI app maps it to a UPI address, confirm the exact receiving UPI ID in the merchant setup. The DealKart checkout uses the gateway's dynamic checkout QR; a static QR image is not directly embedded in the DealKart storefront. A QR image can help identify the receiving UPI address, but it does not replace the gateway observer configuration.
3. Configure the public HTTPS gateway URL and merchant ID. Configure the gateway webhook destination to `https://deal-kart.co.in/api/youpi-webhook` and use the exact same webhook secret on both sides.
4. Confirm that the gateway's payment API is reachable at `YOUPI_API_URL/api/v1/payments` and that it returns a secure `checkoutUrl`.
5. Add the variables above to Vercel and redeploy.

### Flow and safeguards

- `POST /api/youpi-create-payment` re-reads product prices and partial-payment terms from Supabase, validates coupon rules, creates a pending order, then requests a hosted checkout session.
- `POST /api/youpi-webhook` verifies `X-Gateway-Signature` against the raw request bytes using HMAC-SHA256, checks order/payment amount and payment-session reference, and deduplicates deliveries.
- `GET /api/youpi-payment-status?orderId=...` returns minimal order status for the post-checkout return screen. The browser return itself never marks an order paid.
- Partial payment is enabled only when every item in the cart has valid partial-payment terms in the catalog. Remaining balance is stored as due on delivery.
- WhatsApp order flow remains available as a fallback.

### Before any real-money use

Do not treat this integration or a successful build as certification. The upstream YouPI-PG README labels the project experimental and warns that bank alerts can be delayed, missing, duplicated, or misparsed. Test webhook signature failures, replayed events, amount mismatches, duplicate equal-amount payments, payment timeouts, failed/expired sessions, and reconciliation against the receiving bank's official records. Confirm your bank's terms and applicable legal/compliance requirements independently. Do not rely on a screenshot or browser callback as proof of settlement.
