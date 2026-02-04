import { getAllHawkerCentres } from '../js/firebase/wrapper.js';

const regionSelect = document.getElementById("region");
const hcGrid = document.getElementById("hcGrid");

// Function to render hawker centre cards
function renderHawkerCentres(centres) {
    hcGrid.innerHTML = ""; // clear previous cards

    Object.values(centres).forEach(centre => {
        hcGrid.innerHTML += `
        <div class="hc-card">
            <div class="hc-image" style="background-image: url('${centre.ImageURL}');"></div>
            <div class="hc-info">
                <div class="hc-info-top">
                    <strong>${centre.HCName}</strong>
                    <span class="hc-price">${centre.PriceRange}</span>
                    <button>View Menu</button>
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
    if (!centres) return; // fail safe

    renderHawkerCentres(centres);

    // Region filter
    const regionSelect = document.getElementById("region");
    const filterButton = document.querySelector(".filter-bar button");

    filterButton.addEventListener("click", () => {
      const selectedRegion = regionSelect.value.toLowerCase();

      const filtered = Object.fromEntries(
          Object.entries(centres).filter(([id, centre]) =>
              !selectedRegion || centre.Region.toLowerCase() === selectedRegion
          )
      );

      renderHawkerCentres(filtered);
  });

  }

init();

// Select the button and the banner
const searchButton = document.querySelector(".hero-buttons button:first-child");
const banner = document.querySelector(".ad-banner");

searchButton.addEventListener("click", () => {
    const headerOffset = 120; // adjust this to match your fixed header height
    const bannerPosition = banner.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = bannerPosition - headerOffset;

    window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
    });
});

// Get the button element
const backToTopBtn = document.getElementById("backToTop");

// Show the button when the user scrolls down 300px
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopBtn.style.display = "block";
  } else {
    backToTopBtn.style.display = "none";
  }
});

// Scroll smoothly to the top when button is clicked
backToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
