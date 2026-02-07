// js/stall_page.js

import { db, ref, get } from "/js/firebase/realtimedb.js";

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

/* ---------- DOM ---------- */
const el = {
  hcName: document.getElementById("hcName"),
  hcAddress: document.getElementById("hcAddress"),
  hcBanner: document.getElementById("hcBanner"),

  cuisineSelect: document.getElementById("cuisineSelect"),
  filterBtn: document.getElementById("filterBtn"),

  favGrid: document.getElementById("favGrid"),
  resultsGrid: document.getElementById("resultsGrid"),
  favEmpty: document.getElementById("favEmpty"),
  resultsEmpty: document.getElementById("resultsEmpty"),

  tpl: document.getElementById("tpl-stall-card"),
};

/* ---------- Back arrow ---------- */
function smartBack() {
  const returnTo = sessionStorage.getItem("stalls:returnTo");
  const fallbackHome = new URL("/html/home/home.html", window.location.origin).href;

  // Use app flow, not browser history
  window.location.replace(returnTo || fallbackHome);
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

function getHcId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("hc") || sessionStorage.getItem("selectedHcId") || "";
}

/* ---------- favorites (local) ---------- */
function getCustomerId() {
  const id = localStorage.getItem("CustomerID");
  return id && id.trim() ? id.trim() : "guest";
}
function favKey(hcId) {
  return `favStalls:${hcId}:${getCustomerId()}`;
}
function loadFavSet(hcId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(favKey(hcId)) || "[]").map(String));
  } catch {
    return new Set();
  }
}
function saveFavSet(hcId, set) {
  localStorage.setItem(favKey(hcId), JSON.stringify([...set]));
}

/* ---------- wrapper loader ---------- */
async function loadWrapper() {
  const p = window.STALLS_PAGE?.wrapperPath || "/js/firebase/wrapper.js";
  const url = new URL(p, document.baseURI).href;
  return import(url);
}

/* ---------- fallbacks ---------- */
async function readAny(paths) {
  for (const p of paths) {
    const snap = await get(ref(db, p));
    if (snap.exists()) return snap.val();
  }
  return null;
}

/* ---------- normalization helpers ---------- */
function stallIdOf(s) {
  return String(s?.StallID ?? s?.id ?? s?.stallId ?? "").trim();
}
function stallNameOf(s, sid) {
  return s?.StallName ?? s?.name ?? s?.stallName ?? `Stall ${sid || ""}`.trim();
}
function stallUnitOf(s) {
  return s?.StallUnitNo ?? s?.unit ?? s?.unitNo ?? s?.unitNumber ?? "-";
}
function stallHcIdOf(s) {
  return (
    s?.hawkerCentreId ??
    s?.hawkerCentreID ??
    s?.HawkerCentreID ??
    s?.HawkerCentreId ??
    s?.HCID ??
    s?.HCId ??
    s?.hcId ??
    s?.hcID ??
    null
  );
}
// Helper to get image from DB object
function stallImageOf(s) {
  return s?.storeImage || s?.image || s?.ImageURL || s?.coverImage || "";
}

function hcNameOf(hc, hcId) {
  return hc?.HCName ?? hc?.name ?? hc?.HawkerCentreName ?? `Hawker Centre ${hcId}`;
}
function hcAddressOf(hc) {
  return hc?.HCAddress ?? hc?.address ?? hc?.HawkerCentreAddress ?? "";
}
function hcImageOf(hc) {
  return hc?.ImageURL ?? hc?.coverImage ?? hc?.image ?? "";
}

/* ---------- data fetchers ---------- */
async function fetchHawkerCentre(wrapper, hcId) {
  if (wrapper?.getHawkerCentre) return await wrapper.getHawkerCentre(hcId);
  return await readAny([`hawkerCentres/${hcId}`, `HawkerCentre/${hcId}`, `hawkerCentre/${hcId}`]);
}

