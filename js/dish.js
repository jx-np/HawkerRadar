// ../../js/dish.js
// Dish detail page
// URL: dish.html?stall=301&item=CR01

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

function itemKey(stallId, itemCode) {
  return `${stallId}_${itemCode}`;
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
  const wrapperPath = window.DISH_PAGE?.wrapperPath;
  if (!wrapperPath) throw new Error("window.DISH_PAGE.wrapperPath missing");
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

function getParams() {
  const url = new URL(window.location.href);
  return {
    stallId: (url.searchParams.get("stall") || "").trim(),
    itemCode: (url.searchParams.get("item") || "").trim(),
  };
}

// Best-effort: if the user arrived from the stall menu page, remember it.
// This makes the "Add" button reliably return to the right place even if your folder structure differs.
function rememberReturnToFromReferrer() {
  try {
    const ref = (document.referrer || "").trim();
    if (!ref) return;

    // only store same-origin referrers
    const u = new URL(ref);
    if (u.origin !== window.location.origin) return;

    // keep it broad: anything that looks like the stall menu page
    const p = (u.pathname || "").toLowerCase();
    if (p.includes("stall_dish") || p.includes("stall-dish") || p.endsWith("/stall_dish.html") || p.endsWith("/stall-dish.html")) {
      sessionStorage.setItem("dish:returnTo", u.href);
    }
  } catch {
    // ignore
  }
}

function goBackToMenu(stallId, itemCode) {
  // 1) preferred: explicit returnTo saved in session
  const saved = sessionStorage.getItem("dish:returnTo");
  if (saved) {
    try {
      const u = new URL(saved, window.location.href);
      if (u.origin === window.location.origin) {
        if (stallId) u.searchParams.set("stall", String(stallId));
        if (itemCode) u.searchParams.set("highlight", String(itemCode));
        window.location.replace(u.href);
        return;
      }
    } catch {
      // ignore
    }
  }

  // 2) fallback: relative stall menu page in same folder
  const fallback = new URL("./stall_dish.html", window.location.href);
  if (stallId) fallback.searchParams.set("stall", String(stallId));
  if (itemCode) fallback.searchParams.set("highlight", String(itemCode));
  window.location.replace(fallback.href);
}

/* ---------- favorites (guest local fallback matches stall page) ---------- */
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

(async function init() {
  const { stallId, itemCode } = getParams();

  // remember where the user came from (if they came from the stall menu page)
  rememberReturnToFromReferrer();

  // back button
  el.back?.addEventListener("click", () => {
    if (window.history.length > 1) return window.history.back();
    // fallback: go back to stall menu
    goBackToMenu(stallId, itemCode);
  });

  // cart link (so cart can return here)
  el.viewCart?.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.setItem("cart:returnTo", window.location.href);
    window.location.href = new URL("../user/cart.html", window.location.href).href;
  });

  if (!stallId || !itemCode) {
    if (el.name) el.name.textContent = "Missing dish";
    if (el.desc) el.desc.textContent = "Open this page like: dish.html?stall=301&item=CR01";
    return;
  }

  try {
    const wrapper = await loadWrapper();

    // Load dish
    const dish = await wrapper.getMenuItem(stallId, itemCode);
    if (!dish) {
      if (el.name) el.name.textContent = "Dish not found";
      return;
    }

    const dishName = dish.ItemDesc || `Item ${itemCode}`;
    const unitPrice = toNumberPrice(dish.ItemPrice);

    document.title = dishName;
    if (el.name) el.name.textContent = dishName;

    // placeholder description (you can change later)
    const cat = (dish.ItemCategory || "").trim();
    if (el.desc) {
      el.desc.textContent = cat
        ? `${cat}. This is placeholder description text — replace with real dish description later.`
        : "This is placeholder description text — replace with real dish description later.";
    }

    if (el.price) el.price.textContent = money(unitPrice);

    // banner image guess
    const guessImg = `../../images/dishes/${stallId}_${itemCode}.jpg`;
    const fallbackImg = "../../images/dishes/placeholder.jpg";
    setImgWithFallback(el.banner, guessImg, fallbackImg, dishName);

    // Favorites init
    const customerId = localStorage.getItem("CustomerID")?.trim();
    let isFav = false;
    let localFavSet = null;

    if (customerId) {
      const like = await wrapper.getLike(customerId, stallId, itemCode);
      isFav = !!like;
    } else {
      localFavSet = loadLocalFavSet(stallId);
      isFav = localFavSet.has(String(itemCode));
    }

    setPressed(el.favBtn, isFav);

    el.favBtn?.addEventListener("click", async () => {
      try {
        const currently = el.favBtn?.getAttribute("aria-pressed") === "true";

        if (customerId) {
          if (currently) {
            await wrapper.deleteData("likes", `${customerId}_${stallId}_${itemCode}`);
            setPressed(el.favBtn, false);
          } else {
            await wrapper.addLike(customerId, stallId, itemCode);
            setPressed(el.favBtn, true);
          }
        } else {
          if (!localFavSet) localFavSet = loadLocalFavSet(stallId);
          if (currently) localFavSet.delete(String(itemCode));
          else localFavSet.add(String(itemCode));
          saveLocalFavSet(stallId, localFavSet);
          setPressed(el.favBtn, !currently);
        }
      } catch (err) {
        console.error("fav toggle failed", err);
      }
    });
    // Cart: add quantity (persists on this page)
    let cart = loadCart();
    const k = itemKey(stallId, itemCode);
    const selKey = `dish:addQty:${k}`;

    function getInCartQty() {
      return cart.items?.[k]?.qty ?? 0;
    }

    // Load last selected qty for this dish (session-only) so it won't reset to 1 after adding
    let addQty = Math.max(1, Number(sessionStorage.getItem(selKey)) || 1);

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
      cart = loadCart();

      if (!cart.items[k]) {
        cart.items[k] = {
          stallId: String(stallId),
          itemCode: String(itemCode),
          name: String(dishName),
          unitPrice: unitPrice,
          qty: 0,
        };
      }

      cart.items[k].qty += addQty;
      saveCart(cart);

      // ✅ keep user's selected qty (don't reset to 1)
      persistQty();

      // ✅ after adding, go back to the stall menu page
      goBackToMenu(stallId, itemCode);
    });

    // If you come back from Cart, refresh the "In cart" label (keep selected qty too)
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
  }
})();
