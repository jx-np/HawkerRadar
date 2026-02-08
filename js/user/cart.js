import { getPaymentMethods } from "/js/firebase/wrapper.js";
import { getCurrentUser } from "/js/modules/auth.js";

const CART_VERSION = 1;

// ---------- header offset (fixed navbar) ----------
function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

// ---------- Back button ----------
function smartBack() {
  const returnTo =
    sessionStorage.getItem("cart:returnTo") ||
    sessionStorage.getItem("dish:returnTo") ||
    sessionStorage.getItem("stallMenu:url");

  if (returnTo) {
    window.location.replace(returnTo);
    return;
  }

  const lastStallId = sessionStorage.getItem("lastStallId");
  if (lastStallId) {
    const u = new URL("/html/stall/stall_dish.html", window.location.origin);
    u.searchParams.set("stall", String(lastStallId));
    window.location.replace(u.href);
    return;
  }

  window.location.replace(new URL("/html/home/home.html", window.location.origin).href);
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

// ---------- cart storage ----------
function getCustomerId() {
  return getCurrentUser().id
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

function money(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function calcSubtotal(items) {
  let subtotal = 0;
  for (const it of items) {
    subtotal += (Number(it.unitPrice) || 0) * (Number(it.qty) || 0);
  }
  return subtotal;
}

// Fees: GST 9%, Service 10%, Rush hour 5%
function calcFees(subtotal) {
  const gst = subtotal * 0.09;
  const svc = subtotal * 0.10;
  const rush = subtotal * 0.05;
  return { gst, svc, rush, feeTotal: gst + svc + rush };
}

// ---------- firebase wrapper ----------
async function loadWrapper() {
  const wrapperPath = window.CART_PAGE?.wrapperPath || "/js/firebase/wrapper.js";
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

// ---------- DOM ----------
const cartItemsEl = document.getElementById("cartItems");
const cartEmptyEl = document.getElementById("cartEmpty");

const feeGstEl = document.getElementById("feeGst");
const feeSvcEl = document.getElementById("feeSvc");
const feeRushEl = document.getElementById("feeRush");
const feeTotalEl = document.getElementById("feeTotal");
const grandTotalEl = document.getElementById("grandTotal");

const checkoutBtn = document.getElementById("checkoutBtn");

const confirmDialog = document.getElementById("confirmDialog");
const confirmCheck = document.getElementById("confirmCheck");
const cancelConfirm = document.getElementById("cancelConfirm");
const placeOrderBtn = document.getElementById("placeOrderBtn");

const successDialog = document.getElementById("successDialog");
const successOk = document.getElementById("successOk");

let cart = loadCart();

function getItemsArray() {
  return Object.values(cart.items || {}).filter(Boolean);
}

function render() {
  const items = getItemsArray();

  if (cartItemsEl) cartItemsEl.innerHTML = "";

  if (!items.length) {
    if (cartEmptyEl) cartEmptyEl.hidden = false;
    if (checkoutBtn) checkoutBtn.disabled = true;
  } else {
    if (cartEmptyEl) cartEmptyEl.hidden = true;
    if (checkoutBtn) checkoutBtn.disabled = false;

    for (const it of items) {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item-name">${it.name ?? it.itemCode}</div>
        <div class="cart-item-meta">${Number(it.qty) || 0} x ${money(it.unitPrice)}</div>
      `;
      cartItemsEl?.appendChild(row);
    }
  }

  const subtotal = calcSubtotal(items);
  const { gst, svc, rush, feeTotal } = calcFees(subtotal);
  const grandTotal = subtotal + feeTotal;

  if (feeGstEl) feeGstEl.textContent = money(gst);
  if (feeSvcEl) feeSvcEl.textContent = money(svc);
  if (feeRushEl) feeRushEl.textContent = money(rush);
  if (feeTotalEl) feeTotalEl.textContent = money(feeTotal);
  if (grandTotalEl) grandTotalEl.textContent = money(grandTotal);
}

render();

// ---------- Payment Methods ----------
const savedCardsEl = document.getElementById("savedCards");

async function loadPaymentMethods() {
  if (!savedCardsEl) return;

  try {
    const wrapper = await loadWrapper();
    const userId = getCustomerId();

    const user = getCurrentUser();

    if (!user) {
      savedCardsEl.innerHTML = '<p class="no-cards-msg">Please log in to use saved payment methods.</p>';
      return;
    }

    const paymentMethods = await getPaymentMethods(user.id);
    const paymentArray = Object.entries(paymentMethods || {});

    if (paymentArray.length === 0) {
      savedCardsEl.innerHTML = '<p class="no-cards-msg">No cards saved.</p>';
      return;
    }

    // Clear container
    savedCardsEl.innerHTML = '';

    // Display each payment method
    paymentArray.forEach(([cardId, card]) => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'payment-card-item';
      cardDiv.dataset.cardId = cardId;

      const cardType = card.type || 'Card';
      const maskedNumber = card.lastFourDigits ? `**** ${card.lastFourDigits}` : '**** ****';
      const cardHolder = card.cardHolder || 'Card Holder';
      const expiryDate = card.expiryDate || 'MM/YY';

      cardDiv.innerHTML = `
        <div class="card-radio">
          <input type="radio" name="paymentMethod" value="${cardId}" id="card_${cardId}">
          <label for="card_${cardId}">
            <div class="card-info">
              <div class="card-type-badge">${cardType}</div>
              <div class="card-number">${maskedNumber}</div>
              <div class="card-details">
                <span class="card-holder">${cardHolder}</span>
                <span class="card-expiry">Exp: ${expiryDate}</span>
              </div>
            </div>
          </label>
        </div>
      `;

      savedCardsEl.appendChild(cardDiv);
    });

    // Auto-select first card
    const firstRadio = savedCardsEl.querySelector('input[type="radio"]');
    if (firstRadio) firstRadio.checked = true;

  } catch (error) {
    console.error('Error loading payment methods:', error);
    savedCardsEl.innerHTML = '<p class="error-msg">Failed to load payment methods.</p>';
  }
}

// Load payment methods on page load
loadPaymentMethods();

// keep UI fresh if you come back from other pages
window.addEventListener("pageshow", () => {
  cart = loadCart();
  render();
  loadPaymentMethods();
});

// ---------- checkout flow ----------
checkoutBtn?.addEventListener("click", () => {
  confirmCheck.checked = false;
  placeOrderBtn.disabled = true;
  confirmDialog?.showModal?.();
});

confirmCheck?.addEventListener("change", () => {
  placeOrderBtn.disabled = !confirmCheck.checked;
});

cancelConfirm?.addEventListener("click", () => confirmDialog?.close?.());

function groupItemsByStall(items) {
  const map = new Map();
  for (const it of items) {
    const sid = String(it.stallId ?? "").trim();
    if (!sid) continue;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid).push(it);
  }
  return map;
}

placeOrderBtn?.addEventListener("click", async () => {
  placeOrderBtn.disabled = true;

  try {
    const items = getItemsArray();
    if (!items.length) {
      confirmDialog?.close?.();
      render();
      return;
    }

    const wrapper = await loadWrapper();

    const userId = getCustomerId();
    
    // Get selected payment method
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    const payType = selectedPayment ? "Card" : "Cash"; // Default to Cash if no card selected
    const paymentMethodId = selectedPayment ? selectedPayment.value : null;

    // Because wrapper Orders require stallId, we create ONE order per stall
    const byStall = groupItemsByStall(items);

    const createdOrderIds = [];

    for (const [stallId, stallItems] of byStall.entries()) {
      const subtotal = calcSubtotal(stallItems);
      const fees = calcFees(subtotal);

      const orderPayload = {
        userId,
        stallId,
        payType,
        paymentMethodId, // Include selected payment method
        status: "Placed",
        totals: {
          subtotal,
          ...fees,
          grandTotal: subtotal + fees.feeTotal,
        },
        items: stallItems.map((it) => ({
          itemCode: String(it.itemCode),
          name: String(it.name ?? it.itemCode),
          qty: Number(it.qty) || 0,
          unitPrice: Number(it.unitPrice) || 0,
        })),
      };

      const created = await wrapper.createOrder(orderPayload);
      createdOrderIds.push(created?.id || "");
    }

    // Clear cart after successful order(s)
    cart.items = {};
    saveCart(cart);
    render();

    confirmDialog?.close?.();

    // optional: show order ids in console
    console.log("Created orders:", createdOrderIds);

    successDialog?.showModal?.();
  } catch (err) {
    console.error(err);
    placeOrderBtn.disabled = false;
    alert(`Failed to place order. ${err?.message || err}`);
  }
});

successOk?.addEventListener("click", () => {
  successDialog?.close?.();

  // optional: auto return to where they came from
  const returnTo = sessionStorage.getItem("cart:returnTo");
  if (returnTo) window.location.replace(returnTo);
});