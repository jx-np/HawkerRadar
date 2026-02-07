// ../../js/dish.js
// Dish detail page
// URL: dish.html?stall=<stallId>&item=<menuItemId>

const CART_VERSION = 1;

/* ---------- header offset (fixed navbar) ---------- */
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
function getCustomerId() {
  const id = localStorage.getItem("CustomerID");
  return id && id.trim() ? id.trim() : "guest";
}

function cartStorageKey() {
  return `hc:cart:v${CART_VERSION}:${getCustomerId()}`;
}

function loadCart() {
  try {
    const raw = localStorage.getItem(cartStorageKey());
    const cart = raw ? JSON.parse(raw) : null;
    if (!cart || typeof cart !== "object") return { version: CART_VERSION, updatedAt: Date.now(), items: {} };
    if (!cart.items || typeof cart.items !== "object") cart.items = {};
    cart.version = CART_VERSION;
    return cart;
  } catch {
    return { version: CART_VERSION, updatedAt: Date.now(), items: {} };
  }
}

function saveCart(cart) {
  cart.updatedAt = Date.now();
  localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
}

function itemKey(stallId, itemId) {
  return `${stallId}_${itemId}`;
}

function money(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function toNumberPrice(v) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function setPressed(btn, pressed) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  btn.classList.toggle("is-favorited", pressed);
}

function setImgWithFallback(imgEl, primary, fallback, alt = "") {
  if (!imgEl) return;
  imgEl.alt = alt || "";
  imgEl.src = primary || fallback || "";
  
  // Center the image similar to other pages
  imgEl.style.objectPosition = "center center";

  imgEl.addEventListener(
    "error",
    () => {
      if (fallback && imgEl.src !== fallback) imgEl.src = fallback;
    },
    { once: true }
  );
}

