// ../../js/stall-page.js
// Stall Dish Page: loads stall + dishes + feedback + favorites + cart (persistent)
//
// REQUIREMENTS:
// 1) In HTML, before this script:
//    <script>window.STALL_PAGE = { wrapperPath: "../../js/wrapper.js" };</script>
// 2) Templates exist:
//    #tpl-dish-row, #tpl-favorite-card
// 3) Dish row template uses data-actions:
//    - data-action="toggle-favorite"
//    - data-action="cart-plus"
//    - data-action="cart-minus"
// 4) Body has data-stall-id OR URL has ?stall=...



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

  // Image fallbacks
  dishPlaceholderImg: "../../images/dishes/placeholder.jpg",
  stallPlaceholderImg: "../../images/stalls/stall-banner-placeholder.jpg",

  // Cart storage version
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

// Back arrow on stall_dish
function smartBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = new URL("/html/home/home.html", window.location.origin).href;
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

// Cart navigation (your cart is at ../user/cart.html)
document.getElementById("view-cart")?.addEventListener("click", (e) => {
  e.preventDefault();

  // so Cart back arrow can return here
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

function toMoney(v) {
  const n = toNumberPrice(v);
  return `$${n.toFixed(2)}`;
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
  while (node.firstChild) node.removeChild(node.firstChild);
}

function setPressed(btn, pressed) {
  if (!btn) return;
  btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  btn.classList.toggle("is-favorited", pressed);
}

/* ---------------- Firebase wrapper loader ---------------- */
async function loadWrapper() {
  const wrapperPath = window.STALL_PAGE?.wrapperPath;
  if (!wrapperPath) throw new Error("window.STALL_PAGE.wrapperPath is missing in HTML");
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

/* ---------------- Rating ---------------- */
function computeRating(allFeedback, stallId) {
  if (!allFeedback) return { avg: 0, count: 0 };
  let sum = 0;
  let count = 0;

  for (const fb of Object.values(allFeedback)) {
    if (!fb) continue;
    if (String(fb.StallID) !== String(stallId)) continue;
    const r = Number(fb.FbkRating);
    if (Number.isFinite(r)) {
      sum += r;
      count += 1;
    }
  }
  return { avg: count ? sum / count : 0, count };
}

/* ---------------- CART (localStorage persistent) ----------------
   Stored per user (CustomerID or guest).
   Shape:
   {
     version: 1,
     updatedAt: ...,
     items: {
       "301_CR01": { stallId:"301", itemCode:"CR01", name:"...", unitPrice:5.0, qty:2 }
     }
   }
-------------------------------------------------------------- */
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
  for (const it of Object.values(cart.items)) {
    if (!it) continue;
    count += it.qty;
    total += it.qty * it.unitPrice;
  }
  return { count, total };
}

function fmtCount(n) {
  return String(n).padStart(2, "0");
}

function fmtMoney(n) {
  return `$${n.toFixed(2)}`;
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

/* ---------------- FAVORITES (Firebase likes or local fallback) ---------------- */
function localFavKey(stallId) {
  return `hc:fav:${stallId}`;
}

function loadLocalFavorites(stallId) {
  try {
    const raw = localStorage.getItem(localFavKey(stallId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveLocalFavorites(stallId, arr) {
  localStorage.setItem(localFavKey(stallId), JSON.stringify(arr));
}

function likeDocId(customerId, stallId, itemCode) {
  return `${customerId}_${stallId}_${itemCode}`;
}

async function loadFirebaseFavorites(wrapper, customerId, stallId) {
  const likesObj = await wrapper.getCustomerLikes(customerId);
  if (!likesObj) return [];
  const codes = [];
  for (const like of Object.values(likesObj)) {
    if (!like) continue;
    if (String(like.StallID) !== String(stallId)) continue;
    if (like.ItemCode) codes.push(String(like.ItemCode));
  }
  return codes;
}

async function addFirebaseFavorite(wrapper, customerId, stallId, itemCode) {
  await wrapper.addLike(customerId, stallId, itemCode);
}

async function removeFirebaseFavorite(wrapper, customerId, stallId, itemCode) {
  await wrapper.deleteData("likes", likeDocId(customerId, stallId, itemCode));
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

  items.forEach((item) => {
    const node = tpl.content.firstElementChild.cloneNode(true);

    const itemCode = String(item.ItemCode ?? "").trim();
    const itemName = item.ItemDesc ?? `Item ${itemCode}`; // SQL uses ItemDesc as name
    const itemCat = item.ItemCategory ?? "";
    const unitPriceNum = toNumberPrice(item.ItemPrice);
    const priceText = `$${unitPriceNum.toFixed(2)}`;

    node.setAttribute("data-item-code", itemCode);

    const nameEl = node.querySelector(".dish-row__name");
    const descEl = node.querySelector(".dish-row__desc");
    const priceEl = node.querySelector(".dish-row__price");
    if (nameEl) nameEl.textContent = itemName;
    if (descEl) descEl.textContent = itemCat;
    if (priceEl) priceEl.textContent = priceText;

    // image guess (you can change later)
    const imgEl = node.querySelector(".dish-row__thumb");
    const guessImg = `../../images/dishes/${stallId}_${itemCode}.jpg`;
    setImgWithFallback(imgEl, guessImg, cfg.dishPlaceholderImg, itemName);

    // Store for favorites + cart
    dishMap.set(itemCode, {
      code: itemCode,
      name: itemName,
      desc: itemCat,
      unitPrice: unitPriceNum,
      priceText,
      img: guessImg,
    });

    // init qty UI from cart
    const k = cartItemKey(stallId, itemCode);
    const qty = cart.items[k]?.qty ?? 0;
    setRowQtyUI(node, qty);

    // init heart unpressed (we will sync later after favorites load)
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
  // dish list hearts
  $$(`#${cfg.ids.dishList} [data-item-code]`).forEach((row) => {
    const code = row.getAttribute("data-item-code");
    const pressed = likedSet.has(code);
    const btn = row.querySelector(`[data-action="${cfg.actions.toggleFavorite}"]`);
    setPressed(btn, pressed);
    row.classList.toggle("is-favorited", pressed);
  });
}

/* ---------------- Main ---------------- */
(async () => {
  try {
    applyHeaderOffset();

    const stallId = getStallId();
    if (!stallId) {
      safeSetText(cfg.ids.stallName, "Missing StallID");
      safeSetText(cfg.ids.stallUnit, "Add <body data-stall-id='...'> or use ?stall=...");
      return;
    }

    safeSetText(cfg.ids.stallName, "Loading…");

    const wrapper = await loadWrapper();
    const customerId = getCustomerId();

    // Load core data
    const [stall, allItems, allFeedback] = await Promise.all([
      wrapper.getFoodStall(stallId),
      wrapper.getAllMenuItems(),
      wrapper.getAllFeedback(),
    ]);

    if (!stall) {
      safeSetText(cfg.ids.stallName, "Stall not found");
      return;
    }

    safeSetText(cfg.ids.stallName, stall.StallName || "Stall");
    safeSetText(cfg.ids.stallUnit, stall.StallUnitNo ? `Stall Unit: ${stall.StallUnitNo}` : "");
    safeSetText(cfg.ids.stallDesc, stall.StallDesc || "");
    document.title = `${stall.StallName || "Stall"} • Dishes`;

    // Banner
    const bannerEl = document.getElementById(cfg.ids.banner);
    if (bannerEl) {
      const guessBanner = `../../images/stalls/${stallId}.jpg`;
      setImgWithFallback(bannerEl, guessBanner, cfg.stallPlaceholderImg, stall.StallName || "Stall");
    }

    // Rating
    const { avg, count } = computeRating(allFeedback, stallId);
    const ratingEl = document.getElementById(cfg.ids.ratingValue);
    const countEl = document.getElementById(cfg.ids.ratingCount);
    if (ratingEl) ratingEl.textContent = avg ? avg.toFixed(1) : "0.0";
    if (countEl) countEl.textContent = `(${count})`;

    // Filter menu items for stall
    const itemsArr = [];
    if (allItems) {
      for (const it of Object.values(allItems)) {
        if (!it) continue;
        if (String(it.StallID) === String(stallId)) itemsArr.push(it);
      }
    }
    itemsArr.sort((a, b) => String(a.ItemCode).localeCompare(String(b.ItemCode)));

    // Load cart first so we can render qty correctly
    const cart = loadCart();
    updateCartBar(cart);

    // Render dishes
    const dishMap = new Map();
    renderDishRows({ stallId, items: itemsArr, dishMap, cart });

    // Load favorites
    let likedCodes = [];
    if (customerId) likedCodes = await loadFirebaseFavorites(wrapper, customerId, stallId);
    else likedCodes = loadLocalFavorites(stallId);

    const likedSet = new Set(likedCodes);
    syncHearts(likedSet);
    renderFavorites({ likedSet, dishMap });

    // ---------------- Click handling (favorites + cart) ----------------
    document.addEventListener("click", async (e) => {
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;

      const action = actionBtn.getAttribute("data-action");
      const holder = actionBtn.closest("[data-item-code]");
      const itemCode = holder?.getAttribute("data-item-code") || null;

      // Only these actions
      const isFav = action === cfg.actions.toggleFavorite;
      const isPlus = action === cfg.actions.cartPlus;
      const isMinus = action === cfg.actions.cartMinus;

      if (!isFav && !isPlus && !isMinus) return;

      e.preventDefault();

      // Favorites needs itemCode
      if ((isFav || isPlus || isMinus) && !itemCode) return;

      // -------- Favorites toggle --------
      if (isFav) {
        const currentlyLiked = likedSet.has(itemCode);

        try {
          if (customerId) {
            if (currentlyLiked) {
              await removeFirebaseFavorite(wrapper, customerId, stallId, itemCode);
              likedSet.delete(itemCode);
            } else {
              await addFirebaseFavorite(wrapper, customerId, stallId, itemCode);
              likedSet.add(itemCode);
            }
          } else {
            // local fallback
            if (currentlyLiked) likedSet.delete(itemCode);
            else likedSet.add(itemCode);
            saveLocalFavorites(stallId, Array.from(likedSet));
          }

          syncHearts(likedSet);
          renderFavorites({ likedSet, dishMap });
        } catch (err) {
          console.error("Favorite toggle failed:", err);
        }
        return;
      }

      // -------- Cart plus/minus --------
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

      // Update row qty UI
      const newQty = cart.items[key]?.qty ?? 0;

      // If minus/plus clicked from the favorites card, also update the matching row if exists
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
