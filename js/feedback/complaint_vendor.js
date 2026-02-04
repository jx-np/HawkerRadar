import { getAllFeedback, getAllCustomers, getAllComplaints, getCustomer } from "/js/firebase/wrapper.js";

let feedbackDataRaw = await getAllFeedback();
let customerDataRaw = await getAllCustomers();
let complaintsDataRaw = await getAllComplaints();

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

// Select DOM elements
const complaintsList = document.getElementById('complaints-list');
const filterBtn = document.getElementById('filter-btn');
const issueFilter = document.getElementById('issue-filter');
// 2. Function to Render Complaints
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

// 3. Filter Logic
filterBtn.addEventListener('click', () => {
    const selectedIssue = issueFilter.value;

    if (selectedIssue === "All") {
        // Show all data
        renderComplaints(feedbackData);
    } else {
        // Filter the array based on the Issue Type
        const filteredData = feedbackData.filter(item =>
            item.categories.includes(selectedIssue)
        );
        renderComplaints(filteredData);
    }
});

// Initial Render (Show all on load)
renderComplaints(feedbackData);

console.log("Complaint JS loaded");