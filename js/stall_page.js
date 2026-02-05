import {
  getHawkerCentre,
  getAllFoodStalls,
  getAllCuisines,
  getAllMenuItemCuisines,
} from "/js/firebase/wrapper.js";

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

function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

// ✅ Back arrow behavior
function smartBack() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  // fallback if no history
  window.location.href = new URL("/html/home/home.html", window.location.origin).href;
}
document.getElementById("pageBackBtn")?.addEventListener("click", smartBack);

function getHcId() {
  const url = new URL(window.location.href);
  return url.searchParams.get("hc") || sessionStorage.getItem("selectedHcId") || "";
}

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

function setHeroImage(url) {
  if (!el.hcBanner) return;
  el.hcBanner.src = url || "";
}

function clear(node) {
  if (!node) return;
  node.innerHTML = "";
}

function showEmpty(grid, emptyEl, listLen) {
  if (!grid || !emptyEl) return;
  emptyEl.style.display = listLen ? "none" : "block";
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

  return { stallToCuisine };
}

function getStallHcId(stall) {
  // tolerate different field names
  return (
    stall?.HawkerCentreID ??
    stall?.HawkerCentreId ??
    stall?.HCID ??
    stall?.HCId ??
    stall?.hcId ??
    stall?.hcID ??
    null
  );
}

function renderGrid({ hcId, stalls, favSet, stallToCuisine, gridEl, emptyEl }) {
  if (!el.tpl || !gridEl) return;

  clear(gridEl);
  showEmpty(gridEl, emptyEl, stalls.length);

  stalls.forEach((s) => {
    const sid = String(s.StallID ?? "");
    if (!sid) return;

    const card = el.tpl.content.firstElementChild.cloneNode(true);
    card.dataset.stallId = sid;

    // name/unit/cuisine
    const nameEl = card.querySelector(".stall-card__name");
    const unitEl = card.querySelector(".stall-card__unit");
    const cuisineEl = card.querySelector(".stall-card__cuisine");

    if (nameEl) nameEl.textContent = s.StallName || `Stall ${sid}`;
    if (unitEl) unitEl.textContent = `Stall Unit: ${s.StallUnitNo || "-"}`;

    const cset = stallToCuisine.get(sid);
    if (cuisineEl) cuisineEl.textContent = cset && cset.size ? [...cset].join(", ") : "Cuisine Type";

    // image (DIV background)
    const imgDiv = card.querySelector(".stall-card__img");
    if (imgDiv) {
      imgDiv.style.backgroundImage = `url("../../images/stalls/${sid}.jpg")`;
      imgDiv.style.backgroundSize = "cover";
      imgDiv.style.backgroundPosition = "center";
    }

    // fav button
    const favBtn = card.querySelector(".stall-card__fav");
    if (favBtn) {
      favBtn.setAttribute("aria-pressed", favSet.has(sid) ? "true" : "false");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (favSet.has(sid)) favSet.delete(sid);
        else favSet.add(sid);
        saveFavSet(hcId, favSet);
        // re-render handled by caller
      });
    }

    // view menu
    const viewBtn = card.querySelector(".stall-card__btn");
    if (viewBtn) {
      viewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = `./stall_dish.html?stall=${encodeURIComponent(sid)}`;
      });
    }

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

  const [hc, stallsObj, cuisinesObj, micObj] = await Promise.all([
    getHawkerCentre(hcId),
    getAllFoodStalls(),
    getAllCuisines().catch(() => null),
    getAllMenuItemCuisines().catch(() => null),
  ]);

  // hero
  if (hc) {
    if (el.hcName) el.hcName.textContent = hc.HCName || "Hawker Centre";
    if (el.hcAddress) el.hcAddress.textContent = hc.HCAddress || "";
    setHeroImage(hc.ImageURL || "");
  } else {
    if (el.hcName) el.hcName.textContent = "Hawker Centre not found";
  }

  const allStallsRaw = Object.values(stallsObj || {}).filter(Boolean);
  const stallsForHc = allStallsRaw.filter((s) => String(getStallHcId(s)) === String(hcId));

  const { stallToCuisine } = buildCuisineMaps(cuisinesObj, micObj);

  // build dropdown
  if (el.cuisineSelect) {
    el.cuisineSelect.innerHTML = `<option value="">All Cuisines</option>`;
    const cuisineSet = new Set();
    stallsForHc.forEach((s) => {
      const set = stallToCuisine.get(String(s.StallID));
      if (!set) return;
      for (const c of set) cuisineSet.add(c);
    });
    [...cuisineSet].sort().forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      el.cuisineSelect.appendChild(opt);
    });
  }

  const favSet = loadFavSet(hcId);

  function refresh() {
    const selected = el.cuisineSelect ? el.cuisineSelect.value : "";

    const results = selected
      ? stallsForHc.filter((s) => {
          const set = stallToCuisine.get(String(s.StallID));
          return set ? set.has(selected) : false;
        })
      : stallsForHc;

    const favStalls = stallsForHc.filter((s) => favSet.has(String(s.StallID))).slice(0, 3);

    renderGrid({
      hcId,
      stalls: favStalls,
      favSet,
      stallToCuisine,
      gridEl: el.favGrid,
      emptyEl: el.favEmpty,
    });

    renderGrid({
      hcId,
      stalls: results,
      favSet,
      stallToCuisine,
      gridEl: el.resultsGrid,
      emptyEl: el.resultsEmpty,
    });

    // re-wire fav buttons (they save + then we refresh)
    document.querySelectorAll(".stall-card__fav").forEach((btn) => {
      btn.addEventListener("click", () => refresh(), { once: true });
    });
  }

  refresh();
  el.filterBtn?.addEventListener("click", refresh);
})();