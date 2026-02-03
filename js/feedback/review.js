const dbReviews = [
    {
        id: 1,
        name: "Name",
        rating: 3.0,
        title: "Lorem ipsum dolor sit amet.",
        content: "consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    },
    {
        id: 2,
        name: "John Doe",
        rating: 5.0,
        title: "Excellent service!",
        content: "The food was fresh and the stall owner was very polite."
    },
    {
        id: 3,
        name: "Jane Smith",
        rating: 4.5,
        title: "Pretty good",
        content: "Loved the taste, but the queue was a bit long."
    },
    {
        id: 4,
        name: "Alex",
        rating: 3.0,
        title: "Average experience",
        content: "It was okay, nothing special compared to other stalls."
    },
    {
        id: 5,
        name: "Sarah",
        rating: 1.0,
        title: "Disappointed",
        content: "Food was cold when served."
    }
];

// DOM Elements
const reviewListContainer = document.getElementById('review-list');
const filterBtn = document.getElementById('btn-filter');
const filterSelect = document.getElementById('star-filter');
const heroRatingVal = document.getElementById('hero-rating-val');
const heroReviewCount = document.getElementById('hero-review-count');

// 2. LOGIC: Calculate Average Rating & Count for Hero Section
function updateHeroStats(reviews) {
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
        heroRatingVal.textContent = "0.0";
        heroReviewCount.textContent = "(0)";
        return;
    }

    // Sum up all ratings
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const average = (sum / totalReviews).toFixed(1); // One decimal place (e.g., 4.5)

    // Update HTML
    heroRatingVal.textContent = average;
    heroReviewCount.textContent = `(${totalReviews})`; // e.g. (150)
}

// 3. LOGIC: Render Review Cards
function renderReviews(reviewsToRender) {
    reviewListContainer.innerHTML = ''; // Clear existing list

    if (reviewsToRender.length === 0) {
        reviewListContainer.innerHTML = '<p>No reviews found for this filter.</p>';
        return;
    }

    reviewsToRender.forEach(review => {
        // Create HTML string for one card
        const cardHTML = `
            <div class="review-card">
                <div class="card-header">
                    <div class="avatar-circle"></div>
                    <span class="user-name">${review.name}</span>
                    <div class="star-display">
                        <i class="fa-regular fa-star"></i>
                        <span>${review.rating.toFixed(1)}</span>
                    </div>
                </div>
                <div class="review-body">
                    <div class="review-title">${review.title}</div>
                    <div class="review-content">
                        <ul>
                            <li>${review.content}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        // Append to container
        reviewListContainer.innerHTML += cardHTML;
    });
}

// 4. LOGIC: Filter Functionality
filterBtn.addEventListener('click', () => {
    const filterValue = filterSelect.value;
    
    if (filterValue === "all") {
        renderReviews(dbReviews);
    } else {
        // Filter logic: Check if the rounded rating matches the filter
        // Math.floor(4.5) = 4, so 4.5 stars will show up under "4 Stars" filter
        const filteredData = dbReviews.filter(item => Math.floor(item.rating) == filterValue);
        renderReviews(filteredData);
    }
});

// 5. INITIALIZATION: Run on page load
// Calculate stats based on the FULL database
updateHeroStats(dbReviews);
// Show all reviews initially
renderReviews(dbReviews);