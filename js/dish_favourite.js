// ../../js/dish_favourite.js
// Stall Dish Page: loads stall + dishes + feedback + favorites + cart (persistent)
// Works with NEW wrapper.js (getStall/listMenuItemsByStall/listStallFeedback)
// and also tolerates older wrapper shapes (best-effort).

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

  dishPlaceholderImg: "../../images/dishes/placeholder.jpg",
  stallPlaceholderImg: "../../images/stalls/stall-banner-placeholder.jpg",

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
  // Prefer returning to the stall list page we came from
  const returnTo = sessionStorage.getItem("stallList:returnTo");
  if (returnTo) {
    window.location.href = returnTo;
    return;
  }

  // Otherwise, try rebuild stall.html?hc=...
  const hcId = sessionStorage.getItem("selectedHcId");
  if (hcId) {
    const u = new URL("./stall.html", window.location.href); // same folder as stall_dish.html
    u.searchParams.set("hc", String(hcId));
    window.location.href = u.href;
    return;
  }

  // final fallback
  window.location.href = new URL("/html/home/home.html", window.location.origin).href;
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

document.getElementById("view-cart")?.addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.setItem("cart:returnTo", window.location.href);
  window.location.href = new URL("../user/cart.html", window.location.href).href;
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
  const id = localStorage.getItem(cfg.customerStorageKey);
  return id?.trim() ? id.trim() : null;
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
  const wrapperPath = window.STALL_PAGE?.wrapperPath || "/js/firebase/wrapper.js";
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

/* ---------------- Normalizers (support old + new fields) ---------------- */
function stallNameOf(s) {
  return s?.StallName ?? s?.name ?? s?.stallName ?? "Stall";
}
function stallUnitOf(s) {
  const u = s?.StallUnitNo ?? s?.unitNo ?? s?.unit ?? s?.unitNumber ?? "";
  return u ? `Stall Unit: ${u}` : "";
}
function stallDescOf(s) {
  return s?.StallDesc ?? s?.desc ?? s?.description ?? s?.stallDesc ?? "";
}
function feedbackRatingOf(fb) {
  return Number(fb?.FbkRating ?? fb?.rating ?? fb?.stars ?? fb?.score ?? fb?.value);
}
function feedbackStallIdOf(fb) {
  return fb?.StallID ?? fb?.stallId ?? fb?.stallID ?? fb?.StallId ?? null;
}
function menuItemStallIdOf(mi) {
  return mi?.StallID ?? mi?.stallId ?? mi?.stallID ?? mi?.StallId ?? null;
}
function menuItemCodeOf(mi, key) {
  return String(mi?.ItemCode ?? mi?.code ?? mi?.itemCode ?? mi?.id ?? key ?? "").trim();
}
function menuItemNameOf(mi, code) {
  return mi?.ItemDesc ?? mi?.name ?? mi?.itemDesc ?? `Item ${code || ""}`.trim();
}
function menuItemCatOf(mi) {
  return (mi?.ItemCategory ?? mi?.category ?? mi?.cuisine ?? mi?.type ?? "").trim();
}
function menuItemPriceOf(mi) {
  return mi?.ItemPrice ?? mi?.price ?? mi?.unitPrice ?? mi?.cost ?? 0;
}

/* ---------------- Rating ---------------- */
function computeRating(feedbackObj, stallId) {
  if (!feedbackObj) return { avg: 0, count: 0 };

  let sum = 0;
  let count = 0;

  for (const fb of Object.values(feedbackObj)) {
    if (!fb) continue;
    if (String(feedbackStallIdOf(fb)) !== String(stallId)) continue;
    const r = feedbackRatingOf(fb);
    if (Number.isFinite(r)) {
      sum += r;
      count += 1;
    }
  }
  return { avg: count ? sum / count : 0, count };
}

/* ---------------- CART (localStorage persistent) ---------------- */
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
    obj.version = cfg.cartVersion;
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

/* ---------------- FAVORITES (localStorage only; works even if wrapper has no likes) ---------------- */
function localFavKey(stallId) {
  // matches dish.js fallback key
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
/* ---------------- STALL FAVORITES (sync with stall.html key) ---------------- */
function stallHcIdOf(stall) {
  return (
    stall?.hawkerCentreId ??
    stall?.hawkerCentreID ??
    stall?.HawkerCentreID ??
    stall?.HawkerCentreId ??
    stall?.HCID ??
    stall?.HCId ??
    stall?.hcId ??
    stall?.hcID ??
    null
  );
}

function stallFavKey(hcId) {
  const customerId = getCustomerId() || "guest";
  return `favStalls:${hcId}:${customerId}`;
}

function loadStallFavSet(hcId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(stallFavKey(hcId)) || "[]").map(String));
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

    const itemName = menuItemNameOf(mi, itemCode);
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
    const guessImg = `../../images/dishes/${stallId}_${itemCode}.jpg`;
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

    // default heart state; will sync after favs load
    const favBtn = node.querySelector(`[data-action="${cfg.actions.toggleFavorite}"]`);
    setPressed(favBtn, false);

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

    if (nameEl) nameEl.textContent = dish.name || code;
    if (descEl) descEl.textContent = dish.desc || "";
    if (priceEl) priceEl.textContent = dish.priceText || "";
    setImgWithFallback(imgEl, dish.img, cfg.dishPlaceholderImg, dish.name || "Dish");

    const favBtn = card.querySelector(`[data-action="${cfg.actions.toggleFavorite}"]`);
    setPressed(favBtn, true);

    container.appendChild(card);
  });
}

