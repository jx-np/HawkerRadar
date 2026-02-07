// /js/vendor_M.js
// Vendor management: edit dish price, delete dish, add dish
// Open like: vendor_M.html?stall=301

function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

/* ---------- helpers ---------- */
function money(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function toNumberPrice(v) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function setStatus(msg) {
  const el = document.getElementById("statusText");
  if (el) el.textContent = msg || "";
}

function getStallId() {
  const url = new URL(window.location.href);
  const fromUrl = (url.searchParams.get("stall") || "").trim();
  if (fromUrl) return fromUrl;

  // fallbacks (optional)
  const fromSession = (sessionStorage.getItem("vendor:stallId") || "").trim();
  if (fromSession) return fromSession;

  const lastStall = (sessionStorage.getItem("lastStallId") || "").trim();
  if (lastStall) return lastStall;

  return "";
}

async function loadWrapper() {
  const wrapperPath = window.VENDOR_PAGE?.wrapperPath || "/js/firebase/wrapper.js";
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

function setImgWithFallback(imgEl, primary, fallback, alt = "") {
  if (!imgEl) return;
  imgEl.alt = alt || "";
  imgEl.src = primary || fallback || "";
  imgEl.addEventListener(
    "error",
    () => {
      if (fallback && imgEl.src !== fallback) imgEl.src = fallback;
    },
    { once: true }
  );
}

/* ---------- normalizers ---------- */
function stallNameOf(s) {
  return (s?.name ?? s?.StallName ?? s?.stallName ?? "Stall").toString();
}
function stallUnitOf(s) {
  return (s?.unit ?? s?.unitNo ?? s?.UnitNo ?? s?.StallUnit ?? s?.stallUnit ?? "—").toString();
}
function stallHcIdOf(s) {
  return (s?.hawkerCentreId ?? s?.HawkerCentreID ?? s?.hawkerCentreID ?? s?.hcId ?? "").toString();
}

function dishIdGuess(mi, key) {
  return String(mi?.id ?? mi?.ItemCode ?? mi?.itemCode ?? key ?? "").trim();
}
function dishNameOf(mi, id) {
  return (mi?.name ?? mi?.ItemDesc ?? mi?.itemDesc ?? `Item ${id}`).toString();
}
function dishDescOf(mi) {
  return (mi?.description ?? mi?.desc ?? mi?.ItemLongDesc ?? mi?.ItemDescLong ?? "").toString().trim();
}
function dishCuisineOf(mi) {
  return (mi?.cuisine ?? mi?.Cuisine ?? mi?.ItemCuisine ?? "").toString().trim();
}
function dishCategoryOf(mi) {
  return (mi?.category ?? mi?.Category ?? mi?.ItemCategory ?? "").toString().trim();
}
function dishPriceOf(mi) {
  return mi?.price ?? mi?.ItemPrice ?? mi?.unitPrice ?? mi?.cost ?? 0;
}
function dishImageUrlOf(mi) {
  return (mi?.imageUrl ?? mi?.imgUrl ?? mi?.image ?? "").toString().trim();
}

/* ---------- DOM ---------- */
const el = {
  stallBanner: document.getElementById("stall-banner"),
  stallName: document.getElementById("stall-name"),
  stallHc: document.getElementById("stall-hc"),
  stallUnit: document.getElementById("stall-unit"),

  list: document.getElementById("dish-list"),
  tpl: document.getElementById("tpl-vendor-dish"),

  addBtn: document.getElementById("addDishBtn"),

  dlgPrice: document.getElementById("dlgPrice"),
  priceForm: document.getElementById("priceForm"),
  priceDishName: document.getElementById("priceDishName"),
  priceInput: document.getElementById("priceInput"),
  priceCancelBtn: document.getElementById("priceCancelBtn"),

  dlgAdd: document.getElementById("dlgAdd"),
  addForm: document.getElementById("addForm"),
  addName: document.getElementById("addName"),
  addDesc: document.getElementById("addDesc"),
  addCuisine: document.getElementById("addCuisine"),
  addCategory: document.getElementById("addCategory"),
  addPrice: document.getElementById("addPrice"),
  addImageUrl: document.getElementById("addImageUrl"),
  addCancelBtn: document.getElementById("addCancelBtn"),
};

/* ---------- state ---------- */
let wrapper = null;
let stallId = "";
let menuItems = []; // { id, mi }

/* dialogs state */
let editingItemId = "";
let editingItemName = "";

/* ---------- render ---------- */
function clearList() {
  if (!el.list) return;
  while (el.list.firstChild) el.list.removeChild(el.list.firstChild);
}

function renderList() {
  clearList();

  if (!el.list || !el.tpl) return;

  if (!menuItems.length) {
    const li = document.createElement("li");
    li.style.padding = "14px 0";
    li.style.color = "rgba(0,0,0,0.65)";
    li.textContent = "No dishes yet. Click + to add one.";
    el.list.appendChild(li);
    return;
  }

  for (const row of menuItems) {
    const { id, mi } = row;
    const frag = el.tpl.content.cloneNode(true);

    const root = frag.querySelector(".vendor-dish");
    root.dataset.itemId = id;

    const img = frag.querySelector(".vendor-dish__img");
    const nameEl = frag.querySelector(".vendor-dish__name");
    const descEl = frag.querySelector(".vendor-dish__desc");
    const cuisineEl = frag.querySelector(".vendor-dish__cuisine");
    const categoryEl = frag.querySelector(".vendor-dish__category");
    const priceEl = frag.querySelector(".vendor-dish__price");

    const dishName = dishNameOf(mi, id);
    const dishDesc = dishDescOf(mi) || "Description";
    const cuisine = dishCuisineOf(mi) || "—";
    const category = dishCategoryOf(mi) || "—";
    const price = toNumberPrice(dishPriceOf(mi));

    if (nameEl) nameEl.textContent = dishName;
    if (descEl) descEl.textContent = dishDesc;
    if (cuisineEl) cuisineEl.textContent = cuisine;
    if (categoryEl) categoryEl.textContent = category;
    if (priceEl) priceEl.textContent = money(price);

    const urlFromDb = dishImageUrlOf(mi);
    const guessImg = `../../images/dishes/${stallId}_${id}.jpg`;
    setImgWithFallback(img, urlFromDb || guessImg, "../../images/dishes/placeholder.jpg", dishName);

    el.list.appendChild(frag);
  }
}

/* ---------- load data ---------- */
async function loadAll() {
  stallId = getStallId();
  if (!stallId) {
    setStatus("Missing stall id. Open like vendor_M.html?stall=301");
    if (el.stallName) el.stallName.textContent = "Missing Stall";
    return;
  }

  // store for other pages (optional)
  sessionStorage.setItem("lastStallId", String(stallId));
  sessionStorage.setItem("vendor:stallId", String(stallId));

  setStatus("Loading…");

  wrapper = await loadWrapper();

  const stall = wrapper?.getStall ? await wrapper.getStall(stallId) : null;

  if (el.stallName) el.stallName.textContent = stall ? stallNameOf(stall) : `Stall ${stallId}`;
  if (el.stallUnit) el.stallUnit.textContent = `Store Number: ${stall ? stallUnitOf(stall) : "—"}`;

  const hcId = stall ? stallHcIdOf(stall) : "";
  if (el.stallHc) el.stallHc.textContent = hcId ? `Hawker Centre: ${hcId}` : "Hawker Centre";

  // banner (best-effort)
  const stallBannerGuess = `../../images/stalls/${stallId}.jpg`;
  setImgWithFallback(el.stallBanner, stall?.coverImage || stall?.bannerImage || stallBannerGuess, "../../images/stalls/stall-banner-placeholder.jpg", stallNameOf(stall));

  const obj = wrapper?.listMenuItemsByStall ? await wrapper.listMenuItemsByStall(stallId) : null;

  const rows = [];
  if (obj && typeof obj === "object") {
    for (const [key, mi] of Object.entries(obj)) {
      if (!mi) continue;
      const id = dishIdGuess(mi, key);
      if (!id) continue;
      rows.push({ id, mi });
    }
  }

  rows.sort((a, b) => dishNameOf(a.mi, a.id).localeCompare(dishNameOf(b.mi, b.id)));

  menuItems = rows;
  renderList();
  setStatus("");
}

/* ---------- actions ---------- */
async function onEditPrice(itemId) {
  const row = menuItems.find((x) => String(x.id) === String(itemId));
  if (!row) return;

  editingItemId = row.id;
  editingItemName = dishNameOf(row.mi, row.id);

  if (el.priceDishName) el.priceDishName.textContent = editingItemName;
  if (el.priceInput) el.priceInput.value = String(toNumberPrice(dishPriceOf(row.mi)));

  el.dlgPrice?.showModal?.();
}

async function savePriceFromDialog() {
  const v = toNumberPrice(el.priceInput?.value);
  if (!editingItemId) return;

  setStatus("Saving price…");

  // update both `price` and `ItemPrice` so all your pages read it correctly
  await wrapper.updateMenuItem(editingItemId, {
    price: v,
    ItemPrice: v,
    updatedAt: new Date().toISOString(),
  });

  // update local state
  const row = menuItems.find((x) => String(x.id) === String(editingItemId));
  if (row) {
    row.mi = { ...row.mi, price: v, ItemPrice: v };
  }

  renderList();
  setStatus("Saved ✅");

  setTimeout(() => setStatus(""), 900);
}

async function onDeleteDish(itemId) {
  const row = menuItems.find((x) => String(x.id) === String(itemId));
  if (!row) return;

  const name = dishNameOf(row.mi, row.id);
  const ok = window.confirm(`Delete "${name}"?\nThis cannot be undone.`);
  if (!ok) return;

  setStatus("Deleting…");
  await wrapper.deleteMenuItem(row.id);

  menuItems = menuItems.filter((x) => String(x.id) !== String(row.id));
  renderList();
  setStatus("Deleted ✅");
  setTimeout(() => setStatus(""), 900);
}

function newMenuItemId() {
  // simple unique id (works fine with your wrapper.createMenuItem which needs an id)
  const r = Math.floor(Math.random() * 1000);
  return `MI_${Date.now()}_${r}`;
}

async function onAddDishOpen() {
  // reset form
  if (el.addName) el.addName.value = "";
  if (el.addDesc) el.addDesc.value = "";
  if (el.addCuisine) el.addCuisine.value = "";
  if (el.addCategory) el.addCategory.value = "";
  if (el.addPrice) el.addPrice.value = "";
  if (el.addImageUrl) el.addImageUrl.value = "";

  el.dlgAdd?.showModal?.();
}

async function onAddDishSubmit() {
  const name = (el.addName?.value || "").trim();
  const desc = (el.addDesc?.value || "").trim();
  const cuisine = (el.addCuisine?.value || "").trim();
  const category = (el.addCategory?.value || "").trim();
  const price = toNumberPrice(el.addPrice?.value);
  const imageUrl = (el.addImageUrl?.value || "").trim();

  if (!name) throw new Error("Dish name is required");
  if (!(price >= 0)) throw new Error("Price is invalid");

  const id = newMenuItemId();

  setStatus("Creating dish…");

  const payload = {
    id,
    stallId: String(stallId),

    // normalized fields
    name,
    description: desc,
    cuisine,
    category,
    price,

    // compatibility fields (helps other pages that read ItemPrice/ItemDesc)
    ItemDesc: name,
    ItemLongDesc: desc,
    ItemPrice: price,
    ItemCategory: category,

    ...(imageUrl ? { imageUrl } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await wrapper.createMenuItem(payload);

  // reload list (safe & consistent)
  await loadAll();

  setStatus("Created ✅");
  setTimeout(() => setStatus(""), 900);
}

/* ---------- events ---------- */
function bindEvents() {
  // list click delegation (edit/delete)
  el.list?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const li = btn.closest(".vendor-dish");
    const itemId = li?.dataset?.itemId;
    if (!itemId) return;

    const action = btn.dataset.action;
    if (action === "edit-price") onEditPrice(itemId);
    if (action === "delete") onDeleteDish(itemId);
  });

  // dialogs
  el.priceCancelBtn?.addEventListener("click", () => el.dlgPrice?.close?.());
  el.priceForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await savePriceFromDialog();
      el.dlgPrice?.close?.();
    } catch (err) {
      alert(err?.message || String(err));
      setStatus("");
    }
  });

  el.addCancelBtn?.addEventListener("click", () => el.dlgAdd?.close?.());
  el.addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await onAddDishSubmit();
      el.dlgAdd?.close?.();
    } catch (err) {
      alert(err?.message || String(err));
      setStatus("");
    }
  });

  el.addBtn?.addEventListener("click", onAddDishOpen);

  // wireframe-only icon (not implemented)
  document.getElementById("edit-stall-btn")?.addEventListener("click", () => {
    alert("Stall editing not implemented (only dishes are editable here).");
  });
}

/* ---------- init ---------- */
(async function init() {
  try {
    bindEvents();
    await loadAll();
  } catch (err) {
    console.error(err);
    setStatus(err?.message || String(err));
    if (el.stallName) el.stallName.textContent = "Error loading page";
  }
})();