import { listStallFeedback, getUser, getStall } from "/js/firebase/wrapper.js";

// --- Get Stall ID from URL ---
const urlParams = new URLSearchParams(window.location.search);
const STALL_ID = urlParams.get('id'); // e.g. "501"

// --- DOM Elements ---
const reviewListContainer = document.getElementById('review-list');
const filterBtn = document.getElementById('btn-filter');
const filterSelect = document.getElementById('star-filter');
const heroRatingVal = document.getElementById('hero-rating-val');
const heroReviewCount = document.getElementById('hero-review-count');
const stallNameHeader = document.querySelector('.stall-name');
const heroSection = document.querySelector('.hero-section'); // <--- Added Selector

// --- Main Logic ---
async function initPage() {
    if (!STALL_ID) {
        console.error("No Stall ID found in URL");
        if(stallNameHeader) stallNameHeader.textContent = "Error: No Stall ID";
        reviewListContainer.innerHTML = "<p style='text-align:center;'>Error: No stall selected.</p>";
        return;
    }

    console.log("Loading data for Stall ID:", STALL_ID);

    try {
        // Parallel Fetch: Get Stall Info AND Feedback at the same time
        const [stallData, feedbackMap] = await Promise.all([
            getStall(STALL_ID),
            listStallFeedback(STALL_ID)
        ]);

        // Update Header Info & Banner Image
        if (stallData) {
            // 1. Update Name
            if (stallNameHeader) {
                stallNameHeader.textContent = stallData.name || "Unknown Stall";
            }
            
            // 2. Update Background Image (New Logic)
            const imageUrl = stallData.image || stallData.coverImage;
            if (imageUrl && heroSection) {
                heroSection.style.backgroundImage = `url('${imageUrl}')`;
            }

        } else if (stallNameHeader) {
            stallNameHeader.textContent = "Stall Not Found";
        }

        // Process Feedback
        let feedbackData = [];
        const rawFeedbackArray = feedbackMap ? Object.values(feedbackMap) : [];

        if (rawFeedbackArray.length > 0) {
            // Hydrate with User Names
            const processingPromises = rawFeedbackArray.map(async (feedback) => {
                let userName = "Unknown User";
                if (feedback.userId) {
                    try {
                        const user = await getUser(feedback.userId);
                        if (user) {
                            userName = user.name || user.email || "Anonymous";
                        }
                    } catch (err) {
                        console.error("Failed to fetch user:", feedback.userId);
                    }
                }
                return { ...feedback, customerName: userName };
            });

            feedbackData = await Promise.all(processingPromises);
        }

        // Render Page
        updateHeroStats(feedbackData);
        renderReviews(feedbackData);

        // Setup Filter Button
        setupFilter(feedbackData);

    } catch (error) {
        console.error("Error initializing page:", error);
    }
}

// --- Helper Functions ---

function updateHeroStats(reviews) {
    if (!heroRatingVal || !heroReviewCount) return;

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
        heroRatingVal.textContent = "0.0";
        heroReviewCount.textContent = "(0)";
        return;
    }
    const sum = reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
    const average = (sum / totalReviews).toFixed(1);
    
    heroRatingVal.textContent = average;
    heroReviewCount.textContent = `(${totalReviews})`;
}

function renderReviews(reviewsToRender) {
    if (!reviewListContainer) return;
    reviewListContainer.innerHTML = ''; 

    if (!reviewsToRender || reviewsToRender.length === 0) {
        reviewListContainer.innerHTML = '<p style="padding: 20px; text-align:center;">No reviews yet for this stall.</p>';
        return;
    }

    reviewsToRender.forEach(review => {
        const rating = Number(review.rating).toFixed(1);
        const comment = review.comments || "No comment provided.";
        const name = review.customerName;

        const cardHTML = `
            <div class="review-card">
                <div class="card-header">
                    <div class="avatar-circle"></div>
                    <span class="user-name">${name}</span>
                    <div class="star-display">
                        <i class="fa-regular fa-star"></i>
                        <span>${rating}</span>
                    </div>
                </div>
                <div class="review-body">
                    <div class="review-content">
                        <ul><li>${comment}</li></ul>
                    </div>
                </div>
            </div>
        `;
        reviewListContainer.innerHTML += cardHTML;
    });
}

function setupFilter(allFeedback) {
    if (filterBtn && filterSelect) {
        // Remove old listeners by cloning
        const newBtn = filterBtn.cloneNode(true);
        filterBtn.parentNode.replaceChild(newBtn, filterBtn);

        newBtn.addEventListener('click', () => {
            const filterValue = filterSelect.value;
            if (filterValue === "all") {
                renderReviews(allFeedback);
            } else {
                const filteredData = allFeedback.filter(item => Math.floor(item.rating) == filterValue);
                renderReviews(filteredData);
            }
        });
    }
}

// --- Run ---
initPage();
console.log("Review JS loaded");