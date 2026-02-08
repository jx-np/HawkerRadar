import {
    getStall,
    updateStall,
    listMenuItemsByStall,
    createMenuItem,
    updateMenuItem
} from "/js/firebase/wrapper.js";

// =============================
// Constants & Elements
// =============================
const el = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    // Hero
    stallBanner: document.getElementById('stallBanner'),
    editBannerBtn: document.getElementById('editBannerBtn'),
    stallNameTitle: document.getElementById('stallNameTitle'),
    // Add Dish
    addDishForm: document.getElementById('addDishForm'),
    // Dish List
    dishListContainer: document.getElementById('dishListContainer'),
};

// Get stall ID from URL "?stallId=xyz"
const urlParams = new URLSearchParams(window.location.search);
const STALL_ID = urlParams.get('stallId');

// Default placeholder image if none exists
const PLACEHOLDER_IMG = "";
const DISH_PLACEHOLDER = "https://placehold.co/100x100?text=No+Image";


// =============================
// Main Initialization
// =============================
async function init() {
    if (!STALL_ID) {
        alert("No Stall ID provided in URL.");
        el.loadingOverlay.textContent = "Error: Missing Stall ID";
        return;
    }

    try {
        // Load initial data in parallel
        await Promise.all([
            loadStallInfo(),
            loadDishList()
        ]);
    } catch (error) {
        console.error("Init failed:", error);
        alert("Failed to load stall data. See console.");
    } finally {
        el.loadingOverlay.classList.add('hidden');
    }

    attachEventListeners();
}

// =============================
// Data Loading & Rendering
// =============================

// 1. Load Stall Info (Banner & Name)
async function loadStallInfo() {
    const stallData = await getStall(STALL_ID);
    
    if (!stallData) {
        throw new Error("Stall not found in database.");
    }

    // Update UI based on schema (using 'name' and 'storeImage')
    el.stallNameTitle.textContent = stallData.name || "Unnamed Stall";
    el.stallBanner.src = stallData.storeImage || PLACEHOLDER_IMG;
}

// 2. Load and Render Dish List
async function loadDishList() {
    el.dishListContainer.innerHTML = '<p>Loading dishes...</p>';
    const menuItemsMap = await listMenuItemsByStall(STALL_ID);
    
    el.dishListContainer.innerHTML = ''; // Clear loading text

    if (!menuItemsMap || Object.keys(menuItemsMap).length === 0) {
        el.dishListContainer.innerHTML = '<p>No dishes found for this stall.</p>';
        return;
    }

    // Loop through items and render cards
    Object.entries(menuItemsMap).forEach(([dishId, dish]) => {
        const dishCard = document.createElement('div');
        dishCard.className = 'dish-card';
        // Ensure price is a number for the input
        const unitPrice = Number(dish.price) || 0;

        dishCard.innerHTML = `
            <img src="${dish.image || DISH_PLACEHOLDER}" alt="${dish.name}" class="dish-card__img" onerror="this.src='${DISH_PLACEHOLDER}'">
            <div class="dish-card__details">
                <h3 class="dish-card__title">${dish.name || 'Unknown Dish'}</h3>
                <p class="dish-card__desc">${dish.description || ''}</p>
                <small style="color: #666;">Category: ${dish.category || 'N/A'}</small>
            </div>
            <div class="dish-card__actions">
                <label class="price-input-group">
                    <span class="price-input-label">$</span>
                    <input type="number" class="price-input" 
                            data-dish-id="${dishId}" 
                            data-original-price="${unitPrice.toFixed(2)}"
                            value="${unitPrice.toFixed(2)}" step="0.01" min="0">
                </label>
                <button class="btn btn-save" data-action="save-price" data-dish-id="${dishId}" disabled>Save Price</button>
            </div>
        `;

        el.dishListContainer.appendChild(dishCard);
    });

    // Add listeners to newly created inputs to enable "Save" button only when changed
    setupPriceInputListeners();
}


// =============================
// Event Handlers & Actions
// =============================

