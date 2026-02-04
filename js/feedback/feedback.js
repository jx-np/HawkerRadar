import { addFeedback, getAllFeedback } from '/js/firebase/wrapper.js';

const stars = document.querySelectorAll(".star");
const ratingText = document.querySelector(".rating-text");
const ratingInput = document.getElementById("ratingValue");
const form = document.getElementById("feedbackForm");

let currentRating = 0;

// Unified Event Listeners (Fixes duplicate click & missing updateStars)
stars.forEach(star => {
    // 1. Handle Hover (Mouse Enter)
    star.addEventListener("mouseenter", () => {
        highlightHover(star.dataset.value);
    });

    // 2. Handle Hover End (Mouse Leave)
    star.addEventListener("mouseleave", () => {
        clearHover();
        highlightSelected(); // Restores the visual selection
    });

    // 3. Handle Click (Selection)
    star.addEventListener("click", () => {
        // Update State
        currentRating = Number(star.dataset.value);
        
        // Update Form Inputs
        ratingInput.value = currentRating;
        ratingText.textContent = `${currentRating}/5`;
        
        // Update Visuals (Replaces the missing updateStars function)
        highlightSelected(); 
    });
});

// Hover Visuals
function highlightHover(rating) {
    stars.forEach(star => {
        star.classList.toggle("hover", star.dataset.value <= rating);
    });
}

function clearHover() {
    stars.forEach(star => star.classList.remove("hover"));
}

// Selected Visuals
function highlightSelected() {
    stars.forEach(star => {
        star.classList.toggle("selected", star.dataset.value <= currentRating);
    });
}

// Form Submit
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (currentRating === 0) {
        alert("Please select a rating.");
        return;
    }

    try {
        // --- NEW ID GENERATION LOGIC ---
        
        // Fetch all existing feedback
        const allFeedbackData = await getAllFeedback();
        
        // Count them. 
        // If data exists, count the keys. If null (empty db), count is 0.
        const currentCount = allFeedbackData ? Object.keys(allFeedbackData).length : 0;
        
        // Generate ID (e.g., 0 -> 701, 15 -> 716)
        const nextNumber = currentCount + 1;
        const feedbackID = `7${String(nextNumber).padStart(2, '0')}`;
        
        // -------------------------------

        const feedbackSuccess = await addFeedback(
            feedbackID,
            document.getElementById("comments").value, // Assuming you accessed values directly or via data obj
            new Date().toISOString(),
            currentRating,
            "501",
            document.getElementById("foodStall").value
        );

        if (feedbackSuccess) {
            alert("Feedback submitted successfully!");
            form.reset();
            currentRating = 0;
            highlightSelected(); 
            ratingText.textContent = "__/5";
        } else {
            alert("Error submitting feedback.");
        }
    } catch (error) {
        console.error(error);
        alert("Error submitting feedback.");
    }
});

console.log("Complaint JS loaded");