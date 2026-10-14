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
