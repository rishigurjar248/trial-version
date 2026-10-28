import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };
const db = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
function validSignature(raw, supplied, secret) {
  if (!supplied || !secret || !/^sha256=[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
  const left = Buffer.from(supplied.toLowerCase(), "utf8");
  const right = Buffer.from(expected.toLowerCase(), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
const paise = (value) => Math.round(Number(value) * 100);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.YOUPI_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Webhook is not configured" });
  }
  let raw;
  try { raw = await rawBody(req); } catch { return res.status(400).json({ error: "Could not read request body" }); }
  if (!validSignature(raw, String(req.headers["x-gateway-signature"] || ""), process.env.YOUPI_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }
  let event;
  try { event = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "Invalid JSON payload" }); }
  const orderId = String(event.orderId || "");
  const eventName = String(event.event || "").toUpperCase();
  const deliveryId = String(req.headers["x-gateway-delivery-id"] || event.deliveryId || "").slice(0, 160);
  if (!/^DK-[0-9a-f-]{36}$/i.test(orderId) || !deliveryId || !["SUCCESS", "FAILED", "EXPIRED", "CANCELLED"].includes(eventName)) {
    return res.status(400).json({ error: "Missing or invalid payment event fields" });
  }

  const client = db();
  try {
    const { data: order, error: orderError } = await client.from("orders")
      .select("id,pay_now_amount,payment_status,gateway_payment_id")
      .eq("id", orderId).maybeSingle();
    if (orderError) throw new Error("Unable to load order");
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (eventName === "SUCCESS") {
      const receivedPaise = Number.isFinite(Number(event.amountPaise)) ? Number(event.amountPaise) : paise(event.amount);
      if (!Number.isSafeInteger(receivedPaise) || receivedPaise !== paise(order.pay_now_amount)) {
        console.warn("YouPI amount mismatch", { orderId });
        return res.status(409).json({ error: "Payment amount does not match the order" });
      }
      const paymentId = String(event.paymentId || "");
      if (order.gateway_payment_id && paymentId && order.gateway_payment_id !== paymentId) {
        console.warn("YouPI payment ID mismatch", { orderId });
        return res.status(409).json({ error: "Payment session does not match the order" });
      }
    }
    if (order.payment_status === "paid") return res.status(200).json({ received: true, duplicate: true });

    const { error: eventError } = await client.from("payment_webhook_events").insert({
      delivery_id: deliveryId,
      order_id: orderId,
      event_name: eventName,
      received_at: new Date().toISOString(),
    });
    if (eventError) {
      if (eventError.code === "23505") return res.status(200).json({ received: true, duplicate: true });
      throw new Error("Unable to record webhook delivery");
    }

    const patch = { updated_at: new Date().toISOString() };
    if (eventName === "SUCCESS") {
      patch.payment_status = "paid";
      patch.paid_at = new Date().toISOString();
      patch.gateway_utr = String(event.utr || "").slice(0, 80) || null;
    } else {
      patch.payment_status = eventName.toLowerCase();
    }
    const { error: updateError } = await client.from("orders").update(patch)
      .eq("id", orderId).neq("payment_status", "paid");
    if (updateError) {
      await client.from("payment_webhook_events").delete().eq("delivery_id", deliveryId);
      throw new Error("Unable to update order payment status");
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("YouPI webhook processing failed", { message: error?.message });
    return res.status(500).json({ error: "Webhook processing failed; gateway may retry" });
  }
}