function attachEventListeners() {
    // A. Edit Banner Image
    el.editBannerBtn.addEventListener('click', handleEditBanner);

    // B. Add New Dish Form Submit
    el.addDishForm.addEventListener('submit', handleAddDish);

    // C. Dish List Actions (Event delegation for dynamically added buttons)
    el.dishListContainer.addEventListener('click', handleDishAction);
}


// Edit Banner
async function handleEditBanner() {
    const currentUrl = el.stallBanner.src === window.location.origin + PLACEHOLDER_IMG ? '' : el.stallBanner.src;
    const newUrl = prompt("Enter new Banner Image URL:", currentUrl);

    // If user clicked cancel or entered nothing, do nothing
    if (newUrl === null || newUrl.trim() === "") return;

    el.editBannerBtn.textContent = "Updating...";
    el.editBannerBtn.disabled = true;

    try {
        // Call wrapper update function
        await updateStall(STALL_ID, {
            storeImage: newUrl.trim()
        });
        
        // Refresh display
        await loadStallInfo();
        alert("Banner updated successfully!");
    } catch (error) {
        console.error("Update banner failed:", error);
        alert("Failed to update banner. check console.");
    } finally {
        el.editBannerBtn.textContent = "Change Banner Image";
        el.editBannerBtn.disabled = false;
    }
}


// Add New Dish
async function handleAddDish(e) {
    e.preventDefault();

    const submitBtn = el.addDishForm.querySelector('button[type="submit"]');
    submitBtn.textContent = "Adding...";
    submitBtn.disabled = true;

    // Gather data from form inputs
    const dishData = {
        stallId: STALL_ID, // Required by wrapper
        name: document.getElementById('newDishName').value.trim(),
        description: document.getElementById('newDishDesc').value.trim(),
        price: parseFloat(document.getElementById('newDishPrice').value),
        image: document.getElementById('newDishImage').value.trim(),
    };

    try {
        // Call wrapper create function
        await createMenuItem(dishData);
        
        // Reset form and reload list
        el.addDishForm.reset();
        await loadDishList();
        alert("Dish added successfully!");

    } catch (error) {
        console.error("Add dish failed:", error);
        alert("Failed to add dish. Check console.");
    } finally {
        submitBtn.textContent = "Add Dish to Menu";
        submitBtn.disabled = false;
    }
}


// Update Price (and input monitoring)
function setupPriceInputListeners() {
    const inputs = el.dishListContainer.querySelectorAll('.price-input');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const dishId = e.target.dataset.dishId;
            const originalPrice = e.target.dataset.originalPrice;
            // Find associated save button
            const saveBtn = el.dishListContainer.querySelector(`button[data-dish-id="${dishId}"]`);
            // Enable button only if value has changed and is valid
            if (saveBtn) {
                saveBtn.disabled = (e.target.value === originalPrice || !e.target.value);
            }
        });
    });
}

async function handleDishAction(e) {
    // We only care about clicks on elements with data-action="save-price"
    const saveBtn = e.target.closest('[data-action="save-price"]');
    if (!saveBtn) return;

    const dishId = saveBtn.dataset.dishId;
    // Find the input associated with this dish ID
    const input = el.dishListContainer.querySelector(`.price-input[data-dish-id="${dishId}"]`);
    if (!input) return;

    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice < 0) {
        alert("Please enter a valid price.");
        return;
    }

    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;
    input.disabled = true;

    try {
        // Call wrapper update function
        await updateMenuItem(dishId, {
            price: newPrice
        });

        // Update the "original price" data attribute so the "save" button disables correctly next time
        input.dataset.originalPrice = newPrice.toFixed(2);
        alert("Price updated!");

    } catch (error) {
        console.error("Update price failed:", error);
        alert("Failed to update price.");
        // Reset input value on failure if needed
        input.value = input.dataset.originalPrice;
    } finally {
        saveBtn.textContent = "Save Price";
        // Keep disabled until input changes again
        input.disabled = false;
    }
}

// Start the app
init();