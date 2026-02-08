import { createComplaint, listStalls, listHawkerCentres } from '/js/firebase/wrapper.js';
// Direct imports to perform the "count" for ID generation
import { db } from '/js/firebase/realtimedb.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// --- DOM Elements ---
const form = document.getElementById("complaintForm");
const othersCategory = document.getElementById("othersCategory");
const othersInput = document.getElementById("othersInput");

// Inputs for Search
const hawkerInput = document.getElementById("hawkerCentre");
const hawkerIdInput = document.getElementById("selectedHawkerId");
const hawkerList = document.getElementById("hawkerSuggestions");

const stallInput = document.getElementById("foodStall");
const stallIdInput = document.getElementById("selectedStallId");
const stallList = document.getElementById("stallSuggestions");

// --- State ---
const selectedCategories = new Set();
let allStalls = [];
let allHawkerCentres = [];
let filteredStalls = [];

// --- 1. Load Data for Search ---
async function loadSearchData() {
    try {
        const [stallsData, hawkersData] = await Promise.all([
            listStalls(),
            listHawkerCentres()
        ]);
        if (stallsData) allStalls = Object.values(stallsData);
        if (hawkersData) allHawkerCentres = Object.values(hawkersData);
    } catch (error) {
        console.error("Error loading search data:", error);
    }
}
loadSearchData();

// --- 2. Cascading Search Logic ---
// Hawker Centre
hawkerInput.addEventListener('input', () => {
    const query = hawkerInput.value.toLowerCase();
    hawkerList.innerHTML = '';
    
    if (query.length < 1) {
        hawkerList.style.display = 'none';
        return;
    }

    const matches = allHawkerCentres.filter(item => (item.name || "").toLowerCase().includes(query));

    if (matches.length > 0) {
        matches.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.name;
            li.addEventListener('click', () => {
                hawkerInput.value = item.name;
                hawkerIdInput.value = item.id;
                hawkerList.style.display = 'none';
                updateStallListForCentre(item.id);
            });
            hawkerList.appendChild(li);
        });
        hawkerList.style.display = 'block';
    } else {
        hawkerList.style.display = 'none';
    }
});

function updateStallListForCentre(hawkerId) {
    stallInput.disabled = false;
    stallInput.placeholder = "Type to search stall...";
    stallInput.value = ""; 
    stallIdInput.value = "";
    filteredStalls = allStalls.filter(stall => stall.hawkerCentreId === hawkerId);
}

// Stall
stallInput.addEventListener('input', () => {
    const query = stallInput.value.toLowerCase();
    stallList.innerHTML = '';

    if (query.length < 1) {
        stallList.style.display = 'none';
        return;
    }

    const matches = filteredStalls.filter(item => (item.name || "").toLowerCase().includes(query));

    if (matches.length > 0) {
        matches.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.name;
            li.addEventListener('click', () => {
                stallInput.value = item.name;
                stallIdInput.value = item.id;
                stallList.style.display = 'none';
            });
            stallList.appendChild(li);
        });
        stallList.style.display = 'block';
    } else {
        stallList.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (!hawkerInput.contains(e.target)) hawkerList.style.display = 'none';
    if (!stallInput.contains(e.target)) stallList.style.display = 'none';
});

// --- 3. Category Logic ---
document.querySelectorAll(".category").forEach(item => {
    item.addEventListener("click", () => {
        const value = item.dataset.value;
        item.classList.toggle("selected");

        if (item.classList.contains("selected")) {
            selectedCategories.add(value);
        } else {
            selectedCategories.delete(value);
        }

        if (value === "Others") {
            if (item.classList.contains("selected")) {
                othersInput.style.display = "block";
                othersInput.required = true;
            } else {
                othersInput.style.display = "none";
                othersInput.required = false;
                othersInput.value = "";
            }
        }
    });
});

// --- CUSTOM HELPER: Generate ID ---
async function generateNextComplaintId() {
    // 1. Get the complaints node directly
    const snapshot = await get(ref(db, 'complaints'));
    let count = 0;
    if (snapshot.exists()) {
        count = Object.keys(snapshot.val()).length;
    }
    // 2. Format: "complaint_" + 7 + (count+1) padded to 2 digits
    // e.g., count=0 -> complaint_701
    // e.g., count=10 -> complaint_711
    const numberPart = `7${String(count + 1).padStart(2, '0')}`;
    return `complaint_${numberPart}`;
}

// --- CUSTOM HELPER: Format Date ---
function getFormattedDate() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // Format: YYYY-MM-DD HH:mm:ss
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// --- 4. Submit Logic ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (selectedCategories.size === 0) {
        alert("Please select at least one complaint category.");
        return;
    }
    if (!stallIdInput.value) {
        alert("Please search and select a valid Food Stall.");
        return;
    }

    // Process Categories
    const categoriesArray = Array.from(selectedCategories);
    if (categoriesArray.includes("Others")) {
        const index = categoriesArray.indexOf("Others");
        categoriesArray[index] = `Others: ${othersInput.value}`;
    }
    const categoryString = categoriesArray.join(", ");

    try {
        // 1. Generate Custom Data
        const customId = await generateNextComplaintId(); // e.g., complaint_701
        const customDate = getFormattedDate();            // e.g., 2026-01-22 19:00:00

        const complaintData = {
            id: customId,
            userId: "anonymous",
            stallId: stallIdInput.value,
            hawkerCentre: hawkerInput.value,
            dateCreated: customDate, // <--- Correct Format
            incidentDate: document.getElementById("incidentDate").value,
            category: categoryString,
            comments: document.getElementById("description").value
        };

        const result = await createComplaint(complaintData);

        if (result) {
            alert(`Complaint submitted successfully! ID: ${customId}`);
            
            // Reset Form & State
            form.reset();
            selectedCategories.clear();
            document.querySelectorAll(".category").forEach(c => c.classList.remove("selected"));
            othersInput.style.display = "none";
            
            // Reset Search Inputs
            stallInput.disabled = true;
            stallInput.placeholder = "Select a Hawker Centre first...";
            stallIdInput.value = "";
            hawkerIdInput.value = "";
        }
    } catch (err) {
        console.error('Error submitting complaint:', err);
        alert("Server error: " + err.message);
    }
});

console.log("Complaint JS loaded (Custom ID & Date)");