import { createFeedback, onAuthChanged } from '/js/firebase/wrapper.js';

const stars = document.querySelectorAll(".star");
const ratingText = document.querySelector(".rating-text");
const ratingInput = document.getElementById("ratingValue");
const form = document.getElementById("feedbackForm");

// State
let currentRating = 0;
let currentUser = null;

// --- 1. Authentication Listener ---
// We need the User ID to submit feedback (required by your wrapper)
onAuthChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("Feedback Page: User detected", user.uid);
    } else {
        currentUser = null;
        console.log("Feedback Page: No user logged in");
    }
});

// --- 2. Star Rating UI Logic ---
stars.forEach(star => {
    // Handle Hover
    star.addEventListener("mouseenter", () => {
        highlightHover(star.dataset.value);
    });

    // Handle Hover End
    star.addEventListener("mouseleave", () => {
        clearHover();
        highlightSelected(); // Restore selection state
    });

    // Handle Click
    star.addEventListener("click", () => {
        currentRating = Number(star.dataset.value);
        
        // Update Form Inputs
        ratingInput.value = currentRating;
        ratingText.textContent = `${currentRating}/5`;
        
        // Update Visuals
        highlightSelected(); 
    });
});

function highlightHover(rating) {
    stars.forEach(star => {
        star.classList.toggle("hover", star.dataset.value <= rating);
    });
}

function clearHover() {
    stars.forEach(star => star.classList.remove("hover"));
}

function highlightSelected() {
    stars.forEach(star => {
        star.classList.toggle("selected", star.dataset.value <= currentRating);
    });
}

// --- 3. Form Submission ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validation: Check Rating
    if (currentRating === 0) {
        alert("Please select a rating.");
        return;
    }

    // Validation: Check Auth
    if (!currentUser) {
        alert("You must be logged in to submit feedback.");
        // Optional: Redirect to login page
        // window.location.href = "../../html/auth/login.html"; 
        return;
    }

    // Get input values
    const foodStallInput = document.getElementById("foodStall").value;
    const hawkerCentreInput = document.getElementById("hawkerCentre").value;
    const commentsInput = document.getElementById("comments").value;

    // Construct the data object
    // The wrapper 'createFeedback' specifically requires 'userId' and 'stallId'.
    const feedbackData = {
        userId: currentUser.uid,
        stallId: foodStallInput, // Using the input name as ID for now
        hawkerCentre: hawkerCentreInput,
        rating: currentRating,
        comments: commentsInput,
        // 'id' is omitted: wrapper will generate a unique Firebase ID
        // 'dateCreated' is omitted: wrapper will set it to now()
    };

    try {
        const result = await createFeedback(feedbackData);

        if (result) {
            alert("Feedback submitted successfully!");
            
            // Reset Form and State
            form.reset();
            currentRating = 0;
            highlightSelected(); 
            ratingText.textContent = " /5";
        }
    } catch (error) {
        console.error("Submission failed:", error);
        alert("Error submitting feedback: " + error.message);
    }
});

console.log("Complaint JS loaded");