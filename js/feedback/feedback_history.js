import { getCurrentUser } from '/js/modules/auth.js';
import { listUserFeedback, getAllFoodStalls } from '/js/firebase/wrapper.js';
import { formatDate } from '/js/utils/helpers.js';

/*
 * feedback_history.js
 * - Fetches the current user's feedback from Firebase
 * - Renders entries into .history-list in feedback_history.html
 */

const historyList = document.querySelector('.history-list');

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
            historyList.innerHTML = `<div class="no-feedback">No feedback found.</div>`;
            return;
        }

        // turn into array
        const feedbackArray = Object.values(userFeedback);

        if (feedbackArray.length === 0) {
            historyList.innerHTML = `<div class="no-feedback">You have not submitted any feedback yet.</div>`;
            return;
        }

        // load stalls once to map StallID -> StallName
        const allStalls = await getAllFoodStalls();

        const stallMap = allStalls || {};

        // sort by datetime descending
        feedbackArray.sort((a, b) => new Date(b.FbkDateTime) - new Date(a.FbkDateTime));

        for (const fb of feedbackArray) {
            const date = fb.FbkDateTime ? formatDate(new Date(fb.FbkDateTime).getTime()) : '';
            const stall = stallMap[fb.StallID] ? stallMap[fb.StallID].StallName : (fb.StallID || 'Unknown Stall');
            const rating = sanitizeHTML(String(fb.FbkRating || ''));
            const comment = sanitizeHTML(truncate(fb.FbkComment || ''));

            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="col date">${date}</div>
                <div class="col stall">${stall}</div>
                <div class="col rating">☆ <span class="rating-value">${rating}</span></div>
                <div class="col comment">${comment}</div>
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
