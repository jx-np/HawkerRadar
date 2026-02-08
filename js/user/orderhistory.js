// js/user/orderhistory.js
// Order history page — load and display user orders from Firebase

import { getCurrentUser, isAuthenticated } from "/js/modules/auth.js";
import { getAllOrderItems, getAllFoodStalls, listenToAllOrders } from "/js/firebase/wrapper.js";

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

function formatDate(date) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-SG", options);
}

function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`;
}

// Store orders globally for filtering
let allOrders = [];
let unsubscribeListener = null;

async function fetchUserOrders() {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const orderItemsObj = await getAllOrderItems();
    const stallsObj = await getAllFoodStalls();
    
    // Group order items by OrderID and filter by current user's CustomerID
    const ordersMap = new Map();
    const orderItemsArr = Object.values(orderItemsObj || {});
    
    orderItemsArr.forEach((item) => {
      // Check if order belongs to current user (CustomerID or UserId property)
      if (String(item?.CustomerID || item?.UserId) !== String(user.userId)) return;
      
      const orderId = String(item?.OrderID || "");
      if (!orderId) return;
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          id: orderId,
          date: item.OrderDate ? new Date(item.OrderDate) : new Date(),
          time: item.OrderTime || formatTimeFromDate(item.OrderDate),
          status: item.OrderStatus || "received",
          items: [],
          subtotal: 0,
          stallId: item.StallID,
          stallName: "",
        });
      }
      
      const orderData = ordersMap.get(orderId);
      const itemPrice = Number(item?.UnitPrice || 0);
      const itemQty = Number(item?.Quantity || 1);
      orderData.items.push({
        name: item.ItemDesc || item.ItemName || "Item",
        qty: itemQty,
        price: itemPrice,
      });
      orderData.subtotal += itemPrice * itemQty;
    });
    
    // Fill in stall names
    const stallsArr = Object.values(stallsObj || {});
    for (const order of ordersMap.values()) {
      const stall = stallsArr.find((s) => String(s?.StallID) === String(order.stallId));
      if (stall) order.stallName = stall.StallName || stall.StallDesc || `Stall ${order.stallId}`;
    }
    
    // Convert to array and sort by date (newest first)
    const orders = Array.from(ordersMap.values());
    orders.sort((a, b) => b.date - a.date);
    
    return orders;
  } catch (err) {
    console.error("Failed to fetch user orders:", err);
    return [];
  }
}

function formatTimeFromDate(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function filterOrders() {
  const timeFilter = $("select#timeFilter").value;
  const statusFilter = $("select#statusFilter").value;

  const now = new Date();
  const filtered = allOrders.filter((order) => {
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

    // Meta (subtotal, tax, total) - calculate tax as 6% of subtotal
    const tax = order.subtotal * 0.06;
    const total = order.subtotal + tax;
    const metaRows = card.querySelectorAll(".order-meta-row");
    if (metaRows[0]) metaRows[0].querySelector(".order-meta-value").textContent = formatMoney(order.subtotal);
    if (metaRows[1]) metaRows[1].querySelector(".order-meta-value").textContent = formatMoney(tax);
    if (metaRows[2]) metaRows[2].querySelector(".order-meta-value").textContent = formatMoney(total);

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

async function init() {
  const user = getCurrentUser();
  
  // Show login prompt if not authenticated
  if (!user || !isAuthenticated()) {
    const container = $("div#ordersContainer");
    if (container) {
      container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: rgba(0,0,0,0.7);"><p style="margin-bottom: 15px;">Please <a href="../auth/login.html" style="color: #FF3838; text-decoration: underline;">log in</a> to view your order history.</p></div>';
    }
    return;
  }

  // Fetch user orders from Firebase
  allOrders = await fetchUserOrders();
  
  // Initial render
  renderOrders();
  
  // Attach filter handlers
  initFilterHandlers();

  // Set up real-time listener for orders changes
  if (unsubscribeListener) {
    unsubscribeListener();
  }
  unsubscribeListener = listenToAllOrders(async (ordersData) => {
    console.log('Orders updated in real-time:', ordersData);
    // Re-fetch user-filtered orders when any orders change
    allOrders = await fetchUserOrders();
    renderOrders();
  });

  // Clean up listener on page unload
  window.addEventListener('beforeunload', () => {
    if (unsubscribeListener) {
      unsubscribeListener();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
