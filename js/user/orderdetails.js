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
        // fallback: try reading from URL params if not set in sessionStorage
        if (!currentOrderId) {
            const url = new URL(window.location.href);
            currentOrderId = url.searchParams.get('order') || url.searchParams.get('id') || null;
            if (currentOrderId) {
                console.log('Order ID loaded from URL:', currentOrderId);
                sessionStorage.setItem('selectedOrderId', currentOrderId);
            }
        }

        if (!currentOrderId) {
            console.warn('No selectedOrderId found in sessionStorage or URL');
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
        console.log('Loaded order:', order);

        if (!order) {
            console.warn('Order not found for id', currentOrderId);
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

        try {
            renderOrderDetails(order, stall);
        } catch (err) {
            console.error('Error rendering order details:', err);
            const container = document.getElementById('orderDetailsContainer');
            if (container) container.innerHTML = '<p style="padding:16px;">Error displaying order details.</p>';
            hideLoadingState();
        }
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

    // Normalize items: support array or object map shapes
    const rawItems = order.items || [];
    const itemsArray = Array.isArray(rawItems)
        ? rawItems
        : (typeof rawItems === 'object' ? Object.values(rawItems) : []);

    function resolveUnitPrice(it) {
        return Number(it?.unitPrice ?? it?.price ?? it?.ItemPrice ?? it?.cost ?? 0) || 0;
    }

    function resolveQty(it) {
        return Number(it?.qty ?? it?.quantity ?? it?.Qty ?? 0) || 0;
    }

    let itemsHTML = '';
    if (itemsArray.length > 0) {
        itemsHTML = itemsArray
            .map(item => {
                const name = item?.name || item?.itemCode || 'Unknown Item';
                const qty = resolveQty(item) || 1;
                const unit = resolveUnitPrice(item);
                const line = unit * qty;
                const notes = item.specialRequests ? `<p class="item-notes">Notes: ${item.specialRequests}</p>` : '';
                return `
                <div class="order-item">
                    <div class="item-info">
                        <h4 class="item-name">${name}</h4>
                        <p class="item-qty">Quantity: ${qty}</p>
                        ${notes}
                    </div>
                    <div class="item-price">
                        <div class="unit-price">${`$${unit.toFixed(2)}`}</div>
                        <div class="line-total">${`$${line.toFixed(2)}`}</div>
                    </div>
                </div>
            `
            })
            .join('');
    }

    // Prefer stored totals, but fallback to computed subtotal from items
    const computedSubtotal = itemsArray.reduce((s, it) => s + (Number(it?.unitPrice ?? it?.price ?? it?.ItemPrice ?? it?.cost ?? 0) || 0) * (Number(it?.qty ?? it?.quantity ?? 0) || 0), 0);
    const subtotal = order.totals?.subtotal ?? computedSubtotal;
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
    // show the details container and ensure empty state is hidden
    const container = document.getElementById('orderDetailsContainer');
    if (container) container.style.display = 'block';
    const empty = document.getElementById('emptyState');
    if (empty) empty.style.display = 'none';
}

function showEmptyState() {
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
}
