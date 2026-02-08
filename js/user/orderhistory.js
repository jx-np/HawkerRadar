import {
    listUserOrders,
    onAuthChanged,
    listHawkerCentres,
    getStall
} from '/js/firebase/wrapper.js';

let currentUserId = null;
let allOrders = {};
let hawkerCentres = {};
let stalls = {};

/* =========================================================
   INIT
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    onAuthChanged(user => {
        if (!user) {
            window.location.href = '/html/auth/login.html';
            return;
        }

        currentUserId = user.uid;
        setupEventListeners();
        loadOrders();
    });
});

/* =========================================================
   DATA LOADING
========================================================= */
async function loadOrders() {
    try {
        const ordersData = await listUserOrders(currentUserId);

        if (!ordersData || Object.keys(ordersData).length === 0) {
            showEmptyState();
            return;
        }

        // Ensure each order object includes its id (ordersData may be an object keyed by id)
        allOrders = Object.entries(ordersData || {}).reduce((acc, [id, ord]) => {
            acc[id] = Object.assign({}, ord, { id });
            return acc;
        }, {});

        await preloadMetadata();
        populateHawkerFilter();
        renderOrders(Object.values(allOrders));
    } catch (err) {
        console.error('Error loading orders:', err);
        showEmptyState();
    }
}

async function preloadMetadata() {
    /* ---- Hawker Centres ----
       listHawkerCentres() returns an OBJECT, not an array
       { hcId: { ...hcData } }
    */
    const hcData = await listHawkerCentres();
    hawkerCentres = hcData || {};

    /* ---- Stalls (only required ones) ---- */
    const stallIds = new Set(
        Object.values(allOrders)
            .map(o => o.stallId)
            .filter(Boolean)
    );

    await Promise.all(
        [...stallIds].map(async stallId => {
            try {
                stalls[stallId] = await getStall(stallId);
            } catch (err) {
                console.warn(`Failed to load stall ${stallId}`, err);
            }
        })
    );
}

/* =========================================================
   RENDERING
========================================================= */
function renderOrders(orders) {
    const container = document.querySelector('.orders-container');
    container.innerHTML = '';

    if (!orders.length) {
        showEmptyState();
        return;
    }

    orders.forEach(order => {
        container.appendChild(createOrderCard(order));
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';

    const stall = stalls[order.stallId] || {};
    const hawkerCentre = hawkerCentres[stall.hawkerCentreId] || {};

    const status = (order.status || 'pending').toLowerCase();
    const formattedDate = formatDate(order.dateCreated);
    const itemsSummary = getItemsSummary(order.items);
    const total = order.totals?.grandTotal ?? 0;

    card.innerHTML = `
        <div class="order-card__header">
            <div class="order-card__info">
                <h3 class="order-card__id">
                    ${hawkerCentre.name || 'Unknown Hawker Centre'}
                </h3>
                <p class="order-card__date">
                    ${stall.name || 'Unknown Stall'}
                </p>
            </div>
            <span class="order-card__status ${status}">
                ${capitalizeStatus(status)}
            </span>
        </div>

        <div class="order-card__body">
            <p class="order-card__stall">
                ${formattedDate} | ${itemsSummary}
            </p>
            <div class="order-card__meta">
                <div class="order-meta-row">
                    <span>Total</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
        </div>

            <div class="order-card__footer">
                <button class="order-btn order-btn--view" data-order-id="${order.id}">
                    <span class="material-symbols-outlined">visibility</span>
                    View Details
                </button>
            </div>
    `;

    return card;
}

/* =========================================================
   FILTERS
========================================================= */
function applyFilters() {
    const hawkerId = document.getElementById('hawkerFilter')?.value;
    const daysValue = document.getElementById('dateFilter')?.value;

    let filtered = Object.values(allOrders);

    if (hawkerId) {
        filtered = filtered.filter(order => {
            const stall = stalls[order.stallId];
            return stall?.hawkerCentreId === hawkerId;
        });
    }

    if (daysValue) {
        const days = parseInt(daysValue, 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        filtered = filtered.filter(order =>
            new Date(order.dateCreated) >= cutoff
        );
    }

    renderOrders(filtered);
}

function populateHawkerFilter() {
    const select = document.getElementById('hawkerFilter');
    if (!select) return;

    Object.entries(hawkerCentres).forEach(([hcId, hc]) => {
        if (![...select.options].some(o => o.value === hcId)) {
            const option = document.createElement('option');
            option.value = hcId;
            option.textContent = hc.name || hcId;
            select.appendChild(option);
        }
    });
}

/* =========================================================
   EVENTS
========================================================= */
function setupEventListeners() {
    document.getElementById('applyFilter')
        ?.addEventListener('click', applyFilters);

    document.getElementById('dateFilter')
        ?.addEventListener('change', applyFilters);

    document.addEventListener('click', e => {
        const viewBtn = e.target.closest('.order-btn--view');
        if (viewBtn) viewOrderDetails(viewBtn.dataset.orderId);
    });
}

/* =========================================================
   DETAILS
========================================================= */
function viewOrderDetails(orderId) {
    const order = allOrders[orderId];
    if (!order) {
        console.warn('Order not found:', orderId);
        return;
    }

    const stall = stalls[order.stallId] || {};
    const hawkerCentre = hawkerCentres[stall.hawkerCentreId] || {};

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'order-details-overlay';
    overlay.innerHTML = `
        <div class="order-details-modal">
            <button class="order-details-close">×</button>
            <h2>Order Details</h2>
            <p><strong>Hawker Centre:</strong> ${hawkerCentre.name || 'Unknown'}</p>
            <p><strong>Stall:</strong> ${stall.name || 'Unknown'}</p>
            <p><strong>Date:</strong> ${formatDate(order.dateCreated)}</p>
            <p><strong>Status:</strong> ${capitalizeStatus((order.status||'').toLowerCase())}</p>
            <h3>Items</h3>
            <ul class="order-details-items">
                ${Array.isArray(order.items) ? order.items.map(i => `<li>${i.qty||1}x ${i.name} — $${(i.price||0).toFixed(2)}</li>`).join('') : '<li>No items</li>'}
            </ul>
            <div class="order-details-total">
                <strong>Total:</strong> $${(order.totals?.grandTotal ?? 0).toFixed(2)}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelector('.order-details-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });
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

function getItemsSummary(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return 'No items';
    }

    return items
        .map(item => `${item.qty || 1}x ${item.name}`)
        .join(', ');
}

function capitalizeStatus(status) {
    return status
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function showEmptyState() {
    document.querySelector('.orders-container').innerHTML = '';
    document.querySelector('.empty-state')
        ?.style.setProperty('display', 'flex');
}