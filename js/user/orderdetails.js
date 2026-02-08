import {
    getOrder,
    onAuthChanged,
    getStall,
    listHawkerCentres
} from '/js/firebase/wrapper.js';

let currentUserId = null;
let currentOrderId = null;
let hawkerCentres = {};

/* =========================================================
   INIT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/html/user/orderhistory.html';
        });
    }

    onAuthChanged(user => {
        if (!user) {
            window.location.href = '/html/auth/login.html';
            return;
        }

        currentUserId = user.uid;
        
        // Get the order ID from sessionStorage
        currentOrderId = sessionStorage.getItem('selectedOrderId');
        
        if (!currentOrderId) {
            showEmptyState();
            return;
        }

        loadOrderDetails();
    });
});

/* =========================================================
   DATA LOADING
========================================================= */
async function loadOrderDetails() {
    try {
        showLoadingState();

        // Load hawker centres
        const hcData = await listHawkerCentres();
        hawkerCentres = hcData || {};

        // Load the specific order
        const order = await getOrder(currentOrderId);

        if (!order) {
            showEmptyState();
            return;
        }

        // Load stall details if available
        let stall = {};
        if (order.stallId) {
            try {
                stall = await getStall(order.stallId);
            } catch (err) {
                console.warn(`Failed to load stall ${order.stallId}`, err);
            }
        }

        renderOrderDetails(order, stall);
    } catch (err) {
        console.error('Error loading order details:', err);
        showEmptyState();
    }
}

/* =========================================================
   RENDERING
========================================================= */
function renderOrderDetails(order, stall) {
    const container = document.getElementById('orderDetailsContainer');
    const hawkerCentre = hawkerCentres[stall.hawkerCentreId] || {};

    const status = (order.status || 'pending').toLowerCase();
    const formattedDate = formatDate(order.dateCreated);

    let itemsHTML = '';
    if (Array.isArray(order.items) && order.items.length > 0) {
        itemsHTML = order.items
            .map(item => `
                <div class="order-item">
                    <div class="item-info">
                        <h4 class="item-name">${item.name || 'Unknown Item'}</h4>
                        <p class="item-qty">Quantity: ${item.qty || 1}</p>
                        ${item.specialRequests ? `<p class="item-notes">Notes: ${item.specialRequests}</p>` : ''}
                    </div>
                    <div class="item-price">
                        $${((item.price || 0) * (item.qty || 1)).toFixed(2)}
                    </div>
                </div>
            `)
            .join('');
    }

    const subtotal = order.totals?.subtotal ?? 0;
    const delivery = order.totals?.delivery ?? 0;
    const discount = order.totals?.discount ?? 0;
    const grandTotal = order.totals?.grandTotal ?? 0;

    container.innerHTML = `
        <div class="details-card">
            <div class="details-header">
                <div class="details-info">
                    <h2 class="details-title">Order #${order.id?.slice(0, 8).toUpperCase() || 'N/A'}</h2>
                    <p class="details-date">${formattedDate}</p>
                </div>
                <span class="order-status ${status}">
                    ${capitalizeStatus(status)}
                </span>
            </div>

            <div class="details-section">
                <h3>Location</h3>
                <p class="hawker-name">${hawkerCentre.name || 'Unknown Hawker Centre'}</p>
                <p class="stall-name">${stall.name || 'Unknown Stall'}</p>
            </div>

            <div class="details-section">
                <h3>Items</h3>
                <div class="items-container">
                    ${itemsHTML || '<p>No items found</p>'}
                </div>
            </div>

            <div class="details-section">
                <h3>Summary</h3>
                <div class="price-breakdown">
                    <div class="price-row">
                        <span>Subtotal</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    ${delivery > 0 ? `
                        <div class="price-row">
                            <span>Delivery</span>
                            <span>$${delivery.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${discount > 0 ? `
                        <div class="price-row discount">
                            <span>Discount</span>
                            <span>-$${discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="price-row total">
                        <span>Total</span>
                        <span>$${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    hideLoadingState();
}

/* =========================================================
   UTILS
========================================================= */
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizeStatus(status) {
    return status
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function showLoadingState() {
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('loadingState').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
}
