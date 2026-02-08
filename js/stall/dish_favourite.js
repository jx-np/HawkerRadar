// ../../js/dish_favourite.js
// Stall Dish Page: loads stall + dishes + feedback + favorites + cart (persistent)
import { getCurrentUser } from "/js/modules/auth.js"; 

const cfg = {
  stallBodyAttr: "data-stall-id",
  stallQueryParam: "stall",
  customerStorageKey: "CustomerID",

  ids: {
    stallName: "stall-name",
    stallUnit: "stall-unit",
    stallDesc: "stall-desc",
    ratingValue: "stall-rating-value",
    ratingCount: "stall-rating-count",
    banner: "stall-banner",
    ratingContainer: "stall-rating",

    favoritesScroller: "hc-favorites-scroller",
    dishList: "dish-list",
  },

  templates: {
    dishRow: "tpl-dish-row",
    favoriteCard: "tpl-favorite-card",
  },

  actions: {
    toggleFavorite: "toggle-favorite",
    cartPlus: "cart-plus",
    cartMinus: "cart-minus",
  },

  dishPlaceholderImg: "",
  stallPlaceholderImg: "",

  cartVersion: 1,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------- Header offset (fixed navbar) ---------------- */
function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

/* ---------------- Back + Go to Cart ---------------- */
function smartBack() {
  const returnTo = sessionStorage.getItem("stallList:returnTo");
  if (returnTo) {
    window.location.replace(returnTo);
    return;
  }
  const hcId =
    sessionStorage.getItem("selectedHcId") ||
    sessionStorage.getItem("lastHcId");
  if (hcId) {
    const u = new URL("./stall.html", window.location.href);
    u.searchParams.set("hc", String(hcId));
    window.location.replace(u.href);
    return;
  }
  window.location.replace(
    new URL("/html/home/home.html", window.location.origin).href
  );
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

document.getElementById("view-cart")?.addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.setItem("cart:returnTo", window.location.href);
  window.location.href = new URL("/html/user/cart.html", window.location.href).href;
});

/* ---------------- Helpers ---------------- */
function getStallId() {
  const fromBody = document.body?.getAttribute(cfg.stallBodyAttr);
  if (fromBody?.trim()) return fromBody.trim();

  const url = new URL(window.location.href);
  const qp = url.searchParams.get(cfg.stallQueryParam);
  if (qp?.trim()) return qp.trim();

  return null;
}

function getCustomerId() {
  return getCurrentUser().id
}

function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function toNumberPrice(v) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
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

function clearNode(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function setPressed(btn, pressed) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  btn.classList.toggle("is-favorited", pressed);
}

/* ---------------- Wrapper loader ---------------- */
async function loadWrapper() {
  const wrapperPath =
    window.STALL_PAGE?.wrapperPath || "/js/firebase/wrapper.js";
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

/* ---------------- Data Normalizers (UPDATED FOR NEW WRAPPER) ---------------- */
function stallNameOf(s) {
  return s?.name || "Stall";
}
function stallUnitOf(s) {
  const u = s?.unitNo || ""; // Updated: uses 'unitNo'
  return u ? `Unit: ${u}` : "";
}
function stallDescOf(s) {
  return s?.description || ""; // Updated: uses 'description'
}
function menuItemCodeOf(mi, key) {
  return String(mi?.id || key || "").trim();
}
function menuItemNameOf(mi) {
  return mi?.name || "Item"; // Updated: uses 'name'
}
function menuItemCatOf(mi) {
  return (mi?.category || "").trim(); // Updated: uses 'category'
}
function menuItemPriceOf(mi) {
  return mi?.price || 0; // Updated: uses 'price'
}

/* ---------------- Rating Calculation ---------------- */
function computeRating(feedbackList) {
  if (!feedbackList || typeof feedbackList !== "object")
    return { avg: 0, count: 0 };

  let sum = 0;
  let count = 0;

  Object.values(feedbackList).forEach((fb) => {
    if (fb) {
      const r = Number(fb.rating);
      if (Number.isFinite(r)) {
        sum += r;
        count += 1;
      }
    }
  });

  return { avg: count ? sum / count : 0, count };
}

/* ---------------- CART (localStorage) ---------------- */
function cartStorageKey() {
  const customerId = getCustomerId() || "guest";
  return `hc:cart:v${cfg.cartVersion}:${customerId}`;
}

function loadCart() {
  try {
    const raw = localStorage.getItem(cartStorageKey());
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj || typeof obj !== "object") throw new Error("bad cart");
    if (!obj.items || typeof obj.items !== "object") obj.items = {};
    return obj;
  } catch {
    return { version: cfg.cartVersion, updatedAt: Date.now(), items: {} };
  }
}

