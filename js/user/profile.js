import { 
    getUser, 
    updateUser, 
    onAuthChanged,
    logout,
    addPaymentMethod,
    removePaymentMethod,
    getPaymentMethods
} from '/js/firebase/wrapper.js';
import { hasRole } from '/js/modules/auth.js';

let currentUser = null;
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    onAuthChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            loadProfilePhoto();
            updateNavbarProfileButton();
            updateStallManagementButton();
        } else {
            window.location.href = '/html/auth/login.html';
        }
    });

    setupEventListeners();
});

async function loadUserProfile() {
    try {
        currentUser = await getUser(currentUserId);
        
        if (!currentUser) {
            console.error('User not found');
            return;
        }

        document.getElementById('displayName').textContent = currentUser.name || 'Loading...';
        document.getElementById('displayEmail').textContent = currentUser.email || 'Loading...';
        document.getElementById('displayUsername').textContent = currentUser.username || currentUser.name || 'Loading...';

        document.getElementById('profileNameInput').value = currentUser.name || '';
        document.getElementById('profileEmailInput').value = currentUser.email || '';
        document.getElementById('profilePhoneInput').value = currentUser.contactNo || '';
        document.getElementById('profileAddressInput').value = currentUser.address || '';

        loadPaymentMethods();

    } catch (error) {
        console.error('Error loading profile', error);
    }
}

function loadProfilePhoto() {
    const photoKey = `profilePhoto_${currentUserId}`;
    const savedPhoto = localStorage.getItem(photoKey);
    
    if (savedPhoto) {
        document.getElementById('profilePhoto').src = savedPhoto;
    }
}

function saveProfilePhoto(base64Image) {
    const photoKey = `profilePhoto_${currentUserId}`;
    localStorage.setItem(photoKey, base64Image);
}

function setupEventListeners() {
    document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handlePhotoUpload(file);
            }
        });
        
        fileInput.click();
    });

    document.getElementById('saveProfileBtn').addEventListener('click', saveProfileChanges);

    document.getElementById('addCardBtn').addEventListener('click', addNewCard);

    document.querySelectorAll('.change-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const input = e.target.parentElement.querySelector('input');
            if (input) {
                input.removeAttribute('readonly');
                input.focus();
            }
        });
    });

    const navbarProfileBtn = document.getElementById('navbarProfileBtn');
    if (navbarProfileBtn && navbarProfileBtn.textContent === 'Log out') {
        navbarProfileBtn.addEventListener('click', () => {
            logout();
        });
    }
}

function updateNavbarProfileButton() {
    const navbarProfileBtn = document.querySelector('.nav-right a');
    if (navbarProfileBtn) {
        navbarProfileBtn.textContent = 'Log out';
        navbarProfileBtn.href = '/html/auth/login.html';
        navbarProfileBtn.onclick = function() {
            logout();
        };
    }
}

function handlePhotoUpload(file) {
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        document.getElementById('profilePhoto').src = base64Image;
        
        saveProfilePhoto(base64Image);
        showNotification('Profile photo updated successfully!');
    };
    
    reader.onerror = function() {
        alert('Failed to read image file. Please try again.');
    };
    
    reader.readAsDataURL(file);
}

