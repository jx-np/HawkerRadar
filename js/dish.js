// ../../js/dish.js
// Dish detail page
// URL: dish.html?stall=<stallId>&item=<menuItemId>
// Works with updated /js/firebase/wrapper.js (getMenuItem(id), listMenuItemsByStall(stallId)).

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
        if (resolvedStallId) u.searchParams.set("stall", String(resolvedStallId));
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

/* ---------- favorites (localStorage; shared with stall_dish page) ---------- */
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

async function fetchMenuItem(wrapper, stallId, itemId) {
  // ✅ updated wrapper
  if (wrapper?.getMenuItem) {
    const mi = await wrapper.getMenuItem(itemId);
    if (mi) return mi;
  }

  // fallback: list by stall and find
  if (stallId && wrapper?.listMenuItemsByStall) {
    const obj = await wrapper.listMenuItemsByStall(stallId);
    if (!obj) return null;
    if (obj[itemId]) return obj[itemId];
    for (const mi of Object.values(obj)) {
      if (!mi) continue;
      const idGuess = String(mi?.id ?? mi?.ItemCode ?? mi?.itemCode ?? "").trim();
      if (idGuess && idGuess === String(itemId)) return mi;
    }
  }

  // fallback: list all and find
  if (wrapper?.listMenuItems) {
    const obj = await wrapper.listMenuItems();
    if (!obj) return null;
    if (obj[itemId]) return obj[itemId];
    for (const mi of Object.values(obj)) {
      if (!mi) continue;
      const idGuess = String(mi?.id ?? mi?.ItemCode ?? mi?.itemCode ?? "").trim();
      if (idGuess && idGuess === String(itemId)) return mi;
    }
  }

  return null;
}

/* ---------- main ---------- */
(async function init() {
  const { stallId: paramStallId, itemId } = getParams();
  let navStallId = paramStallId; // will be updated after dish loads

  rememberReturnToFromReferrer();

  // cart link (so cart can return here)
  el.viewCart?.addEventListener("click", (e) => {
    e.preventDefault();
      // Always return cart -> stall menu
  const stallMenuUrl =
    sessionStorage.getItem("dish:returnTo") ||
    (() => {
      const u = new URL("./stall_dish.html", window.location.href);
      if (navStallId) u.searchParams.set("stall", String(navStallId));
      return u.href;
    })();

  sessionStorage.setItem("cart:returnTo", stallMenuUrl);
  window.location.href = new URL("../user/cart.html", window.location.href).href;
  });

  if (!itemId) {
    if (el.name) el.name.textContent = "Missing dish";
    if (el.desc) el.desc.textContent = "Open this page like: dish.html?stall=301&item=CR01";
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

    // resolve stallId (prefer URL param, else from menu item)
    const resolvedStallId = (paramStallId || dishStallIdOf(mi) || "").toString().trim();
    navStallId = resolvedStallId;

    // back button -> return to stall menu (stall_dish.html)
    el.back?.addEventListener("click", () => {
      smartBackToMenu(resolvedStallId);
    });

    const dishName = dishNameOf(mi, itemId);
    const unitPrice = toNumberPrice(dishPriceOf(mi));

    document.title = dishName;
    if (el.name) el.name.textContent = dishName;
    if (el.price) el.price.textContent = money(unitPrice);

    if (el.desc) {
      el.desc.textContent = dishDescOf(
        mi,
        "This is placeholder description text — replace with real dish description later."
      );
    }

    // banner image guess
    const guessImg = resolvedStallId
      ? `../../images/dishes/${resolvedStallId}_${itemId}.jpg`
      : `../../images/dishes/${itemId}.jpg`;
    setImgWithFallback(el.banner, guessImg, "../../images/dishes/placeholder.jpg", dishName);

    // favorites (localStorage)
    const favSet = loadLocalFavSet(resolvedStallId || "unknown");
    setPressed(el.favBtn, favSet.has(String(itemId)));

    el.favBtn?.addEventListener("click", () => {
      const currently = el.favBtn?.getAttribute("aria-pressed") === "true";
      if (currently) favSet.delete(String(itemId));
      else favSet.add(String(itemId));
      saveLocalFavSet(resolvedStallId || "unknown", favSet);
      setPressed(el.favBtn, !currently);
    });

    // cart qty selector persistence
    const k = itemKey(resolvedStallId || "unknown", itemId);
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
      // prevent double clicks
      if (el.addBtn) el.addBtn.disabled = true;

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
      persistQty();

      // go back to stall menu page
      smartBackToMenu(resolvedStallId);
    });

    // refresh “In cart” on return from cart, keep selected qty
    window.addEventListener("pageshow", () => {
      cart = loadCart();
      const saved = Number(sessionStorage.getItem(selKey));
      if (Number.isFinite(saved) && saved >= 1) addQty = saved;
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