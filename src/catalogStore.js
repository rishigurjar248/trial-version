import { extractedProducts } from "./productData";

export const CATALOG_KEY = "dealkart-catalog-v3";

const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
};

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const productReviewCount = (product) => {
  const count = asNumber(product.reviewCount ?? product.review_count, 0);
  if (count > 0) return count;

  const match = String(product.reviews ?? "0")
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .match(/^(\d+(?:\.\d+)?)\s*([km])?$/);
  if (!match) return 0;
  return (
    Number(match[1]) *
    (match[2] === "m" ? 1000000 : match[2] === "k" ? 1000 : 1)
  );
};

export const compareProductsByRating = (a, b) => {
  const ratingDifference = asNumber(b.rating, 4.3) - asNumber(a.rating, 4.3);
  if (ratingDifference !== 0) return ratingDifference;
  const reviewDifference = productReviewCount(b) - productReviewCount(a);
  return (
    reviewDifference || String(a.name ?? "").localeCompare(String(b.name ?? ""))
  );
};

export const compareStorefrontOrder = (a, b) => {
  const rankFor = (product) => {
    if (product.storefrontRank == null || product.storefrontRank === "")
      return null;
    const rank = Number(product.storefrontRank);
    return Number.isFinite(rank) && rank > 0 ? rank : null;
  };
  const aRank = rankFor(a);
  const bRank = rankFor(b);
  if (aRank != null && bRank != null && aRank !== bRank) return aRank - bRank;
  if ((aRank != null) !== (bRank != null)) return aRank != null ? -1 : 1;
  return compareProductsByRating(a, b);
};

export const normalize = (p = {}, index = 0) => {
  const keyPoints = asArray(p.keyPoints ?? p.key_points ?? p.specs).slice(0, 4);
  const legacyGallery = asArray(p.galleryImages ?? p.gallery_images);
  const legacyImages = asArray(p.images);
  const imageUrls = asArray(p.imageUrls ?? p.image_urls);
  const allImages = [
    ...new Set(
      [...imageUrls, p.image, ...legacyGallery, ...legacyImages].filter(
        Boolean,
      ),
    ),
  ].slice(0, 5);
  const id = asNumber(p.id, index + 1);
  const price = asNumber(p.price, 0);
  const mrp = asNumber(p.mrp ?? p.oldPrice ?? p.old_price, price);

  return {
    ...p,
    id,
    page: asNumber(p.page, id),
    name: String(p.name ?? p.title ?? "Untitled product"),
    brand: String(p.brand ?? "DealKart"),
    category: String(p.category ?? "All Deals"),
    price,
    paymentType:
      (p.paymentType ?? p.payment_type) === "partial" ? "partial" : "full",
    partialPaymentAmount: asNumber(
      p.partialPaymentAmount ?? p.partial_payment_amount,
      0,
    ),
    mrp,
    oldPrice: asNumber(p.oldPrice ?? p.old_price ?? p.mrp, mrp),
    discount: asNumber(p.discount, 0),
    rating: asNumber(p.rating, 4.3),
    reviews:
      p.reviews != null && String(p.reviews) !== "—" ? String(p.reviews) : "0",
    reviewCount: asNumber(p.reviewCount ?? p.review_count, 0),
    image: allImages[0] || "",
    imageUrls: allImages,
    galleryImages: allImages.slice(1),
    images: allImages,
    keyPoints,
    specs: keyPoints,
    isTop10: Boolean(p.isTop10 ?? p.is_top10),
    top10Rank: p.top10Rank ?? p.top10_rank ?? null,
    storefrontRank: p.storefrontRank ?? p.storefront_rank ?? null,
    description: String(p.description ?? ""),
    isActive: p.isActive ?? p.is_active ?? true,
    returnEligible:
      p.returnEligible ??
      p.return_eligible ??
      p.hasReturn ??
      p.has_return ??
      true,
  };
};

export function getInitialCatalog() {
  const productImages = import.meta.glob("./assets/products/product-*.jpg", {
    eager: true,
    import: "default",
    query: "?url",
  });
  const defaultTop10 = new Set([2, 9, 13, 19, 48, 49, 55, 76, 79, 1040]);
  return extractedProducts.map((p, index) =>
    normalize(
      {
        ...p,
        isTop10: defaultTop10.has(Number(p.page)),
        image:
          productImages[
            `./assets/products/product-${String(p.page).padStart(4, "0")}.jpg`
          ],
      },
      index,
    ),
  );
}

export function loadCatalog(fallback) {
  return fallback;
}

export async function fetchRemoteCatalog(fallback = [], options = {}) {
  const { fallbackOnError = true } = options;
  try {
    const res = await fetch("/api/catalog", {
      cache: "default",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
    const json = await res.json();
    if (!Array.isArray(json.products))
      throw new Error("Invalid catalog response from server.");
    return json.products.map(normalize);
  } catch (error) {
    console.warn("Remote catalog could not be loaded.", error);
    if (fallbackOnError) return fallback;
    throw error;
  }
}

export async function saveCatalog(changes, deletedIds = []) {
  const res = await fetch("/api/catalog", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes, deletedIds }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Unable to save catalog");
  return json;
}
