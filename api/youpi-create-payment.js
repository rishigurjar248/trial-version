import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const db = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const parseBody = (body) => {
  if (typeof body === "string") { try { return JSON.parse(body); } catch { return {}; } }
  return body && typeof body === "object" ? body : {};
};
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const amountString = (value) => roundMoney(value).toFixed(2);
const couponDiscount = (row, subtotal) => {
  const tiers = [
    { min: Number(row.tier1_min ?? 499), discount: Number(row.tier1_discount || 0) },
    { min: Number(row.tier2_min ?? 999), discount: Number(row.tier2_discount || 0) },
    { min: Number(row.tier3_min ?? 1999), discount: Number(row.tier3_discount || 0) },
  ].filter((t) => t.discount > 0).sort((a, b) => a.min - b.min);
  const discount = tiers.length
    ? tiers.filter((t) => subtotal >= t.min).reduce((best, t) => Math.max(best, t.discount), 0)
    : (subtotal >= Number(row.min_subtotal || 0) ? Number(row.discount || 0) : 0);
  return Math.min(subtotal, Math.max(0, discount));
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "YOUPI_API_URL", "YOUPI_MERCHANT_ID", "DEALKART_PUBLIC_URL"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) return res.status(503).json({ error: `Payment integration is not configured on the server (${missing.join(", ")}).` });

  const body = parseBody(req.body);
  const customer = body.customer || {};
  const name = String(customer.name || "").trim().slice(0, 100);
  const phone = String(customer.phone || "").trim();
  const address = String(customer.address || "").trim().slice(0, 1000);
  const pincode = String(customer.pincode || "").trim();
  if (!name || !/^\d{10}$/.test(phone) || !address || !/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: "Enter a valid name, 10-digit phone number, delivery address, and 6-digit pincode." });
  }

  const submittedItems = Array.isArray(body.items) ? body.items : [];
  if (!submittedItems.length || submittedItems.length > 50) return res.status(400).json({ error: "Your cart is empty or contains too many line items." });
  const normalizedItems = submittedItems.map((item) => ({
    productId: Number(item.productId),
    quantity: Number(item.quantity),
  }));
  if (normalizedItems.some((item) => !Number.isSafeInteger(item.productId) || item.productId <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
    return res.status(400).json({ error: "One or more cart items are invalid." });
  }
  const combined = new Map();
  for (const item of normalizedItems) combined.set(item.productId, (combined.get(item.productId) || 0) + item.quantity);
  if ([...combined.values()].some((quantity) => quantity > 20)) return res.status(400).json({ error: "Maximum quantity is 20 per product." });

  const client = db();
  try {
    const ids = [...combined.keys()];
    const { data: products, error: productsError } = await client
      .from("products")
      .select("id,name,brand,price,payment_type,partial_payment_amount,is_active")
      .in("id", ids);
    if (productsError) throw new Error("Unable to validate the product catalog. Please retry.");
    const productMap = new Map((products || []).map((product) => [Number(product.id), product]));
    if (productMap.size !== ids.length || ids.some((id) => !productMap.get(id)?.is_active)) {
      return res.status(400).json({ error: "One or more products are no longer available. Refresh your cart and try again." });
    }

    const items = ids.map((productId) => {
      const product = productMap.get(productId);
      const quantity = combined.get(productId);
      const price = roundMoney(product.price);
      if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid price configured for product ${productId}.`);
      return {
        product_id: productId,
        name: String(product.name || "").slice(0, 200),
        brand: String(product.brand || "").slice(0, 100),
        unit_price: price,
        quantity,
        line_total: roundMoney(price * quantity),
        payment_type: product.payment_type === "partial" ? "partial" : "full",
        partial_payment_amount: roundMoney(product.partial_payment_amount || 0),
      };
    });
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.line_total, 0));
    let discountAmount = 0;
    const couponCode = String(body.couponCode || "").trim().toUpperCase().slice(0, 32);
    if (couponCode) {
      const { data: coupon, error: couponError } = await client
        .from("coupons")
        .select("code,discount,min_subtotal,tier1_min,tier1_discount,tier2_min,tier2_discount,tier3_min,tier3_discount,is_active")
        .eq("code", couponCode)
        .eq("is_active", true)
        .maybeSingle();
      if (couponError) throw new Error("Unable to validate the coupon. Please retry.");
      if (!coupon) return res.status(400).json({ error: "This coupon is invalid or inactive." });
      discountAmount = couponDiscount(coupon, subtotal);
      if (discountAmount <= 0) return res.status(400).json({ error: "Your cart does not meet this coupon's minimum spend." });
    }
    const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));
    if (totalAmount <= 0) return res.status(400).json({ error: "The payable amount must be greater than zero." });

    const paymentMode = body.paymentMode === "partial" ? "partial" : "full";
    if (paymentMode === "partial" && items.some((item) => item.payment_type !== "partial" || item.partial_payment_amount <= 0 || item.partial_payment_amount >= item.unit_price)) {
      return res.status(400).json({ error: "Partial payment is only available when every item has valid partial-payment terms." });
    }
    const configuredPartial = roundMoney(items.reduce((sum, item) => sum + item.partial_payment_amount * item.quantity, 0));
    const payNowAmount = paymentMode === "partial" ? Math.min(totalAmount, configuredPartial) : totalAmount;
    const dueOnDelivery = roundMoney(totalAmount - payNowAmount);
    if (payNowAmount <= 0) return res.status(400).json({ error: "The online payment amount must be greater than zero." });

    const orderId = `DK-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const { error: insertError } = await client.from("orders").insert({
      id: orderId,
      customer_details: { name, phone, address, pincode },
      items,
      subtotal,
      coupon_code: couponCode || null,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      pay_now_amount: payNowAmount,
      due_on_delivery: dueOnDelivery,
      payment_mode: paymentMode,
      payment_status: "pending",
      gateway_provider: "youpi",
      currency: "INR",
      created_at: now,
      updated_at: now,
    });
    if (insertError) throw new Error("Could not create your order record. Please retry.");

    const baseUrl = process.env.YOUPI_API_URL.replace(/\/+$/, "");
    const siteUrl = process.env.DEALKART_PUBLIC_URL.replace(/\/+$/, "");
    let gatewayResponse;
    try {
      const response = await fetch(`${baseUrl}/api/v1/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Merchant-Id": process.env.YOUPI_MERCHANT_ID },
        body: JSON.stringify({
          orderId,
          amount: amountString(payNowAmount),
          currency: "INR",
          returnUrl: `${siteUrl}/?payment_return=1&order_id=${encodeURIComponent(orderId)}`,
          metadata: { paymentMode, dueOnDelivery: amountString(dueOnDelivery) },
        }),
        signal: AbortSignal.timeout(15000),
      });
      gatewayResponse = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("YouPI payment session creation failed", { status: response.status, orderId });
        return res.status(502).json({ error: "The payment gateway could not start checkout. Your order was not marked as paid; please retry or contact support with your order reference.", orderId });
      }
    } catch (error) {
      console.error("YouPI payment API unavailable", { orderId, message: error?.message });
      return res.status(502).json({ error: "The payment gateway is temporarily unreachable. Your order is pending; please retry shortly or contact support with your order reference.", orderId });
    }

    const checkoutUrl = String(gatewayResponse.checkoutUrl || gatewayResponse.checkoutURL || "");
    let parsedCheckoutUrl;
    try { parsedCheckoutUrl = new URL(checkoutUrl); } catch { parsedCheckoutUrl = null; }
    const allowedProtocol = parsedCheckoutUrl && (parsedCheckoutUrl.protocol === "https:" || (process.env.NODE_ENV !== "production" && parsedCheckoutUrl.protocol === "http:"));
    if (!allowedProtocol) {
      console.error("YouPI response omitted a valid checkout URL", { orderId });
      return res.status(502).json({ error: "The gateway did not return a valid secure checkout URL. Contact support with your order reference.", orderId });
    }
    const gatewayPaymentId = String(gatewayResponse.paymentId || "").slice(0, 128);
    const { error: updateError } = await client.from("orders").update({
      gateway_payment_id: gatewayPaymentId || null,
      gateway_checkout_url: checkoutUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
    if (updateError) {
      console.error("Unable to store gateway payment reference", { orderId, message: updateError.message });
      return res.status(500).json({ error: "The payment session was created but could not be linked to the order. Contact support before attempting another payment.", orderId });
    }

    return res.status(200).json({ orderId, checkoutUrl, amount: amountString(payNowAmount), currency: "INR" });
  } catch (error) {
    console.error("YouPI order creation failed", { message: error?.message });
    return res.status(500).json({ error: error?.message || "Unable to create the payment order." });
  }
}
