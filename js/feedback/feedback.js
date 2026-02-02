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

//hover effect
stars.forEach(star => {
    star.addEventListener("mouseenter", () => {
        updateStars(star.dataset.value);
    });

    star.addEventListener("mouseleave", () => {
        updateStars(currentRating);
    });
});

function updateStars(rating) {
    stars.forEach(star => {
        star.textContent =
            star.dataset.value <= rating ? "★" : "☆";
    });
}