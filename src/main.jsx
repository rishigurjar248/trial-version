import {
  ArrowRight,
  BadgePercent,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  Heart,
  History,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Moon,
  Phone,
  PiggyBank,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Tag,
  Ticket,
  Trash2,
  Truck,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { Component, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import AdminPage from "./AdminPage";
import dealkartSymbol from "./assets/dealkart-symbol.png";
import heroGym from "./assets/hero-posters/fitness-home-gym.webp";
import heroFitness from "./assets/hero-posters/fitness-stronger.webp";
import heroFood from "./assets/hero-posters/food-clean-green.webp";
import heroStock from "./assets/hero-posters/stock-up-days.webp";
import heroWellness from "./assets/hero-posters/wellness-balance.webp";
import {
  compareStorefrontOrder,
  fetchRemoteCatalog,
  getInitialCatalog,
} from "./catalogStore";
import "./styles.css";

const WHATSAPP_NUMBER = "919244335428";
const SUPPORT_PHONE = "9244335428";
const SUPPORT_EMAIL = "mysterioofficial26@gmail.com";
const categories = [
  "All Deals",
  "Skincare",
  "Electronics",
  "Fashion",
  "Fitness",
  "Food",
  "Fragrance",
  "Personal Care",
];
const initialProducts = getInitialCatalog();
// The public storefront uses Supabase as its source of truth. Do not render
// the bundled one-product fallback while the remote catalog is loading.
let products = initialProducts;
let specialDeals = initialProducts
  .filter((p) => p.isTop10)
  .sort(
    (a, b) => (Number(a.top10Rank) || 999999) - (Number(b.top10Rank) || 999999),
  )
  .slice(0, 10);

const heroSlides = [
  // Default hero: Stock Up Days poster. Other posters are shown only when
  // the customer explicitly uses the carousel controls.
  { image: heroStock, alt: "Stock up days DealKart offers" },
  { image: heroFitness, alt: "Stronger every day fitness deals" },
  { image: heroGym, alt: "Home gym equipment deals" },
  { image: heroWellness, alt: "Wellness and yoga deals" },
  { image: heroFood, alt: "Clean food and healthy essentials deals" },
];
const money = (n) => (n ? `₹${n.toLocaleString("en-IN")}` : "");
const productGalleryImages = import.meta.glob(
  "./assets/product-gallery/product-*-view*.jpg",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
);

// External photos are included only where the exact product identity was verified.
// Every product also has two additional views generated from its original catalog
// photo, so no unrelated/random product can ever appear in the gallery.
const verifiedExternalGalleries = {
  1: [
    "https://innovist.com/cdn/shop/files/First_Image_Guides_copy_2_3x_1879e414-8ce5-4d69-b04d-a8038a5b519b_1_1.jpg?v=1756540569&width=720",
    "https://innovist.com/cdn/shop/files/2_236_3x_066f0731-d201-44b2-b374-5bb40288f7a8_2_1.jpg?v=1769598634&width=720",
    "https://innovist.com/cdn/shop/files/De-Tan_card_Exf_BW.jpg?v=1772013758&width=720",
  ],
  2: [
    "https://www.portronics.com/cdn/shop/files/Toad_8_Wireless_Mouse_for_Laptop.jpg?v=1732528723",
    "https://www.portronics.com/cdn/shop/files/Toad_8_Bluetooth_Mouse_Best_Wireless_Mouse_online.jpg?v=1732529065",
    "https://www.portronics.com/cdn/shop/files/Portronics_Toad_8_Wireless_Mouse_for_Laptop.jpg?v=1732529088",
  ],
  4: [
    "https://innovist.com/cdn/shop/files/exfoliating_face_Scrub_100ml.jpg?v=1787219525&width=720",
    "https://innovist.com/cdn/shop/files/Artboard_2_5_19a2b2b0-3209-4ecd-8de1-2f3a7558bbff.jpg?v=1772185709&width=720",
    "https://innovist.com/cdn/shop/files/Artboard_3_4_24ed62c0-2ae7-47e8-9de1-b4499ec2103b.jpg?v=1772185709&width=720",
  ],
  9: [
    "https://images-static.nykaa.com/media/catalog/product/3/e/3e30075227989-1.jpg",
    "https://images-static.nykaa.com/media/catalog/product/3/e/3e30075227989-2.jpg",
    "https://images-static.nykaa.com/media/catalog/product/3/e/3e30075227989-3.jpg",
  ],
  13: [
    "https://images-static.nykaa.com/media/catalog/product/3/e/3e4c4e9IB1895-102_4.jpg?tr=w-500",
    "https://assets.myntassets.com/assets/images/2025/DECEMBER/5/Iv5oBtZj_4c6390b444a94a80857e80865ae98c51.jpg",
  ],
  19: [
    "https://alpino.store/cdn/shop/files/Cold_Coffee_Shaker.webp?v=1784715194&width=1946",
    "https://alpino.store/cdn/shop/files/0001.webp?v=1784713927&width=1946",
    "https://alpino.store/cdn/shop/files/SNPColdCoffee02_89b70f78-8f64-41cf-9210-eb477a1ec55c.webp?v=1785135697&width=1946",
  ],
  35: [
    "https://i.ebayimg.com/00/s/MTUwMFgxNTAw/z/6xgAAOSw1E9n~hDN/%24_57.JPG?set_id=880000500F",
  ],
  37: [
    "https://www.bbassets.com/media/uploads/p/s/40293846_3-urban-gabru-hair-volumizing-powder-wax-for-men-matte-finish-24-hours-strong-hold.jpg",
  ],
  41: [
    "https://cdn.tirabeauty.com/v2/billowing-snowflake-434234/tira-p/wrkr/products/pictures/item/free/original/1129331/NA2FfukeI-1129331_1.jpg",
  ],
};

const getProductGallery = (p) => {
  const localViews = [2, 3]
    .map(
      (n) =>
        productGalleryImages[
          `./assets/product-gallery/product-${String(p.page).padStart(4, "0")}-view${n}.jpg`
        ],
    )
    .filter(Boolean);
  const verified = verifiedExternalGalleries[p.page] || [];
  // Admin-uploaded galleryImages must be included here too. Previously only
  // the primary image and built-in galleries were rendered, so newly added
  // product photos appeared to be lost on the storefront.
  return [
    ...new Set(
      [p.image, ...(p.galleryImages || []), ...verified, ...localViews].filter(
        Boolean,
      ),
    ),
  ];
};
const salePrice = (p) => p.price;
const mrp = (p) => {
  if (p.oldPrice > p.price) return p.oldPrice;
  return Math.ceil(p.price / 0.75 / 50) * 50;
};
const discount = (p) =>
  Math.max(0, Math.round((1 - salePrice(p) / mrp(p)) * 100));
const getItemPayment = ({ p, qty }) => {
  const price = Math.max(0, Number(p.price) || 0);
  const quantity = Math.max(0, Number(qty) || 0);
  const payNowPerItem =
    p.paymentType === "partial"
      ? Math.min(Math.max(0, Number(p.partialPaymentAmount) || 0), price)
      : price;
  return {
    payNow: payNowPerItem * quantity,
    dueOnDelivery: (price - payNowPerItem) * quantity,
    payNowPerItem,
    duePerItem: price - payNowPerItem,
  };
};
const getPaymentBreakdown = (items, orderTotal, paymentMode = "full") => {
  const total = Math.max(0, Number(orderTotal) || 0);
  const configuredPayNow =
    paymentMode === "partial"
      ? items.reduce((sum, item) => sum + getItemPayment(item).payNow, 0)
      : total;
  const payNow = Math.min(configuredPayNow, total);
  return { payNow, dueOnDelivery: total - payNow };
};
function waUrl(items, customer = {}, promo = {}, paymentMode = "full") {
  const lines = items
    .map((item) => {
      const { p, qty } = item;
      const payment = getItemPayment(item);
      const itemPrice = Math.max(0, Number(p.price) || 0);
      const terms =
        paymentMode === "partial"
          ? `Partial: ${money(payment.payNowPerItem)} now + ${money(payment.duePerItem)} on delivery per item`
          : `Full payment: ${money(itemPrice)} now per item`;
      return `${p.name} | ${p.brand} | ${money(p.price)} × ${qty} | ${terms}`;
    })
    .join("\n");
  const subtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
  const discountAmount = promo.discount || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const payment = getPaymentBreakdown(items, total, paymentMode);
  const couponLine = promo.code
    ? `\nCoupon: ${promo.code} (${money(discountAmount)} OFF)`
    : "";
  const couponNote =
    discountAmount > 0 && paymentMode === "partial"
      ? "\nCoupon savings reduce the delivery balance first."
      : "";
  const m = `Hi DealKart 👋\n\nI want to place an order:\n${lines}${couponLine}\n\nSubtotal: ${money(subtotal)}\nDiscount: ${money(discountAmount)}\nTotal: ${money(total)}\nPay now: ${money(payment.payNow)}\nDue on delivery: ${money(payment.dueOnDelivery)}${couponNote}\n\nCustomer details:\nName: ${customer.name || ""}\nPhone: ${customer.phone || ""}\nFull delivery address: ${customer.address || ""}\nPincode: ${customer.pincode || ""}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(m)}`;
}
function Logo() {
  return (
    <a className="logo" href="#top" aria-label="DealKart home">
      <img src={dealkartSymbol} alt="DealKart symbol" />
      <span className="logo-word">
        Deal<span>Kart</span>
      </span>
    </a>
  );
}
function Header({
  query,
  setQuery,
  onSearch,
  cartCount,
  wishCount,
  onCart,
  onWishlist,
  hidden,
  theme,
  onToggleTheme,
}) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-brand">
            <Zap size={11} fill="currentColor" /> DEALKART
          </span>
          <span className="topbar-message">100% genuine products</span>
          <i>·</i>
          <span>72-hour easy returns</span>
          <i>·</i>
          <span>Pan India delivery</span>
          <div className="topbar-note">
            Trusted deals, simple WhatsApp ordering
          </div>
        </div>
      </div>
      <header className={hidden ? "header-hidden" : ""}>
        <div className="header-inner">
          <Logo />
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(query);
            }}
          >
            <Search size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands and more..."
              aria-label="Search products, brands and more"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <button type="submit" className="search-submit" aria-label="Search">
              <Search size={16} />
            </button>
          </form>
          <div className="header-actions">
            <div className="delivery head-action">
              <MapPin size={18} />
              <span>
                <small>Deliver to</small>
                <b>India</b>
              </span>
            </div>
            <button className="head-count" onClick={onWishlist}>
              <span className="action-icon">
                <Heart size={18} />
              </span>
              <span className="action-label">Wishlist</span>
              {wishCount > 0 && <em>{wishCount}</em>}
            </button>
            <button className="head-count cart-head" onClick={onCart}>
              <span className="action-icon">
                <ShoppingCart size={18} />
              </span>
              <span className="action-label">Cart</span>
              {cartCount > 0 && <em>{cartCount}</em>}
            </button>
            <button
              className="theme-toggle"
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb">
                  {theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
                </span>
              </span>
            </button>
            <button className="profile-button" aria-label="DealKart account">
              <UserRound size={17} />
            </button>
          </div>
        </div>
      </header>
      <nav className={hidden ? "nav-hidden" : ""}>
        <div className="nav-inner">
          <div className="nav-deals">
            <Zap size={12} fill="currentColor" /> Deals
          </div>
          {categories.map((x) => (
            <a key={x} href="#products">
              {x}
            </a>
          ))}
          <a className="nav-special" href="#todays-special">
            <Sparkles size={12} /> Today's Special
          </a>
          <span className="nav-trust">
            <ShieldCheck size={12} /> Verified shopping
          </span>
        </div>
      </nav>
    </>
  );
}
function Hero({ slide, setSlide, onExplore }) {
  const s = heroSlides[slide];
  return (
    <section
      className="hero reveal"
      aria-label="DealKart promotional hero carousel"
    >
      <div
        className="hero-poster-stage"
        style={{ "--hero-bg": `url(${s.image})` }}
      >
        <img
          key={slide}
          src={s.image}
          alt={s.alt}
          fetchPriority={slide === 0 ? "high" : "auto"}
          loading={slide === 0 ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
      <div className="hero-frame">
        <div className="hero-live">
          <span /> LIVE DEALS
        </div>
        <button className="hero-explore" onClick={onExplore}>
          Explore deals <ArrowRight size={15} />
        </button>
      </div>
      <button
        className="hero-arrow prev"
        onClick={() =>
          setSlide((slide + heroSlides.length - 1) % heroSlides.length)
        }
        aria-label="Previous slide"
      >
        <ChevronLeft />
      </button>
      <button
        className="hero-arrow next"
        onClick={() => setSlide((slide + 1) % heroSlides.length)}
        aria-label="Next slide"
      >
        <ChevronRight />
      </button>
      <div className="dots">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            className={i === slide ? "active" : ""}
            onClick={() => setSlide(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
function Trust() {
  return (
    <section className="trust reveal">
      <div className="trust-item">
        <ShieldCheck />
        <span>
          <b>100% Genuine Products</b>
          <small>Authenticity-focused sourcing</small>
        </span>
      </div>
      <div className="trust-item">
        <Truck />
        <span>
          <b>Pan India Delivery</b>
          <small>Delivered to your doorstep</small>
        </span>
      </div>
      <div className="trust-item">
        <RotateCcw />
        <span>
          <b>72-Hour Easy Returns</b>
          <small>Simple return support</small>
        </span>
      </div>
      <div className="trust-item">
        <MessageCircle />
        <span>
          <b>WhatsApp Ordering</b>
          <small>Quick & simple checkout</small>
        </span>
      </div>
    </section>
  );
}
function ProductCard({ p, onOpen, onAdd, onWish, wished, onSeen }) {
  return (
    <article
      className="card reveal"
      onClick={() => {
        onSeen(p);
        onOpen(p);
      }}
    >
      <div className="pic">
        <img src={p.image} alt={p.name} />
        <span className="badge">{p.badge}</span>
        <button
          className={"heart " + (wished ? "liked" : "")}
          onClick={(e) => {
            e.stopPropagation();
            onWish(p);
          }}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={17} fill={wished ? "currentColor" : "none"} />
        </button>
        <div className="card-side-actions" aria-label="Product actions">
          <button
            className={wished ? "liked" : ""}
            onClick={(e) => {
              e.stopPropagation();
              onWish(p);
            }}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            title={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={15} fill={wished ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(p);
            }}
            aria-label="Add to cart"
            title="Add to cart"
          >
            <ShoppingCart size={15} />
          </button>
        </div>
        <div className="hover">
          <div className="hover-meta">
            <span>{p.category}</span>
            <span className="stock">
              <Check size={11} /> {p.availability}
            </span>
          </div>
          <h3>{p.name}</h3>
          <p>{p.description}</p>
          <ul>
            {(Array.isArray(p.specs) ? p.specs : []).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="hover-price">
            <del>{money(mrp(p))}</del>
            <b>{money(salePrice(p))}</b>
            <span>{discount(p)}% off</span>
          </div>
          <div className="hover-actions">
            <button
              className={"hover-wish " + (wished ? "liked" : "")}
              onClick={(e) => {
                e.stopPropagation();
                onWish(p);
              }}
            >
              <Heart size={14} fill={wished ? "currentColor" : "none"} />{" "}
              {wished ? "Saved" : "Add to wishlist"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  waUrl([{ p, qty: 1 }]),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <MessageCircle size={14} /> Buy now
            </button>
          </div>
        </div>
      </div>
      <div className="content">
        <div className="rating">
          <Star size={13} fill="currentColor" />
          {p.rating}
          <span>({p.reviews})</span>
        </div>
        <small>{p.brand}</small>
        <h3>{p.name}</h3>
        <div className="price">
          <del>{money(mrp(p))}</del>
          <b>{money(salePrice(p))}</b>
          <span>{discount(p)}% off</span>
        </div>
        <button
          className="buy"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(p);
          }}
        >
          <ShoppingCart size={15} /> Add to cart
        </button>
        <p>
          <Eye size={11} /> Quick view · WhatsApp checkout
        </p>
      </div>
    </article>
  );
}
function productHasReturn(p) {
  const value =
    p?.returnEligible ?? p?.return_eligible ?? p?.hasReturn ?? p?.has_return;
  if (value === undefined || value === null || value === "") return true;
  if (typeof value === "string")
    return !["false", "0", "no", "none", "no return"].includes(
      value.trim().toLowerCase(),
    );
  return Boolean(value);
}

function Modal({ p, onClose, onAdd, onWish, wished, onSeen }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  useEffect(() => setImageIndex(0), [p?.id]);
  useEffect(() => setDescriptionExpanded(false), [p?.id]);
  if (!p) return null;
  const gallery = getProductGallery(p);
  const activeImage = gallery[imageIndex] || p.image;
  const previousImage = () =>
    setImageIndex((i) => (i + gallery.length - 1) % gallery.length);
  const nextImage = () => setImageIndex((i) => (i + 1) % gallery.length);

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="modal-image">
          <img src={activeImage} alt={`${p.name} view ${imageIndex + 1}`} />
          <span className="modal-discount">-{discount(p)}%</span>
          <button
            className={"modal-heart " + (wished ? "liked" : "")}
            onClick={() => onWish(p)}
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart size={19} fill={wished ? "currentColor" : "none"} />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                className="gallery-arrow gallery-prev"
                onClick={previousImage}
                aria-label="Previous product image"
              >
                <ChevronLeft size={21} />
              </button>
              <button
                className="gallery-arrow gallery-next"
                onClick={nextImage}
                aria-label="Next product image"
              >
                <ChevronRight size={21} />
              </button>
              <div className="gallery-counter">
                {imageIndex + 1} / {gallery.length}
              </div>
              <div className="gallery-thumbs">
                {gallery.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    className={i === imageIndex ? "active" : ""}
                    onClick={() => setImageIndex(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="modal-info">
          <span className="brand">{p.brand}</span>
          <h2>{p.name}</h2>
          <div className="rating">
            <Star size={14} fill="currentColor" />
            {p.rating}
            <span>({p.reviews} ratings)</span>
          </div>
          <div className="modal-price">
            <span className="mrp-label">MRP</span>
            <del>{money(mrp(p))}</del>
            <b>{money(salePrice(p))}</b>
            <span className="sale-offer">{discount(p)}% off</span>
          </div>
          <div className="modal-description">
            <p className={descriptionExpanded ? "expanded" : ""}>
              {p.description}
            </p>
            <button
              className="modal-read-more"
              type="button"
              onClick={() => setDescriptionExpanded((expanded) => !expanded)}
            >
              {descriptionExpanded ? "Read less" : "Read more"}
            </button>
          </div>
          <div className="specs">
            {(Array.isArray(p.specs) ? p.specs : []).map((s) => (
              <div key={s}>
                <Check size={14} />
                {s}
              </div>
            ))}
          </div>
          <div
            className="modal-trust-strip"
            aria-label="Delivery and product assurance information"
          >
            <div className="modal-trust-item">
              <Truck size={25} strokeWidth={1.8} />
              <b>Delivery</b>
              <span>Deliver within 7 working days</span>
            </div>
            <div className="modal-trust-item">
              <ShieldCheck size={25} strokeWidth={1.8} />
              <b>100% Genuine</b>
              <span>Authentic product assurance</span>
            </div>
            <div className="modal-trust-item">
              {productHasReturn(p) ? (
                <RotateCcw size={25} strokeWidth={1.8} />
              ) : (
                <X size={25} strokeWidth={1.8} />
              )}
              <b>
                {productHasReturn(p) ? "72-hour easy return" : "*No Return"}
              </b>
              <span>
                {productHasReturn(p)
                  ? "Request within 72 hours of delivery"
                  : "This product is not returnable"}
              </span>
            </div>
          </div>
          <div className="modal-buttons">
            <button onClick={() => onAdd(p)}>
              <ShoppingCart size={17} /> Add to cart
            </button>
            <button
              onClick={() =>
                window.open(
                  waUrl([{ p, qty: 1 }]),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <MessageCircle size={17} /> Buy on WhatsApp
            </button>
          </div>
          <button
            className={"wishlist-line " + (wished ? "liked" : "")}
            onClick={() => onWish(p)}
          >
            <Heart size={16} fill={wished ? "currentColor" : "none"} />{" "}
            {wished ? "Saved to wishlist" : "Add to wishlist"}
          </button>
          <button
            className="modal-continue"
            onClick={() => {
              onSeen(p);
              onClose();
            }}
          >
            Continue shopping <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
function Wishlist({
  open,
  onClose,
  items,
  onOpen,
  onAdd,
  onAddAll,
  onClear,
  onWish,
}) {
  const wishlistTotal = items.reduce(
    (sum, product) => sum + Number(product.price || 0),
    0,
  );
  const wishlistSavings = items.reduce(
    (sum, product) =>
      sum + Math.max(0, mrp(product) - Number(product.price || 0)),
    0,
  );

  return (
    <>
      <div
        className={"drawer-overlay " + (open ? "show" : "")}
        onClick={onClose}
      />
      <aside className={"wishlist-panel " + (open ? "open" : "")}>
        <div className="wishlist-head">
          <div className="wishlist-heading">
            <Heart size={21} fill="currentColor" aria-hidden="true" />
            <div>
              <b>Your wishlist</b>
              <small>
                {items.length} saved {items.length === 1 ? "item" : "items"}
              </small>
            </div>
          </div>
          <div className="wishlist-head-actions">
            {items.length > 0 && (
              <button className="wishlist-clear" onClick={onClear}>
                <Trash2 size={14} /> Clear all
              </button>
            )}
            <button onClick={onClose} aria-label="Close wishlist">
              <X />
            </button>
          </div>
        </div>
        {!items.length ? (
          <div className="wishlist-empty">
            <Heart size={38} />
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart on any product to save it here.</p>
            <a href="#products" onClick={onClose}>
              Explore deals <ArrowRight size={14} />
            </a>
          </div>
        ) : (
          <>
            <div className="wishlist-toolbar">
              <span>Saved for later</span>
              <span>
                {items.length} {items.length === 1 ? "product" : "products"}
              </span>
            </div>
            <div className="wishlist-list">
              {items.map((p) => (
                <article className="wish-item" key={p.id}>
                  <button
                    className="wish-image"
                    onClick={() => onOpen(p)}
                    aria-label={`View ${p.name}`}
                  >
                    <img src={p.image} alt="" />
                  </button>
                  <div className="wish-content">
                    <small>{p.brand}</small>
                    <b>{p.name}</b>
                    <div className="wish-price-line">
                      <strong>{money(p.price)}</strong>
                      {mrp(p) > p.price && <del>{money(mrp(p))}</del>}
                      {discount(p) > 0 && <em>{discount(p)}% off</em>}
                    </div>
                    <div className="wish-rating">
                      <Star size={12} fill="currentColor" aria-hidden="true" />
                      <b>{Number(p.rating || 4.3).toFixed(1)}</b>
                      <span>({p.reviews || "0"} reviews)</span>
                    </div>
                    <div className="wish-actions">
                      <button
                        className="wish-add"
                        onClick={() => {
                          onAdd(p);
                          onClose();
                        }}
                      >
                        <ShoppingCart size={13} /> Add to cart
                      </button>
                      <button className="wish-view" onClick={() => onOpen(p)}>
                        <Eye size={13} /> View
                      </button>
                    </div>
                  </div>
                  <button
                    className="wish-remove"
                    onClick={() => onWish(p)}
                    aria-label={`Remove ${p.name} from wishlist`}
                    title="Remove from wishlist"
                  >
                    <X size={15} />
                  </button>
                </article>
              ))}
            </div>
            <footer className="wishlist-footer">
              <div className="wishlist-total">
                <small>Wishlist total</small>
                <b>{money(wishlistTotal)}</b>
                {wishlistSavings > 0 && (
                  <span>You save {money(wishlistSavings)}</span>
                )}
              </div>
              <button className="wishlist-add-all" onClick={onAddAll}>
                <ShoppingCart size={16} /> Add all to cart{" "}
                <ArrowRight size={16} />
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
function RecentlyViewed({ items, onOpen }) {
  if (!items.length) return null;
  return (
    <section className="recent section reveal">
      <div className="section-heading">
        <div>
          <span className="kicker">
            <History size={11} /> RECENTLY VIEWED
          </span>
          <h2>Pick up where you left off</h2>
        </div>
        <span className="result">Your browser remembers these locally</span>
      </div>
      <div className="recent-row">
        {items.map((p) => (
          <button className="recent-card" key={p.id} onClick={() => onOpen(p)}>
            <img src={p.image} alt="" />
            <span>
              <small>{p.brand}</small>
              <b>{p.name}</b>
              <strong>{money(p.price)}</strong>
            </span>
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}
function InfoModal({ type, onClose }) {
  if (!type) return null;
  const content = {
    returns: {
      title: "72-Hour Easy Return Policy",
      kicker: "RETURNS & REFUNDS",
      body: (
        <>
          <p>
            You can request a return within <b>72 hours of delivery</b> for
            eligible products, subject to the product and brand's return
            conditions.
          </p>
          <ul>
            <li>
              <b>Record an unboxing video:</b> Please record one clear,
              continuous video while opening the parcel. Keep the shipping
              label, outer packaging and parcel condition visible.
            </li>
            <li>
              Do not throw away the original packaging, tags, invoice, seals or
              accessories until you are satisfied with the product.
            </li>
            <li>
              If an item is damaged, incorrect, missing or tampered with,
              contact support promptly with order details, photos and the
              unboxing video.
            </li>
            <li>
              Do not accept a visibly damaged/tampered parcel without
              documenting its condition and contacting support/courier as
              appropriate.
            </li>
            <li>
              For hygiene-sensitive products, opened/used items may not be
              eligible for return unless they arrived damaged, defective or
              incorrect.
            </li>
            <li>
              Return pickup and refund timelines can vary by product, seller and
              courier checks.
            </li>
            <li>
              Return eligibility can vary by product. Product-specific
              restrictions shown at purchase will apply.
            </li>
          </ul>
        </>
      ),
    },
    delivery: {
      title: "Delivery Information",
      kicker: "PAN INDIA DELIVERY",
      body: (
        <>
          <p>
            We aim to deliver orders across India through our shipping partners.
          </p>
          <ul>
            <li>
              Delivery timelines depend on your pincode, seller dispatch time
              and courier availability.
            </li>
            <li>
              Provide a complete address, reachable phone number and correct
              6-digit pincode to avoid delays.
            </li>
            <li>
              You may be contacted on WhatsApp if additional delivery
              information is needed.
            </li>
            <li>
              Inspect the parcel before opening and record your unboxing video
              for return/support protection.
            </li>
          </ul>
        </>
      ),
    },
    support: {
      title: "Contact DealKart",
      kicker: "WE'RE HERE TO HELP",
      body: (
        <>
          <p>Need help with an order, product, delivery or return?</p>
          <div className="contact-box">
            <a href={`tel:+91${SUPPORT_PHONE}`}>
              <Phone size={15} />
              <strong>Call:</strong> {SUPPORT_PHONE}
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={15} />
              <strong>WhatsApp:</strong> {SUPPORT_PHONE}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail size={15} />
              <strong>Email:</strong> {SUPPORT_EMAIL}
            </a>
          </div>
          <p>
            For faster support, keep your order details and a short description
            of the issue ready.
          </p>
        </>
      ),
    },
  }[type];
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          <X />
        </button>
        <span className="brand">{content.kicker}</span>
        <h2>{content.title}</h2>
        <div className="info-body">{content.body}</div>
      </div>
    </div>
  );
}
function Cart({ open, onClose, items, onChange, onRemove, onCheckout }) {
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponConfig, setCouponConfig] = useState(null);
  const [offersOpen, setOffersOpen] = useState(false);
  useEffect(() => {
    fetch("/api/coupons")
      .then((r) => (r.ok ? r.json() : { coupons: [] }))
      .then((j) => setAvailableCoupons(j.coupons || []))
      .catch(() => setAvailableCoupons([]));
  }, []);
  const discountedSubtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
  const mrpTotal = items.reduce((s, x) => s + mrp(x.p) * x.qty, 0);
  const productDiscount = Math.max(0, mrpTotal - discountedSubtotal);
  const couponTierRules = couponConfig
    ? [
        {
          min: Number(couponConfig.tier1Min ?? 499),
          discount: Number(couponConfig.tier1Discount || 0),
        },
        {
          min: Number(couponConfig.tier2Min ?? 999),
          discount: Number(couponConfig.tier2Discount || 0),
        },
        {
          min: Number(couponConfig.tier3Min ?? 1999),
          discount: Number(couponConfig.tier3Discount || 0),
        },
      ].filter((t) => t.discount > 0)
    : [];
  const tieredCoupon = couponTierRules.length > 0;
  const eligibleTierDiscount = couponTierRules
    .filter((t) => discountedSubtotal >= t.min)
    .reduce((best, t) => Math.max(best, t.discount), 0);
  const couponDiscount =
    appliedCoupon && couponConfig
      ? Math.min(
          discountedSubtotal,
          tieredCoupon
            ? eligibleTierDiscount
            : discountedSubtotal >= Number(couponConfig.minSubtotal || 0)
              ? Number(couponConfig.flatDiscount ?? couponConfig.discount) || 0
              : 0,
        )
      : 0;
  const total = Math.max(0, discountedSubtotal - couponDiscount);
  const totalSaved = productDiscount + couponDiscount;
  const totalDiscountPercent =
    mrpTotal > 0 ? Math.round((totalSaved / mrpTotal) * 100) : 0;

  // Keep upsells relevant to what is already in the cart: use the most
  // represented category, then surface the best-discounted products in it.
  const categoryCounts = items.reduce((acc, x) => {
    acc[x.p.category] = (acc[x.p.category] || 0) + x.qty;
    return acc;
  }, {});
  const upsellCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  const dealProducts = products
    .filter(
      (p) =>
        p.category === upsellCategory && !items.some((x) => x.p.id === p.id),
    )
    .sort((a, b) => {
      const discountDiff = discount(b) - discount(a);
      return discountDiff || salePrice(a) - salePrice(b);
    })
    .slice(0, 4);

  const applyCoupon = async (candidate = coupon) => {
    const code = candidate.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon("");
      setCouponConfig(null);
      setCouponMessage("Enter a coupon code.");
      return;
    }
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: discountedSubtotal }),
      });
      const json = await res.json();
      if (!res.ok || !json.coupon)
        throw new Error(json.error || "Invalid coupon code.");
      setCouponConfig(json.coupon);
      setAppliedCoupon(code);
      setCoupon(code);
      setCouponMessage(
        `${code} applied · ₹${Math.min(discountedSubtotal, Number(json.coupon.discount))} OFF`,
      );
    } catch (e) {
      setAppliedCoupon("");
      setCouponConfig(null);
      setCouponMessage(e.message || "Invalid coupon code.");
    }
  };

  useEffect(() => {
    if (!open) return;
    setCoupon(appliedCoupon || "");
    setCouponMessage(
      appliedCoupon && couponConfig
        ? couponDiscount > 0
          ? `${appliedCoupon} applied · ₹${couponDiscount} OFF`
          : `Add items to reach the next eligible coupon tier.`
        : "",
    );
  }, [open]);

  useEffect(() => {
    if (appliedCoupon) {
      setCouponMessage(
        couponConfig && couponDiscount > 0
          ? `${appliedCoupon} applied · ₹${couponDiscount} OFF`
          : couponConfig
            ? `Add items to reach the next eligible coupon tier.`
            : "",
      );
    }
  }, [discountedSubtotal, appliedCoupon, couponConfig, couponDiscount]);

  return (
    <>
      <div
        className={"cart-overlay " + (open ? "show" : "")}
        onClick={onClose}
      />
      <aside className={"cart " + (open ? "open" : "")}>
        <div className="cart-headline">
          <div>
            <b>Your Cart</b>
            <small>{items.reduce((s, x) => s + x.qty, 0)} items</small>
          </div>
          <button onClick={onClose} aria-label="Close cart">
            <X />
          </button>
        </div>
        {!items.length ? (
          <div className="cart-empty">
            <ShoppingCart size={36} />
            <h3>Your cart is empty</h3>
            <p>Add a few deals and checkout on WhatsApp.</p>
            <a href="#products" onClick={onClose}>
              Browse deals <ArrowRight size={14} />
            </a>
          </div>
        ) : (
          <>
            <div className="cart-scroll">
              <div className="cart-items">
                {items.map((x) => {
                  const itemMrp = mrp(x.p);
                  const off =
                    itemMrp > x.p.price
                      ? Math.max(0, Math.round((1 - x.p.price / itemMrp) * 100))
                      : 0;
                  return (
                    <div className="cart-item cart-item-enter" key={x.p.id}>
                      <div className="cart-item-badge">{off}% off</div>
                      <img src={x.p.image} alt="" />
                      <div className="ci">
                        <b>{x.p.name}</b>
                        <small>
                          {x.p.brand} · {x.p.category}
                        </small>
                        <div className="ci-price">
                          <del>{money(mrp(x.p))}</del>
                          <strong>{money(x.p.price)}</strong>
                        </div>
                        <div className="qty">
                          <button
                            onClick={() => onChange(x.p, -1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus />
                          </button>
                          <span>{x.qty}</span>
                          <button
                            onClick={() => onChange(x.p, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus />
                          </button>
                        </div>
                        <button
                          className="cart-delete"
                          onClick={() => onRemove(x.p)}
                          aria-label={`Delete ${x.p.name} from cart`}
                          title="Delete item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <section className="cart-coupon">
                <div className="coupon-input-wrap">
                  <Sparkles size={15} />
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    placeholder="Enter Coupon Code"
                    aria-label="Coupon code"
                  />
                  <button onClick={() => applyCoupon()}>Apply</button>
                </div>
                {couponMessage && (
                  <small
                    className={
                      appliedCoupon ? "coupon-success" : "coupon-error"
                    }
                  >
                    {couponMessage}
                  </small>
                )}
                <div className="coupon-offer-list">
                  {availableCoupons.slice(0, 2).map((offer) => (
                    <button
                      key={offer.code}
                      onClick={() => {
                        setCoupon(offer.code);
                        applyCoupon(offer.code);
                      }}
                    >
                      {offer.code}{" "}
                      <b>
                        ₹{Number(offer.maxDiscount ?? offer.discount) || 0} OFF
                      </b>
                    </button>
                  ))}
                </div>
                <button
                  className="offers-link"
                  onClick={() => setOffersOpen(true)}
                >
                  <b>View All Offers</b>
                  <ArrowRight size={17} />
                </button>
              </section>

              {dealProducts.length > 0 && (
                <section className="cart-deals">
                  <div className="cart-deals-title">
                    <span>BEST DEALS</span>
                    <b>
                      {upsellCategory
                        ? `More ${upsellCategory} deals`
                        : "Complete your set"}
                    </b>
                  </div>
                  <div className="cart-deals-row">
                    {dealProducts.map((p) => (
                      <div className="cart-deal-card" key={p.id}>
                        <img src={p.image} alt="" />
                        <b title={p.name}>{p.name}</b>
                        <div>
                          {p.oldPrice && <del>{money(p.oldPrice)}</del>}
                          <strong>{money(p.price)}</strong>
                        </div>
                        <small>{discount(p)}% off</small>
                        <button onClick={() => onChange(p, 0)}>Add</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="cart-foot">
              <div className="cart-summary-heading">
                <div className="cart-summary-title">
                  <ShoppingCart size={22} aria-hidden="true" />
                  <b>Order Summary</b>
                </div>
                {totalSaved > 0 && (
                  <div className="cart-saving-pill">
                    <BadgePercent size={16} aria-hidden="true" />
                    <span>
                      You're Saving <b>{money(totalSaved)}</b>
                    </span>
                  </div>
                )}
              </div>
              <div className="cart-calculation">
                <div className="cart-summary-row">
                  <span className="cart-summary-label">
                    <Tag size={16} aria-hidden="true" /> MRP (Total)
                  </span>
                  <b>{money(mrpTotal)}</b>
                </div>
                <div className="cart-summary-row">
                  <span className="cart-summary-label">
                    <BadgePercent size={16} aria-hidden="true" /> Discounted
                    Price
                  </span>
                  <b>{money(discountedSubtotal)}</b>
                </div>
                {appliedCoupon && (
                  <div className="cart-summary-row">
                    <span className="cart-summary-label">
                      <Ticket size={16} aria-hidden="true" />
                      {`Coupon Deduction (${appliedCoupon})`}
                    </span>
                    <b>−{money(couponDiscount)}</b>
                  </div>
                )}
                <div className="cart-final-line">
                  <div className="cart-final-label">
                    <b>Estimated Total</b>
                    <small>Inclusive of all taxes</small>
                  </div>
                  <div className="cart-final-prices">
                    {mrpTotal > total && <del>{money(mrpTotal)}</del>}
                    <b>{money(total)}</b>
                    {totalDiscountPercent > 0 && (
                      <em>{totalDiscountPercent}% OFF</em>
                    )}
                  </div>
                </div>
              </div>
              {totalSaved > 0 && (
                <div className="cart-saved">
                  <PiggyBank size={34} aria-hidden="true" />
                  <div>
                    <b>
                      You are saving <strong>{money(totalSaved)}</strong>
                    </b>
                    <span>Great choice! Keep shopping and save more.</span>
                  </div>
                  <Sparkles
                    className="cart-savings-sparkle"
                    size={18}
                    aria-hidden="true"
                  />
                </div>
              )}
              <button
                onClick={() =>
                  onCheckout({
                    coupon: appliedCoupon,
                    discount: couponDiscount,
                  })
                }
              >
                <LockKeyhole size={18} aria-hidden="true" />
                <span>Checkout Now</span>
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </aside>
      {offersOpen && (
        <div
          className="offers-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOffersOpen(false);
          }}
        >
          <section
            className="offers-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offers-modal-title"
          >
            <header>
              <div>
                <span className="offers-kicker">
                  <Sparkles size={13} /> DEALKART COUPONS
                </span>
                <h2 id="offers-modal-title">Available offers</h2>
                <p>Choose a coupon to apply it to your current cart.</p>
              </div>
              <button
                onClick={() => setOffersOpen(false)}
                aria-label="Close offers"
              >
                <X size={20} />
              </button>
            </header>
            <div className="offers-modal-list">
              {availableCoupons.map((c) => {
                const tiers = [
                  {
                    min: Number(c.tier1Min ?? 499),
                    discount: Number(c.tier1Discount || 0),
                  },
                  {
                    min: Number(c.tier2Min ?? 999),
                    discount: Number(c.tier2Discount || 0),
                  },
                  {
                    min: Number(c.tier3Min ?? 1999),
                    discount: Number(c.tier3Discount || 0),
                  },
                ]
                  .filter((t) => t.discount > 0)
                  .sort((a, b) => a.min - b.min);
                const maxOff = Math.max(
                  Number(c.discount) || 0,
                  ...tiers.map((t) => t.discount),
                );
                return (
                  <article className="offers-modal-card" key={c.code}>
                    <div className="offer-code-mark">
                      <TicketIconFallback />
                    </div>
                    <div className="offer-copy">
                      <div className="offer-code-line">
                        <b>{c.code}</b>
                        <strong>Up to ₹{maxOff} OFF</strong>
                      </div>
                      {tiers.length ? (
                        <ul>
                          {tiers.map((t) => (
                            <li key={`${t.min}-${t.discount}`}>
                              Shop for <b>₹{t.min} or more</b> and get{" "}
                              <b>₹{t.discount} off</b>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>
                          Shop for ₹{Number(c.minSubtotal || 0)} or more and get
                          ₹{Number(c.discount || 0)} off.
                        </p>
                      )}
                      <small>
                        Applies to discounted cart subtotal · One coupon per
                        order
                      </small>
                    </div>
                    <button
                      onClick={() => {
                        setCoupon(c.code);
                        applyCoupon(c.code);
                        setOffersOpen(false);
                      }}
                    >
                      Apply
                    </button>
                  </article>
                );
              })}
              {!availableCoupons.length && (
                <div className="offers-empty">
                  No public offers are available right now. You can still enter
                  a private coupon code manually.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function TicketIconFallback() {
  return <span className="offer-ticket-symbol">%</span>;
}
function Checkout({
  open,
  onClose,
  items,
  couponInfo = { code: "", discount: 0 },
}) {
  const [f, setF] = useState({ name: "", phone: "", address: "", pincode: "" });
  const [paymentMode, setPaymentMode] = useState("full");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  useEffect(() => {
    if (open) {
      setPaymentError("");
      setPaymentBusy(false);
      setPaymentMode("full");
      try {
        const saved = JSON.parse(
          localStorage.getItem("dealkart-checkout") || "null",
        );
        if (saved) setF(saved);
      } catch {}
    }
  }, [open]);
  useEffect(() => {
    try {
      localStorage.setItem("dealkart-checkout", JSON.stringify(f));
    } catch {}
  }, [f]);
  if (!open) return null;
  const subtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
  const orderTotal = Math.max(0, subtotal - (couponInfo.discount || 0));
  const canPayPartially =
    items.length > 0 &&
    items.every(({ p }) => {
      const amount = Number(p.partialPaymentAmount);
      return (
        p.paymentType === "partial" &&
        Number.isFinite(amount) &&
        amount > 0 &&
        amount < Number(p.price)
      );
    });
  const fullPaymentTotals = getPaymentBreakdown(items, orderTotal, "full");
  const partialPaymentTotals = canPayPartially
    ? getPaymentBreakdown(items, orderTotal, "partial")
    : null;
  const paymentTotals = getPaymentBreakdown(items, orderTotal, paymentMode);
  const ok =
    f.name.trim() &&
    /^\d{10}$/.test(f.phone.trim()) &&
    /^\d{6}$/.test(f.pincode.trim()) &&
    f.address.trim();
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="checkout" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>
          <X />
        </button>
        <div className="checkout-top">
          <ShieldCheck />
          <div>
            <small>DEALKART CHECKOUT</small>
            <h2>Complete your order</h2>
            <p>
              Enter your delivery details, then pay securely through the hosted UPI checkout.
            </p>
          </div>
        </div>
        <div className="form">
          {[
            ["name", "Full name", "Your name"],
            ["phone", "Phone number", "10-digit mobile number"],
            ["pincode", "Pincode", "6-digit pincode"],
          ].map(([k, l, ph]) => (
            <label key={k}>
              {l}
              <input
                inputMode={
                  k === "phone" || k === "pincode" ? "numeric" : "text"
                }
                maxLength={k === "phone" ? 10 : k === "pincode" ? 6 : 80}
                value={f[k]}
                onChange={(e) =>
                  setF({
                    ...f,
                    [k]: e.target.value.replace(
                      k === "name" ? /[^a-zA-Z\s.'-]/g : /\D/g,
                      "",
                    ),
                  })
                }
                placeholder={ph}
              />
            </label>
          ))}
          <label>
            Full delivery address
            <textarea
              rows="3"
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
              placeholder="House / flat, street, area, city, state"
            />
          </label>
        </div>
        <div className="checkout-summary">
          <span>
            Order total
            {couponInfo.code && (
              <small className="checkout-coupon">
                {couponInfo.code} · ₹{couponInfo.discount || 0} OFF
              </small>
            )}
          </span>
          <b>{money(orderTotal)}</b>
        </div>
        <fieldset className="payment-options">
          <legend>Choose payment option</legend>
          <label
            className={
              paymentMode === "full"
                ? "payment-option selected"
                : "payment-option"
            }
          >
            <input
              type="radio"
              name="payment-mode"
              value="full"
              checked={paymentMode === "full"}
              onChange={() => setPaymentMode("full")}
            />
            <span>
              <strong>Full payment now</strong>
              <small>Pay the complete order total now.</small>
            </span>
            <b>{money(fullPaymentTotals.payNow)}</b>
          </label>
          <label
            className={[
              "payment-option",
              paymentMode === "partial" ? "selected" : "",
              !canPayPartially ? "unavailable" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <input
              type="radio"
              name="payment-mode"
              value="partial"
              checked={paymentMode === "partial"}
              disabled={!canPayPartially}
              onChange={() => setPaymentMode("partial")}
            />
            <span>
              <strong>Partial payment, rest on delivery</strong>
              <small>
                {canPayPartially
                  ? `${money(partialPaymentTotals.payNow)} now · ${money(partialPaymentTotals.dueOnDelivery)} on delivery`
                  : "Available when every item has partial-payment terms set in admin."}
              </small>
            </span>
            {canPayPartially && <b>{money(partialPaymentTotals.payNow)}</b>}
          </label>
        </fieldset>
        <div className="checkout-payment-breakdown">
          <div>
            <span>Pay now</span>
            <b>{money(paymentTotals.payNow)}</b>
          </div>
          <div>
            <span>Due on delivery</span>
            <b>{money(paymentTotals.dueOnDelivery)}</b>
          </div>
        </div>
        <button
          type="button"
          className={"checkout-btn checkout-payment-button " + (!ok || paymentBusy ? "disabled" : "")}
          disabled={!ok || paymentBusy}
          onClick={async () => {
            if (!ok || paymentBusy) return;
            setPaymentBusy(true);
            setPaymentError("");
            try {
              const response = await fetch("/api/youpi-create-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customer: {
                    name: f.name.trim(),
                    phone: f.phone.trim(),
                    address: f.address.trim(),
                    pincode: f.pincode.trim(),
                  },
                  items: items.map(({ p, qty }) => ({ productId: p.id, quantity: qty })),
                  couponCode: couponInfo.code || "",
                  paymentMode,
                }),
              });
              const result = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(result.error || "Unable to start payment. Please try again.");
              if (!result.checkoutUrl) throw new Error("The payment gateway did not return a checkout URL.");
              window.location.assign(result.checkoutUrl);
            } catch (error) {
              setPaymentError(error?.message || "Unable to start payment. Please try again.");
              setPaymentBusy(false);
            }
          }}
        >
          <ShieldCheck size={18} /> {paymentBusy ? "Connecting to payment gateway…" : `Pay ${money(paymentTotals.payNow)} with UPI`}
        </button>
        {paymentError && <div className="checkout-payment-error" role="alert">{paymentError}</div>}
        <a
          className="checkout-whatsapp"
          href={ok ? waUrl(items, f, couponInfo, paymentMode) : undefined}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => { if (!ok) e.preventDefault(); }}
        >
          <MessageCircle size={16} /> Prefer to order through WhatsApp?
        </a>
        <div className="checkout-note">
          <ShieldCheck size={14} /> Your order remains pending until DealKart receives and verifies a payment notification.
        </div>
      </div>
    </div>
  );
}
function Footer({ setInfo, wishCount, onWishlist }) {
  return (
    <footer>
      <div className="footer-marquee" aria-hidden="true">
        <div>SHOP · SAVE · DISCOVER · SHOP · SAVE · DISCOVER · </div>
        <div>
          DEALKART · GENUINE · EASY RETURNS · DEALKART · GENUINE · EASY RETURNS
          ·{" "}
        </div>
      </div>
      <div className="footer-trust">
        <div>
          <ShieldCheck />
          <b>100% Genuine Products</b>
          <span>Authenticity-focused sourcing</span>
        </div>
        <div>
          <RotateCcw />
          <b>72-Hour Easy Returns</b>
          <span>Easy support on eligible items</span>
        </div>
        <div>
          <Truck />
          <b>Pan India Delivery</b>
          <span>Delivered to your doorstep</span>
        </div>
        <div>
          <MessageCircle />
          <b>Fast Customer Support</b>
          <span>Call or WhatsApp us</span>
        </div>
      </div>
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="footer-subtagline">Shop more. Save bigger.</p>
          <p>
            Curated deals from trusted brands with simple WhatsApp ordering.
          </p>
          <div className="footer-contact">
            <a href={`tel:+91${SUPPORT_PHONE}`}>
              <Phone size={13} /> {SUPPORT_PHONE}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail size={13} /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <div className="footer-col">
          <b>Shop</b>
          <a href="#products">All deals</a>
          <a href="#products">Best sellers</a>
          <a href="#todays-special">Today's Special</a>
          <a href="#products">Top picks</a>
        </div>
        <div className="footer-col">
          <b>Help & Policies</b>
          <button onClick={() => setInfo("delivery")}>
            Delivery information
          </button>
          <button onClick={() => setInfo("returns")}>
            72-hour return policy
          </button>
          <button onClick={() => setInfo("support")}>Contact support</button>
        </div>
        <div className="footer-col">
          <b>Order</b>
          <a href="#products">Prepaid ordering</a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp ordering <ExternalLink size={11} />
          </a>
          <button onClick={onWishlist}>
            My wishlist {wishCount > 0 && `(${wishCount})`}
          </button>
          <a href="#admin">Manage catalog</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 DealKart. All rights reserved.</span>
        <span>
          Prepaid orders · Pan India delivery · 72-hour easy returns on eligible
          products
        </span>
      </div>
    </footer>
  );
}
function SpecialDealsPage({ onOpen, onAdd, onWish, wished, onSeen, onBack }) {
  return (
    <main className="special-page">
      <section className="special-hero reveal">
        <div className="special-hero-copy">
          <span className="kicker">
            <Zap size={12} fill="currentColor" /> TODAY'S SPECIAL
          </span>
          <h1>
            10 deals. <span>One day.</span> Big savings.
          </h1>
          <p>
            Our hand-picked 10 offers with sharp prices, limited-time deal
            badges and DealKart's simple WhatsApp checkout.
          </p>
          <div className="special-pills">
            <span>
              <Sparkles size={13} /> Lowest-price picks
            </span>
            <span>
              <Clock3 size={13} /> Today's selection
            </span>
            <span>
              <ShieldCheck size={13} /> Verified shopping
            </span>
          </div>
        </div>
        <div className="special-hero-badge">
          <b>10</b>
          <span>
            BEST DEALS
            <br />
            OF THE DAY
          </span>
        </div>
      </section>
      <section className="section special-list-section">
        <div className="section-heading special-heading">
          <div>
            <span className="kicker">LOWEST PRICE EVER*</span>
            <h2>Today's 10 Best Deals</h2>
            <p>
              Only ten hand-picked offers make this list. Check back tomorrow
              for a fresh selection.
            </p>
          </div>
          <button className="special-back" onClick={onBack}>
            <ArrowRight size={15} /> Back to all deals
          </button>
        </div>
        <div className="special-grid">
          {specialDeals.map((p, index) => (
            <div className="special-item" key={p.id}>
              <span className="deal-rank">#{index + 1}</span>
              <ProductCard
                p={p}
                onOpen={onOpen}
                onAdd={onAdd}
                onWish={onWish}
                wished={wished(p)}
                onSeen={onSeen}
              />
            </div>
          ))}
        </div>
        <p className="special-disclaimer">
          *“Lowest price ever” is DealKart promotional wording for this featured
          selection and is not a historical price guarantee.
        </p>
      </section>
    </main>
  );
}
function App() {
  const [catalogVersion, refreshCatalog] = useState(0);
  // Render the bundled catalog immediately. The live catalog refreshes in the
  // background, so a slow network never blocks the storefront shell.
  const [catalogStatus, setCatalogStatus] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setCatalogStatus("loading");
    fetchRemoteCatalog([], { fallbackOnError: false })
      .then((remote) => {
        if (cancelled) return;
        if (!Array.isArray(remote) || remote.length === 0) {
          throw new Error("No products were returned from the catalog.");
        }
        products = remote;
        specialDeals = remote
          .filter((p) => p.isTop10)
          .sort(
            (a, b) =>
              (Number(a.top10Rank) || 999999) - (Number(b.top10Rank) || 999999),
          )
          .slice(0, 10);
        setCatalogError("");
        setCatalogStatus("ready");
        refreshCatalog((x) => x + 1);
      })
      .catch((error) => {
        if (cancelled) return;
        products = [];
        specialDeals = [];
        setCatalogError(
          error?.message || "Unable to load the latest products.",
        );
        setCatalogStatus("error");
        refreshCatalog((x) => x + 1);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(() => {
    if (window.location.hash === "#admin") return "admin";
    if (window.location.hash === "#todays-special") return "special";
    return "home";
  });
  const [category, setCategory] = useState("All Deals");
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState([]);
  const [wish, setWish] = useState([]);
  const [recent, setRecent] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [info, setInfo] = useState(null);
  const [slide, setSlide] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [toast, setToast] = useState("");
  const [couponInfo, setCouponInfo] = useState({ code: "", discount: 0 });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_return") !== "1") return;
    const orderId = params.get("order_id");
    if (!orderId) {
      setToast("Returned from checkout. Your payment is still being verified.");
      return;
    }
    let cancelled = false;
    fetch(`/api/youpi-payment-status?orderId=${encodeURIComponent(orderId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Status unavailable");
        if (cancelled) return;
        if (data.paymentStatus === "paid") setToast(`Payment verified for order ${orderId.slice(0, 8)}. Thank you!`);
        else if (["failed", "expired", "cancelled"].includes(data.paymentStatus)) setToast("Payment was not confirmed. You can retry checkout or contact DealKart support.");
        else setToast("Payment status is pending verification. Please don't pay again until you check your order status.");
      })
      .catch(() => { if (!cancelled) setToast("We are checking your payment. Please contact DealKart if the status does not update."); })
      .finally(() => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("payment_return");
        cleanUrl.searchParams.delete("order_id");
        window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#admin") setPage("admin");
      else if (window.location.hash === "#todays-special") setPage("special");
      else setPage("home");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("dealkart-theme") || "light";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("dealkart-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("dealkart-wishlist") || "[]",
      );
      setWish(
        saved.map((x) => products.find((p) => p.id === x.id)).filter(Boolean),
      );
      const rv = JSON.parse(localStorage.getItem("dealkart-recent") || "[]");
      setRecent(
        rv.map((x) => products.find((p) => p.id === x.id)).filter(Boolean),
      );
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "dealkart-wishlist",
      JSON.stringify(wish.map((p) => ({ id: p.id }))),
    );
  }, [wish]);
  useEffect(() => {
    localStorage.setItem(
      "dealkart-recent",
      JSON.stringify(recent.map((p) => ({ id: p.id }))),
    );
  }, [recent]);
  useEffect(() => {
    const reveal = () =>
      document.querySelectorAll(".reveal").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) el.classList.add("revealed");
      });
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    return () => window.removeEventListener("scroll", reveal);
  }, [q, category, catalogStatus, catalogVersion]);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 150);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(id);
  }, [toast]);
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          (category === "All Deals" || p.category === category) &&
          (!s ||
            [
              p.name,
              p.brand,
              p.category,
              p.description,
              ...(Array.isArray(p.specs) ? p.specs : []),
            ]
              .join(" ")
              .toLowerCase()
              .includes(s)),
      )
      .sort(compareStorefrontOrder);
  }, [q, category, catalogVersion]);
  const submitSearch = (value) => {
    const search = value.trim();
    setCategory("All Deals");
    setQ(search);
    requestAnimationFrame(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const add = (p) => {
    setCart((c) =>
      c.some((x) => x.p.id === p.id)
        ? c.map((x) => (x.p.id === p.id ? { ...x, qty: x.qty + 1 } : x))
        : [...c, { p, qty: 1 }],
    );
    setCartOpen(true);
    setToast(`${p.name} added to cart`);
  };
  const change = (p, d) =>
    setCart((c) => {
      const exists = c.some((x) => x.p.id === p.id);
      if (!exists) return [...c, { p, qty: 1 }];
      if (d === 0) return c;
      return c.map((x) =>
        x.p.id === p.id ? { ...x, qty: Math.max(1, x.qty + d) } : x,
      );
    });
  const remove = (p) => setCart((c) => c.filter((x) => x.p.id !== p.id));
  const toggleWish = (p) => {
    setWish((w) => {
      const exists = w.some((x) => x.id === p.id);
      setToast(
        exists
          ? `${p.name} removed from wishlist`
          : `${p.name} saved to wishlist`,
      );
      return exists ? w.filter((x) => x.id !== p.id) : [...w, p];
    });
  };
  const addWishlistToCart = () => {
    if (!wish.length) return;
    const savedItems = [...wish];
    setCart((current) => {
      const merged = [...current];
      for (const product of savedItems) {
        const existingIndex = merged.findIndex(
          (item) => item.p.id === product.id,
        );
        if (existingIndex >= 0) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            qty: merged[existingIndex].qty + 1,
          };
        } else {
          merged.push({ p: product, qty: 1 });
        }
      }
      return merged;
    });
    setWishlistOpen(false);
    setCartOpen(true);
    setToast(
      `${savedItems.length} saved ${savedItems.length === 1 ? "item" : "items"} added to cart`,
    );
  };
  const clearWishlist = () => {
    if (
      !wish.length ||
      !window.confirm("Remove all saved products from your wishlist?")
    )
      return;
    setWish([]);
    setToast("Wishlist cleared");
  };
  const seen = (p) =>
    setRecent((r) => [p, ...r.filter((x) => x.id !== p.id)].slice(0, 4));
  const scrollProducts = () =>
    document
      .getElementById("products")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (page === "admin") return <AdminPage />;
  if (catalogStatus !== "ready") {
    return (
      <div
        id="top"
        className={`site ${theme === "light" ? "light-theme" : ""}`}
      >
        <Header
          query={q}
          setQuery={setQ}
          onSearch={submitSearch}
          cartCount={cart.reduce((s, x) => s + x.qty, 0)}
          wishCount={wish.length}
          onCart={() => setCartOpen(true)}
          onWishlist={() => setWishlistOpen(true)}
          hidden={hidden}
          theme={theme}
          onToggleTheme={() =>
            setTheme((t) => (t === "dark" ? "light" : "dark"))
          }
        />
        <main className="catalog-status" aria-live="polite">
          {catalogStatus === "loading" ? (
            <>
              <div className="catalog-spinner" aria-hidden="true" />
              <h1>Loading latest deals…</h1>
              <p>Fetching the newest products from DealKart.</p>
              <div className="catalog-skeleton-grid" aria-hidden="true">
                {[1, 2, 3, 4].map((item) => (
                  <div className="catalog-skeleton-card" key={item} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="catalog-status-icon">!</div>
              <h1>We couldn’t load the products</h1>
              <p>{catalogError || "Please try again in a moment."}</p>
              <button type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </>
          )}
        </main>
      </div>
    );
  }
  return (
    <div id="top" className={`site ${theme === "light" ? "light-theme" : ""}`}>
      <Header
        query={q}
        setQuery={setQ}
        onSearch={submitSearch}
        cartCount={cart.reduce((s, x) => s + x.qty, 0)}
        wishCount={wish.length}
        onCart={() => setCartOpen(true)}
        onWishlist={() => setWishlistOpen(true)}
        hidden={hidden}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />
      {page === "special" ? (
        <SpecialDealsPage
          onOpen={setSelected}
          onAdd={add}
          onWish={toggleWish}
          wished={(p) => wish.some((x) => x.id === p.id)}
          onSeen={seen}
          onBack={() => {
            window.location.hash = "top";
          }}
        />
      ) : (
        <main>
          <Hero slide={slide} setSlide={setSlide} onExplore={scrollProducts} />
          <Trust />
          <section className="section homepage-special reveal" id="top-deals">
            <div className="section-heading">
              <div>
                <span className="kicker">
                  <Zap size={11} fill="currentColor" /> TODAY'S SPECIAL
                </span>
                <h2>
                  Today's top deals by <strong>DEALKART PICKS</strong>
                </h2>
                <p>10 handpicked offers specially selected for today.</p>
              </div>
              <a className="view-special" href="#todays-special">
                View all 10 <ArrowRight size={15} />
              </a>
            </div>
            <div className="special-grid homepage-special-grid">
              {specialDeals.map((p, index) => (
                <div className="special-item" key={p.id}>
                  <span className="deal-rank">#{index + 1}</span>
                  <ProductCard
                    p={p}
                    onOpen={setSelected}
                    onAdd={add}
                    onWish={toggleWish}
                    wished={wish.some((x) => x.id === p.id)}
                    onSeen={seen}
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="category-strip reveal">
            <div className="category-intro">
              <span className="kicker">
                <Sparkles size={11} /> CURATED FOR YOU
              </span>
              <b>Browse by category</b>
            </div>
            <div className="category-pills">
              {categories.map((c) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  onClick={() => {
                    setCategory(c);
                    scrollProducts();
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
          <section className="section products-section" id="products">
            <div className="section-heading">
              <div>
                <span className="kicker">BEST DEALS OF ALL TIME</span>
                <h2>Best deals Of All Time</h2>
                <p>
                  Hover a product for quick details · click for full product
                  view.
                </p>
              </div>
              <div className="result">
                <SlidersHorizontal size={15} />
                {filtered.length} products
              </div>
            </div>
            {filtered.length ? (
              <div className="grid">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onOpen={setSelected}
                    onAdd={add}
                    onWish={toggleWish}
                    wished={wish.some((x) => x.id === p.id)}
                    onSeen={seen}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <Search />
                <h3>No products found</h3>
                <p>Try another product, brand or category.</p>
                <button
                  onClick={() => {
                    setQ("");
                    setCategory("All Deals");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
          <RecentlyViewed
            items={recent}
            onOpen={(p) => {
              seen(p);
              setSelected(p);
            }}
          />
          <section className="wa-banner reveal">
            <div>
              <span className="kicker">SIMPLE ORDERING</span>
              <h2>See something you like?</h2>
              <p>
                Add products to your cart, enter your address, and finish the
                order in WhatsApp. No account required.
              </p>
              <div className="banner-points">
                <span>
                  <Check size={13} /> No account needed
                </span>
                <span>
                  <ShieldCheck size={13} /> Secure order flow
                </span>
                <span>
                  <Clock3 size={13} /> Quick support
                </span>
              </div>
            </div>
            <button onClick={() => setCheckout(true)}>
              <MessageCircle size={18} /> Order on WhatsApp
            </button>
          </section>
          <section className="about-strip reveal">
            <div>
              <span className="kicker">WHY DEALKART</span>
              <h2 className="about-headline">
                A cleaner way to discover good deals.
              </h2>
            </div>
            <div className="about-copy">
              <p>
                We keep the buying journey simple: discover a deal, save it, add
                it to your cart and send your order through WhatsApp.
              </p>
              <div className="mini-stats">
                <span>
                  <b>{products.length}+</b>
                  <small>Curated picks</small>
                </span>
                <span>
                  <b>4.5★</b>
                  <small>Average product rating</small>
                </span>
                <span>
                  <b>72 hr</b>
                  <small>Easy return window*</small>
                </span>
              </div>
            </div>
          </section>
        </main>
      )}
      <Footer
        setInfo={setInfo}
        wishCount={wish.length}
        onWishlist={() => setWishlistOpen(true)}
      />
      <a
        className="floating-support"
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi DealKart, I need help 👋")}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Contact DealKart on WhatsApp"
      >
        <MessageCircle size={20} />
        <span>Need help?</span>
      </a>
      <Modal
        p={selected}
        onClose={() => setSelected(null)}
        onAdd={add}
        onWish={toggleWish}
        wished={selected ? wish.some((x) => x.id === selected.id) : false}
        onSeen={seen}
      />
      <Wishlist
        open={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
        items={wish}
        onOpen={(p) => {
          seen(p);
          setWishlistOpen(false);
          setSelected(p);
        }}
        onAdd={add}
        onAddAll={addWishlistToCart}
        onClear={clearWishlist}
        onWish={toggleWish}
      />
      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onChange={change}
        onRemove={remove}
        onCheckout={(promo = { coupon: "", discount: 0 }) => {
          setCouponInfo({
            code: promo.coupon || "",
            discount: promo.discount || 0,
          });
          setCartOpen(false);
          setCheckout(true);
        }}
      />
      <Checkout
        open={checkout}
        onClose={() => setCheckout(false)}
        items={
          cart.length ? cart : products.slice(0, 1).map((p) => ({ p, qty: 1 }))
        }
        couponInfo={couponInfo}
      />
      <InfoModal type={info} onClose={() => setInfo(null)} />
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
class AppErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("DealKart storefront error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#111",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <div>
            <h1>DealKart is temporarily unavailable</h1>
            <p>
              Please refresh the page. If the problem continues, check the
              catalog data in Supabase.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 16px", cursor: "pointer" }}
            >
              Refresh website
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
