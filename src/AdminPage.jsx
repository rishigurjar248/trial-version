import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  ImagePlus,
  Link as LinkIcon,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getInitialCatalog, fetchRemoteCatalog, saveCatalog } from "./catalogStore";
import { supabaseBrowser } from "./supabaseClient";

const MAX_IMAGES = 5;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function checkAdminSession() {
  try {
    const res = await fetch("/api/admin-session", { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

const blank = () => ({
  id: Date.now(),
  page: Date.now(),
  name: "",
  brand: "",
  category: "All Deals",
  price: "",
  mrp: "",
  discount: "",
  rating: "4.3",
  reviews: "0",
  image: "",
  imageUrls: [],
  galleryImages: [],
  description: "",
  keyPoints: ["", "", "", ""],
  specs: ["", "", "", ""],
  isTop10: false,
  top10Rank: null,
  returnEligible: true,
});

const csvEscape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;

const getImages = (product) => {
  const source = product.imageUrls?.length
    ? product.imageUrls
    : [product.image, ...(product.galleryImages || [])];
  return [...new Set(source.filter(Boolean))].slice(0, MAX_IMAGES);
};

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      onLogin();
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-icon"><ShieldCheck size={28}/></div>
        <span className="kicker">DEALKART ADMIN</span>
        <h1>Admin access</h1>
        <p>Sign in to add, edit, remove and feature products.</p>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin email" autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required /></label>
        {error && <div className="admin-error">{error}</div>}
        <button className="admin-btn primary admin-login-submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        <button type="button" className="admin-back" onClick={() => { window.location.hash = "top"; }}>← Back to website</button>
      </form>
    </div>
  );
}

function ImageManager({ product, update }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const images = getImages(product);

  const setImageAt = (index, value) => {
    const next = [...images];
    next[index] = value.trim();
    update(product.id, "imageUrls", next.slice(0, MAX_IMAGES));
  };

  const removeImage = (index) => {
    const next = images.filter((_, i) => i !== index);
    update(product.id, "imageUrls", next);
  };

  const uploadImages = async (files) => {
    setUploadError("");
    if (!supabaseBrowser) {
      setUploadError("Browser Supabase keys are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel.");
      return;
    }
    const selected = Array.from(files || []).filter(f => f.type.startsWith("image/"));
    if (!selected.length) return;
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) {
      setUploadError("This product already has 5 images. Remove one before uploading another.");
      return;
    }
    const batch = selected.slice(0, slots);
    if (selected.length > slots) setUploadError(`Only ${slots} image${slots === 1 ? "" : "s"} fit in the remaining slots.`);

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of batch) {
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`${file.name} is larger than 5 MB. Compress it to WebP/JPEG before uploading.`);
        }
        const signRes = await fetch("/api/storage-upload-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });
        const signJson = await signRes.json().catch(() => ({}));
        if (!signRes.ok || !signJson.token || !signJson.path) {
          throw new Error(signJson.error || "Could not prepare image upload.");
        }
        const { error } = await supabaseBrowser.storage
          .from("product-images")
          .uploadToSignedUrl(signJson.path, signJson.token, file);
        if (error) throw new Error(error.message);
        uploaded.push(signJson.publicUrl);
      }
      update(product.id, "imageUrls", [...images, ...uploaded].slice(0, MAX_IMAGES));
    } catch (error) {
      setUploadError(error.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-images">
      <div className="admin-image-help">
        <span><b>{images.length}/{MAX_IMAGES}</b> images</span>
        <small>Paste an existing public image URL or upload to DealKart Storage.</small>
      </div>
      <div className="admin-image-slots">
        {Array.from({ length: MAX_IMAGES }).map((_, i) => (
          <div className="admin-image-slot" key={i}>
            <div className="admin-image-slot-head">
              <b>Image {i + 1}</b>
              {images[i] && <button type="button" onClick={() => removeImage(i)} aria-label={`Remove image ${i + 1}`}><X size={13}/></button>}
            </div>
            <div className="admin-url-input">
              <LinkIcon size={14}/>
              <input
                value={images[i] || ""}
                onChange={e => setImageAt(i, e.target.value)}
                placeholder="https://example.com/product.webp"
                type="url"
              />
            </div>
            {images[i] ? (
              <div className="admin-image-preview">
                <img src={images[i]} alt={`Product view ${i + 1}`} onError={e => { e.currentTarget.dataset.error = "true"; }} />
                <span>Preview</span>
              </div>
            ) : (
              <div className="admin-image-empty"><ImagePlus size={18}/><span>Paste URL above</span></div>
            )}
          </div>
        ))}
      </div>
      <label className={`admin-upload-images ${uploading ? "disabled" : ""}`}>
        <Upload size={16}/>{uploading ? "Uploading…" : "Upload images to Supabase Storage"}
        <input type="file" accept="image/*" multiple disabled={uploading || images.length >= MAX_IMAGES} onChange={e => { uploadImages(e.target.files); e.target.value = ""; }} />
      </label>
      {uploadError && <div className="admin-image-error">{uploadError}</div>}
      <small className="admin-image-tip">For the Free plan, keep images around 300–800 KB each when possible. WebP is recommended.</small>
    </div>
  );
}

