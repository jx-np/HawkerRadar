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
filterBtn.addEventListener('click', () => {
    const selectedCategory = issueFilter.value;
    const selectedDate = dateFilter.value; // Returns "YYYY-MM-DD"

    console.log("Filtering...", selectedCategory, selectedDate);

    const filteredData = feedbackData.filter(item => {
        // --- 1. ROBUST CATEGORY CHECK ---
        // Convert BOTH to lowercase so "Service" matches "service"
        // We use String() to safely handle if data is missing/null
        const itemCat = String(item.categories).toLowerCase().trim();
        const filterCat = selectedCategory.toLowerCase().trim();
        
        const categoryMatch = selectedCategory === 'All' || itemCat === filterCat;


        // --- 2. ROBUST DATE CHECK ---
        let dateMatch = true;
        
        if (selectedDate) {
            if (item.FbkDateTime) {
                // Create actual Date objects to compare (ignoring time and format differences)
                // This makes "2026-02-05" equal "05/02/2026" or "Feb 5, 2026"
                const itemDateObj = new Date(item.FbkDateTime);
                const filterDateObj = new Date(selectedDate);

                // Compare Year, Month, and Day specifically
                const isSameYear = itemDateObj.getFullYear() === filterDateObj.getFullYear();
                const isSameMonth = itemDateObj.getMonth() === filterDateObj.getMonth();
                const isSameDay = itemDateObj.getDate() === filterDateObj.getDate();

                dateMatch = isSameYear && isSameMonth && isSameDay;
            } else {
                dateMatch = false; // Hide if item has no date
            }
        }

        return categoryMatch && dateMatch;
    });

    console.log("Items matched:", filteredData.length);
    renderComplaints(filteredData);
});

// filterBtn.addEventListener('click', () => {
//     const selectedCategory = issueFilter.value;
//     const selectedDate = dateFilter.value; 

//     console.log("--- FILTER CLICKED ---");
//     console.log("Selected Category:", selectedCategory);
//     console.log("Selected Date:", selectedDate);

//     const filteredData = feedbackData.filter(item => {
//         // --- DEBUGGING ---
//         // This will print the category of the first few items so you can check spelling
//         // (We only log the first one to avoid spamming the console)
//         if (item === feedbackData[0]) {
//             console.log("First Item Data:", item);
//             console.log("Item Category in DB:", item.categories);
//         }

//         // 1. Check Category
//         // We use safe comparison: match "All", OR match the category exactly
//         const categoryMatch = selectedCategory === 'All' || item.categories === selectedCategory;

//         // 2. Check Date
//         let dateMatch = true; 
//         if (selectedDate) {
//             if (item.FbkDateTime) {
//                 dateMatch = item.FbkDateTime.includes(selectedDate);
//             } else {
//                 dateMatch = false; 
//             }
//         }

//         return categoryMatch && dateMatch;
//     });

//     console.log("Total items found:", filteredData.length);
//     renderComplaints(filteredData);
// });

// Initial Render (Show all on load)
renderComplaints(feedbackData);

console.log("Complaint JS loaded");