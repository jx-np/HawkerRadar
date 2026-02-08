// ../../js/stall-cart.js
// Persistent cart using localStorage.
// Cart data shape:
// {
//   version: 1,
//   updatedAt: 123456789,
//   items: {
//     "301_CR01": { stallId:"301", itemCode:"CR01", name:"...", unitPrice:5, qty:2 }
//   }
// }

import { getCurrentUser } from "../modules/auth.js"; 

const CART_VERSION = 1;

function getCustomerId() {
  const user = getCurrentUser();
  return user && user.id ? user.id : "guest";
}

function cartStorageKey() {
  // per user cart
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

function toNumberPrice(p) {
  const n = Number(String(p ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function totals(cart) {
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
  const { count, total } = totals(cart);

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

function getRowItemCode(row) {
  return row.getAttribute("data-item-code");
}

export function initStallCart({ stallId, dishMap }) {
  // dishMap must provide itemCode -> { name, unitPrice } at minimum
  let cart = loadCart();

  // initial sync: set qty UI on each row
  document.querySelectorAll("#dish-list [data-item-code]").forEach((row) => {
    const itemCode = getRowItemCode(row);
    const k = itemKey(stallId, itemCode);
    const qty = cart.items[k]?.qty ?? 0;
    setRowQtyUI(row, qty);
  });

  updateCartBar(cart);

  // event delegation for + and -
  document.addEventListener("click", (e) => {
    const plusBtn = e.target.closest('[data-action="cart-plus"]');
    const minusBtn = e.target.closest('[data-action="cart-minus"]');

    if (!plusBtn && !minusBtn) return;

    const row = e.target.closest("[data-item-code]");
    if (!row) return;

    const itemCode = getRowItemCode(row);
    if (!itemCode) return;

    const k = itemKey(stallId, itemCode);
    const dish = dishMap.get(itemCode);

    // Safety: if dishMap missing, ignore
    if (!dish) return;

    // Ensure cart item exists
    if (!cart.items[k]) {
      cart.items[k] = {
        stallId: String(stallId),
        itemCode: String(itemCode),
        name: String(dish.name ?? itemCode),
        unitPrice: toNumberPrice(dish.unitPrice),
        qty: 0,
      };
    }

    if (plusBtn) {
      cart.items[k].qty += 1;
    } else if (minusBtn) {
      cart.items[k].qty -= 1;
      if (cart.items[k].qty <= 0) delete cart.items[k];
    }

    saveCart(cart);

    const newQty = cart.items[k]?.qty ?? 0;
    setRowQtyUI(row, newQty);

    updateCartBar(cart);
  });
}