function snapshotProduct(p = {}) {
  return {
    id: Number(p.id), page: Number(p.page ?? p.id), name: String(p.name ?? ""), brand: String(p.brand ?? ""),
    category: String(p.category ?? "All Deals"), price: Number(p.price ?? 0), mrp: Number(p.mrp ?? 0),
    oldPrice: Number(p.oldPrice ?? 0), discount: Number(p.discount ?? 0), rating: Number(p.rating ?? 4.3),
    reviews: String(p.reviews ?? "0"), reviewCount: Number(p.reviewCount ?? 0), image: String(p.image ?? ""),
    imageUrls: getImages(p), keyPoints: [...(p.keyPoints || p.specs || [])].slice(0, 4),
    description: String(p.description ?? ""), isTop10: Boolean(p.isTop10), top10Rank: p.isTop10 ? Number(p.top10Rank) || null : null,
    isActive: p.isActive !== false, returnEligible: p.returnEligible !== false,
  };
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [items, setItems] = useState(() => getInitialCatalog());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [newProduct, setNewProduct] = useState(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [addError, setAddError] = useState("");
  const originalRef = useRef(new Map());
  const deletedRef = useRef(new Set());

  useEffect(() => {
    if (authenticated) {
      fetchRemoteCatalog(getInitialCatalog()).then(remote => {
        setItems(remote);
        originalRef.current = new Map(remote.map(p => [Number(p.id), snapshotProduct(p)]));
        deletedRef.current = new Set();
      }).finally(() => setLoadingCatalog(false));
      setCheckingSession(false);
      return;
    }
    checkAdminSession().then(ok => {
      if (ok) setAuthenticated(true);
      setCheckingSession(false);
    });
  }, [authenticated]);

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? items.filter(p => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const update = (id, key, value) =>
    setItems(rows => rows.map(p => p.id === id ? { ...p, [key]: value } : p));

  const updatePoint = (id, index, value) =>
    setItems(rows => rows.map(p => p.id === id ? {
      ...p,
      keyPoints: [...(p.keyPoints || ["", "", "", ""])].slice(0, 4).map((x, i) => i === index ? value : x),
    } : p));

  const add = () => { const draft = blank(); draft.id = Math.max(0, ...items.map(p => Number(p.id) || 0)) + 1; draft.page = draft.id; setAddError(""); setNewProduct(draft); };
  const updateDraft = (_id, key, value) => setNewProduct(p => p ? { ...p, [key]: value } : p);
  const updateDraftPoint = (index, value) => setNewProduct(p => p ? { ...p, keyPoints: (p.keyPoints || ["", "", "", ""]).map((v, i) => i === index ? value : v) } : p);
  const saveNewProduct = async (e) => {
    e.preventDefault();
    if (!newProduct?.name.trim()) { setAddError("Enter a product name before saving."); return; }
    if (!Number(newProduct.price) || !Number(newProduct.mrp)) { setAddError("Enter a valid selling price and MRP."); return; }
    setAddingProduct(true); setAddError("");
    try {
      const points = [...(newProduct.keyPoints || [])].slice(0, 4);
      while (points.length < 4) points.push("");
      const images = getImages(newProduct);
      const product = { ...newProduct, id: Number(newProduct.id), page: Number(newProduct.id), price: Number(newProduct.price), mrp: Number(newProduct.mrp), oldPrice: Number(newProduct.mrp), discount: Math.max(0, Math.round((1 - Number(newProduct.price) / Number(newProduct.mrp)) * 100)), rating: Number(newProduct.rating) || 4.3, reviews: String(newProduct.reviews || "0"), reviewCount: Number(newProduct.reviewCount) || 0, keyPoints: points, specs: points, image: images[0] || "", imageUrls: images, galleryImages: images.slice(1), isTop10: false, top10Rank: null, isActive: true, returnEligible: newProduct.returnEligible !== false };
      await saveCatalog([{ ...product, __imagesChanged: true }], []);
      setItems(rows => [...rows, product]);
      originalRef.current.set(Number(product.id), snapshotProduct(product));
      setNewProduct(null);
      setQuery("");
    } catch (error) {
      setAddError(`Could not save product: ${error.message || "Please try again."}`);
    } finally { setAddingProduct(false); }
  };
  const remove = (id) => {
    setItems(rows => rows.filter(p => p.id !== id));
    if (originalRef.current.has(Number(id))) deletedRef.current.add(Number(id));
  };

  const toggleTop10 = (id) => {
    setItems(rows => {
      const current = rows.find(p => p.id === id);
      if (!current) return rows;
      if (!current.isTop10) {
        const selected = rows.filter(p => p.isTop10);
        if (selected.length >= 10) {
          alert("Today's Top 10 already has 10 products. Remove one before adding another.");
          return rows;
        }
        const used = new Set(selected.map(p => Number(p.top10Rank)).filter(Boolean));
        const rank = [1,2,3,4,5,6,7,8,9,10].find(n => !used.has(n)) || selected.length + 1;
        return rows.map(p => p.id === id ? { ...p, isTop10: true, top10Rank: rank } : p);
      }
      return rows.map(p => p.id === id ? { ...p, isTop10: false, top10Rank: null } : p);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = items.map((p, i) => {
        const points = [...(p.keyPoints || p.specs || [])].slice(0, 4);
        while (points.length < 4) points.push("");
        const images = getImages(p);
        return {
          ...p,
          id: Number(p.id) || i + 1,
          page: Number(p.page) || Number(p.id) || i + 1,
          price: Number(p.price) || 0,
          mrp: Number(p.mrp) || Number(p.oldPrice) || Number(p.price) || 0,
          oldPrice: Number(p.mrp) || Number(p.oldPrice) || Number(p.price) || 0,
          discount: Number(p.discount) || 0,
          rating: Number(p.rating) || 4.3,
          reviews: String(p.reviews || "0"),
          keyPoints: points,
          specs: points,
          image: images[0] || "",
          imageUrls: images,
          galleryImages: images.slice(1),
          isTop10: Boolean(p.isTop10),
          top10Rank: p.isTop10 ? Number(p.top10Rank) || null : null,
          returnEligible: p.returnEligible !== false,
        };
      });

      const changed = cleaned.filter(p => {
        const before = originalRef.current.get(Number(p.id));
        return !before || JSON.stringify(snapshotProduct(p)) !== JSON.stringify(before);
      }).map(p => {
        const before = originalRef.current.get(Number(p.id));
        const imagesChanged = !before || JSON.stringify(getImages(p)) !== JSON.stringify(before.imageUrls || []);
        return { ...p, __imagesChanged: imagesChanged };
      });
      const deletedIds = [...deletedRef.current].filter(id => !cleaned.some(p => Number(p.id) === Number(id)));

      if (!changed.length && !deletedIds.length) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
        return;
      }

      await saveCatalog(changed, deletedIds);
      setItems(cleaned);
      originalRef.current = new Map(cleaned.map(p => [Number(p.id), snapshotProduct(p)]));
      deletedRef.current = new Set();
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      alert(`Could not save globally: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const cols = ["id","name","brand","category","price","mrp","discount","rating","reviews","imageUrls","description","keyPoints","isTop10","top10Rank","returnEligible"];
    const csv = [cols, ...items.map(p => cols.map(c => Array.isArray(p[c]) ? p[c].join(" | ") : p[c]))]
      .map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dealkart-products.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  const logout = async () => {
    try { await fetch("/api/admin-logout", { method: "POST", credentials: "include" }); } catch {}
    setAuthenticated(false);
  };

  if (checkingSession) return <div className="admin-login"><div className="admin-login-card"><span className="kicker">DEALKART ADMIN</span><h1>Checking access…</h1></div></div>;
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span className="admin-brand-mark">D</span><span>DealKart <small>Admin</small></span></div>
        <nav aria-label="Admin navigation">
          <a href="#admin-overview" className="active"><span>⌂</span> Dashboard</a>
          <a href="#admin-products" className="active"><span>▦</span> Products</a>
          <a href="#admin-products" onClick={() => setQuery("")}><span>☆</span> Top Deals</a>
          <a href="#admin-products"><span>▤</span> Orders</a>
          <a href="#admin-products"><span>◇</span> Coupons</a>
          <a href="#admin-products"><span>♙</span> Customers</a>
          <a href="#admin-products"><span>▥</span> Analytics</a>
          <a href="#admin-products"><span>⚙</span> Settings</a>
          <a href="#top" onClick={logout}><span>⇥</span> Logout</a>
        </nav>
        <div className="admin-sidebar-foot">CATALOG CONTROL<br/><b>Global catalog</b><span>● Connected session</span></div>
      </aside>
      <main className="admin-page" id="admin-overview">
      <div className="admin-topline"><span>PRODUCT MANAGEMENT / CATALOG</span><div><span className="admin-status-dot"/> Admin workspace <button onClick={logout}>Log out</button></div></div>
      <div className="admin-head">
        <div>
          <button className="admin-back" onClick={() => { window.location.hash = "top"; }}><ArrowLeft size={16}/> Website</button>
          <span className="kicker">DEALKART CATALOG</span>
          <h1>Product Manager</h1>
          <p>All product text lives in PostgreSQL. Up to 5 image URLs are stored separately in the product image table, with optional uploads to Supabase Storage.</p>
        </div>
        <div className="admin-actions">
          <button className="admin-btn secondary" onClick={logout}><LogOut size={16}/> Log out</button>
          <button className="admin-btn secondary" onClick={exportCsv}><Download size={16}/> Export CSV</button>
          <button className="admin-btn primary" onClick={save} disabled={saving}>{saving ? "Saving…" : saved ? "Saved!" : "Save catalog"}</button>
        </div>
      </div>

      <div className="admin-toolbar" id="admin-products">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, brand or category…" />
        <span>{loadingCatalog ? "Loading…" : `${items.length} items · ${items.filter(p => p.isTop10).length}/10 top deals`}</span>
        <button className="admin-btn primary" onClick={add}><Plus size={16}/> Add product</button>
      </div>

      {newProduct && <div className="admin-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !addingProduct) setNewProduct(null); }}>
        <form className="admin-add-modal" onSubmit={saveNewProduct} role="dialog" aria-modal="true" aria-labelledby="add-product-title">
          <div className="admin-modal-head"><div><span className="kicker">DEALKART CATALOG</span><h2 id="add-product-title">Add new product</h2><p>Fill in the details and save. The product is added to the global catalog.</p></div><button type="button" className="admin-modal-close" aria-label="Close" onClick={() => setNewProduct(null)} disabled={addingProduct}><X size={19}/></button></div>
          <div className="admin-form-grid admin-modal-fields">
            <label>Product name *<input autoFocus value={newProduct.name} onChange={e => updateDraft(newProduct.id,"name",e.target.value)} required /></label>
            <label>Brand<input value={newProduct.brand} onChange={e => updateDraft(newProduct.id,"brand",e.target.value)} /></label>
            <label>Category<input value={newProduct.category} onChange={e => updateDraft(newProduct.id,"category",e.target.value)} /></label>
            <label>MRP (₹) *<input type="number" min="1" value={newProduct.mrp} onChange={e => updateDraft(newProduct.id,"mrp",e.target.value)} required /></label>
            <label>Selling price (₹) *<input type="number" min="1" value={newProduct.price} onChange={e => updateDraft(newProduct.id,"price",e.target.value)} required /></label>
            <label>Rating<input type="number" min="0" max="5" step="0.1" value={newProduct.rating} onChange={e => updateDraft(newProduct.id,"rating",e.target.value)} /></label>
            <label>Reviews count<input value={newProduct.reviews} onChange={e => updateDraft(newProduct.id,"reviews",e.target.value)} /></label>
            <label className="admin-top-toggle"><span>Return policy</span><button type="button" className={newProduct.returnEligible !== false ? "on" : ""} onClick={() => updateDraft(newProduct.id,"returnEligible",newProduct.returnEligible === false)}>{newProduct.returnEligible !== false ? "✓ 72-hour return" : "No Return"}</button></label>
            <label className="admin-wide">Description<textarea value={newProduct.description} onChange={e => updateDraft(newProduct.id,"description",e.target.value)} /></label>
            <div className="admin-wide"><div className="admin-field-title">4 key points</div><div className="admin-points admin-modal-points">{[0,1,2,3].map(i => <input key={i} placeholder={`Key point ${i+1}`} value={newProduct.keyPoints?.[i] || ""} onChange={e => updateDraftPoint(i,e.target.value)} />)}</div></div>
            <div className="admin-wide"><div className="admin-field-title">Product images (up to 5)</div><ImageManager product={newProduct} update={updateDraft}/></div>
          </div>
          {addError && <div className="admin-error admin-add-error">{addError}</div>}
          <div className="admin-modal-footer"><button type="button" className="admin-btn secondary" onClick={() => setNewProduct(null)} disabled={addingProduct}>Cancel</button><button type="submit" className="admin-btn primary" disabled={addingProduct}>{addingProduct ? "Saving product…" : <><Save size={16}/> Save product</>}</button></div>
        </form>
      </div>}

      <div className="admin-cards">
        {visible.map((p, rowIndex) => (
          <section className={`admin-product-card ${p.isTop10 ? "featured" : ""}`} key={p.id}>
            <div className="admin-product-title">
              <div><span className="admin-row-number">#{rowIndex + 1}</span><h2>{p.name || "New product"}</h2></div>
              <button className="delete-row" title="Remove product" onClick={() => remove(p.id)}><Trash2 size={17}/></button>
            </div>
            <div className="admin-form-grid">
              <label>Product name<input value={p.name || ""} onChange={e => update(p.id,"name",e.target.value)} /></label>
              <label>Brand<input value={p.brand || ""} onChange={e => update(p.id,"brand",e.target.value)} /></label>
              <label>Category<input value={p.category || ""} onChange={e => update(p.id,"category",e.target.value)} /></label>
              <label>MRP<input type="number" value={p.mrp ?? ""} onChange={e => update(p.id,"mrp",e.target.value)} /></label>
              <label>My price<input type="number" value={p.price ?? ""} onChange={e => update(p.id,"price",e.target.value)} /></label>
              <label>Rating<input type="number" min="0" max="5" step="0.1" value={p.rating ?? ""} onChange={e => update(p.id,"rating",e.target.value)} /></label>
              <label>Reviews<input value={p.reviews ?? ""} onChange={e => update(p.id,"reviews",e.target.value)} /></label>
              <label className="admin-top-toggle"><span>Today's Top 10</span><button type="button" className={p.isTop10 ? "on" : ""} onClick={() => toggleTop10(p.id)}>{p.isTop10 ? `✓ Top 10 #${p.top10Rank || ""}` : "Add to Top 10"}</button></label>
              <label className="admin-top-toggle"><span>Return policy</span><button type="button" className={p.returnEligible !== false ? "on" : ""} onClick={() => update(p.id, "returnEligible", p.returnEligible === false)}>{p.returnEligible !== false ? "✓ 72-hour return" : "* No Return"}</button></label>
              <label className="admin-wide">Description<textarea value={p.description || ""} onChange={e => update(p.id,"description",e.target.value)} /></label>
              <div className="admin-wide"><div className="admin-field-title">4 Key points</div><div className="admin-points">{[0,1,2,3].map(i => <input key={i} placeholder={`Key point ${i+1}`} value={(p.keyPoints || p.specs || [])[i] || ""} onChange={e => updatePoint(p.id,i,e.target.value)} />)}</div></div>
              <div className="admin-wide"><div className="admin-field-title">Product images — maximum 5</div><ImageManager product={p} update={update}/></div>
            </div>
          </section>
        ))}
      </div>
      {!visible.length && <div className="admin-empty">No products match your search.</div>}
      <div className="admin-note"><b>Storage tip:</b> use WebP images around 300–800 KB. Changes become global after <b>Save catalog</b>.</div>
      </main>
    </div>
  );
}