async function loadWrapper() {
  const wrapperPath = window.DISH_PAGE?.wrapperPath || "/js/firebase/wrapper.js";
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

function getParams() {
  const url = new URL(window.location.href);
  return {
    stallId: (url.searchParams.get("stall") || "").trim(),
    itemId: (url.searchParams.get("item") || "").trim(),
  };
}

function smartBackToMenu(resolvedStallId) {
  const saved = sessionStorage.getItem("dish:returnTo");
  if (saved) {
    try {
      const u = new URL(saved, window.location.href);
      if (u.origin === window.location.origin) {
        window.location.replace(u.href);
        return;
      }
    } catch {
      // ignore
    }
  }

  const fallback = new URL("./stall_dish.html", window.location.href);
  if (resolvedStallId) fallback.searchParams.set("stall", String(resolvedStallId));
  window.location.replace(fallback.href);
}

// best-effort: store stall_dish referrer as returnTo
function rememberReturnToFromReferrer() {
  try {
    const ref = (document.referrer || "").trim();
    if (!ref) return;
    const u = new URL(ref);
    if (u.origin !== window.location.origin) return;
    const p = (u.pathname || "").toLowerCase();
    if (p.includes("stall_dish") || p.includes("stall-dish")) {
      sessionStorage.setItem("dish:returnTo", u.href);
    }
  } catch {
    // ignore
  }
}

/* ---------- favorites (localStorage) ---------- */
function localFavKey(stallId) {
  return `hc:fav:${stallId}`;
}
function loadLocalFavSet(stallId) {
  try {
    const raw = localStorage.getItem(localFavKey(stallId));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}
function saveLocalFavSet(stallId, set) {
  localStorage.setItem(localFavKey(stallId), JSON.stringify([...set]));
}

/* ---------- DOM ---------- */
const el = {
  back: document.getElementById("pageBackBtn"),
  banner: document.getElementById("dish-banner"),
  favBtn: document.getElementById("dish-fav-btn"),
  name: document.getElementById("dish-name"),
  desc: document.getElementById("dish-desc"),
  price: document.getElementById("dish-price"),

  qtyMinus: document.getElementById("qtyMinus"),
  qtyPlus: document.getElementById("qtyPlus"),
  qtyNum: document.getElementById("qtyNum"),
  inCart: document.getElementById("inCart"),

  addBtn: document.getElementById("addBtn"),
  viewCart: document.getElementById("viewCart"),
};

/* ---------- data normalizers ---------- */
function dishNameOf(mi, itemId) {
  return (mi?.name ?? mi?.ItemDesc ?? mi?.itemDesc ?? `Item ${itemId}`).toString();
}
function dishDescOf(mi, fallback = "") {
  const d = (mi?.description ?? mi?.desc ?? mi?.ItemLongDesc ?? mi?.ItemDescLong ?? "").toString().trim();
  if (d) return d;
  const cat = (mi?.category ?? mi?.ItemCategory ?? mi?.cuisine ?? mi?.type ?? "").toString().trim();
  if (cat) return `${cat}. ${fallback}`.trim();
  return fallback;
}
function dishPriceOf(mi) {
  return mi?.price ?? mi?.ItemPrice ?? mi?.unitPrice ?? mi?.cost ?? 0;
}
function dishStallIdOf(mi) {
  return mi?.stallId ?? mi?.StallID ?? mi?.stallID ?? mi?.StallId ?? "";
}
// NEW: Helper to get image from DB object
function dishImageOf(mi) {
  return mi?.image || mi?.ImageURL || mi?.img || "";
}

async function fetchMenuItem(wrapper, stallId, itemId) {
  // 1. Try getMenuItem directly (fastest)
  if (wrapper?.getMenuItem) {
    const mi = await wrapper.getMenuItem(itemId);
    if (mi) return mi;
  }

  // 2. Fallback: list by stall
  if (stallId && wrapper?.listMenuItemsByStall) {
    const obj = await wrapper.listMenuItemsByStall(stallId);
    if (obj) {
        if (obj[itemId]) return obj[itemId];
        // scan values if key mismatch
        for (const mi of Object.values(obj)) {
            if (!mi) continue;
            const idGuess = String(mi?.id ?? mi?.ItemCode ?? "").trim();
            if (idGuess === String(itemId)) return mi;
        }
    }
  }

  return null;
}

/* ---------- main ---------- */
(async function init() {
  const { stallId: paramStallId, itemId } = getParams();
  let navStallId = paramStallId; 

  rememberReturnToFromReferrer();

  // View Cart Button Logic
  el.viewCart?.addEventListener("click", (e) => {
    e.preventDefault();
    const stallMenuUrl = sessionStorage.getItem("dish:returnTo") || 
      (() => {
        const u = new URL("./stall_dish.html", window.location.href);
        if (navStallId) u.searchParams.set("stall", String(navStallId));
        return u.href;
      })();

    sessionStorage.setItem("cart:returnTo", stallMenuUrl);
    window.location.href = new URL("/user/cart.html", window.location.href).href;
  });

  if (!itemId) {
    if (el.name) el.name.textContent = "Missing dish";
    if (el.addBtn) el.addBtn.disabled = true;
    return;
  }

  try {
    const wrapper = await loadWrapper();
    const mi = await fetchMenuItem(wrapper, paramStallId, itemId);

    if (!mi) {
      if (el.name) el.name.textContent = "Dish not found";
      if (el.desc) el.desc.textContent = `No menu item found for item=${itemId}`;
      if (el.addBtn) el.addBtn.disabled = true;
      return;
    }

    // resolve stallId
    const resolvedStallId = (paramStallId || dishStallIdOf(mi) || "").toString().trim();
    navStallId = resolvedStallId;

    // Back button
    el.back?.addEventListener("click", () => {
      smartBackToMenu(resolvedStallId);
    });

    const dishName = dishNameOf(mi, itemId);
    const unitPrice = toNumberPrice(dishPriceOf(mi));

    document.title = dishName;
    if (el.name) el.name.textContent = dishName;
    if (el.price) el.price.textContent = money(unitPrice);

    if (el.desc) {
      el.desc.textContent = dishDescOf(mi, "No description available.");
    }

    // --- BANNER IMAGE LOGIC ---
    // 1. Try DB Image first
    let finalImg = dishImageOf(mi);
    
    // 2. If no DB image, fallback to file path convention
    if (!finalImg) {
        finalImg = resolvedStallId
          ? `/images/dishes/${resolvedStallId}_${itemId}.jpg`
          : `/images/dishes/${itemId}.jpg`;
    }

    setImgWithFallback(el.banner, finalImg, "/images/dishes/placeholder.jpg", dishName);
    // --------------------------

    // Favorites
    const favSet = loadLocalFavSet(resolvedStallId || "unknown");
    // Check if the current button state matches localStorage
    const isFav = favSet.has(String(itemId));
    setPressed(el.favBtn, isFav);
    // Ensure icon style matches (filled vs outline) if you use Material Symbols 'FILL'
    const favIcon = el.favBtn?.querySelector(".material-symbols-outlined");
    if(favIcon) favIcon.style.fontVariationSettings = isFav ? "'FILL' 1" : "'FILL' 0";

    el.favBtn?.addEventListener("click", () => {
      const currently = favSet.has(String(itemId));
      if (currently) favSet.delete(String(itemId));
      else favSet.add(String(itemId));
      
      saveLocalFavSet(resolvedStallId || "unknown", favSet);
      setPressed(el.favBtn, !currently);
      
      if(favIcon) favIcon.style.fontVariationSettings = !currently ? "'FILL' 1" : "'FILL' 0";
    });

    // Qty Logic
    const k = itemKey(resolvedStallId || "unknown", itemId);
    // session key for this specific dish's add-qty
    const selKey = `dish:addQty:${k}`;

    let cart = loadCart();
    let addQty = Math.max(1, Number(sessionStorage.getItem(selKey)) || 1);

    function getInCartQty() {
      const key = itemKey(resolvedStallId || "unknown", itemId);
      return cart.items?.[key]?.qty ?? 0;
    }

    function persistQty() {
      sessionStorage.setItem(selKey, String(addQty));
    }

    function renderQtyUI() {
      if (el.qtyNum) el.qtyNum.textContent = String(addQty);
      if (el.inCart) el.inCart.textContent = `In cart: ${getInCartQty()}`;
      if (el.addBtn) {
        el.addBtn.disabled = !(unitPrice > 0);
        el.addBtn.textContent = `Add for ${money(unitPrice * addQty)}`;
      }
    }

    el.qtyMinus?.addEventListener("click", () => {
      addQty = Math.max(1, addQty - 1);
      persistQty();
      renderQtyUI();
    });

    el.qtyPlus?.addEventListener("click", () => {
      addQty += 1;
      persistQty();
      renderQtyUI();
    });

    el.addBtn?.addEventListener("click", () => {
      el.addBtn.disabled = true; // debounce

      cart = loadCart();
      const key = itemKey(resolvedStallId || "unknown", itemId);

      if (!cart.items[key]) {
        cart.items[key] = {
          stallId: String(resolvedStallId || "unknown"),
          itemCode: String(itemId),
          name: String(dishName),
          unitPrice: unitPrice,
          qty: 0,
        };
      }

      cart.items[key].qty += addQty;
      saveCart(cart);
      
      // We don't reset addQty here, user might want to add more? 
      // Usually UX implies we go back or show success.
      // Current behavior: Go back to menu
      smartBackToMenu(resolvedStallId);
    });

    window.addEventListener("pageshow", () => {
      cart = loadCart();
      renderQtyUI();
    });

    persistQty();
    renderQtyUI();

  } catch (err) {
    console.error(err);
    if (el.name) el.name.textContent = "Error loading dish";
    if (el.desc) el.desc.textContent = err?.message || String(err);
    if (el.addBtn) el.addBtn.disabled = true;
  }
})();