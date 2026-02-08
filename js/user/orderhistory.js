import {
    listUserOrders,
    onAuthChanged,
    listHawkerCentres,
    getStall
} from '../firebase/wrapper.js';

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
            window.location.href = '../../html/auth/login.html';
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

        allOrders = ordersData;

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
            <button class="order-btn order-btn--reorder" data-order-id="${order.id}">
                <span class="material-symbols-outlined">refresh</span>
                Reorder
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
        const reorderBtn = e.target.closest('.order-btn--reorder');

        if (viewBtn) viewOrderDetails(viewBtn.dataset.orderId);
        if (reorderBtn) reorderItems(reorderBtn.dataset.orderId);
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