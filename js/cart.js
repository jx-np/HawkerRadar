// ../../js/cart.js
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
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  // If we saved a return URL (recommended)
  const returnTo = sessionStorage.getItem("cart:returnTo");
  if (returnTo) {
    window.location.href = returnTo;
    return;
  }

  // fallback: try referrer if it's same site
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin === window.location.origin) {
        window.location.href = ref.href;
        return;
      }
    } catch {}
  }

  // final fallback
  window.location.href = new URL("/html/home/home.html", window.location.origin).href;
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

// ---------- cart storage (same as stall pages) ----------
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

function money(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function calcSubtotal(cart) {
  let subtotal = 0;
  for (const it of Object.values(cart.items || {})) {
    if (!it) continue;
    subtotal += (Number(it.unitPrice) || 0) * (Number(it.qty) || 0);
  }
  return subtotal;
}

// Fees: GST 9%, Service 10%, Rush hour 5% (always)
function calcFees(subtotal) {
  const gst = subtotal * 0.09;
  const svc = subtotal * 0.10;
  const rush = subtotal * 0.05;
  return { gst, svc, rush, feeTotal: gst + svc + rush };
}

// ---------- firebase wrapper ----------
async function loadWrapper() {
  const wrapperPath = window.CART_PAGE?.wrapperPath;
  if (!wrapperPath) throw new Error("window.CART_PAGE.wrapperPath missing");
  const wrapperUrl = new URL(wrapperPath, document.baseURI).href;
  return import(wrapperUrl);
}

function nextOrderId(ordersObj) {
  let maxId = 0;
  for (const [k, v] of Object.entries(ordersObj || {})) {
    const n = Number(v?.OrderID ?? k);
    if (Number.isFinite(n) && n > maxId) maxId = n;
  }
  return maxId + 1;
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

function render() {
  const items = Object.values(cart.items || {}).filter(Boolean);

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

  const subtotal = calcSubtotal(cart);
  const { gst, svc, rush, feeTotal } = calcFees(subtotal);
  const grandTotal = subtotal + feeTotal;

  if (feeGstEl) feeGstEl.textContent = money(gst);
  if (feeSvcEl) feeSvcEl.textContent = money(svc);
  if (feeRushEl) feeRushEl.textContent = money(rush);
  if (feeTotalEl) feeTotalEl.textContent = money(feeTotal);
  if (grandTotalEl) grandTotalEl.textContent = money(grandTotal);
}

render();

// ---------- checkout flow ----------
checkoutBtn?.addEventListener("click", () => {
  confirmCheck.checked = false;
  placeOrderBtn.disabled = true;
  confirmDialog?.showModal();
});

confirmCheck?.addEventListener("change", () => {
  placeOrderBtn.disabled = !confirmCheck.checked;
});

cancelConfirm?.addEventListener("click", () => confirmDialog?.close());

placeOrderBtn?.addEventListener("click", async () => {
  placeOrderBtn.disabled = true;

  try {
    const items = Object.values(cart.items || {}).filter(Boolean);
    if (!items.length) {
      confirmDialog?.close();
      render();
      return;
    }

    const wrapper = await loadWrapper();

    const allOrders = await wrapper.getAllCustOrders();
    const orderId = nextOrderId(allOrders);

    const customerId = getCustomerId();
    const customerForDb = customerId === "guest" ? 0 : (Number(customerId) || 0);

    const orderDate = new Date().toISOString();
    const pmtType = "Card"; // per your placeholder (no cards saved)

    // Save order header
    const okOrder = await wrapper.addCustOrder(orderId, orderDate, pmtType, customerForDb);
    if (!okOrder) throw new Error("addCustOrder failed");

    // Save order items
    let orderItemNo = 1;
    for (const it of items) {
      const okItem = await wrapper.addOrderItem(
        orderId,
        orderItemNo++,
        String(it.stallId),
        String(it.itemCode),
        Number(it.qty) || 0,
        Number(it.unitPrice) || 0
      );
      if (!okItem) throw new Error("addOrderItem failed");
    }

    // Clear cart after successful order
    cart.items = {};
    saveCart(cart);
    render();

    confirmDialog?.close();
    successDialog?.showModal();
  } catch (err) {
    console.error(err);
    placeOrderBtn.disabled = false;
    alert("Failed to place order. Check console for details.");
  }
});

successOk?.addEventListener("click", () => {
  successDialog?.close();
});