import { addComplaint } from '/js/firebase/wrapper.js';
import { addFeedback } from '/js/firebase/wrapper.js';

const selectedCategories = new Set();
const othersCategory = document.getElementById("othersCategory");
const othersInput = document.getElementById("othersInput");

document.querySelectorAll(".category").forEach(item => {
    item.addEventListener("click", () => {
        const value = item.dataset.value;

        item.classList.toggle("selected");

        if (item.classList.contains("selected")) {
            selectedCategories.add(value);
        } else {
            selectedCategories.delete(value);
        }

        // Handle "Others" input
        if (value === "Others") {
            if (item.classList.contains("selected")) {
                othersInput.style.display = "block";
                othersInput.required = true;
            } else {
                othersInput.style.display = "none";
                othersInput.required = false;
                othersInput.value = "";
            }
        }
    });
});

document.getElementById("complaintForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (selectedCategories.size === 0) {
        alert("Please select at least one complaint category.");
        return;
    }

    const categories = Array.from(selectedCategories);

    if (categories.includes("Others")) {
        categories[categories.indexOf("Others")] = `Others: ${othersInput.value}`;
    }

    const data = {
        foodStall: document.getElementById("foodStall").value,
        hawkerCentre: document.getElementById("hawkerCentre").value,
        incidentDate: document.getElementById("incidentDate").value,
        categories: categories,
        description: document.getElementById("description").value
    };

    try {
        const complaintID = `complaint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const categoryString = categories.join(", ");

        const complaintSuccess = await addFeedback(complaintID, )
        addComplaint(complaintID, categoryString);

        if (complaintSuccess) {
            alert("Complaint submitted successfully.");
            document.getElementById("complaintForm").reset();
            selectedCategories.clear();
            document.querySelectorAll(".category").forEach(c => c.classList.remove("selected"));
            othersInput.style.display = "none";
        } else {
            alert("Error submitting complaint.");
        }
    } catch (err) {
        console.error('Error submitting complaint:', err);
        alert("Server error.");
    }
});

console.log("Complaint JS loaded");