import { createClient } from "@supabase/supabase-js";
import { COOKIE_NAME, getCookie, verifySession } from "../lib/auth.js";

const getDb = () =>
  createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

const arrayValue = (value) => (Array.isArray(value) ? value : []);

const mapRow = (r = {}, imageRows = []) => {
  const orderedImages = imageRows
    .filter((x) => x?.image_url)
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((x) => x.image_url)
    .slice(0, 5);
  const legacyImages = [
    r.image,
    ...arrayValue(r.gallery_images),
    ...arrayValue(r.images),
  ].filter(Boolean);
  const imageUrls = [...new Set([...orderedImages, ...legacyImages])].slice(
    0,
    5,
  );

  return {
    id: Number(r.id),
    page: Number(r.page ?? r.id),
    name: r.name ?? "",
    brand: r.brand ?? "",
    category: r.category ?? "All Deals",
    price: Number(r.price ?? 0),
    paymentType: r.payment_type === "partial" ? "partial" : "full",
    partialPaymentAmount: Number(r.partial_payment_amount ?? 0),
    mrp: Number(r.mrp ?? r.old_price ?? 0),
    oldPrice: Number(r.old_price ?? r.mrp ?? 0),
    discount: Number(r.discount ?? 0),
    rating: Number(r.rating ?? 4.3),
    reviews: String(r.reviews ?? "0"),
    reviewCount: Number(r.review_count ?? 0),
    image: imageUrls[0] ?? "",
    imageUrls,
    galleryImages: imageUrls.slice(1),
    images: imageUrls,
    keyPoints: arrayValue(r.key_points).slice(0, 4),
    specs: arrayValue(r.key_points).slice(0, 4),
    description: r.description ?? "",
    isTop10: Boolean(r.is_top10),
    top10Rank: r.top10_rank ?? null,
    storefrontRank: r.storefront_rank ?? null,
    isActive: r.is_active !== false,
    returnEligible: r.return_eligible !== false,
  };
};

