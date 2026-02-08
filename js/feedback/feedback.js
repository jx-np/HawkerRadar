import { createFeedback, createComplaint, listStalls, listHawkerCentres } from '/js/firebase/wrapper.js';
import { getCurrentUser } from '/js/modules/auth.js';

// DOM Elements
const form = document.getElementById("feedbackForm");
const stars = document.querySelectorAll(".star");
const ratingText = document.querySelector(".rating-text");
const ratingInput = document.getElementById("ratingValue");

// Complaint Elements
const addComplaintCheck = document.getElementById("addComplaintCheck");
const complaintSection = document.getElementById("complaintSection");
const othersCategory = document.getElementById("othersCategory");
const othersInput = document.getElementById("othersInput");
const selectedCategories = new Set();

// Inputs
const hawkerInput = document.getElementById("hawkerCentre");
const hawkerIdInput = document.getElementById("selectedHawkerId");
const hawkerList = document.getElementById("hawkerSuggestions");

const stallInput = document.getElementById("foodStall");
const stallIdInput = document.getElementById("selectedStallId");
const stallList = document.getElementById("stallSuggestions");

// State
let currentRating = 0;
let allStalls = [];         
let allHawkerCentres = [];  
let filteredStalls = [];    

// --- Load Data ---
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

// --- Search Logic (Hawker & Stall) ---
// (Same as before, abbreviated for clarity)
hawkerInput.addEventListener('input', () => {
    const query = hawkerInput.value.toLowerCase();
    hawkerList.innerHTML = '';
    if (query.length < 1) { hawkerList.style.display = 'none'; return; }
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
    } else { hawkerList.style.display = 'none'; }
});

function updateStallListForCentre(hawkerId) {
    stallInput.disabled = false;
    stallInput.placeholder = "Type to search stall...";
    stallInput.value = ""; 
    stallIdInput.value = "";
    filteredStalls = allStalls.filter(stall => stall.hawkerCentreId === hawkerId);
}

stallInput.addEventListener('input', () => {
    const query = stallInput.value.toLowerCase();
    stallList.innerHTML = '';
    if (query.length < 1) { stallList.style.display = 'none'; return; }
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
    } else { stallList.style.display = 'none'; }
});

document.addEventListener('click', (e) => {
    if (!hawkerInput.contains(e.target)) hawkerList.style.display = 'none';
    if (!stallInput.contains(e.target)) stallList.style.display = 'none';
});

// --- Star Rating ---
stars.forEach(star => {
    star.addEventListener("mouseenter", () => highlightHover(star.dataset.value));
    star.addEventListener("mouseleave", () => { clearHover(); highlightSelected(); });
    star.addEventListener("click", () => {
        currentRating = Number(star.dataset.value);
        ratingInput.value = currentRating;
        ratingText.textContent = `${currentRating}/5`;
        highlightSelected(); 
    });
});
function highlightHover(rating) { stars.forEach(star => star.classList.toggle("hover", star.dataset.value <= rating)); }
function clearHover() { stars.forEach(star => star.classList.remove("hover")); }
function highlightSelected() { stars.forEach(star => star.classList.toggle("selected", star.dataset.value <= currentRating)); }

// --- Complaint Toggle Logic ---
addComplaintCheck.addEventListener('change', () => {
    if (addComplaintCheck.checked) {
        complaintSection.style.display = "block";
    } else {
        complaintSection.style.display = "none";
    }
});

// --- Complaint Category Logic ---
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

// --- Helper: Date ---
function getFormattedDate() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// --- Submit Logic ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Validate Review
    if (currentRating === 0) return alert("Please select a rating for your review.");
    if (!stallIdInput.value) {
        if(stallInput.value) {
            stallIdInput.value = stallInput.value; 
        } else {
            return alert("Please select a valid food stall.");
        }
    }

    // 2. Validate Complaint (Only if checked)
    let complaintData = null;
    if (addComplaintCheck.checked) {
        if (selectedCategories.size === 0) {
            alert("Please select at least one complaint category.");
            return;
        }
        const incidentDate = document.getElementById("incidentDate").value;
        const complaintDesc = document.getElementById("complaintDescription").value;
        if (!incidentDate) {
            alert("Please select the Date of Incident.");
            return;
        }
        if (!complaintDesc.trim()) {
            alert("Please describe the complaint issue.");
            return;
        }

        // Process Categories
        const categoriesArray = Array.from(selectedCategories);
        if (categoriesArray.includes("Others")) {
            const index = categoriesArray.indexOf("Others");
            categoriesArray[index] = `Others: ${othersInput.value}`;
        }
        const categoryString = categoriesArray.join(", ");
        
        complaintData = {
            userId: getCurrentUser().id,
            stallId: stallIdInput.value,
            hawkerCentre: hawkerInput.value,
            dateCreated: getFormattedDate(),
            incidentDate: incidentDate,
            category: categoryString,
            description: complaintDesc, // Using separate description for complaint
            status: "open"
        };
    }

    try {
        // --- A. Submit Review ---
        const currentUser = getCurrentUser();
        const userId = currentUser.id
        
        const feedbackData = {
            dateCreated: getFormattedDate(),
            userId: userId,
            stallId: stallIdInput.value, 
            hawkerCentre: hawkerInput.value,
            rating: currentRating,
            comments: document.getElementById("comments").value,
        };

        const reviewResult = await createFeedback(feedbackData);

        // --- B. Submit Complaint (if exists) ---
        let msg = `Review submitted! ID: ${reviewResult.id}`;
        
        if (complaintData) {
            const complaintResult = await createComplaint(complaintData);
            if (complaintResult) {
                msg += `\nComplaint submitted! ID: ${complaintResult.id}`;
            }
        }

        if (reviewResult) {
            console.log(msg);
            // Reset Form
            form.reset();
            currentRating = 0;
            highlightSelected(); 
            ratingText.textContent = " /5";
            
            // Reset Sections
            addComplaintCheck.checked = false;
            complaintSection.style.display = "none";
            selectedCategories.clear();
            document.querySelectorAll(".category").forEach(c => c.classList.remove("selected"));
            othersInput.style.display = "none";

            // Reset Search
            stallInput.disabled = true;
            stallInput.placeholder = "Select a Hawker Centre first...";
            stallIdInput.value = "";
            hawkerIdInput.value = "";
        }

    } catch (error) {
        console.error("Submission failed:", error);
        alert("Error: " + error.message);
    }
});

console.log("Feedback+Complaint JS loaded");