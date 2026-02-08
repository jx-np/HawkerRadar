import {
  getHawkerCentre,
  listStallsByHawkerCentre,
} from "/js/firebase/wrapper.js";

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
  pageBackBtn: document.getElementById("pageBackBtn"),
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
  return (
    url.searchParams.get("hc") || sessionStorage.getItem("selectedHcId") || ""
  );
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
    return new Set(
      JSON.parse(localStorage.getItem(favKey(hcId)) || "[]").map(String)
    );
  } catch {
    return new Set();
  }
}

function saveFavSet(hcId, set) {
  localStorage.setItem(favKey(hcId), JSON.stringify([...set]));
}

function renderStalls(hcId, stalls, favSet) {
  // 1. Build Dropdown Options
  const cuisineSet = new Set();
  stalls.forEach((s) => {
    if (s.cuisine) {
      cuisineSet.add(s.cuisine);
    }
  });

  el.cuisineSelect.innerHTML = `<option value="">All Cuisines</option>`;
  [...cuisineSet].sort().forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    el.cuisineSelect.appendChild(opt);
  });

  const selectedCuisine = el.cuisineSelect.value || "";

  // 2. Filter Stalls
  const favStalls = stalls
    .filter((s) => favSet.has(String(s.id)))
    .slice(0, 3);

  const results = selectedCuisine
    ? stalls.filter((s) => s.cuisine === selectedCuisine)
    : stalls;

  // 3. Render Helper
  const renderGrid = (grid, emptyEl, list) => {
    grid.innerHTML = "";
    emptyEl.style.display = list.length ? "none" : "block";

    list.forEach((stall) => {
      const sid = String(stall.id);
      const card = el.tpl.content.firstElementChild.cloneNode(true);
      card.dataset.stallId = sid;

      // Text Content
      card.querySelector(".stall-card__name").textContent =
        stall.name || `Stall ${sid}`;
      card.querySelector(".stall-card__unit").textContent = `Unit: ${
        stall.unitNo || "-"
      }`;
      card.querySelector(".stall-card__cuisine").textContent =
        stall.cuisine || "Cuisine Type";

      // Image
      const imgEl = card.querySelector(".stall-card__img");
      const imageUrl = stall.storeImage || "";

      if (imgEl && imageUrl) {
        imgEl.style.backgroundImage = `url('${imageUrl}')`;
        imgEl.style.backgroundSize = "cover";
        imgEl.style.backgroundPosition = "top center";
      }

      // Fav Button Logic
      const favBtn = card.querySelector(".stall-card__fav");
      if (favBtn) {
        // Force state update immediately
        const isFav = favSet.has(sid);
        favBtn.setAttribute("aria-pressed", isFav ? "true" : "false");

        favBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          
          if (favSet.has(sid)) {
             favSet.delete(sid);
          } else {
             favSet.add(sid);
          }
          
          console.log(`Toggled Favorite for ${sid}. New State:`, favSet.has(sid));
          
          saveFavSet(hcId, favSet);
          renderStalls(hcId, stalls, favSet); // Re-render to update UI
        });
      }

      // Card Click
      const actionBtn = card.querySelector(".stall-card__btn");
      if (actionBtn) {
        actionBtn.addEventListener("click", () => {
          sessionStorage.setItem("stallList:returnTo", window.location.href);

          const url = new URL("./stall_dish.html", window.location.href);
          url.searchParams.set("stall", String(sid));

          sessionStorage.setItem("stallMenu:url", url.href);
          sessionStorage.setItem("lastStallId", String(sid));

          window.location.href = url.href;
        });
      }

      grid.appendChild(card);
    });
  };

  renderGrid(el.favGrid, el.favEmpty, favStalls);
  renderGrid(el.resultsGrid, el.resultsEmpty, results);
}

(async function init() {
  if (el.pageBackBtn) {
    el.pageBackBtn.addEventListener("click", () => {
      const returnTo = sessionStorage.getItem("stalls:returnTo");
      const fallbackHome = new URL("/html/home/home.html", window.location.origin).href;
      window.location.replace(returnTo || fallbackHome);
    });
  }

  const hcId = getHcId();
  if (!hcId) {
    el.hcName.textContent = "Missing Hawker Centre ID";
    return;
  }

  sessionStorage.setItem("lastHcId", hcId);

  const centre = await getHawkerCentre(hcId);
  el.hcName.textContent = centre?.name || `Hawker Centre ${hcId}`;
  el.hcAddress.textContent = centre?.address || "";
  setHeroImage(centre?.coverImage || "");

  const stallsMap = await listStallsByHawkerCentre(hcId);
  const stallsForHc = Object.values(stallsMap || {});

  const favSet = loadFavSet(hcId);

  console.log("[stall] hcId:", hcId);
  console.log("[stall] stalls found:", stallsForHc.length);

  renderStalls(hcId, stallsForHc, favSet);

  el.filterBtn.addEventListener("click", () =>
    renderStalls(hcId, stallsForHc, favSet)
  );
})();