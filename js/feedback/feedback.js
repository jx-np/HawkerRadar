const stars = document.querySelectorAll(".star");
const ratingText = document.querySelector(".rating-text");
let currentRating = 0;

//Handle click
stars.forEach(star => {
    star.addEventListener("click", () => {
        currentRating = Number(star.dataset.value);
        updateStars(currentRating);
        ratingText.textContent = `${currentRating}/5`;
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