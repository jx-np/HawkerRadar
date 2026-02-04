import { getAllFeedback, getAllCustomers, getCustomer } from "/js/firebase/wrapper.js";

let feedbackDataRaw = await getAllFeedback();
let customerDataRaw = await getAllCustomers();

// 1. Convert customers to an array first so we can search them
const customersArray = feedbackDataRaw ? Object.values(feedbackDataRaw) : [];

// 2. Create the complaints array and merge the customer name into it
let feedbackData = [];

if (feedbackDataRaw) {
    // A. Create an array of Promises
    const processingPromises = Object.values(feedbackDataRaw).map(async (feedback) => {
        // Now we can use await here safely because the callback is async
        let customer = await getCustomer(feedback.CustomerID);
        console.log(customer)
        return {
            ...feedback,
            customername: customer ? customer.CustName : "Unknown User"
        };
    });

    // B. Wait for ALL promises to finish before continuing
    feedbackData = await Promise.all(processingPromises);
}

console.log(feedbackData)
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
                    <span class="user-name">${review.customername}</span>
                    <div class="star-display">
                        <i class="fa-regular fa-star"></i>
                        <span>${review.FbkRating.toFixed(1)}</span>
                    </div>
                </div>
                <div class="review-body">
                    <div class="review-content">
                        <ul>
                            <li>${review.FbkComment}</li>
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
        renderReviews(feedbackData);
    } else {
        // Filter logic: Check if the rounded rating matches the filter
        // Math.floor(4.5) = 4, so 4.5 stars will show up under "4 Stars" filter
        const filteredData = feedbackData.filter(item => Math.floor(item.FbkRating) == filterValue);
        renderReviews(filteredData);
    }
});

// 5. INITIALIZATION: Run on page load
// Calculate stats based on the FULL database
updateHeroStats(feedbackData);
// Show all reviews initially
renderReviews(feedbackData);