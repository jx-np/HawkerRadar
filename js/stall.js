import {
  getHawkerCentre,
  getAllFoodStalls,
  getAllCuisines,
  getAllMenuItemCuisines,
} from "/js/firebase/wrapper.js";

// fallback direct read (in case your node names differ)
import { db, ref, get } from "/js/firebase/realtimedb.js";

function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

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

function getHcId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("hc") || sessionStorage.getItem("selectedHcId") || "";
}

function setHeroImage(url) {
  if (!el.hcBanner) return;
  if (!url) {
    el.hcBanner.removeAttribute("src");
    return;
  }
  el.hcBanner.src = url;
}

function favKey(hcId) {
  return `favStalls:${hcId}`;
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

async function readAny(pathList) {
  for (const p of pathList) {
    const snap = await get(ref(db, p));
    if (snap.exists()) return snap.val();
  }
  return null;
}

async function getAllFoodStallsSafe() {
  const viaWrapper = await getAllFoodStalls();
  if (viaWrapper) return viaWrapper;

  // fallback if your Firebase node name is different
  return await readAny(["foodStall", "FoodStall", "foodstall", "FOODSTALL"]);
}

function buildCuisineMaps(cuisinesObj, micObj) {
  const cuisineById = new Map();
  Object.values(cuisinesObj || {}).forEach((c) => {
    if (c?.CuisineID != null) cuisineById.set(String(c.CuisineID), c.CuisineDesc || "");
  });

  const stallToCuisine = new Map(); // StallID -> Set(desc)
  Object.values(micObj || {}).forEach((mic) => {
    if (!mic?.StallID || mic?.CuisineID == null) return;
    const sid = String(mic.StallID);
    const desc = cuisineById.get(String(mic.CuisineID));
    if (!desc) return;

    if (!stallToCuisine.has(sid)) stallToCuisine.set(sid, new Set());
    stallToCuisine.get(sid).add(desc);
  });

  return { cuisineById, stallToCuisine };
}

function renderStalls(hcId, stalls, favSet, stallToCuisine) {
  // Dropdown options
  const cuisineSet = new Set();
  stalls.forEach((s) => {
    const set = stallToCuisine.get(String(s.StallID));
    if (!set) return;
    for (const c of set) cuisineSet.add(c);
  });

  // reset dropdown (keep first option)
  el.cuisineSelect.innerHTML = `<option value="">All Cuisines</option>`;
  [...cuisineSet].sort().forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    el.cuisineSelect.appendChild(opt);
  });

  const selectedCuisine = el.cuisineSelect.value || "";

  const favStalls = stalls.filter((s) => favSet.has(String(s.StallID))).slice(0, 3);
  const results = selectedCuisine
    ? stalls.filter((s) => {
        const set = stallToCuisine.get(String(s.StallID));
        return set ? set.has(selectedCuisine) : false;
      })
    : stalls;

  // render helper
  const renderGrid = (grid, emptyEl, list) => {
    grid.innerHTML = "";
    emptyEl.style.display = list.length ? "none" : "block";

    list.forEach((stall) => {
      const sid = String(stall.StallID);

      const card = el.tpl.content.firstElementChild.cloneNode(true);
      card.dataset.stallId = sid;

      card.querySelector(".stall-card__name").textContent = stall.StallName || `Stall ${sid}`;
      card.querySelector(".stall-card__unit").textContent = `Stall Unit: ${stall.StallUnitNo || "-"}`;

      const cuisines = stallToCuisine.get(sid);
      card.querySelector(".stall-card__cuisine").textContent =
        cuisines && cuisines.size ? [...cuisines].join(", ") : "Cuisine Type";

      // fav button
      const favBtn = card.querySelector(".stall-card__fav");
      favBtn.setAttribute("aria-pressed", favSet.has(sid) ? "true" : "false");

      favBtn.addEventListener("click", () => {
        if (favSet.has(sid)) favSet.delete(sid);
        else favSet.add(sid);
        saveFavSet(hcId, favSet);
        renderStalls(hcId, stalls, favSet, stallToCuisine); // re-render
      });

      // view menu
      card.querySelector(".stall-card__btn").addEventListener("click", () => {
        sessionStorage.setItem("stallList:returnTo", window.location.href); // ✅ add this
        window.location.href = `./stall_dish.html?stall=${encodeURIComponent(sid)}`;
      });

      grid.appendChild(card);
    });
  };

  renderGrid(el.favGrid, el.favEmpty, favStalls);
  renderGrid(el.resultsGrid, el.resultsEmpty, results);
}

(async function init() {
  const hcId = getHcId();
  if (!hcId) {
    el.hcName.textContent = "Missing Hawker Centre ID";
    return;
  }

  sessionStorage.setItem("selectedHcId", hcId);

  const centre = await getHawkerCentre(hcId);
  el.hcName.textContent = centre?.HCName || `Hawker Centre ${hcId}`;
  el.hcAddress.textContent = centre?.HCAddress || "";
  setHeroImage(centre?.ImageURL || "");

  const stallsObj = await getAllFoodStallsSafe();
  const allStalls = Object.values(stallsObj || {});

  // IMPORTANT: wrapper uses HawkerCentreID (capital C)
  const stallsForHc = allStalls.filter((s) => String(s?.HawkerCentreID) === String(hcId));

  // cuisines (optional)
  const [cuisinesObj, micObj] = await Promise.all([
    getAllCuisines().catch(() => null),
    getAllMenuItemCuisines().catch(() => null),
  ]);

  const { stallToCuisine } = buildCuisineMaps(cuisinesObj, micObj);

  const favSet = loadFavSet(hcId);

  // Debug logs (super useful)
  console.log("[stall] hcId:", hcId);
  console.log("[stall] total stalls in DB:", allStalls.length);
  console.log("[stall] stallsForHc:", stallsForHc.length);
  console.log("[stall] sample stall object:", allStalls[0]);

  renderStalls(hcId, stallsForHc, favSet, stallToCuisine);

  el.filterBtn.addEventListener("click", () => renderStalls(hcId, stallsForHc, favSet, stallToCuisine));
})();
