import { listStallFeedback, getUser, getStall } from "../firebase/wrapper.js";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */

function getStallId() {
    const url = new URL(window.location.href);
    return (
        url.searchParams.get("stall") ||
        url.searchParams.get("id") ||
        sessionStorage.getItem("selectedStallId") ||
        null
    );
}

function normalizeFeedback(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return Object.values(raw);
    return [];
}

function maskName(name) {
    if (!name || name.length <= 2) return name;
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

function safeNumber(val, fallback = 0) {
    const n = Number(val);
    return isNaN(n) ? fallback : n;
}

/* ------------------------------------------------------------------
   DOM
------------------------------------------------------------------- */

const els = {
    reviewList: document.getElementById("review-list"),
    filterBtn: document.getElementById("btn-filter"),
    filterSelect: document.getElementById("star-filter"),
    heroRating: document.getElementById("hero-rating-val"),
    heroCount: document.getElementById("hero-review-count"),
    stallName: document.querySelector(".stall-name"),
    heroSection: document.querySelector(".hero-section"),
    backBtn: document.querySelector(".back-arrow")
};

/* ------------------------------------------------------------------
   State
------------------------------------------------------------------- */

let ALL_REVIEWS = [];
const STALL_ID = getStallId();

/* ------------------------------------------------------------------
   Init
------------------------------------------------------------------- */

init();

async function init() {
    setupBackButton();

    if (!STALL_ID) {
        renderError("No stall selected.");
        return;
    }

    sessionStorage.setItem("selectedStallId", STALL_ID);

    try {
        const [stall, rawFeedback] = await Promise.all([
            getStall(STALL_ID),
            listStallFeedback(STALL_ID)
        ]);

        renderStallHeader(stall);

        const feedbackArray = normalizeFeedback(rawFeedback);
        ALL_REVIEWS = await hydrateFeedbackWithUsers(feedbackArray);

        updateHeroStats(ALL_REVIEWS);
        renderReviews(ALL_REVIEWS);
        setupFilter();

    } catch (err) {
        console.error("Init failed:", err);
        renderError("Failed to load reviews.");
    }
}

/* ------------------------------------------------------------------
   UI Setup
------------------------------------------------------------------- */

function setupBackButton() {
    if (!els.backBtn) return;
    els.backBtn.style.cursor = "pointer";
    els.backBtn.onclick = () => window.history.back();
}

function renderError(msg) {
    if (els.stallName) els.stallName.textContent = "Error";
    if (els.reviewList) {
        els.reviewList.innerHTML = `<p style="text-align:center;">${msg}</p>`;
    }
}

/* ------------------------------------------------------------------
   Stall Header
------------------------------------------------------------------- */

function renderStallHeader(stall) {
    if (!stall) {
        if (els.stallName) els.stallName.textContent = "Stall Not Found";
        return;
    }

    if (els.stallName) {
        els.stallName.textContent = stall.name || "Unknown Stall";
    }

    const image =
        stall.storeImage ||
        stall.image ||
        stall.coverImage;

    if (image && els.heroSection) {
        els.heroSection.style.backgroundImage = `url('${image}')`;
    }
}

/* ------------------------------------------------------------------
   Feedback Processing
------------------------------------------------------------------- */

async function hydrateFeedbackWithUsers(feedbackList) {
    return Promise.all(
        feedbackList.map(async (fb) => {
            // NPE error bruh
            if (!fb) return null;
            
            let userName = "Anonymous";
            let profilePhoto = null;


            console.log(fb);
            if (fb.userId) {
                try {
                    const user = await getUser(fb.userId);
                    if (user) {
                        userName = user.name || user.email || userName;
                        profilePhoto = user.profilePhoto || null;
                    }
                } catch (e) {
                    console.warn("User fetch failed:", fb.userId);
                }
            }

            return {
                ...fb,
                rating: safeNumber(fb.rating),
                comment: fb.comment || fb.comments || "",
                customerName: maskName(userName),
                profilePhoto
            };
        })
    ).then(results => results.filter(item => item !== null));
}

/* ------------------------------------------------------------------
   Hero Stats
------------------------------------------------------------------- */

function updateHeroStats(reviews) {
    if (!els.heroRating || !els.heroCount) return;

    if (!reviews.length) {
        els.heroRating.textContent = "0.0";
        els.heroCount.textContent = "(0)";
        return;
    }

    const avg =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    els.heroRating.textContent = avg.toFixed(1);
    els.heroCount.textContent = `(${reviews.length})`;
}

/* ------------------------------------------------------------------
   Rendering
------------------------------------------------------------------- */

function renderReviews(reviews) {
    if (!els.reviewList) return;
    els.reviewList.innerHTML = "";

    if (!reviews.length) {
        els.reviewList.innerHTML =
            `<p style="text-align:center; padding:20px;">No reviews yet.</p>`;
        return;
    }

    const sorted = [...reviews].sort((a, b) => {
        const da = a.dateCreated ? new Date(a.dateCreated) : new Date(0);
        const db = b.dateCreated ? new Date(b.dateCreated) : new Date(0);
        return db - da;
    });

    for (const r of sorted) {
        els.reviewList.appendChild(buildReviewCard(r));
    }
}

function buildReviewCard(review) {
    const card = document.createElement("div");
    card.className = "review-card";

    const avatar = review.profilePhoto
        ? `<img src="${review.profilePhoto}" alt="avatar" class="profile-photo" />`
        : `<div class="avatar-circle"></div>`;

    card.innerHTML = `
        <div class="card-header">
            <div class="avatar">${avatar}</div>
            <span class="user-name">${review.customerName}</span>
            <div class="star-display">
                <i class="fa-regular fa-star"></i>
                <span>${review.rating.toFixed(1)}</span>
            </div>
        </div>
        <div class="review-body">
            <p>${review.comment || "No comment provided."}</p>
        </div>
    `;

    return card;
}

/* ------------------------------------------------------------------
   Filtering
------------------------------------------------------------------- */

function setupFilter() {
    if (!els.filterBtn || !els.filterSelect) return;

    els.filterBtn.onclick = () => {
        const val = els.filterSelect.value;

        if (val === "all") {
            renderReviews(ALL_REVIEWS);
            return;
        }

        const star = Number(val);
        const filtered = ALL_REVIEWS.filter(
            r => Math.floor(r.rating) === star
        );

        renderReviews(filtered);
    };
}

console.log("✅ Reviews page loaded (rewritten)");