async function fetchStallsForHc(wrapper, hcId) {
  if (wrapper?.listStallsByHawkerCentre) {
    const obj = await wrapper.listStallsByHawkerCentre(hcId);
    return Object.values(obj || {}).filter(Boolean);
  }

  if (wrapper?.getAllFoodStalls) {
    const obj = await wrapper.getAllFoodStalls();
    const all = Object.values(obj || {}).filter(Boolean);
    return all.filter((s) => String(stallHcIdOf(s)) === String(hcId));
  }

  if (wrapper?.listStalls) {
    const obj = await wrapper.listStalls();
    const all = Object.values(obj || {}).filter(Boolean);
    return all.filter((s) => String(stallHcIdOf(s)) === String(hcId));
  }

  const raw = await readAny(["stalls", "Stalls", "foodStall", "FoodStall"]);
  const all = Object.values(raw || {}).filter(Boolean);
  return all.filter((s) => String(stallHcIdOf(s)) === String(hcId));
}

async function buildStallCuisineMap(wrapper) {
  if (wrapper?.getAllCuisines && wrapper?.getAllMenuItemCuisines) {
    const [cuisinesObj, micObj] = await Promise.all([
      wrapper.getAllCuisines().catch(() => null),
      wrapper.getAllMenuItemCuisines().catch(() => null),
    ]);

    const cuisineById = new Map();
    Object.values(cuisinesObj || {}).forEach((c) => {
      if (c?.CuisineID != null) cuisineById.set(String(c.CuisineID), c.CuisineDesc || "");
    });

    const stallToCuisine = new Map();
    Object.values(micObj || {}).forEach((mic) => {
      const sid = String(mic?.StallID ?? "");
      const desc = cuisineById.get(String(mic?.CuisineID ?? ""));
      if (!sid || !desc) return;
      if (!stallToCuisine.has(sid)) stallToCuisine.set(sid, new Set());
      stallToCuisine.get(sid).add(desc);
    });

    return stallToCuisine;
  }

  const miObj =
    (wrapper?.listMenuItems ? await wrapper.listMenuItems().catch(() => null) : null) ||
    (wrapper?.getAllMenuItems ? await wrapper.getAllMenuItems().catch(() => null) : null) ||
    (await readAny(["menuItems", "MenuItems", "MenuItem"]));

  const map = new Map();
  Object.values(miObj || {}).forEach((mi) => {
    const sid = String(mi?.stallId ?? mi?.StallID ?? mi?.StallId ?? "").trim();
    if (!sid) return;

    const tag = String(
      mi?.cuisine ?? mi?.CuisineDesc ?? mi?.ItemCategory ?? mi?.category ?? mi?.type ?? ""
    ).trim();
    if (!tag) return;

    if (!map.has(sid)) map.set(sid, new Set());
    map.get(sid).add(tag);
  });

  return map;
}

/* ---------- render ---------- */
function clear(node) {
  if (node) node.innerHTML = "";
}
function showEmpty(emptyEl, len) {
  if (emptyEl) emptyEl.style.display = len ? "none" : "block";
}
function setHeroImage(url) {
  if (!el.hcBanner) return;
  el.hcBanner.src = url || "";
  // Ensure banner also aligns to top if you want consistency
  el.hcBanner.style.objectPosition = "center top"; 
}

function renderGrid({ hcId, stalls, favSet, stallToCuisine, gridEl, emptyEl, onRefresh }) {
  if (!el.tpl || !gridEl) return;

  clear(gridEl);
  showEmpty(emptyEl, stalls.length);

  stalls.forEach((s) => {
    const sid = stallIdOf(s);
    if (!sid) return;

    const card = el.tpl.content.firstElementChild.cloneNode(true);
    card.dataset.stallId = sid;

    // content
    card.querySelector(".stall-card__name").textContent = stallNameOf(s, sid);
    card.querySelector(".stall-card__unit").textContent = `Unit: ${stallUnitOf(s)}`;

    const cset = stallToCuisine.get(sid);
    card.querySelector(".stall-card__cuisine").textContent =
      cset && cset.size ? [...cset].join(", ") : "Cuisine Type";

    // image
    const imgDiv = card.querySelector(".stall-card__img");
    if (imgDiv) {
      // 1. Try to get image from DB object
      let imgUrl = stallImageOf(s);
      
      // 2. If no DB image, fallback to local convention
      if (!imgUrl) {
          imgUrl = `/images/stalls/${sid}.jpg`;
      }

      imgDiv.style.backgroundImage = `url("${imgUrl}")`;
      imgDiv.style.backgroundSize = "cover";
      // ✅ UPDATED: Align image to the top
      imgDiv.style.backgroundPosition = "center top";
    }

    // fav
    const favBtn = card.querySelector(".stall-card__fav");
    favBtn.setAttribute("aria-pressed", favSet.has(sid) ? "true" : "false");
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (favSet.has(sid)) favSet.delete(sid);
      else favSet.add(sid);
      saveFavSet(hcId, favSet);
      onRefresh?.();
    });

    // view menu (button click)
    card.querySelector(".stall-card__btn").addEventListener("click", (e) => {
      e.stopPropagation();
      sessionStorage.setItem("stallList:returnTo", window.location.href);
      window.location.href = `/html/Stall/stall_dish.html?stall=${encodeURIComponent(sid)}`;
    });

    // view menu (card click)
    card.addEventListener("click", () => {
        sessionStorage.setItem("stallList:returnTo", window.location.href);
        window.location.href = `/html/Stall/stall_dish.html?stall=${encodeURIComponent(sid)}`;
    });

    gridEl.appendChild(card);
  });
}

