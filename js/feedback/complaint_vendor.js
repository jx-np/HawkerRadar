import { listStallComplaints, getUser, getStall } from "/js/firebase/wrapper.js";

// --- Get Stall ID from URL ---
const urlParams = new URLSearchParams(window.location.search);
const STALL_ID = urlParams.get('id'); 

// --- DOM Elements ---
const complaintsList = document.getElementById('complaints-list');
const stallTitle = document.querySelector('.stall-title');
const stallHeader = document.querySelector('.stall-header'); // <--- Select the header box
const filterBtn = document.getElementById('filter-btn');
const issueFilter = document.getElementById('issue-filter');
const dateFilter = document.getElementById('date-filter');

// --- Initialization ---
async function initPage() {
    if (!STALL_ID) {
        if (stallTitle) stallTitle.textContent = "Error: No Stall ID";
        complaintsList.innerHTML = '<p style="text-align:center;">No stall selected in URL.</p>';
        return;
    }

    console.log("Loading for Stall ID:", STALL_ID);

    try {
        const [stall, complaintsMap] = await Promise.all([
            getStall(STALL_ID),
            listStallComplaints(STALL_ID)
        ]);

        // --- UPDATE HEADER INFO ---
        if (stall) {
            console.log("Stall found:", stall.name);
            stallTitle.textContent = stall.name;

            // <--- Update Background Image --->
            // Checks for 'image' or 'coverImage' property in your DB
            const imageUrl = stall.image || stall.coverImage; 
            
            if (imageUrl) {
                stallHeader.style.backgroundImage = `url('${imageUrl}')`;
            } else {
                // Keep default CSS image or set a specific fallback
                console.log("No image found for stall, keeping default.");
            }
        } else {
            stallTitle.textContent = "Stall Not Found";
        }

        // --- PROCESS COMPLAINTS ---
        const rawComplaints = complaintsMap ? Object.values(complaintsMap) : [];
        let complaintsData = [];

        if (rawComplaints.length > 0) {
            const processingPromises = rawComplaints.map(async (item) => {
                let userName = "Unknown User";
                
                if (item.userId) {
                    try {
                        const user = await getUser(item.userId);
                        if (user) {
                            userName = user.name || user.email || "Anonymous";
                        }
                    } catch (err) {
                        console.error("Failed to fetch user", item.userId);
                    }
                }

                return {
                    ...item,
                    customerName: userName,
                    category: item.category || "General",
                    comments: item.comments || "No details provided.",
                    date: item.dateCreated
                };
            });

            complaintsData = await Promise.all(processingPromises);
        }

        window.currentComplaintsData = complaintsData; 
        renderComplaints(complaintsData);

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// --- Render Function ---
function renderComplaints(data) {
    complaintsList.innerHTML = '';

    if (!data || data.length === 0) {
        complaintsList.innerHTML = '<p style="text-align:center; color:#777;">No complaints found.</p>';
        return;
    }

    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedData.forEach(complaint => {
        const dateObj = new Date(complaint.date);
        const dateStr = isNaN(dateObj) ? "Unknown Date" : dateObj.toLocaleDateString();

        const card = document.createElement('article');
        card.classList.add('complaint-card');

        card.innerHTML = `
            <div class="card-header">
                <div class="avatar"></div>
                <span class="user-name">${complaint.customerName}</span>
                <span class="issue-type">
                    <span class="issue-label">Issue Type:</span> ${complaint.category}
                </span>
                <span class="date">${dateStr}</span>
            </div>
            <div class="card-body">
                <ul>
                    <li>${complaint.comments}</li>
                </ul>
            </div>
        `;

        complaintsList.appendChild(card);
    });
}

// --- 5. Filter Logic ---
if (filterBtn) {
    filterBtn.addEventListener('click', () => {
        const data = window.currentComplaintsData || [];
        const selectedCategory = issueFilter.value;
        const selectedDate = dateFilter.value; 

        const filteredData = data.filter(item => {
            const itemCat = String(item.category).toLowerCase().trim();
            const filterCat = selectedCategory.toLowerCase().trim();
            const categoryMatch = selectedCategory === 'All' || itemCat === filterCat;

            let dateMatch = true;
            if (selectedDate && item.date) {
                const itemDateObj = new Date(item.date);
                const filterDateObj = new Date(selectedDate);
                
                dateMatch = (
                    itemDateObj.getFullYear() === filterDateObj.getFullYear() &&
                    itemDateObj.getMonth() === filterDateObj.getMonth() &&
                    itemDateObj.getDate() === filterDateObj.getDate()
                );
            }

            return categoryMatch && dateMatch;
        });

        renderComplaints(filteredData);
    });
}

// Start
initPage();
console.log("Complaint Vendor JS loaded");