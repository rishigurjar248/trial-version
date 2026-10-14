import { createClient } from "@supabase/supabase-js";
import { getCookie, verifySession, COOKIE_NAME } from "../lib/auth.js";

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const isAdmin = (req) => verifySession(getCookie(req, COOKIE_NAME));
const fromRow = (r) => ({ code: r.code, discount: Number(r.discount), minSubtotal: Number(r.min_subtotal || 0), isActive: Boolean(r.is_active), isPublic: Boolean(r.is_public) });
export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "Supabase environment variables are missing." });
  const admin = isAdmin(req); const client = db();
  if (req.method === "GET") {
    let q = client.from("coupons").select("code,discount,min_subtotal,is_active,is_public").order("code");
    if (!admin) q = q.eq("is_active", true).eq("is_public", true);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ coupons: (data || []).map(fromRow) });
  }
  if (req.method === "POST") {
    const code = String(req.body?.code || "").trim().toUpperCase();
    const { data, error } = await client.from("coupons").select("code,discount,min_subtotal,is_active,is_public").eq("code", code).eq("is_active", true).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Invalid or inactive coupon code." });
    if (Number(req.body?.subtotal || 0) < Number(data.min_subtotal || 0)) return res.status(400).json({ error: `This coupon requires a minimum subtotal of ₹${Number(data.min_subtotal).toLocaleString("en-IN")}.` });
    return res.status(200).json({ coupon: fromRow(data) });
  }
  if (!admin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method === "PUT") {
    const c = req.body?.coupon || {};
    const code = String(c.code || "").trim().toUpperCase().replace(/\s/g, "");
    const discount = Number(c.discount); const minSubtotal = Number(c.minSubtotal || 0);
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) return res.status(400).json({ error: "Use 2–32 letters, numbers, hyphens or underscores for the code." });
    if (!Number.isFinite(discount) || discount <= 0 || !Number.isFinite(minSubtotal) || minSubtotal < 0) return res.status(400).json({ error: "Enter a valid discount and minimum subtotal." });
    const { error } = await client.from("coupons").upsert({ code, discount, min_subtotal: minSubtotal, is_active: c.isActive !== false, is_public: c.isPublic !== false, updated_at: new Date().toISOString() }, { onConflict: "code" });
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