function syncHearts(likedSet) {
  $$(`#${cfg.ids.dishList} [data-item-code]`).forEach((row) => {
    const code = row.getAttribute("data-item-code");
    const pressed = likedSet.has(code);
    const btn = row.querySelector(`[data-action="${cfg.actions.toggleFavorite}"]`);
    setPressed(btn, pressed);
    row.classList.toggle("is-favorited", pressed);
  });
}

/* ---------------- Data fetchers (new wrapper first, then old) ---------------- */
async function fetchStall(wrapper, stallId) {
  if (wrapper?.getStall) return wrapper.getStall(stallId);
  if (wrapper?.getFoodStall) return wrapper.getFoodStall(stallId);
  if (wrapper?.getFoodstall) return wrapper.getFoodstall(stallId);
  return null;
}

async function fetchMenuItems(wrapper, stallId) {
  // NEW: listMenuItemsByStall(stallId)
  if (wrapper?.listMenuItemsByStall) {
    const obj = await wrapper.listMenuItemsByStall(stallId);
    return Object.entries(obj || {}).map(([key, mi]) => ({ key, mi }));
  }

  // OLD: getAllMenuItems() and filter
  if (wrapper?.getAllMenuItems) {
    const obj = await wrapper.getAllMenuItems();
    const out = [];
    for (const [key, mi] of Object.entries(obj || {})) {
      if (!mi) continue;
      if (String(menuItemStallIdOf(mi)) === String(stallId)) out.push({ key, mi });
    }
    return out;
  }

  // NEW fallback: listMenuItems() and filter
  if (wrapper?.listMenuItems) {
    const obj = await wrapper.listMenuItems();
    const out = [];
    for (const [key, mi] of Object.entries(obj || {})) {
      if (!mi) continue;
      if (String(menuItemStallIdOf(mi)) === String(stallId)) out.push({ key, mi });
    }
    return out;
  }

  return [];
}

async function fetchFeedback(wrapper, stallId) {
  // NEW: listStallFeedback(stallId)
  if (wrapper?.listStallFeedback) {
    return (await wrapper.listStallFeedback(stallId)) || null;
  }

  // OLD: getAllFeedback()
  if (wrapper?.getAllFeedback) {
    return (await wrapper.getAllFeedback()) || null;
  }

  return null;
}

