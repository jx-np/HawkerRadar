import { getCurrentUser } from '../modules/auth.js';
import { listUserFeedback, listStalls } from '../firebase/wrapper.js';
import { formatDate } from '../utils/helpers.js';

/*
 * feedback_history.js
 * - Fetches the current user's feedback from Firebase
 * - Renders entries into .history-list in feedback_history.html
 */

// Select the history list at runtime (after DOM ready) to avoid null when module loads early

function sanitizeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function truncate(text, length = 200) {
    if (!text) return '';
    return text.length > length ? text.substr(0, length) + '...' : text;
}

async function loadFeedbackHistory() {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;

    historyList.innerHTML = ''; // clear placeholder items

    const currentUser = getCurrentUser();

    if (!currentUser) {
        historyList.innerHTML = `<div class="no-feedback">Please log in to view your feedback history.</div>`;
        return;
    }

    try {
        const userFeedback = await listUserFeedback(currentUser.id);

        if (!userFeedback) {
            historyList.innerHTML = `<div class="no-feedback">no reviews yet...</div>`;
            return;
        }

        // turn into array
        const feedbackArray = Object.values(userFeedback);

        if (feedbackArray.length === 0) {
            historyList.innerHTML = `<div class="no-feedback">no reviews yet...</div>`;
            return;
        }

        // load stalls once to map stallId -> stall data
        const allStalls = await listStalls();
        const stallMap = allStalls || {};

        // sort by datetime descending using available date fields
        feedbackArray.sort((a, b) => {
            const aDate = new Date(a.dateCreated || a.FbkDateTime || a.date || a.createdAt || 0).getTime();
            const bDate = new Date(b.dateCreated || b.FbkDateTime || b.date || b.createdAt || 0).getTime();
            return bDate - aDate;
        });

        for (const fb of feedbackArray) {
            const rawDate = fb.dateCreated || fb.FbkDateTime || fb.date || fb.createdAt || '';
            const date = rawDate ? formatDate(new Date(rawDate).getTime()) : '';

            const stallId = fb.stallId || fb.StallID || fb.stall || '';
            const stallData = stallMap[stallId];
            const stall = stallData ? (stallData.name || stallData.StallName || stallId) : (stallId || 'Unknown Stall');

            const rating = sanitizeHTML(String(fb.rating || fb.FbkRating || ''));
            const comment = sanitizeHTML(truncate(fb.comments || fb.comment || fb.FbkComment || ''));

            const item = document.createElement('div');
            item.className = 'history-item';
            // build a details link that navigates to the stall's reviews page
            const detailsHref = stallId ? `/html/Feedback/reviews.html?stall=${encodeURIComponent(stallId)}` : '/html/Feedback/reviews.html';

            item.innerHTML = `
                <div class="col date">${date}</div>
                <div class="col stall">${stall}</div>
                <div class="col rating">☆ <span class="rating-value">${rating}</span></div>
                <div class="col comment">${comment}</div>
                <div class="col action"><a class="details-btn" href="${detailsHref}">Details</a></div>
            `;

            historyList.appendChild(item);
        }

    } catch (error) {
        console.error('Error loading feedback history:', error);
        historyList.innerHTML = `<div class="no-feedback">Error loading feedback history.</div>`;
    }
}

// initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFeedbackHistory();
});
