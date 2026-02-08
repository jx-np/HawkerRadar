// /js/hawker.js 
import { listHawkerCentres, listStalls } from "/js/firebase/wrapper.js";
// ---------- NAV RESET (prevents "back" loops between pages) ----------
(function resetNavForHome() {
  // Home is the start of the flow; clear stale return targets from previous sessions.
  try {
    sessionStorage.removeItem("stallList:returnTo");
    sessionStorage.removeItem("dish:returnTo");
    sessionStorage.removeItem("cart:returnTo");
    sessionStorage.removeItem("stallMenu:url");
    sessionStorage.removeItem("lastStallId");
    sessionStorage.removeItem("lastHcId");
  } catch {
    // ignore
  }
})();

// Grab DOM elements used across the page
const regionSelect = document.getElementById("region");
const hcGrid = document.getElementById("hcGrid");

/* ==========================
   RENDER HAWKER CENTRES
========================== */
// Creates hawker centre cards and inserts them into the grid
function renderHawkerCentres(centres) {
  if (!hcGrid) return;

  // Clear existing cards before rendering new ones
  hcGrid.innerHTML = "";

  // Loop through each hawker centre from Firebase
  Object.entries(centres).forEach(([hcId, centre]) => {
    const realHcId = String(centre.id ?? hcId);

    // Inject hawker centre card HTML
    hcGrid.innerHTML += `
      <div class="hc-card" data-hc-id="${realHcId}">
          <div class="hc-image" style="background-image: url('${centre.coverImage}');"></div>
          <div class="hc-info">
              <div class="hc-info-top">
                  <strong>${centre.name}</strong>
                  <span class="hc-price">${centre.priceRange}</span>
              </div>
              <em>${centre.region}</em>
              <button class="hc-view-menu" type="button">View Menu</button>
          </div>
      </div>
    `;
  });
}

/* ==========================
   INITIAL DATA LOAD + FILTER
========================== */
// Fetch hawker centres from Firebase and set up region filtering
async function init() {
  const centres = await listHawkerCentres();
  if (!centres) return;

  renderHawkerCentres(centres);

  // Apply region filter only when "Filter" button is clicked
  const filterButton = document.querySelector(".filter-bar button");
  filterButton?.addEventListener("click", () => {
    const selectedRegion = (regionSelect?.value || "").toLowerCase();

    // Filter centres by selected region
    const filtered = Object.fromEntries(
      Object.entries(centres).filter(([, centre]) => {
        if (!selectedRegion) return true;
        return (centre.region || "").toLowerCase() === selectedRegion;
      })
    );

    // Re-render grid with filtered results
    renderHawkerCentres(filtered);
  });
}

// Start page logic
init();

/* ==========================
   HERO SEARCH SCROLL
========================== */
// Smooth-scroll from hero button down to banner section
const searchButton = document.querySelector(".hero-buttons button:first-child");
const banner = document.querySelector(".ad-banner");

searchButton?.addEventListener("click", () => {
  if (!banner) return;

  // Offset accounts for fixed header
  const headerOffset = 60;
  const bannerPosition =
    banner.getBoundingClientRect().top + window.pageYOffset;

  window.scrollTo({
    top: bannerPosition - headerOffset,
    behavior: "smooth",
  });
});

/* ==========================
   BACK TO TOP BUTTON
========================== */
// Show button only after scrolling down
const backToTopBtn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (!backToTopBtn) return;
  backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
});

// Smooth-scroll back to top when clicked
backToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ==========================
   HAWKER CENTRE → STALL PAGE
========================== */
// Handle "View Menu" click for hawker centre cards
hcGrid?.addEventListener("click", (e) => {
  const btn = e.target.closest(".hc-view-menu");
  if (!btn) return;

  const card = btn.closest(".hc-card");
  const hcId = card?.dataset?.hcId;
  if (!hcId) return;

  // Save selected hawker centre ID for next page
  sessionStorage.setItem("selectedHcId", hcId);

  // ✅ PUT IT RIGHT HERE (before redirect)
  sessionStorage.setItem("stalls:returnTo", window.location.href);

  // Redirect to stall page with hc query param
  const url = new URL("/html/stall/stall.html", window.location.origin);
  url.searchParams.set("hc", hcId);
  window.location.href = url.href;
});

/* ==========================
   FEATURED STALL → DISH PAGE
========================== */
// Handles featured stall "View Menu" buttons
const featuredGrid = document.querySelector(".feature-stall-grid");

featuredGrid?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".feature-view-menu");
  if (!btn) return;

  // Prefer direct StallID from data attribute
  let stallId = (btn.dataset.stallId || "").trim();

  // Fallback: resolve StallID by matching stall name from Firebase
  if (!stallId) {
    const wantedName = (
      btn.dataset.stallName ||
      btn
        .closest(".feature-stall-card")
        ?.querySelector("strong")
        ?.textContent ||
      ""
    )
      .trim()
      .toLowerCase();

    if (wantedName) {
      const stallsObj = await listStalls();
      const allStalls = Object.values(stallsObj || {}).filter(Boolean);

      const match = allStalls.find(
        (s) =>
          String(s?.StallName || "").trim().toLowerCase() === wantedName
      );

      stallId = match?.StallID ? String(match.StallID) : "";
    }
  }

  // Abort if StallID still cannot be resolved
  if (!stallId) {
    console.warn("[home] Could not resolve featured stall to a StallID.");
    return;
  }

  // Redirect to dish page with stall query param
  const url = new URL(
    "/html/stall/stall_dish.html",
    window.location.origin
  );
  url.searchParams.set("stall", stallId);
  // ensure stall_dish back arrow returns to Home when coming from Featured Stalls
  sessionStorage.setItem("stallList:returnTo", window.location.href);
  window.location.href = url.href;
});
