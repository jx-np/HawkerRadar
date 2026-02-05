import { getAllFeedback, getAllCustomers, getAllComplaints, getCustomer } from "/js/firebase/wrapper.js";

let feedbackDataRaw = await getAllFeedback();
let complaintsDataRaw = await getAllComplaints();
let customerDataRaw = await getAllCustomers();

// Convert customers to an array first so we can search them
const customersArray = feedbackDataRaw ? Object.values(feedbackDataRaw) : [];

// Create the complaints array and merge the customer name into it
let feedbackData = [];

if (feedbackDataRaw) {
    // Create an array of Promises
    const processingPromises = Object.values(feedbackDataRaw).map(async (feedback) => {
        // Now we can use await here safely because the callback is async
        let customer = await getCustomer(feedback.CustomerID);
        let complaintInfo = complaintsDataRaw ? complaintsDataRaw[feedback.FbkID] : null;
        console.log(customer)
        return {
            ...feedback,
            customername: customer ? customer.CustName : "Unknown User",
            categories: complaintInfo ? complaintInfo.Category : "General"
        };
    });

    // Wait for ALL promises to finish before continuing
    feedbackData = await Promise.all(processingPromises);
}

// Select DOM elements
const dateFilter = document.getElementById('date-filter');
const complaintsList = document.getElementById('complaints-list');
const filterBtn = document.getElementById('filter-btn');
const issueFilter = document.getElementById('issue-filter');
// Function to Render Complaints
function renderComplaints(data) {
    // Clear existing content
    complaintsList.innerHTML = '';

    if (data.length === 0) {
        complaintsList.innerHTML = '<p style="text-align:center; color:#777;">No complaints found for this category.</p>';
        return;
    }

    // Loop through data and create HTML for each card
    data.forEach(complaint => {
        const card = document.createElement('article');
        card.classList.add('complaint-card');

        card.innerHTML = `
            <div class="card-header">
                <div class="avatar"></div>
                <span class="user-name">${complaint.customername}</span>
                <span class="issue-type"><span class="issue-label">Issue Type:</span> ${complaint.categories}</span>
                <span class="date">${complaint.FbkDateTime}</span>
            </div>
            <div class="card-body">
                <ul>
                    <li>${complaint.FbkComment}</li>
                </ul>
            </div>
        `;

        complaintsList.appendChild(card);
    });
}

// Filter Logic
// filterBtn.addEventListener('click', () => {
//     const selectedIssue = issueFilter.value;

//     if (selectedIssue === "All") {
//         // Show all data
//         renderComplaints(feedbackData);
//     } else {
//         // Filter the array based on the Issue Type
//         const filteredData = feedbackData.filter(item =>
//             item.categories.includes(selectedIssue)
//         );
//         renderComplaints(filteredData);
//     }
// });

filterBtn.addEventListener('click', () => {
    const selectedCategory = issueFilter.value;

    const selectedDate = dateFilter.value; // Gets date as "YYYY-MM-DD"

    const filteredData = feedbackData.filter(item => {
        // Your existing category check
        const categoryMatch = selectedCategory === 'All' || item.issue === selectedCategory;

        // If no date is selected (!selectedDate), it returns true (shows all).
        // Otherwise, it checks if the dates match exactly.
        const dateMatch = !selectedDate || item.date === selectedDate;

        // Return items that match BOTH category AND date
        return categoryMatch && dateMatch;
    });

    renderComplaints(filteredData);
});

// Initial Render (Show all on load)
renderComplaints(feedbackData);

console.log("Complaint JS loaded");