import { 
    onAuthChanged, 
    getStall 
} from "/js/firebase/wrapper.js";

import { hasRole } from "/js/modules/auth.js";

import { 
    db, 
    ref, 
    get, 
    update 
} from "/js/firebase/realtimedb.js"; 
// Make sure path to realtimedb.js is correct based on your folder structure

const el = {
    loading: document.getElementById('loading'),
    grid: document.getElementById('stallsGrid'),
    empty: document.getElementById('emptyState'),
    
    // Modal
    modal: document.getElementById('addStallModal'),
    openBtn: document.getElementById('openAddModalBtn'),
    closeBtn: document.getElementById('closeModalBtn'),
    confirmBtn: document.getElementById('confirmAddBtn'),
    input: document.getElementById('stallIdInput')
};

let currentUser = null;

async function init() {
    onAuthChanged(async (user) => {
        if (user) {
            // no vendor role check for page??
            if (!hasRole('vendor')) {
                window.location.href = "/html/user/profile.html";
                return;
            }
            
            currentUser = user;
            console.log("Vendor ID:", user.uid);
            await loadUserStalls();
        } else {
            // Not logged in
            window.location.href = "/html/auth/login.html";
        }
    });

    setupEventListeners();
}

async function loadUserStalls() {
    el.loading.classList.remove('hidden');
    el.grid.innerHTML = '';
    el.empty.classList.add('hidden');

    try {
        // 1. Get User Data
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snap = await get(userRef);
        const userData = snap.val() || {};

        // 2. Check 'ownedStalls' array
        const ownedIds = userData.ownedStalls || [];

        if (!ownedIds || ownedIds.length === 0) {
            el.loading.classList.add('hidden');
            el.empty.classList.remove('hidden');
            return;
        }

        // 3. Fetch details for each stall ID
        const promises = ownedIds.map(id => getStall(id));
        const stalls = await Promise.all(promises);

        // Filter out nulls (if ID exists in user list but stall was deleted)
        const validStalls = stalls.filter(s => s !== null);

        if (validStalls.length === 0) {
            el.loading.classList.add('hidden');
            el.empty.classList.remove('hidden');
            return;
        }

        // 4. Render
        validStalls.forEach(stall => createStallCard(stall));
        el.loading.classList.add('hidden');

    } catch (err) {
        console.error("Error loading stalls:", err);
        el.loading.textContent = "Error loading data.";
    }
}

function createStallCard(stall) {
    const card = document.createElement('a');
    // Link to your management page created earlier
    card.href = `/html/vendor/vendormanage.html?stallId=${stall.id}`;
    card.className = 'stall-card';

    const imgUrl = stall.storeImage || "https://placehold.co/400x300?text=No+Image";

    card.innerHTML = `
        <img src="${imgUrl}" alt="${stall.name}" class="card-img">
        <div class="card-body">
            <h3 class="card-title">${stall.name}</h3>
            <div class="card-info">
                <div>ID: ${stall.id}</div>
                <div>Unit: ${stall.unitNo || '-'}</div>
            </div>
            <div class="card-btn">Manage Stall</div>
        </div>
    `;
    el.grid.appendChild(card);
}

// --- Event Listeners ---
function setupEventListeners() {
    el.openBtn.addEventListener('click', () => {
        el.input.value = '';
        el.modal.classList.remove('hidden');
        el.input.focus();
    });

    el.closeBtn.addEventListener('click', () => el.modal.classList.add('hidden'));

    el.confirmBtn.addEventListener('click', handleAddStall);
}

async function handleAddStall() {
    const stallId = el.input.value.trim();
    if (!stallId) return alert("Please enter a Stall ID");

    el.confirmBtn.textContent = "Checking...";
    el.confirmBtn.disabled = true;

    try {
        // 1. Verify Stall Exists
        const stallData = await getStall(stallId);
        if (!stallData) {
            alert("Stall ID not found in database.");
            el.confirmBtn.textContent = "Add Stall";
            el.confirmBtn.disabled = false;
            return;
        }

        // 2. Add to User's List
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snap = await get(userRef);
        const userData = snap.val() || {};
        
        let currentList = userData.ownedStalls || [];
        
        // Check duplicate
        if (currentList.includes(stallId)) {
            alert("You are already managing this stall.");
        } else {
            currentList.push(stallId);
            await update(userRef, { ownedStalls: currentList });
            alert("Stall added successfully!");
            el.modal.classList.add('hidden');
            await loadUserStalls(); // Refresh UI
        }

    } catch (err) {
        console.error(err);
        alert("Failed to add stall.");
    } finally {
        el.confirmBtn.textContent = "Add Stall";
        el.confirmBtn.disabled = false;
    }
}

init();