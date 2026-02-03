const complaintsData = [
    {
        id: 1,
        name: "John Doe",
        issueType: "Poor Hygiene",
        date: "23 Jan 2024",
        title: "Lorem ipsum dolor sit amet.",
        description: "The tables were not cleaned properly and there were used napkins left behind."
    },
    {
        id: 2,
        name: "Jane Smith",
        issueType: "Food Safety Issue",
        date: "22 Jan 2024",
        title: "Undercooked chicken served.",
        description: "consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    },
    {
        id: 3,
        name: "Alice Brown",
        issueType: "Unsatisfactory Service",
        date: "20 Jan 2024",
        title: "Staff was rude.",
        description: "The staff member ignored my request for water three times."
    },
    {
        id: 4,
        name: "Bob White",
        issueType: "Overcharging",
        date: "19 Jan 2024",
        title: "Charged for extra items.",
        description: "My receipt shows 3 drinks but I only ordered 2."
    },
    {
        id: 5,
        name: "Charlie Green",
        issueType: "Poor Hygiene",
        date: "18 Jan 2024",
        title: "Dirty utensils.",
        description: "The fork provided had dried food stuck to it."
    }
];

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
                <span class="user-name">${complaint.name}</span>
                <span class="issue-type"><span class="issue-label">Issue Type:</span> ${complaint.issueType}</span>
                <span class="date">${complaint.date}</span>
            </div>
            <div class="card-body">
                <h3>${complaint.title}</h3>
                <ul>
                    <li>${complaint.description}</li>
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
        renderComplaints(complaintsData);
    } else {
        // Filter the array based on the Issue Type
        const filteredData = complaintsData.filter(item => item.issueType === selectedIssue);
        renderComplaints(filteredData);
    }
});

// Initial Render (Show all on load)
renderComplaints(complaintsData);