(async function init() {
  const hcId = getHcId();
  console.log("[stall] url =", location.href);
  console.log("[stall] hcId =", hcId);

  if (!hcId) {
    if (el.hcName) el.hcName.textContent = "Missing Hawker Centre ID";
    if (el.hcAddress) el.hcAddress.textContent = "Open this page like: stall.html?hc=101";
    return;
  }

  sessionStorage.setItem("selectedHcId", hcId);

  try {
    const wrapper = await loadWrapper();
    console.log("[stall] wrapper exports =", Object.keys(wrapper || {}));

    const [hc, stallsForHc, stallToCuisine] = await Promise.all([
      fetchHawkerCentre(wrapper, hcId),
      fetchStallsForHc(wrapper, hcId),
      buildStallCuisineMap(wrapper),
    ]);

    // hero
    if (el.hcName) el.hcName.textContent = hcNameOf(hc, hcId);
    if (el.hcAddress) el.hcAddress.textContent = hcAddressOf(hc);
    setHeroImage(hcImageOf(hc));

    const favSet = loadFavSet(hcId);

    // dropdown cuisines
    const cuisineSet = new Set();
    stallsForHc.forEach((s) => {
      const sid = stallIdOf(s);
      const set = stallToCuisine.get(sid);
      if (!set) return;
      for (const c of set) cuisineSet.add(c);
    });

    if (el.cuisineSelect) {
      el.cuisineSelect.innerHTML = `<option value="">All Cuisines</option>`;
      [...cuisineSet].sort().forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        el.cuisineSelect.appendChild(opt);
      });

      // if we have no cuisine data, disable filter UI
      const hasCuisine = cuisineSet.size > 0;
      el.cuisineSelect.disabled = !hasCuisine;
      if (el.filterBtn) el.filterBtn.disabled = !hasCuisine;
    }

    function refresh() {
      const selected = el.cuisineSelect ? el.cuisineSelect.value : "";
      const results = selected
        ? stallsForHc.filter((s) => {
            const sid = stallIdOf(s);
            const set = stallToCuisine.get(sid);
            return set ? set.has(selected) : false;
          })
        : stallsForHc;

      const favStalls = stallsForHc.filter((s) => favSet.has(stallIdOf(s))).slice(0, 3);

      renderGrid({
        hcId,
        stalls: favStalls,
        favSet,
        stallToCuisine,
        gridEl: el.favGrid,
        emptyEl: el.favEmpty,
        onRefresh: refresh,
      });

      renderGrid({
        hcId,
        stalls: results,
        favSet,
        stallToCuisine,
        gridEl: el.resultsGrid,
        emptyEl: el.resultsEmpty,
        onRefresh: refresh,
      });
    }

    refresh();
    el.filterBtn?.addEventListener("click", refresh);
  } catch (err) {
    console.error("[stall] init failed:", err);
    if (el.hcName) el.hcName.textContent = "Error loading stalls";
    if (el.hcAddress) el.hcAddress.textContent = err?.message || String(err);
  }
})();