async function saveProfileChanges() {
    try {
        const updatedData = {
            name: document.getElementById('profileNameInput').value.trim(),
            email: document.getElementById('profileEmailInput').value.trim(),
            contactNo: document.getElementById('profilePhoneInput').value.trim(),
            address: document.getElementById('profileAddressInput').value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (!updatedData.name) {
            alert('Name is required');
            return;
        }

        if (!updatedData.email) {
            alert('Email is required');
            return;
        }

        const emailRegex = /^.+@.+$/;
        if (!emailRegex.test(updatedData.email)) {
            alert('Please enter a valid email address');
            return;
        }

        await updateUser(currentUserId, updatedData);

        document.getElementById('displayName').textContent = updatedData.name;
        document.getElementById('displayEmail').textContent = updatedData.email;
        document.getElementById('displayUsername').textContent = updatedData.name;

        showNotification('Profile updated');

        await loadUserProfile();

    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile changes. Please try again.');
    }
}

function loadPaymentMethods() {
    const container = document.getElementById('paymentCardsContainer');
    container.innerHTML = '';

    const paymentMethods = currentUser.paymentMethods || {};
    const paymentArray = Object.entries(paymentMethods);

    if (paymentArray.length === 0) {
        container.innerHTML = '<p class="no-cards">No payment methods added yet.</p>';
        return;
    }

    paymentArray.forEach(([cardId, card]) => {
        const cardElement = createPaymentCardElement(cardId, card);
        container.appendChild(cardElement);
    });
}

function createPaymentCardElement(cardId, card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'payment-card';
    cardDiv.dataset.cardId = cardId;

    const cardType = card.type || 'Card';
    const maskedNumber = card.lastFourDigits ? `**** ${card.lastFourDigits}` : '**** ****';
    const cardHolder = card.cardHolder || 'Card Holder';
    const expiryDate = card.expiryDate || 'MM/YY';

    cardDiv.innerHTML = `
        <div class="card-header">
            <span class="card-type">${cardType}</span>
            <button class="delete-card-btn" data-card-id="${cardId}">×</button>
        </div>
        <div class="card-number">${maskedNumber}</div>
        <div class="card-footer">
            <span class="card-holder">${cardHolder}</span>
            <span class="card-expiry">${expiryDate}</span>
        </div>
    `;

    const deleteBtn = cardDiv.querySelector('.delete-card-btn');
    deleteBtn.addEventListener('click', () => deleteCard(cardId));

    return cardDiv;
}

function addNewCard() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Payment Method</h2>
                <button class="close-modal">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Card Type</label>
                    <select id="cardType">
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="Amex">American Express</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Card Number</label>
                    <input type="text" id="cardNumber" placeholder="1234 5678 9012 3456" maxlength="19">
                </div>
                <div class="form-group">
                    <label>Card Holder Name</label>
                    <input type="text" id="cardHolder" placeholder="JOHN DOE">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Expiry Date</label>
                        <input type="text" id="expiryDate" placeholder="MM/YY" maxlength="5">
                    </div>
                    <div class="form-group">
                        <label>CVV</label>
                        <input type="text" id="cvv" placeholder="123" maxlength="4">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn">Cancel</button>
                <button class="save-card-btn">Add Card</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const cardNumberInput = modal.querySelector('#cardNumber');
    cardNumberInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '');
        let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
        e.target.value = formatted;
    });

    const expiryInput = modal.querySelector('#expiryDate');
    expiryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        e.target.value = value;
    });

    const cvvInput = modal.querySelector('#cvv');
    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.querySelector('.save-card-btn').addEventListener('click', () => saveNewCard(modal));
}

async function saveNewCard(modal) {
    const cardType = modal.querySelector('#cardType').value;
    const cardNumber = modal.querySelector('#cardNumber').value.replace(/\s/g, '');
    const cardHolder = modal.querySelector('#cardHolder').value.trim();
    const expiryDate = modal.querySelector('#expiryDate').value;
    const cvv = modal.querySelector('#cvv').value;

    if (!cardNumber || cardNumber.length < 13) {
        alert('Please enter a valid card number');
        return;
    }

    if (!cardHolder) {
        alert('Please enter card holder name');
        return;
    }

    if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
        alert('Please enter expiry date in MM/YY format');
        return;
    }

    if (!cvv || cvv.length < 3) {
        alert('Please enter a valid CVV');
        return;
    }

    try {
        const lastFourDigits = cardNumber.slice(-4);

        const paymentMethod = {
            type: cardType,
            lastFourDigits: lastFourDigits,
            cardHolder: cardHolder,
            expiryDate: expiryDate
        };

        await addPaymentMethod(currentUserId, paymentMethod);

        // Reload user to get updated payment methods
        currentUser = await getUser(currentUserId);

        loadPaymentMethods();
        modal.remove();
        showNotification('Payment method added');

    } catch (error) {
        console.error('Error saving card:', error);
        alert('Failed to add payment method. Please try again.');
    }
}

async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to remove this payment method?')) {
        return;
    }

    try {
        await removePaymentMethod(currentUserId, cardId);

        // Reload user to get updated payment methods
        currentUser = await getUser(currentUserId);

        loadPaymentMethods();
        showNotification('Payment method removed');

    } catch (error) {
        console.error('Error deleting card:', error);
        alert('Failed to remove payment method. Please try again.');
    }
}

function updateStallManagementButton() {
    const stallManageBtn = document.querySelector('.stall-manage-btn');
    if (stallManageBtn) {
        if (hasRole('vendor')) {
            stallManageBtn.style.display = 'inline-block';
        } else {
            stallManageBtn.style.display = 'none';
        }
    }
}

function showNotification(message) {
    // notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}