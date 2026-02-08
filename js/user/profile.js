// js/user/profile.js
// User profile page — load and update user profile from Firebase

import { getCurrentUser, isAuthenticated, updateProfile, disableAccount } from "/js/modules/auth.js";
import { getUserById, listenToUserProfile } from "/js/firebase/wrapper.js";

function applyHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--site-header-h", `${h}px`);
}
applyHeaderOffset();
window.addEventListener("resize", applyHeaderOffset);
window.addEventListener("load", applyHeaderOffset);

const $ = (sel, root = document) => root.querySelector(sel);

let currentUser = null;
let unsubscribeListener = null;

async function loadUserProfile() {
  const user = getCurrentUser();
  
  if (!user || !isAuthenticated()) {
    // Redirect to login if not authenticated
    window.location.href = "../auth/login.html";
    return;
  }

  currentUser = user;

  try {
    // Try to get full user details from Firebase
    let userProfile = null;
    try {
      userProfile = await getUserById(user.userId);
    } catch (err) {
      console.warn("Could not fetch full profile from Firebase:", err);
    }

    // Use Firebase profile data if available, fallback to currentUser data
    const profileData = userProfile || user;

    // Populate display section
    $("#displayName").textContent = profileData.displayName || profileData.name || "User";
    $("#displayEmail").textContent = profileData.email || user.email || "N/A";
    $("#displayUsername").textContent = `"${profileData.username || profileData.displayName?.split(" ")[0] || "User"}"`;

    // Set profile photo if available
    const profilePhotoEl = $("#profilePhoto");
    if (profilePhotoEl && profileData.photoURL) {
      profilePhotoEl.src = profileData.photoURL;
    }

    // Populate form inputs
    $("#profileNameInput").value = profileData.displayName || profileData.name || "";
    $("#profileEmailInput").value = profileData.email || user.email || "";
    $("#profilePhoneInput").value = profileData.phone || profileData.phoneNumber || "";
    $("#profileAddressInput").value = profileData.address || "";

    console.log("User profile loaded:", profileData);
  } catch (err) {
    console.error("Error loading user profile:", err);
    alert("Error loading profile data");
  }
}

function attachEventListeners() {
  // Save Profile Button
  const saveBtn = $("#saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      if (!currentUser) {
        alert("User not authenticated");
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        // Collect form data
        const updates = {
          displayName: $("#profileNameInput").value || currentUser.displayName,
          email: $("#profileEmailInput").value || currentUser.email,
          phone: $("#profilePhoneInput").value,
          address: $("#profileAddressInput").value,
        };

        // Call Firebase updateProfile
        await updateProfile(currentUser.userId, updates);

        // Update currentUser with new data
        currentUser = { ...currentUser, ...updates };

        // Refresh display
        $("#displayName").textContent = updates.displayName;
        $("#displayEmail").textContent = updates.email;

        saveBtn.textContent = "Changes Saved!";
        setTimeout(() => {
          saveBtn.textContent = "Save Changes";
          saveBtn.disabled = false;
        }, 2000);

        console.log("Profile updated successfully");
      } catch (err) {
        console.error("Error updating profile:", err);
        alert("Failed to save profile changes");
        saveBtn.textContent = "Save Changes";
        saveBtn.disabled = false;
      }
    });
  }

  // Upload Photo Button (placeholder implementation)
  const uploadBtn = $("#uploadPhotoBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      // Create hidden file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          uploadBtn.disabled = true;
          uploadBtn.textContent = "Uploading...";

          // Note: Actual file upload to Firebase Storage would go here
          // For now, we'll create a data URL preview
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataURL = event.target?.result;
            if (dataURL) {
              $("#profilePhoto").src = dataURL;
              console.log("Photo preview updated (upload to Firebase Storage not yet implemented)");
            }
          };
          reader.readAsDataURL(file);

          uploadBtn.textContent = "Photo Updated";
          setTimeout(() => {
            uploadBtn.textContent = "Upload New Photo";
            uploadBtn.disabled = false;
          }, 1500);
        } catch (err) {
          console.error("Error uploading photo:", err);
          alert("Failed to upload photo");
          uploadBtn.textContent = "Upload New Photo";
          uploadBtn.disabled = false;
        }
      });
      input.click();
    });
  }

  // Change links (edit mode toggle)
  const changeLinks = document.querySelectorAll(".change-link");
  changeLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const infoGroup = link.closest(".info-group");
      if (infoGroup) {
        const input = infoGroup.querySelector("input");
        if (input) {
          input.focus();
          input.select();
        }
      }
    });
  });

  // Add Card Button (placeholder)
  const addCardBtn = $("#addCardBtn");
  if (addCardBtn) {
    addCardBtn.addEventListener("click", () => {
      alert("Add card functionality coming soon");
    });
  }
}

async function init() {
  // Load user profile from Firebase
  await loadUserProfile();

  // Attach all event listeners
  attachEventListeners();

  // Set up real-time listener for profile changes
  if (currentUser) {
    if (unsubscribeListener) {
      unsubscribeListener();
    }
    unsubscribeListener = listenToUserProfile(currentUser.userId, async (profileData) => {
      console.log('User profile updated in real-time:', profileData);
      // Update currentUser with new data
      currentUser = { ...currentUser, ...profileData };
      // Reload UI with new data
      await loadUserProfile();
    });

    // Clean up listener on page unload
    window.addEventListener('beforeunload', () => {
      if (unsubscribeListener) {
        unsubscribeListener();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