/* ---------------- Main ---------------- */
(async () => {
  try {
    const stallId = getStallId();
    if (!stallId) {
      safeSetText(cfg.ids.stallName, "Missing StallID");
      safeSetText(cfg.ids.stallUnit, "Add <body data-stall-id='...'> or use ?stall=...");
      return;
    }

    safeSetText(cfg.ids.stallName, "Loading…");

    const wrapper = await loadWrapper();

    // Load core data (new wrapper compatible)
    const [stall, menuEntries, feedbackObj] = await Promise.all([
      fetchStall(wrapper, stallId),
      fetchMenuItems(wrapper, stallId),
      fetchFeedback(wrapper, stallId),
    ]);

    if (!stall) {
      safeSetText(cfg.ids.stallName, "Stall not found");
      return;
    }

    safeSetText(cfg.ids.stallName, stallNameOf(stall));
    safeSetText(cfg.ids.stallUnit, stallUnitOf(stall));
    safeSetText(cfg.ids.stallDesc, stallDescOf(stall));
    // ---------------- Stall favorite (banner heart) ----------------
    const stallFavBtn = document.getElementById("stall-fav-btn");
    const hcId = stallHcIdOf(stall);

    if (stallFavBtn && hcId) {
      let stallFavSet = loadStallFavSet(hcId);

      // initial state
      setPressed(stallFavBtn, stallFavSet.has(String(stallId)));

      stallFavBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        stallFavSet = loadStallFavSet(hcId); // reload to be safe

        const sid = String(stallId);
        if (stallFavSet.has(sid)) stallFavSet.delete(sid);
        else stallFavSet.add(sid);

        saveStallFavSet(hcId, stallFavSet);
        setPressed(stallFavBtn, stallFavSet.has(sid));
      });
    } else if (stallFavBtn) {
      // no hawkerCentreId found on stall -> hide button to avoid “dead” UI
      stallFavBtn.style.display = "none";
    }
    document.title = `${stallNameOf(stall)} • Dishes`;

    // Banner
    const bannerEl = document.getElementById(cfg.ids.banner);
    if (bannerEl) {
      const guessBanner = `../../images/stalls/${stallId}.jpg`;
      setImgWithFallback(bannerEl, guessBanner, cfg.stallPlaceholderImg, stallNameOf(stall));
    }

    // Rating
    const { avg, count } = computeRating(feedbackObj, stallId);
    const ratingEl = document.getElementById(cfg.ids.ratingValue);
    const countEl = document.getElementById(cfg.ids.ratingCount);
    if (ratingEl) ratingEl.textContent = avg ? avg.toFixed(1) : "0.0";
    if (countEl) countEl.textContent = `(${count})`;

    // items
    const itemsArr = (menuEntries || [])
      .filter(Boolean)
      .sort((a, b) => String(menuItemCodeOf(a.mi, a.key)).localeCompare(String(menuItemCodeOf(b.mi, b.key))));

    // cart
    let cart = loadCart();
    updateCartBar(cart);

    // render dishes
    const dishMap = new Map();
    renderDishRows({
      stallId,
      items: itemsArr,
      dishMap,
      cart,
    });

    // ---------------- Dish navigation (row click + favorite card click) ----------------
    const openDishPage = (itemCode) => {
      if (!itemCode) return;
      const url = new URL("./dish.html", window.location.href);
      url.searchParams.set("stall", String(stallId));
      url.searchParams.set("item", String(itemCode));
      sessionStorage.setItem("dish:returnTo", window.location.href);
      window.location.href = url.href;
    };

    document.getElementById(cfg.ids.dishList)?.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      const row = e.target.closest('li.dish-row[data-item-code]');
      if (!row) return;
      openDishPage(row.getAttribute("data-item-code"));
    });

    document.getElementById(cfg.ids.favoritesScroller)?.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      const card = e.target.closest('article.favorite-card[data-item-code]');
      if (!card) return;
      openDishPage(card.getAttribute("data-item-code"));
    });

    // refresh qty when returning (bfcache/pageshow)
    function refreshCartAndFavUI() {
      // cart refresh
      cart = loadCart();
      updateCartBar(cart);
      $$(`#${cfg.ids.dishList} [data-item-code]`).forEach((row) => {
        const code = row.getAttribute("data-item-code");
        const k = cartItemKey(stallId, code);
        const qty = cart.items?.[k]?.qty ?? 0;
        setRowQtyUI(row, qty);
      });

      // favorites refresh (so changes from dish.html show up)
      likedSet = loadFavSet(stallId);
      syncHearts(likedSet);
      renderFavorites({ likedSet, dishMap });
    }

    window.addEventListener("pageshow", refreshCartAndFavUI);

    // favorites (local)
    let likedSet = loadFavSet(stallId);
    syncHearts(likedSet);
    renderFavorites({ likedSet, dishMap });

    // ---------------- Click handling (favorites + cart) ----------------
    document.addEventListener("click", (e) => {
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;

      const action = actionBtn.getAttribute("data-action");
      const holder = actionBtn.closest("[data-item-code]");
      const itemCode = holder?.getAttribute("data-item-code") || null;

      const isFav = action === cfg.actions.toggleFavorite;
      const isPlus = action === cfg.actions.cartPlus;
      const isMinus = action === cfg.actions.cartMinus;

      if (!isFav && !isPlus && !isMinus) return;
      e.preventDefault();
      if (!itemCode) return;

      // favorites toggle (local)
      if (isFav) {
        const currentlyLiked = likedSet.has(itemCode);
        if (currentlyLiked) likedSet.delete(itemCode);
        else likedSet.add(itemCode);

        saveFavSet(stallId, likedSet);
        syncHearts(likedSet);
        renderFavorites({ likedSet, dishMap });
        return;
      }

      // cart plus/minus (always reload from storage first)
      cart = loadCart();
      const dish = dishMap.get(itemCode);
      if (!dish) return;

      const key = cartItemKey(stallId, itemCode);

      if (!cart.items[key]) {
        cart.items[key] = {
          stallId: String(stallId),
          itemCode: String(itemCode),
          name: String(dish.name ?? itemCode),
          unitPrice: Number(dish.unitPrice) || 0,
          qty: 0,
        };
      }

      if (isPlus) {
        cart.items[key].qty += 1;
      } else if (isMinus) {
        cart.items[key].qty -= 1;
        if (cart.items[key].qty <= 0) delete cart.items[key];
      }

      saveCart(cart);

      const newQty = cart.items[key]?.qty ?? 0;
      const row = document.querySelector(`#${cfg.ids.dishList} [data-item-code="${CSS.escape(itemCode)}"]`);
      if (row) setRowQtyUI(row, newQty);

      updateCartBar(cart);
    });
  } catch (err) {
    console.error(err);
    safeSetText(cfg.ids.stallName, "Error loading page");
    safeSetText(cfg.ids.stallUnit, err?.message || String(err));
  }
})();