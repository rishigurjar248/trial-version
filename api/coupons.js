import { createClient } from "@supabase/supabase-js";
import { getCookie, verifySession, COOKIE_NAME } from "../lib/auth.js";

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const isAdmin = (req) => verifySession(getCookie(req, COOKIE_NAME));
const fromRow = (r) => ({
  code: r.code, discount: Number(r.discount || 0), flatDiscount: Number(r.discount || 0), minSubtotal: Number(r.min_subtotal || 0),
  tier1Min: Number(r.tier1_min ?? 499), tier1Discount: Number(r.tier1_discount || 0),
  tier2Min: Number(r.tier2_min ?? 999), tier2Discount: Number(r.tier2_discount || 0),
  tier3Min: Number(r.tier3_min ?? 1999), tier3Discount: Number(r.tier3_discount || 0),
  maxDiscount: Math.max(Number(r.discount || 0), Number(r.tier1_discount || 0), Number(r.tier2_discount || 0), Number(r.tier3_discount || 0)),
  isActive: Boolean(r.is_active), isPublic: Boolean(r.is_public)
});
const couponColumns = "code,discount,min_subtotal,tier1_min,tier1_discount,tier2_min,tier2_discount,tier3_min,tier3_discount,is_active,is_public";
const getDiscountForSubtotal = (row, subtotal) => {
  const tiers = [
    { min: Number(row.tier1_min ?? 499), discount: Number(row.tier1_discount || 0) },
    { min: Number(row.tier2_min ?? 999), discount: Number(row.tier2_discount || 0) },
    { min: Number(row.tier3_min ?? 1999), discount: Number(row.tier3_discount || 0) },
  ].filter(t => t.discount > 0).sort((a,b) => a.min - b.min);
  if (tiers.length) return tiers.filter(t => subtotal >= t.min).reduce((best,t) => Math.max(best,t.discount), 0);
  return subtotal >= Number(row.min_subtotal || 0) ? Number(row.discount || 0) : 0;
};
export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Supabase environment variables are missing." });
  const admin = isAdmin(req); const client = db();
  if (req.method === "GET") {
    let q = client.from("coupons").select(couponColumns).order("code");
    if (!admin) q = q.eq("is_active", true).eq("is_public", true);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ coupons: (data || []).map(fromRow) });
  }
  if (req.method === "POST") {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const { data, error } = await client.from("coupons").select(couponColumns).eq("code", code).eq("is_active", true).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Invalid or inactive coupon code." });
    const subtotal = Math.max(0, Number(req.body?.subtotal || 0));
    const discount = getDiscountForSubtotal(data, subtotal);
    if (discount <= 0) {
      const tiers = [{min:Number(data.tier1_min ?? 499),discount:Number(data.tier1_discount||0)},{min:Number(data.tier2_min ?? 999),discount:Number(data.tier2_discount||0)},{min:Number(data.tier3_min ?? 1999),discount:Number(data.tier3_discount||0)}].filter(t=>t.discount>0).sort((a,b)=>a.min-b.min);
      const min = tiers[0]?.min ?? Number(data.min_subtotal || 0);
      return res.status(400).json({ error: `Add items worth at least ₹${min.toLocaleString("en-IN")} to use this coupon.` });
    }
    return res.status(200).json({ coupon: { ...fromRow(data), discount: Math.min(subtotal, discount) } });
  }
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method === "PUT") {
    const c = req.body?.coupon || {};
    const code = String(c.code || "").trim().toUpperCase().replace(/\s/g, "");
    const discount = Number(c.discount || 0); const minSubtotal = Number(c.minSubtotal || 0);
    const tier1Min = Number(c.tier1Min ?? 499), tier1Discount = Number(c.tier1Discount || 0);
    const tier2Min = Number(c.tier2Min ?? 999), tier2Discount = Number(c.tier2Discount || 0);
    const tier3Min = Number(c.tier3Min ?? 1999), tier3Discount = Number(c.tier3Discount || 0);
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return res.status(400).json({ error: "Use 2–32 letters, numbers, hyphens or underscores for the code." });
    const numbers = [discount,minSubtotal,tier1Min,tier1Discount,tier2Min,tier2Discount,tier3Min,tier3Discount];
    if (numbers.some(n => !Number.isFinite(n) || n < 0) || discount <= 0 || Math.max(discount,tier1Discount,tier2Discount,tier3Discount) <= 0) return res.status(400).json({ error: "Enter at least one positive discount and valid non-negative cart thresholds." });
    const { error } = await client.from("coupons").upsert({ code, discount, min_subtotal: minSubtotal, tier1_min:tier1Min, tier1_discount:tier1Discount, tier2_min:tier2Min, tier2_discount:tier2Discount, tier3_min:tier3Min, tier3_discount:tier3Discount, is_active: c.isActive !== false, is_public: c.isPublic !== false, updated_at: new Date().toISOString() }, { onConflict: "code" });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  if (req.method === "DELETE") {
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Coupon code is required." });
    const { error } = await client.from("coupons").delete().eq("code", code);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
