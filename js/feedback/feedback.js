import { addFeedback } from '/js/firebase/wrapper.js';

const stars = document.querySelectorAll(".star");
const ratingText = document.querySelector(".rating-text");
const ratingInput = document.getElementById("ratingValue");
const form = document.getElementById("feedbackForm");

let currentRating = 0;

//Handle click
stars.forEach(star => {
    star.addEventListener("click", () => {
        currentRating = Number(star.dataset.value);
        updateStars(currentRating);
        ratingText.textContent = `${currentRating}/5`;
        ratingInput.value = currentRating;
    });
});

stars.forEach(star => {
    star.addEventListener("mouseenter", () => {
        highlightHover(star.dataset.value);
    });

    star.addEventListener("mouseleave", () => {
        clearHover();
        highlightSelected();
    });

    star.addEventListener("click", () => {
        currentRating = Number(star.dataset.value);
        ratingInput.value = currentRating;
        ratingText.textContent = `${currentRating}/5`;
        highlightSelected();
    });
});

// Hover effect
function highlightHover(rating) {
    stars.forEach(star => {
        star.classList.toggle(
            "hover",
            star.dataset.value <= rating
        );
    });
}

function clearHover() {
    stars.forEach(star => star.classList.remove("hover"));
}

function highlightSelected() {
    stars.forEach(star => {
        star.classList.toggle(
            "selected",
            star.dataset.value <= currentRating
        );
    });
}

// Form submit
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (currentRating === 0) {
        alert("Please select a rating.");
        return;
    }

    const data = {
        foodStall: document.getElementById("foodStall").value,
        hawkerCentre: document.getElementById("hawkerCentre").value,
        rating: currentRating,
        comments: document.getElementById("comments").value
    };

    try {
        const feedbackID = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const feedbackSuccess = await addFeedback(
            feedbackID,
            data.comments,
            new Date().toISOString(),
            data.rating,
            "anonymous",
            data.foodStall
        );

        if (feedbackSuccess) {
            alert("Feedback submitted successfully!");
            form.reset();
            updateStars(0);
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