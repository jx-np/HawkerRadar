// /js/featured.js 
import { listStalls, listHawkerCentres } from "/js/firebase/wrapper.js";

const featuredGrid = document.querySelector(".feature-stall-grid");

async function loadFeaturedStalls() {
  if (!featuredGrid) return;

  // Fetch both datasets in parallel
  const [stalls, centres] = await Promise.all([
    listStalls(),
    listHawkerCentres()
  ]);

  if (!stalls || !centres) return;

  // Map hawkerCentreId -> hawker centre name
  const centreNameMap = {};
  Object.entries(centres).forEach(([id, centre]) => {
    centreNameMap[id] = centre.name;
  });

  // Take first 3 stalls
  const firstThree = Object.entries(stalls).slice(0, 3);

  featuredGrid.innerHTML = "";

  firstThree.forEach(([stallId, stall], index) => {
    const imageNumber = 301 + index; // 301, 302, 303
    const centreName = centreNameMap[stall.hawkerCentreId] || "Hawker Centre";

    featuredGrid.innerHTML += `
      <div class="feature-stall-card">
        <div class="feature-stall-image"
             style="background-image: url('/img/${imageNumber}.jpg');">
        </div>
        <div class="feature-stall-info">
          <strong>${stall.name}</strong>
          <em>${centreName}</em>
          <button class="feature-view-menu"
                  data-stall-id="${stallId}">
            View Menu
          </button>
        </div>
      </div>
    `;
  });
}

loadFeaturedStalls();
