// js/fooditem.js
// Loads menu items for a single stall and renders them using #tpl-dish-row

import { getAllMenuItems } from "/js/firebase/wrapper.js";
import { initStallCart } from "/js/stall_cart.js";

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

function getStallId() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("stall") || "").trim();
}

function clearNode(n) { while (n.firstChild) n.removeChild(n.firstChild); }

function toNumberPrice(v) {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toMoney(v) { const n = toNumberPrice(v); return `$${n.toFixed(2)}`; }

function setImgWithFallback(imgEl, primary, fallback, alt = "") {
  if (!imgEl) return;
  imgEl.alt = alt || "";
  imgEl.src = primary || fallback || "";
  imgEl.addEventListener(
    "error",
    () => { if (fallback && imgEl.src !== fallback) imgEl.src = fallback; },
    { once: true }
  );
}

async function render() {
  const stallId = getStallId();
  const listEl = document.getElementById("dish-list");
  const tpl = document.getElementById("tpl-dish-row");

  if (!listEl || !tpl) return console.warn("Missing template or list container");
  if (!stallId) {
    listEl.innerHTML = "<li class=\"stall-empty\">Missing stall id</li>";
    return;
  }

  try {
    const all = await getAllMenuItems();
    const items = Object.values(all || {}).filter((it) => String(it?.StallID) === String(stallId));

    clearNode(listEl);

    // map for cart init: ItemCode -> { name, unitPrice }
    const dishMap = new Map();

    items.forEach((it) => {
      const itemCode = String(it.ItemCode ?? "");
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.setAttribute("data-item-code", itemCode);

      node.querySelector(".dish-row__name").textContent = it.ItemDesc || `Item ${itemCode}`;
      const desc = node.querySelector(".dish-row__desc");
      if (desc) desc.textContent = it.ItemCategory || "";

      const priceEl = node.querySelector(".dish-row__price");
      if (priceEl) priceEl.childNodes[0].textContent = toMoney(it.ItemPrice || 0);

      const img = node.querySelector(".dish-row__thumb");
      const guess = `../../images/dishes/${stallId}_${itemCode}.jpg`;
      const fallback = "../../images/dishes/placeholder.jpg";
      setImgWithFallback(img, guess, fallback, it.ItemDesc || "");

      // favorite (UI only for now)
      const favBtn = node.querySelector(".dish-row__fav-btn");
      if (favBtn) favBtn.setAttribute("aria-pressed", "false");

      // edit / remove handlers (placeholders)
      const editBtn = node.querySelector(".dish-row__edit");
      if (editBtn) editBtn.addEventListener("click", (e) => { e.stopPropagation(); alert('Edit dish: ' + itemCode); });

      const removeBtn = node.querySelector(".dish-row__remove");
      if (removeBtn) removeBtn.addEventListener("click", (e) => { e.stopPropagation(); if (confirm('Delete dish ' + itemCode + '?')) node.remove(); });

      // make the whole row navigable to the dish detail page
      node.setAttribute('role', 'link');
      node.tabIndex = 0;
      node.addEventListener('click', (e) => {
        // ignore clicks on controls (cart buttons, fav, edit, remove)
        if (e.target.closest('[data-action]') || e.target.closest('.dish-row__fav-btn') || e.target.closest('.dish-row__edit') || e.target.closest('.dish-row__remove')) return;
        window.location.href = `./dish.html?stall=${encodeURIComponent(stallId)}&item=${encodeURIComponent(itemCode)}`;
      });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') node.click();
      });

      listEl.appendChild(node);

      dishMap.set(itemCode, { name: it.ItemDesc || itemCode, unitPrice: toNumberPrice(it.ItemPrice) });
    });

    // wire up cart behaviour (from existing module)
    initStallCart({ stallId, dishMap });

  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<li class=\"stall-empty\">Error loading menu: ${String(err?.message||err)}</li>`;
  }
}

document.addEventListener("DOMContentLoaded", render);
