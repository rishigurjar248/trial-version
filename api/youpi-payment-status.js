import { createClient } from "@supabase/supabase-js";
const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: "Order status is not configured" });
  const orderId = String(req.query?.orderId || "");
  if (!/^DK-[0-9a-f-]{36}$/i.test(orderId)) return res.status(400).json({ error: "Invalid order reference" });
  const { data, error } = await db().from("orders").select("id,payment_status,pay_now_amount,due_on_delivery,currency").eq("id", orderId).maybeSingle();
  if (error) return res.status(500).json({ error: "Unable to check order status" });
  if (!data) return res.status(404).json({ error: "Order not found" });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ orderId: data.id, paymentStatus: data.payment_status, amount: Number(data.pay_now_amount), dueOnDelivery: Number(data.due_on_delivery), currency: data.currency || "INR" });
}
