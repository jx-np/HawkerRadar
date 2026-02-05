// /js/hawker.js
import { getAllHawkerCentres, getAllFoodStalls } from "/js/firebase/wrapper.js";

const regionSelect = document.getElementById("region");
const hcGrid = document.getElementById("hcGrid");

// Function to render hawker centre cards
function renderHawkerCentres(centres) {
  if (!hcGrid) return;
  hcGrid.innerHTML = ""; // clear previous cards

  Object.entries(centres).forEach(([hcId, centre]) => {
    const realHcId = String(centre.HawkerCentreID ?? centre.HCId ?? centre.HCID ?? hcId);

    hcGrid.innerHTML += `
      <div class="hc-card" data-hc-id="${realHcId}">
        <div class="hc-image" style="background-image: url('${centre.ImageURL}');"></div>
        <div class="hc-info">
          <div class="hc-info-top">
            <strong>${centre.HCName}</strong>
            <span class="hc-price">${centre.PriceRange}</span>
            <button class="hc-view-menu" type="button">View Menu</button>
          </div>
          <em>${centre.Region}</em>
        </div>
      </div>
    `;
  });
}

// Initialize: fetch data and render
async function init() {
  const centres = await getAllHawkerCentres();
  if (!centres) return;

  renderHawkerCentres(centres);

  const filterButton = document.querySelector(".filter-bar button");
  filterButton?.addEventListener("click", () => {
    const selectedRegion = (regionSelect?.value || "").toLowerCase();

    const filtered = Object.fromEntries(
      Object.entries(centres).filter(([, centre]) => {
        if (!selectedRegion) return true;
        return (centre.Region || "").toLowerCase() === selectedRegion;
      })
    );

    renderHawkerCentres(filtered);
  });
}

init();

// ✅ Smooth scroll (only if elements exist)
const searchButton = document.querySelector(".hero-buttons button:first-child");
const banner = document.querySelector(".ad-banner");

searchButton?.addEventListener("click", () => {
  if (!banner) return;
  const headerOffset = 120;
  const bannerPosition = banner.getBoundingClientRect().top + window.pageYOffset;
  window.scrollTo({ top: bannerPosition - headerOffset, behavior: "smooth" });
});

// ✅ Back to top (only if element exists)
const backToTopBtn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (!backToTopBtn) return;
  backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
});

backToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ✅ Hawker Centre "View Menu" -> stall.html?hc=...
hcGrid?.addEventListener("click", (e) => {
  const btn = e.target.closest(".hc-view-menu");
  if (!btn) return;

  const card = btn.closest(".hc-card");
  const hcId = card?.dataset?.hcId;
  if (!hcId) return;

  sessionStorage.setItem("selectedHcId", hcId);

  // robust absolute path
  const url = new URL("/html/stall/stall.html", window.location.origin);
  url.searchParams.set("hc", hcId);
  window.location.href = url.href;
});

// ✅ Featured Stalls "View Menu" -> stall_dish.html?stall=...
// Requires featured buttons to have class="feature-view-menu"
// Best: set data-stall-id="123"
// Fallback: set data-stall-name="Exact StallName in Firebase"
const featuredGrid = document.querySelector(".feature-stall-grid");

featuredGrid?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".feature-view-menu");
  if (!btn) return;

  // Prefer direct StallID from HTML
  let stallId = (btn.dataset.stallId || "").trim();

  // Fallback: match by stall name in Firebase
  if (!stallId) {
    const wantedName = (
      btn.dataset.stallName ||
      btn.closest(".feature-stall-card")?.querySelector("strong")?.textContent ||
      ""
    )
      .trim()
      .toLowerCase();

    if (wantedName) {
      const stallsObj = await getAllFoodStalls();
      const allStalls = Object.values(stallsObj || {}).filter(Boolean);

      const match = allStalls.find(
        (s) => String(s?.StallName || "").trim().toLowerCase() === wantedName
      );

      stallId = match?.StallID ? String(match.StallID) : "";
    }
  }

  if (!stallId) {
    console.warn("[home] Could not resolve featured stall to a StallID.");
    return;
  }

  // Go to stall menu page (adjust path if your project uses a different folder)
  const url = new URL("/html/stall/stall_dish.html", window.location.origin);
  url.searchParams.set("stall", stallId);
  window.location.href = url.href;
});