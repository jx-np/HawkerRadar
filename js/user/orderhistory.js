// js/user/orderhistory.js
// Order history page — load and display user orders

function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => root.querySelectorAll(sel);

// Mock order data (replace with Firebase calls)
const mockOrders = [
  {
    id: "ORD001",
    stallName: "Taste of Chicken Rice",
    date: new Date("2026-02-06"),
    time: "2:30 PM",
    status: "completed",
    subtotal: 25.00,
    tax: 1.50,
    total: 26.50,
    items: [
      { name: "Chicken Rice", qty: 2, price: 10.00 },
      { name: "Egg", qty: 1, price: 5.00 },
    ],
  },
  {
    id: "ORD002",
    stallName: "Fresh Noodle",
    date: new Date("2026-02-05"),
    time: "1:15 PM",
    status: "completed",
    subtotal: 18.00,
    tax: 1.08,
    total: 19.08,
    items: [
      { name: "Laksa Noodle", qty: 1, price: 12.00 },
      { name: "Drink", qty: 1, price: 6.00 },
    ],
  },
  {
    id: "ORD003",
    stallName: "Dumpling House",
    date: new Date("2026-01-28"),
    time: "12:00 PM",
    status: "cancelled",
    subtotal: 15.00,
    tax: 0.90,
    total: 15.90,
    items: [
      { name: "Dumplings (10pc)", qty: 1, price: 12.00 },
      { name: "Soy Sauce", qty: 1, price: 3.00 },
    ],
  },
];

function formatDate(date) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-SG", options);
}

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

function filterOrders() {
  const timeFilter = $("select#timeFilter").value;
  const statusFilter = $("select#statusFilter").value;

  const now = new Date();
  const filtered = mockOrders.filter((order) => {
    // Time filter
    if (timeFilter) {
      const days = parseInt(timeFilter, 10);
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      if (order.date < cutoff) return false;
    }

    // Status filter
    if (statusFilter && order.status !== statusFilter) return false;

    return true;
  });

  return filtered;
}

function renderOrders() {
  const container = $("div#ordersContainer");
  const emptyState = $("div#emptyState");
  const tplCard = $("#tpl-order-card");
  const tplItem = $("#tpl-order-item");

  if (!container || !tplCard || !tplItem) return;

  const orders = filterOrders();

  container.innerHTML = "";

  if (orders.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  orders.forEach((order) => {
    const card = tplCard.content.firstElementChild.cloneNode(true);

    // Header info
    card.querySelector(".order-id").textContent = order.id;
    card.querySelector(".order-date").textContent = formatDate(order.date);
    card.querySelector(".order-time").textContent = order.time;
    card.querySelector(".order-status").textContent = order.status.toUpperCase();
    card.querySelector(".order-status").classList.toggle("cancelled", order.status === "cancelled");

    // Stall name
    card.querySelector(".order-card__stall").textContent = order.stallName;

    // Items list
    const itemsList = card.querySelector(".order-items-list");
    order.items.forEach((item) => {
      const itemNode = tplItem.content.firstElementChild.cloneNode(true);
      itemNode.querySelector(".order-item__name").textContent = item.name;
      itemNode.querySelector(".order-item__qty").textContent = `x${item.qty}`;
      itemNode.querySelector(".order-item__price").textContent = formatMoney(item.price * item.qty);
      itemsList.appendChild(itemNode);
    });

    // Meta (subtotal, tax, total)
    const metaRows = card.querySelectorAll(".order-meta-row");
    if (metaRows[0]) metaRows[0].querySelector(".order-meta-value").textContent = formatMoney(order.subtotal);
    if (metaRows[1]) metaRows[1].querySelector(".order-meta-value").textContent = formatMoney(order.tax);
    if (metaRows[2]) metaRows[2].querySelector(".order-meta-value").textContent = formatMoney(order.total);

    // Buttons
    const viewBtn = card.querySelector(".order-btn--view");
    const reorderBtn = card.querySelector(".order-btn--reorder");

    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        alert(`View details for order ${order.id}`);
      });
    }

    if (reorderBtn) {
      reorderBtn.addEventListener("click", () => {
        alert(`Reorder from ${order.stallName}`);
      });
    }

    container.appendChild(card);
  });
}

function initFilterHandlers() {
  const timeFilter = $("select#timeFilter");
  const statusFilter = $("select#statusFilter");

  [timeFilter, statusFilter].forEach((filter) => {
    if (filter) {
      filter.addEventListener("change", renderOrders);
    }
  });
}

(function init() {
  renderOrders();
  initFilterHandlers();
})();