const mapProduct = (p = {}) => {
  const suppliedImages = arrayValue(p.imageUrls ?? p.image_urls);
  const legacyImages = [
    p.image,
    ...arrayValue(p.galleryImages ?? p.gallery_images),
    ...arrayValue(p.images),
  ].filter(Boolean);
  const imageUrls = [...new Set([...suppliedImages, ...legacyImages])].slice(
    0,
    5,
  );
  const keyPoints = arrayValue(p.keyPoints ?? p.key_points ?? p.specs).slice(
    0,
    4,
  );

  return {
    id: Number(p.id),
    page: Number(p.page ?? p.id),
    name: String(p.name ?? ""),
    brand: String(p.brand ?? ""),
    category: String(p.category ?? "All Deals"),
    price: Number(p.price ?? 0),
    payment_type: p.paymentType === "partial" ? "partial" : "full",
    partial_payment_amount:
      p.paymentType === "partial"
        ? Math.max(0, Number(p.partialPaymentAmount) || 0)
        : 0,
    mrp: Number(p.mrp ?? p.oldPrice ?? p.old_price ?? 0),
    old_price: Number(p.oldPrice ?? p.old_price ?? p.mrp ?? 0),
    discount: Number(p.discount ?? 0),
    rating: Number(p.rating ?? 4.3),
    reviews: String(p.reviews ?? "0"),
    review_count: Number(p.reviewCount ?? p.review_count ?? 0),
    image: imageUrls[0] || "",
    gallery_images: imageUrls.slice(1),
    images: imageUrls,
    key_points: keyPoints,
    description: String(p.description ?? ""),
    is_top10: Boolean(p.isTop10 ?? p.is_top10),
    top10_rank: p.top10Rank ?? p.top10_rank ?? null,
    storefront_rank: p.storefrontRank ?? p.storefront_rank ?? null,
    is_active: p.isActive !== false && p.is_active !== false,
    return_eligible: p.returnEligible !== false && p.return_eligible !== false,
    updated_at: new Date().toISOString(),
  };
};

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res
      .status(500)
      .json({ error: "Supabase environment variables are missing." });
  }

  const db = getDb();

  if (req.method === "GET") {
    const { data, error } = await db
      .from("products")
      .select(
        "id,page,name,brand,category,price,payment_type,partial_payment_amount,mrp,old_price,discount,rating,reviews,review_count,image,gallery_images,images,key_points,description,is_top10,top10_rank,storefront_rank,is_active,return_eligible,created_at",
      )
      .eq("is_active", true)
      .order("top10_rank", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const ids = (data ?? []).map((p) => p.id);
    let imageRows = [];
    if (ids.length) {
      const { data: images, error: imageError } = await db
        .from("product_images")
        .select("product_id,image_url,position")
        .in("product_id", ids)
        .order("position", { ascending: true });
      if (imageError)
        return res.status(500).json({ error: imageError.message });
      imageRows = images ?? [];
    }

    const grouped = new Map();
    for (const row of imageRows) {
      if (!grouped.has(row.product_id)) grouped.set(row.product_id, []);
      grouped.get(row.product_id).push(row);
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );
    res.setHeader(
      "CDN-Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );
    return res.status(200).json({
      products: (data ?? []).map((row) =>
        mapRow(row, grouped.get(row.id) ?? []),
      ),
    });
  }

  if (!verifySession(getCookie(req, COOKIE_NAME))) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.method !== "PUT")
    return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const products = Array.isArray(body?.changes) ? body.changes : [];
  const deletedIds = Array.isArray(body?.deletedIds)
    ? [
        ...new Set(
          body.deletedIds
            .map(Number)
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ]
    : [];

  if (!products.length && !deletedIds.length) {
    return res
      .status(200)
      .json({ ok: true, changedCount: 0, deletedCount: 0, imageCount: 0 });
  }
  if (products.length > 1000)
    return res
      .status(400)
      .json({ error: "Too many changed products in one save." });

  const imageChangedIds = new Set(
    products.filter((p) => p?.__imagesChanged).map((p) => Number(p.id)),
  );
  const rows = products
    .map(mapProduct)
    .filter((p) => Number.isFinite(p.id) && p.id > 0);
  if (rows.length !== products.length)
    return res
      .status(400)
      .json({ error: "One or more changed products has an invalid ID." });

  const duplicateIds = rows
    .map((p) => p.id)
    .filter((id, i, arr) => arr.indexOf(id) !== i);
  if (duplicateIds.length)
    return res
      .status(400)
      .json({ error: "Duplicate product IDs were supplied." });

  // Incremental save: only changed/new products are upserted.
  if (rows.length) {
    const { error: upsertError } = await db
      .from("products")
      .upsert(rows, { onConflict: "id" });
    if (upsertError)
      return res.status(500).json({ error: upsertError.message });
  }

  // Removing a product only deactivates it, preserving its historical data.
  if (deletedIds.length) {
    const { error: deactivateError } = await db
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", deletedIds);
    if (deactivateError)
      return res.status(500).json({ error: deactivateError.message });
  }

  // Only products whose image list is part of the change are normalized here.
  // The client sends changed products only, so unchanged products' image rows are untouched.
  let imageCount = 0;
  if (rows.length && imageChangedIds.size) {
    const ids = rows.map((p) => p.id).filter((id) => imageChangedIds.has(id));
    const imageRowsForChanged = rows.filter((p) => imageChangedIds.has(p.id));
    const { error: deleteImagesError } = await db
      .from("product_images")
      .delete()
      .in("product_id", ids);
    if (deleteImagesError)
      return res.status(500).json({ error: deleteImagesError.message });

    const imageRows = imageRowsForChanged.flatMap((p) => {
      const source = [p.image, ...arrayValue(p.gallery_images)]
        .filter(Boolean)
        .slice(0, 5);
      return source.map((url, index) => ({
        product_id: p.id,
        image_url: url,
        position: index + 1,
      }));
    });

    if (imageRows.length) {
      const { error: imageInsertError } = await db
        .from("product_images")
        .insert(imageRows);
      if (imageInsertError)
        return res.status(500).json({ error: imageInsertError.message });
      imageCount = imageRows.length;
    }
  }

  return res.status(200).json({
    ok: true,
    changedCount: rows.length,
    deletedCount: deletedIds.length,
    imageCount,
  });
}
