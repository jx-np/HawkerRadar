import { createFeedback, listStalls, listHawkerCentres } from '/js/firebase/wrapper.js';
// DIRECT IMPORTS (Bypassing wrapper just for the count)
import { db } from '/js/firebase/realtimedb.js'; 
import { ref, get } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// DOM Elements
const form = document.getElementById("feedbackForm");
const stars = document.querySelectorAll(".star");
const ratingText = document.querySelector(".rating-text");
const ratingInput = document.getElementById("ratingValue");

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

// Load Data
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

// HAWKER CENTRE Search Logic
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

// FOOD STALL Search Logic
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

// Close lists on outside click
document.addEventListener('click', (e) => {
    if (!hawkerInput.contains(e.target)) hawkerList.style.display = 'none';
    if (!stallInput.contains(e.target)) stallList.style.display = 'none';
});

// Star Rating Logic
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

// Generate ID
async function generateNextId() {
    // Manually fetch 'feedback' node since wrapper doesn't expose it
    const snapshot = await get(ref(db, 'feedback'));
    let count = 0;
    if (snapshot.exists()) {
        count = Object.keys(snapshot.val()).length;
    }

    return `7${String(count + 1).padStart(2, '0')}`;
}

// Format Date
function getFormattedDate() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    // Format: YYYY-MM-DD HH:mm:ss
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Submit
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (currentRating === 0) return alert("Please select a rating.");

    if (!stallIdInput.value) {
        if(stallInput.value) {
            stallIdInput.value = stallInput.value; 
        } else {
            return alert("Please select a valid food stall.");
        }
    }

    try {
        // Generate Custom ID & Date
        const nextId = await generateNextId();
        const customDate = getFormattedDate();

        const feedbackData = {
            id: nextId,           // <--- Set the manual ID
            dateCreated: customDate, // <--- Set the manual Date
            userId: "anonymous",  // note to self need to fix this after user authentication
            stallId: stallIdInput.value, 
            hawkerCentre: hawkerInput.value,
            rating: currentRating,
            comments: document.getElementById("comments").value,
        };

        // Submit using wrapper
        const result = await createFeedback(feedbackData);
        
        if (result) {
            alert(`Feedback submitted! ID: ${nextId}`);
            form.reset();
            currentRating = 0;
            highlightSelected(); 
            ratingText.textContent = " /5";
            
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

console.log("Feedback JS loaded");