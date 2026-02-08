import { listStallComplaints, getUser, getStall, updateComplaint } from "/js/firebase/wrapper.js";
// [!] Import auth function. Ensure this path points to where you saved your auth.js file
import { getCurrentUser } from "/js/modules/auth.js";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */

function maskName(name) {
    if (!name || name.length <= 2) return name;
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

// --- 1. Helper: Get Stall ID from URL or Session ---
function getStallId() {
    const url = new URL(window.location.href);
    return (
        url.searchParams.get("stall") || // Priority 1
        url.searchParams.get("id") ||    // Priority 2
        sessionStorage.getItem("selectedStallId") || // Priority 3
        ""
    );
}

const STALL_ID = getStallId();

// --- DOM Elements ---
const complaintsList = document.getElementById('complaints-list');
const stallTitle = document.querySelector('.stall-title');
const stallHeader = document.querySelector('.stall-header'); 
const filterBtn = document.getElementById('filter-btn');
const issueFilter = document.getElementById('issue-filter');
const dateFilter = document.getElementById('date-filter');
const backBtn = document.querySelector('.back-arrow'); // <--- Added Back Button

// --- Initialization ---
async function initPage() {

    // --- SETUP BACK BUTTON ---
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // --- SECURITY CHECK START ---
    const user = getCurrentUser();

    // Check if user is logged in
    if (!user) {
        alert("Access Denied: Please log in first.");
        window.location.href = "/login.html"; // Redirect to login page
        return;
    }

    // Check if user has the 'vendor' role
    if (!user.roles || !user.roles.vendor) {
        document.body.innerHTML = `
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
                <p>Current Role: <strong>${user.roles?.vendor ? 'Vendor' : 'Customer'}</strong> (Required: <strong>Vendor</strong>)</p>
                <a href="/">Return Home</a>
            </div>
        `;
        return; // Stop execution
    }
    // --- SECURITY CHECK END ---

    if (!STALL_ID) {
        if (stallTitle) stallTitle.textContent = "Error: No Stall ID";
        complaintsList.innerHTML = '<p style="text-align:center;">No stall selected in URL.</p>';
        return;
    }

    // Persist ID
    sessionStorage.setItem("selectedStallId", STALL_ID);

    console.log("Loading for Stall ID:", STALL_ID);

    try {
        const [stall, complaintsMap] = await Promise.all([
            getStall(STALL_ID),
            listStallComplaints(STALL_ID)
        ]);

        // --- UPDATE HEADER INFO ---
        if (stall) {
            if (stallTitle) stallTitle.textContent = stall.name;

            // <--- IMAGE FIX: Use 'storeImage' property --->
            const imageUrl = stall.storeImage || stall.image || stall.coverImage; 
            
            if (imageUrl) {
                stallHeader.style.backgroundImage = `url('${imageUrl}')`;
            }
        } else {
            if (stallTitle) stallTitle.textContent = "Stall Not Found";
        }

        // --- PROCESS COMPLAINTS ---
        const rawComplaints = complaintsMap ? Object.values(complaintsMap) : [];
        let complaintsData = [];

        if (rawComplaints.length > 0) {
            const processingPromises = rawComplaints.map(async (item) => {
                let userName = "Unknown User";
                let profilePhoto = null;
                
                if (item.userId) {
                    try {
                        const user = await getUser(item.userId);
                        if (user) {
                            userName = user.name || user.email || "Anonymous";
                            profilePhoto = user.profilePhoto || null;
                        }
                    } catch (err) {
                        console.error("Failed to fetch user", item.userId);
                    }
                }

                return {
                    ...item,
                    customerName: maskName(userName),
                    profilePhoto,
                    category: item.category || "General",
                    comments: item.comments || "No details provided.",
                    date: item.dateCreated,
                    status: item.status || 'open'
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

// --- Build Complaint Card ---
function buildComplaintCard(complaint) {
    const dateObj = new Date(complaint.date);
    const dateStr = isNaN(dateObj) ? "Unknown Date" : dateObj.toLocaleDateString();

    const isClosed = complaint.status === 'closed';
    const btnClass = isClosed ? 'btn-mark-read closed' : 'btn-mark-read';
    const btnText = isClosed ? 'Read' : 'Mark as Read';

    const avatar = complaint.profilePhoto
        ? `<img src="${complaint.profilePhoto}" alt="avatar" class="profile-photo" />`
        : `<div class="avatar-circle"></div>`;

    const card = document.createElement('article');
    card.className = 'complaint-card';

    card.innerHTML = `
        <div class="card-header">
            <div class="avatar">${avatar}</div>
            <span class="user-name">${complaint.customerName}</span>
            <span class="issue-type">
                <span class="issue-label">Issue Type:</span> ${complaint.category}
            </span>
            <span class="date">${dateStr}</span>
        </div>
        <div class="card-body">
            <ul>
                <li>${complaint.description}</li>
            </ul>
            <div class="card-actions">
                <button class="${btnClass}" data-id="${complaint.id}">${btnText}</button>
            </div>
        </div>
    `;

    // Attach Click Listener
    const btn = card.querySelector('.btn-mark-read');
    btn.addEventListener('click', async () => {
        if (btn.classList.contains('closed')) return;

        try {
            await updateComplaint(complaint.id, { status: 'closed' });
            
            btn.textContent = "Read";
            btn.classList.add('closed');
            complaint.status = 'closed';
            
        } catch (error) {
            console.error("Failed to mark as read:", error);
            alert("Error updating status.");
        }
    });

    return card;
}

// --- Render Function ---
function renderComplaints(data) {
    complaintsList.innerHTML = '';

    if (!data || data.length === 0) {
        complaintsList.innerHTML = '<p style="text-align:center; color:#777;">No complaints found.</p>';
        return;
    }

    // Sort by Date (Newest first)
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const complaint of sortedData) {
        complaintsList.appendChild(buildComplaintCard(complaint));
    }
}

// --- Filter Logic ---
if (filterBtn) {
    filterBtn.addEventListener('click', () => {
        const data = window.currentComplaintsData || [];
        const selectedCategory = issueFilter.value;
        const selectedDate = dateFilter.value; 

        const filteredData = data.filter(item => {
            const itemCat = String(item.category).toLowerCase().trim();
            const filterCat = selectedCategory.toLowerCase().trim();
            
            // Includes check allows "Price" to be found in "Cleanliness, Price"
            const categoryMatch = selectedCategory === 'All' || itemCat.includes(filterCat);

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