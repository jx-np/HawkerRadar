import { 
    listUserOrders,
    onAuthChanged,
    getHawkerCentre,
    getStall
} from '/js/firebase/wrapper.js';

let currentUserId = null;
let allOrders = {};
let hawkerCentres = {};
let stalls = {};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    onAuthChanged((user) => {
        if (user) {
            currentUserId = user.uid;
            loadOrders();
            setupEventListeners();
        } else {
            window.location.href = '/html/auth/login.html';
        }
    });
});

/**
 * Fetch all orders for the current user from Firebase
 */
async function loadOrders() {
    try {
        const ordersData = await listUserOrders(currentUserId);
        
        if (!ordersData) {
            showEmptyState();
            return;
        }

        allOrders = ordersData;
        
        // Pre-load hawker centre and stall data
        await preloadMetadata();
        
        // Render the orders
        renderOrders(Object.values(allOrders));
    } catch (error) {
        console.error('Error loading orders:', error);
        showEmptyState();
    }
}

/**
 * Pre-load hawker centre and stall data to avoid repetitive API calls
 */
async function preloadMetadata() {
    const uniqueHCIds = new Set();
    const uniqueStallIds = new Set();

    for (const order of Object.values(allOrders)) {
        if (order.hawkerCentreId) uniqueHCIds.add(order.hawkerCentreId);
        if (order.stallId) uniqueStallIds.add(order.stallId);
    }

    // Load hawker centres
    for (const hcId of uniqueHCIds) {
        try {
            hawkerCentres[hcId] = await getHawkerCentre(hcId);
        } catch (error) {
            console.warn(`Failed to load hawker centre ${hcId}:`, error);
        }
    }

    // Load stalls
    for (const stallId of uniqueStallIds) {
        try {
            stalls[stallId] = await getStall(stallId);
        } catch (error) {
            console.warn(`Failed to load stall ${stallId}:`, error);
        }
    }
}

/**
 * Render orders to the DOM
 */
function renderOrders(ordersToRender) {
    const container = document.querySelector('.orders-container');
    container.innerHTML = '';

    if (ordersToRender.length === 0) {
        showEmptyState();
        return;
    }

    ordersToRender.forEach(order => {
        const orderCard = createOrderCard(order);
        container.appendChild(orderCard);
    });
}

/**
 * Create an order card element
 */
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';

    const hawkerCentre = hawkerCentres[order.hawkerCentreId] || {};
    const stall = stalls[order.stallId] || {};
    const status = (order.status || 'pending').toLowerCase();
    
    const formattedDate = order.dateCreated ? formatDate(order.dateCreated) : 'N/A';
    const itemsSummary = getItemsSummary(order.items);
    const totalAmount = order.totalAmount ? `$ ${order.totalAmount.toFixed(2)}` : '$ 0.00';

    card.innerHTML = `
        <div class="order-card__header">
            <div class="order-card__info">
                <h3 class="order-card__id">${hawkerCentre.name || 'Unknown Hawker Centre'}</h3>
                <p class="order-card__date">${stall.name || 'Unknown Stall'}</p>
            </div>
            <span class="order-card__status ${status === 'cancelled' ? 'cancelled' : ''}">${capitalizeStatus(status)}</span>
        </div>
        <div class="order-card__body">
            <div class="order-card__items">
                <p class="order-card__stall">${formattedDate} | ${itemsSummary}</p>
            </div>
            <div class="order-card__meta">
                <div class="order-meta-row order-meta-total">
                    <span class="order-meta-label">Total</span>
                    <span class="order-meta-value">${totalAmount}</span>
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

/**
 * Format date string to readable format
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleDateString('en-US', options);
    } catch {
        return dateString;
    }
}

/**
 * Create a summary string of order items
 */
function getItemsSummary(items) {
    if (!items || typeof items !== 'object' || Object.keys(items).length === 0) {
        return 'No items';
    }

    const itemList = Object.entries(items)
        .map(([itemId, itemData]) => {
            const qty = itemData.qty || 1;
            const name = itemData.name || itemId;
            return `${qty}x ${name}`;
        })
        .join(', ');

    return itemList;
}

/**
 * Capitalize status string
 */
function capitalizeStatus(status) {
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Show empty state message
 */
function showEmptyState() {
    const container = document.querySelector('.orders-container');
    const emptyState = document.querySelector('.empty-state');
    
    container.innerHTML = '';
    if (emptyState) {
        emptyState.style.display = 'flex';
    }
}

/**
 * Setup event listeners for filters and buttons
 */
function setupEventListeners() {
    const applyFilterBtn = document.getElementById('applyFilter');
    const hawkerFilter = document.getElementById('hawkerFilter');
    const dateFilter = document.getElementById('dateFilter');

    // Apply filter button
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', applyFilters);
    }

    // Allow pressing Enter in the date filter
    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }

    // Delegate click handlers for order buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.order-btn--view')) {
            const orderId = e.target.closest('.order-btn--view').dataset.orderId;
            viewOrderDetails(orderId);
        }
        if (e.target.closest('.order-btn--reorder')) {
            const orderId = e.target.closest('.order-btn--reorder').dataset.orderId;
            reorderItems(orderId);
        }
    });

    // Populate hawker centre filter dropdown
    populateHawkerFilter();
}

/**
 * Populate the hawker centre filter dropdown
 */
function populateHawkerFilter() {
    const select = document.getElementById('hawkerFilter');
    if (!select) return;

    const uniqueHCs = new Set();
    Object.values(allOrders).forEach(order => {
        if (order.hawkerCentreId) {
            uniqueHCs.add(order.hawkerCentreId);
        }
    });

    const currentValue = select.value;
    
    // Preserve the "All" option and add others
    Array.from(uniqueHCs).forEach(hcId => {
        const hc = hawkerCentres[hcId];
        if (hc && !Array.from(select.options).some(opt => opt.value === hcId)) {
            const option = document.createElement('option');
            option.value = hcId;
            option.textContent = hc.name || hcId;
            select.appendChild(option);
        }
    });

    if (currentValue) {
        select.value = currentValue;
    }
}

/**
 * Apply filters to orders
 */
function applyFilters() {
    const hawkerFilterValue = document.getElementById('hawkerFilter').value;
    const dateFilterValue = document.getElementById('dateFilter').value;

    let filtered = Object.values(allOrders);

    // Filter by hawker centre
    if (hawkerFilterValue) {
        filtered = filtered.filter(order => order.hawkerCentreId === hawkerFilterValue);
    }

    // Filter by date
    if (dateFilterValue) {
        const days = parseInt(dateFilterValue);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        filtered = filtered.filter(order => {
            const orderDate = new Date(order.dateCreated);
            return orderDate >= cutoffDate;
        });
    }

    renderOrders(filtered);
}