function saveCart(cart) {
  cart.updatedAt = Date.now();
  localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
}

function cartItemKey(stallId, itemCode) {
  return `${stallId}_${itemCode}`;
}

function cartTotals(cart) {
  let count = 0;
  let total = 0;
  for (const it of Object.values(cart.items || {})) {
    if (!it) continue;
    count += Number(it.qty) || 0;
    total += (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
  }
  return { count, total };
}

function fmtCount(n) {
  return String(n).padStart(2, "0");
}
function fmtMoney(n) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function updateCartBar(cart) {
  const { count, total } = cartTotals(cart);
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");
  if (countEl) countEl.textContent = fmtCount(count);
  if (totalEl) totalEl.textContent = fmtMoney(total);
}

function setRowQtyUI(row, qty) {
  const qtyEl = row.querySelector(".dish-row__qty-num");
  if (qtyEl) qtyEl.textContent = String(qty);
  row.classList.toggle("has-qty", qty > 0);
}

/* ---------------- FAVORITES (localStorage) ---------------- */
function localFavKey(stallId) {
  return `hc:fav:${stallId}`;
}
function loadFavSet(stallId) {
  try {
    const raw = localStorage.getItem(localFavKey(stallId));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}
function saveFavSet(stallId, set) {
  localStorage.setItem(localFavKey(stallId), JSON.stringify([...set]));
}
function stallFavKey(hcId) {
  const customerId = getCustomerId() || "guest";
  return `favStalls:${hcId}:${customerId}`;
}
function loadStallFavSet(hcId) {
  try {
    return new Set(
      JSON.parse(localStorage.getItem(stallFavKey(hcId)) || "[]").map(String)
    );
  } catch {
    return new Set();
  }
}
function saveStallFavSet(hcId, set) {
  localStorage.setItem(stallFavKey(hcId), JSON.stringify([...set]));
}

/* ---------------- Rendering ---------------- */
function renderDishRows({ stallId, items, dishMap, cart }) {
  const ul = document.getElementById(cfg.ids.dishList);
  const tpl = document.getElementById(cfg.templates.dishRow);
  if (!ul || !tpl) return;

  clearNode(ul);

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "dish-row dish-row--empty";
    li.textContent = "No dishes found for this stall.";
    ul.appendChild(li);
    return;
  }

  items.forEach((entry) => {
    const { key, mi } = entry;
    const node = tpl.content.firstElementChild.cloneNode(true);

    const itemCode = menuItemCodeOf(mi, key);
    if (!itemCode) return;

    const itemName = menuItemNameOf(mi);
    const itemCat = menuItemCatOf(mi);
    const unitPriceNum = toNumberPrice(menuItemPriceOf(mi));
    const priceText = fmtMoney(unitPriceNum);

    node.setAttribute("data-item-code", itemCode);

    const nameEl = node.querySelector(".dish-row__name");
    const descEl = node.querySelector(".dish-row__desc");
    const priceEl = node.querySelector(".dish-row__price");
    if (nameEl) nameEl.textContent = itemName;
    if (descEl) descEl.textContent = itemCat;
    if (priceEl) priceEl.textContent = priceText;

    const imgEl = node.querySelector(".dish-row__thumb");
    // Updated: uses 'image' from JSON
    const guessImg = mi.image
      ? mi.image
      : `/images/dishes/${stallId}_${itemCode}.jpg`;
    setImgWithFallback(imgEl, guessImg, cfg.dishPlaceholderImg, itemName);

    dishMap.set(itemCode, {
      code: itemCode,
      name: itemName,
      desc: itemCat,
      unitPrice: unitPriceNum,
      priceText,
      img: guessImg,
    });

    const k = cartItemKey(stallId, itemCode);
    const qty = cart.items?.[k]?.qty ?? 0;
    setRowQtyUI(node, qty);

    ul.appendChild(node);
  });
}

function renderFavorites({ likedSet, dishMap }) {
  const container = document.getElementById(cfg.ids.favoritesScroller);
  const tpl = document.getElementById(cfg.templates.favoriteCard);
  if (!container) return;

  clearNode(container);

  const likedCodes = Array.from(likedSet);
  if (likedCodes.length === 0) {
    const p = document.createElement("p");
    p.className = "favorites__empty";
    p.textContent = "No favorites yet.";
    container.appendChild(p);
    return;
  }
  if (!tpl) return;

  likedCodes.forEach((code) => {
    const dish = dishMap.get(code);
    if (!dish) return;

    const card = tpl.content.firstElementChild.cloneNode(true);
    card.setAttribute("data-item-code", code);

    const nameEl = card.querySelector(".favorite-card__name");
    const descEl = card.querySelector(".favorite-card__desc");
    const priceEl = card.querySelector(".favorite-card__price");
    const imgEl = card.querySelector(".favorite-card__image");

    if (nameEl) nameEl.textContent = dish.name;
    if (descEl) descEl.textContent = dish.desc;
    if (priceEl) priceEl.textContent = dish.priceText;
    setImgWithFallback(imgEl, dish.img, cfg.dishPlaceholderImg, dish.name);

    const favBtn = card.querySelector(
      `[data-action="${cfg.actions.toggleFavorite}"]`
    );
    setPressed(favBtn, true);
    container.appendChild(card);
  });
}

function syncHearts(likedSet) {
  $$(`#${cfg.ids.dishList} [data-item-code]`).forEach((row) => {
    const code = row.getAttribute("data-item-code");
    const pressed = likedSet.has(code);
    const btn = row.querySelector(
      `[data-action="${cfg.actions.toggleFavorite}"]`
    );
    setPressed(btn, pressed);
    row.classList.toggle("is-favorited", pressed);
  });
}

/* ---------------- Fetchers ---------------- */
async function fetchStall(wrapper, stallId) {
  if (wrapper?.getStall) return wrapper.getStall(stallId);
  return null;
}

async function fetchMenuItems(wrapper, stallId) {
  if (wrapper?.listMenuItemsByStall) {
    const obj = await wrapper.listMenuItemsByStall(stallId);
    return Object.entries(obj || {}).map(([key, mi]) => ({ key, mi }));
  }
  return [];
}

async function fetchFeedback(wrapper, stallId) {
  if (wrapper?.listStallFeedback) {
    return await wrapper.listStallFeedback(stallId);
  }
  return {};
}

/* ---------------- Main ---------------- */
(async () => {
  try {
    const stallId = getStallId();
    if (!stallId) {
      safeSetText(cfg.ids.stallName, "Missing StallID");
      return;
    }

    safeSetText(cfg.ids.stallName, "Loading…");
    const wrapper = await loadWrapper();

    const [stall, menuEntries, feedbackObj] = await Promise.all([
      fetchStall(wrapper, stallId),
      fetchMenuItems(wrapper, stallId),
      fetchFeedback(wrapper, stallId),
    ]);

    if (!stall) {
      safeSetText(cfg.ids.stallName, "Stall not found");
      return;
    }
    if (!stall) {
      safeSetText(cfg.ids.stallName, "Stall not found");
      return;
    }

    safeSetText(cfg.ids.stallName, stallNameOf(stall));
    safeSetText(cfg.ids.stallUnit, stallUnitOf(stall));
    safeSetText(cfg.ids.stallDesc, stallDescOf(stall));

    safeSetText(cfg.ids.stallName, stallNameOf(stall));
    safeSetText(cfg.ids.stallUnit, stallUnitOf(stall));
    safeSetText(cfg.ids.stallDesc, stallDescOf(stall));

    // Banner
    const bannerEl = document.getElementById(cfg.ids.banner);
    if (bannerEl) {
      // Updated: uses 'storeImage' from JSON
      const storeImg = stall.storeImage
        ? stall.storeImage
        : `/images/stalls/${stallId}.jpg`;
      setImgWithFallback(
        bannerEl,
        storeImg,
        cfg.stallPlaceholderImg,
        stallNameOf(stall)
      );

      // ✅ FIX: Force the image to align to the top
      bannerEl.style.objectPosition = "center top";
    }

    // Rating
    const { avg, count } = computeRating(feedbackObj);
    const ratingEl = document.getElementById(cfg.ids.ratingValue);
    const countEl = document.getElementById(cfg.ids.ratingCount);

    if (ratingEl) ratingEl.textContent = avg ? avg.toFixed(1) : "0.0";
    if (countEl) countEl.textContent = `(${count})`;

    const ratingContainer = document.getElementById(cfg.ids.ratingContainer);
    if (ratingContainer) {
      ratingContainer.style.cursor = "pointer";
      ratingContainer.onclick = () => {
        const url = new URL("/html/feedback/reviews.html", window.location.href);
        url.searchParams.set("stall", stallId);
        window.location.href = url.href;
      };
    }

    // Heart logic
    const hcId = stall.hawkerCentreId;
    const stallFavBtn = document.getElementById("stall-fav-btn");
    if (stallFavBtn && hcId) {
      let stallFavSet = loadStallFavSet(hcId);
      setPressed(stallFavBtn, stallFavSet.has(String(stallId)));
      stallFavBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stallFavSet = loadStallFavSet(hcId);
        const sid = String(stallId);
        if (stallFavSet.has(sid)) stallFavSet.delete(sid);
        else stallFavSet.add(sid);
        saveStallFavSet(hcId, stallFavSet);
        setPressed(stallFavBtn, stallFavSet.has(sid));
      });
    }

    document.title = `${stallNameOf(stall)} • Dishes`;

    const itemsArr = (menuEntries || []).filter(Boolean);
    let cart = loadCart();
    updateCartBar(cart);

    const dishMap = new Map();
    renderDishRows({ stallId, items: itemsArr, dishMap, cart });

    function openDishPage(code) {
      if (!code) return;
      const url = new URL("./dish.html", window.location.href);
      url.searchParams.set("stall", String(stallId));
      url.searchParams.set("item", String(code));
      sessionStorage.setItem("dish:returnTo", window.location.href);
      window.location.href = url.href;
    }

    document
      .getElementById(cfg.ids.dishList)
      ?.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return;
        const row = e.target.closest("li.dish-row[data-item-code]");
        if (row) openDishPage(row.getAttribute("data-item-code"));
      });

    document
      .getElementById(cfg.ids.favoritesScroller)
      ?.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return;
        const card = e.target.closest("article.favorite-card[data-item-code]");
        if (card) openDishPage(card.getAttribute("data-item-code"));
      });

    let likedSet = loadFavSet(stallId);
    syncHearts(likedSet);
    renderFavorites({ likedSet, dishMap });

    document.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;
      const action = actionBtn.getAttribute("data-action");
      const holder = actionBtn.closest("[data-item-code]");
      const itemCode = holder?.getAttribute("data-item-code");
      if (!itemCode) return;

      e.preventDefault();
      e.stopPropagation();

      if (action === cfg.actions.toggleFavorite) {
        if (likedSet.has(itemCode)) likedSet.delete(itemCode);
        else likedSet.add(itemCode);
        saveFavSet(stallId, likedSet);
        syncHearts(likedSet);
        renderFavorites({ likedSet, dishMap });
      } else if (
        action === cfg.actions.cartPlus ||
        action === cfg.actions.cartMinus
      ) {
        cart = loadCart();
        const dish = dishMap.get(itemCode);
        if (!dish) return;
        const key = cartItemKey(stallId, itemCode);
        if (!cart.items[key]) {
          cart.items[key] = {
            stallId: String(stallId),
            itemCode: String(itemCode),
            name: dish.name,
            unitPrice: dish.unitPrice,
            qty: 0,
          };
        }
        if (action === cfg.actions.cartPlus) cart.items[key].qty++;
        else {
          cart.items[key].qty--;
          if (cart.items[key].qty <= 0) delete cart.items[key];
        }
        saveCart(cart);
        const newQty = cart.items[key]?.qty ?? 0;
        const row = document.querySelector(
          `#${cfg.ids.dishList} [data-item-code="${CSS.escape(itemCode)}"]`
        );
        if (row) setRowQtyUI(row, newQty);
        updateCartBar(cart);
      }
    });

    window.addEventListener("pageshow", () => {
      cart = loadCart();
      updateCartBar(cart);
      $$(`#${cfg.ids.dishList} [data-item-code]`).forEach((row) => {
        const code = row.getAttribute("data-item-code");
        const k = cartItemKey(stallId, code);
        setRowQtyUI(row, cart.items?.[k]?.qty ?? 0);
      });
      likedSet = loadFavSet(stallId);
      syncHearts(likedSet);
      renderFavorites({ likedSet, dishMap });
    });
  } catch (err) {
    console.error(err);
    safeSetText(cfg.ids.stallName, "Error loading page");
  }
})();