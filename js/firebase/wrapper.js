import {
    db,
    ref,
    set,
    get,
    update,
    remove,
    child,
    push as firebasePush
} from '/js/firebase/realtimedb.js';

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateEmail
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const auth = getAuth();

const dbRef = (path) => ref(db, path);

const snapshotToValue = (snap) => (snap.exists() ? snap.val() : null);

async function getOnce(path) {
    const snap = await get(dbRef(path));
    return snapshotToValue(snap);
}

/**
 * Create or overwrite a Hawker Centre
 * @param {{
 *   id: string|number,
 *   name: string,
 *   address: string,
 *   coverImage: string,            // image URL
 *   priceRange: "$" | "$$" | "$$$",
 *   region: string,
 *   [key: string]: any
 * }} hc
 * 
 * @example
 * // Create a new hawker centre
 * const hc = await createHawkerCentre({
 *     id: 'hc-001',
 *     name: "Maxwell Food Centre",
 *     address: "1 Kadayanallur St, Singapore 069184",
 *     coverImage: "https://cdn.chimmy.xyz/maxwell-food-centre.jpg",
 *     priceRange: "$$",
 *     region: "Central"
 * });
 * console.log(hc.id); // 'hc-001'
 */

export async function createHawkerCentre(hc) {
    const { id, ...rest } = hc;
    if (id === undefined || id === null) {
        throw new Error("HawkerCentre.id is required");
    }

    // you can also auto-add timestamps here if you like
    const now = new Date().toISOString();
    const data = {
        ...rest,
        createdAt: rest.createdAt || now,
        updatedAt: rest.updatedAt || now
    };

    return setEntity('hawkerCentres', id, data);
}

/**
 * Get a single Hawker Centre by ID
 * @example
 * // Fetch a hawker centre
 * const centre = await getHawkerCentre('hc-001');
 * console.log(centre.name); // "Maxwell Food Centre"
 */
export async function getHawkerCentre(id) {
    return getOnce(`hawkerCentres/${id}`);
}

/**
 * Get all Hawker Centres
 * @example
 * // Fetch all hawker centres
 * const allCentres = await listHawkerCentres();
 * Object.entries(allCentres).forEach(([id, centre]) => {
 *     console.log(`${centre.name} - ${centre.region}`);
 * });
 */
export async function listHawkerCentres() {
    return getOnce('hawkerCentres');
}

/**
 * Update a Hawker Centre with partial data
 * @example
 * // Update just the price range
 * const updated = await updateHawkerCentre('hc-001', {
 *     priceRange: "$$$"
 * });
 * console.log(updated.priceRange); // "$$$"
 */
export async function updateHawkerCentre(id, partial) {
    const withUpdatedAt = {
        ...partial,
        updatedAt: new Date().toISOString()
    };

    return updateEntity('hawkerCentres', id, withUpdatedAt);
}

/**
 * Delete a Hawker Centre
 * Note: Does not cascade delete stalls
 * @example
 * // Delete a hawker centre
 * await deleteHawkerCentre('hc-001');
 */
export async function deleteHawkerCentre(id) {
    // does not cascade delete stalls, etc
    await deleteEntity('hawkerCentres', id);
}

/**
 * Create or overwrite a Stall.
 * Also maintains `hawkerCentreStalls/{hawkerCentreId}/{stallId}` index.
 * @example
 * // Create a new stall
 * const stall = await createStall({
 *     id: 'stall-001',
 *     hawkerCentreId: 'hc-001',
 *     name: "Chicken Rice Stall",
 *     stallNumber: "A1",
 *     cuisine: "Chinese",
 *     owner: 'user-123'
 * });
 */
export async function createStall(stall) {
    const { id, hawkerCentreId, ...rest } = stall;
    if (!hawkerCentreId) throw new Error('hawkerCentreId is required for stall');

    const data = await setEntity('stalls', id, { hawkerCentreId, ...rest });

    // index: HawkerCentre → Stalls
    await set(dbRef(`hawkerCentreStalls/${hawkerCentreId}/${id}`), true);

    return data;
}

/**
 * Get a single Stall by ID
 * @example
 * // Fetch a stall
 * const stall = await getStall('stall-001');
 * console.log(stall.name); // "Chicken Rice Stall"
 */
export async function getStall(id) {
    return getOnce(`stalls/${id}`);
}

/**
 * Get all Stalls
 * @example
 * // Fetch all stalls in the system
 * const allStalls = await listStalls();
 * Object.values(allStalls).forEach(stall => {
 *     console.log(`${stall.name} - Centre ${stall.hawkerCentreId}`);
 * });
 */
export async function listStalls() {
    return getOnce('stalls');
}

/**
 * Get all Stalls in a specific Hawker Centre
 * @example
 * // Get all stalls in Maxwell Food Centre
 * const stalls = await listStallsByHawkerCentre('hc-001');
 * Object.values(stalls).forEach(stall => {
 *     console.log(`Stall ${stall.stallNumber}: ${stall.name}`);
 * });
 */
export async function listStallsByHawkerCentre(hawkerCentreId) {
    const stallIds = await getOnce(`hawkerCentreStalls/${hawkerCentreId}`);
    if (!stallIds) return null;

    const result = {};
    for (const stallId of Object.keys(stallIds)) {
        result[stallId] = await getStall(stallId);
    }
    return result;
}

/**
 * Update a Stall with partial data
 * Handles index updates if hawkerCentreId changes
 * @example
 * // Update stall information
 * const updated = await updateStall('stall-001', {
 *     name: "Deluxe Chicken Rice",
 *     rating: 4.5
 * });
 */
export async function updateStall(id, partial) {
    const stall = await updateEntity('stalls', id, partial);

    // If hawkerCentreId changed, you should also update indexes.
    // This keeps it simple: only update index if hawkerCentreId is in partial.
    if (partial.hawkerCentreId) {
        const oldStall = await getStall(id);
        // remove from old centre index if needed
        if (oldStall && oldStall.hawkerCentreId && oldStall.hawkerCentreId !== partial.hawkerCentreId) {
            await remove(dbRef(`hawkerCentreStalls/${oldStall.hawkerCentreId}/${id}`));
        }
        await set(dbRef(`hawkerCentreStalls/${partial.hawkerCentreId}/${id}`), true);
    }

    return stall;
}

/**
 * Delete a Stall and its index references
 * Note: Does not auto-delete menuItems, orders, feedback, or complaints
 * @example
 * // Delete a stall
 * await deleteStall('stall-001');
 */
export async function deleteStall(id) {
    const stall = await getStall(id);
    if (stall && stall.hawkerCentreId) {
        await remove(dbRef(`hawkerCentreStalls/${stall.hawkerCentreId}/${id}`));
    }
    // NOTE: does not auto-delete menuItems, orders, feedback, complaints
    await deleteEntity('stalls', id);
}

/**
 * Create or overwrite a Menu Item.
 * Also maintains `stallMenuItems/{stallId}/{menuItemId}` index.
 * @example
 * // Create a new menu item
 * const item = await createMenuItem({
 *     id: 'item-001',
 *     stallId: 'stall-001',
 *     name: "Chicken Rice with Soup",
 *     price: 4.50,
 *     description: "Fragrant chicken rice served with hot soup",
 *     image: "https://example.com/chicken-rice.jpg"
 * });
 */
export async function createMenuItem(menuItem) {
    const { id, stallId, ...rest } = menuItem;
    if (!stallId) throw new Error('stallId is required for menuItem');

    const data = await setEntity('menuItems', id, { stallId, ...rest });

    // index: Stall → MenuItems
    await set(dbRef(`stallMenuItems/${stallId}/${id}`), true);

    return data;
}

/**
 * Get a single Menu Item by ID
 * @example
 * // Fetch a menu item
 * const item = await getMenuItem('item-001');
 * console.log(`${item.name} - $${item.price}`);
 */
export async function getMenuItem(id) {
    return getOnce(`menuItems/${id}`);
}

/**
 * Get all Menu Items across all stalls
 * @example
 * // Fetch all menu items
 * const allItems = await listMenuItems();
 * Object.values(allItems).forEach(item => {
 *     console.log(`Stall ${item.stallId}: ${item.name} - $${item.price}`);
 * });
 */
export async function listMenuItems() {
    return getOnce('menuItems');
}

/**
 * Get all Menu Items in a specific Stall
 * @example
 * // Get menu for a specific stall
 * const menu = await listMenuItemsByStall('stall-001');
 * Object.values(menu).forEach(item => {
 *     console.log(`${item.name} - $${item.price}`);
 * });
 */
export async function listMenuItemsByStall(stallId) {
    const ids = await getOnce(`stallMenuItems/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const menuItemId of Object.keys(ids)) {
        result[menuItemId] = await getMenuItem(menuItemId);
    }
    return result;
}

/**
 * Update a Menu Item with partial data
 * Handles index updates if stallId changes
 * @example
 * // Update price of a menu item
 * const updated = await updateMenuItem('item-001', {
 *     price: 5.00,
 *     available: true
 * });
 */
export async function updateMenuItem(id, partial) {
    const updated = await updateEntity('menuItems', id, partial);

    // handle stallId change in index if needed
    if (partial.stallId) {
        const old = await getMenuItem(id);
        if (old && old.stallId && old.stallId !== partial.stallId) {
            await remove(dbRef(`stallMenuItems/${old.stallId}/${id}`));
        }
        await set(dbRef(`stallMenuItems/${partial.stallId}/${id}`), true);
    }

    return updated;
}

/**
 * Delete a Menu Item and its index references
 * @example
 * // Delete a menu item
 * await deleteMenuItem('item-001');
 */
export async function deleteMenuItem(id) {
    const mi = await getMenuItem(id);
    if (mi && mi.stallId) {
        await remove(dbRef(`stallMenuItems/${mi.stallId}/${id}`));
    }
    await deleteEntity('menuItems', id);
}

/**
 * Add or overwrite a promotion on a Menu Item.
 * If `promotion.id` is not provided, a push key is generated.
 * @example
 * // Add a promotion to a menu item
 * const promo = await addMenuItemPromotion('item-001', {
 *     discount: 20,
 *     description: "20% off during lunch hours",
 *     validFrom: "2024-02-01",
 *     validUntil: "2024-02-28"
 * });
 */
export async function addMenuItemPromotion(menuItemId, promotion) {
    const baseRef = dbRef(`menuItems/${menuItemId}/promotions`);
    let promoId = promotion.id;

    if (!promoId) {
        const newRef = firebasePush(baseRef);
        promoId = newRef.key;
    }

    const full = { ...promotion, id: promoId };
    await set(child(baseRef, promoId), full);
    return full;
}

/**
 * Remove a promotion from a Menu Item
 * @example
 * // Remove a promotion
 * await removeMenuItemPromotion('item-001', 'promo-456');
 */
export async function removeMenuItemPromotion(menuItemId, promotionId) {
    await remove(dbRef(`menuItems/${menuItemId}/promotions/${promotionId}`));
}

/**
 * Register a user with Firebase Auth and create a profile in /users
 * @param {{email: string, password: string, nric?: string, name?: string, contactNo?: string, roles?: object}} payload
 * @example
 * // Register a new customer
 * const user = await registerUserWithEmail({
 *     email: 'john@example.com',
 *     password: 'securePassword123',
 *     name: 'John Doe',
 *     contactNo: '+6581234567'
 * });
 * console.log(user.id); // Firebase UID
 * 
 * // Register a vendor
 * const vendor = await registerUserWithEmail({
 *     email: 'vendor@example.com',
 *     password: 'vendorPass456',
 *     name: 'Vendor Name',
 *     roles: { vendor: true }
 * });
 */
export async function registerUserWithEmail(payload) {
    const { email, password, ...profile } = payload;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const now = new Date().toISOString();
    const userData = {
        id: uid,
        email,
        createdAt: now,
        updatedAt: now,
        roles: { customer: true, ...(profile.roles || {}) },
        ...profile
    };

    await set(dbRef(`users/${uid}`), userData);
    return userData;
}

/**
 * Login a user with email and password
 * @example
 * // Login a user
 * const user = await loginWithEmail('john@example.com', 'securePassword123');
 * console.log(user.uid); // User ID from Firebase Auth
 */
export async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

/**
 * Listen for authentication state changes
 * @example
 * // Watch for login/logout changes
 * const unsubscribe = onAuthChanged((user) => {
 *     if (user) {
 *         console.log(`User logged in: ${user.email}`);
 *     } else {
 *         console.log('User logged out');
 *     }
 * });
 * 
 * // Call unsubscribe() to stop listening
 */
export function onAuthChanged(callback) {
    return onAuthStateChanged(auth, callback);
}

/**
 * Logout the current user
 * @example
 * // Logout current user
 * await logout();
 * console.log('User logged out');
 */
export async function logout() {
    await signOut(auth);
}

/**
 * Direct DB-only user creation (e.g. vendor-created users) without Auth.
 * Caller must handle password hashing externally.
 * @example
 * // Create a user directly in database (no Firebase Auth)
 * const user = await createUserDirect({
 *     id: 'user-789',
 *     email: 'direct@example.com',
 *     name: 'Direct User',
 *     roles: { customer: true }
 * });
 */
export async function createUserDirect(user) {
    const { id, ...rest } = user;
    return setEntity('users', id, rest);
}

/**
 * Get a user by ID
 * @example
 * // Fetch a user's profile
 * const user = await getUser('user-789');
 * console.log(`${user.name} - ${user.email}`);
 */
export async function getUser(id) {
    return getOnce(`users/${id}`);
}

/**
 * Update a user's profile with partial data
 * @example
 * // Update user profile
 * const updated = await updateUser('user-789', {
 *     name: 'John Updated',
 *     contactNo: '+6587654321',
 *     prefCusine: 'Asian'
 * });
 */
export async function updateUser(id, partial) {
    if (partial.email && auth.currentUser && auth.currentUser.uid === id) {
        try {
            await updateEmail(auth.currentUser, partial.email);
        } catch (error) {
            throw error;
        }
    }
    
    return updateEntity('users', id, partial);
}

/**
 * Delete a user from database
 * Note: Does not delete Firebase Auth user; handle server-side if needed
 * @example
 * // Delete a user
 * await deleteUser('user-789');
 */
export async function deleteUser(id) {
    // NOTE: does not delete Auth user; call auth.deleteUser(server-side) if needed
    await deleteEntity('users', id);
}

/**
 * Add a payment method to a user
 * @param {string} userId - The user's ID
 * @param {{
 *   type: string,
 *   lastFourDigits: string,
 *   cardHolder: string,
 *   expiryDate: string,
 *   [key: string]: any
 * }} paymentMethod - Payment method details
 * @returns {Promise<{cardId: string, ...}>} The added payment method with cardId
 * @example
 * // Add a payment method
 * const card = await addPaymentMethod('user-789', {
 *     type: 'Visa',
 *     lastFourDigits: '4242',
 *     cardHolder: 'JOHN DOE',
 *     expiryDate: '12/25'
 * });
 * console.log(card.cardId); // 'card_1234567890'
 */
export async function addPaymentMethod(userId, paymentMethod) {
    if (!userId) throw new Error('userId is required');
    if (!paymentMethod) throw new Error('paymentMethod is required');

    const user = await getUser(userId);
    if (!user) throw new Error('User not found');

    const cardId = `card_${Date.now()}`;
    const paymentMethods = user.paymentMethods || {};
    
    paymentMethods[cardId] = {
        ...paymentMethod,
        addedAt: new Date().toISOString()
    };

    await updateUser(userId, { paymentMethods });

    return { cardId, ...paymentMethods[cardId] };
}

/**
 * Remove a payment method from a user's profile
 * @param {string} userId - The user's ID
 * @param {string} cardId - The card ID to remove
 * @example
 * // Remove a payment method
 * await removePaymentMethod('user-789', 'card_1234567890');
 */
export async function removePaymentMethod(userId, cardId) {
    if (!userId) throw new Error('userId is required');
    if (!cardId) throw new Error('cardId is required');

    const user = await getUser(userId);
    if (!user) throw new Error('User not found');

    const paymentMethods = { ...user.paymentMethods };
    delete paymentMethods[cardId];

    await updateUser(userId, { paymentMethods });
}

/**
 * Get all payment methods for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<object>} Object containing all payment methods with cardId as keys
 * @example
 * // Get user's payment methods
 * const methods = await getPaymentMethods('user-789');
 * Object.entries(methods).forEach(([cardId, card]) => {
 *     console.log(`${card.type} ending in ${card.lastFourDigits}`);
 * });
 */
export async function getPaymentMethods(userId) {
    if (!userId) throw new Error('userId is required');

    const user = await getUser(userId);
    if (!user) return {};

    return user.paymentMethods || {};
}

/**
 * Alias for getPaymentMethods - get all payment methods for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<object>} Object containing all payment methods
 * @example
 * // List user's payment methods
 * const methods = await listPaymentMethods('user-789');
 */
export async function listPaymentMethods(userId) {
    return getPaymentMethods(userId);
}

/**
 * Update a specific payment method
 * @param {string} userId - The user's ID
 * @param {string} cardId - The card ID to update
 * @param {object} updates - Fields to update
 * @example
 * // Update card expiry date
 * await updatePaymentMethod('user-789', 'card_1234567890', {
 *     expiryDate: '12/26'
 * });
 */
export async function updatePaymentMethod(userId, cardId, updates) {
    if (!userId) throw new Error('userId is required');
    if (!cardId) throw new Error('cardId is required');
    if (!updates) throw new Error('updates are required');

    const user = await getUser(userId);
    if (!user) throw new Error('User not found');

    const paymentMethods = user.paymentMethods || {};
    if (!paymentMethods[cardId]) {
        throw new Error('Payment method not found');
    }

    paymentMethods[cardId] = {
        ...paymentMethods[cardId],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    await updateUser(userId, { paymentMethods });

    return paymentMethods[cardId];
}

/**
 * Create an Order.
 * If `order.id` is provided, it will be used.
 * Otherwise a push key is generated.
 * Also maintains `userOrders` and `stallOrders` indexes.
 *
 * @param {{
 *   id?: string,
 *   userId: string|number,
 *   stallId: string|number,
 *   hawkerCentreId?: string|number,
 *   dateCreated?: string,
 *   status?: string,
 *   payType: 'Cash' | 'Card' | 'PayNow',
 *   items: object,
 *   [key: string]: any
 * }} order
 * @example
 * // Create a new order
 * const order = await createOrder({
 *     userId: 'user-789',
 *     stallId: 'stall-001',
 *     hawkerCentreId: 'hc-001',
 *     payType: 'Card',
 *     status: 'pending',
 *     items: {
 *         'item-001': { qty: 2, price: 4.50 },
 *         'item-002': { qty: 1, price: 3.50 }
 *     },
 *     totalAmount: 12.50
 * });
 * console.log(order.id); // Generated order ID
 */
export async function createOrder(order) {
    const { id: maybeId, userId, stallId } = order;
    if (!userId) throw new Error('userId is required for order');
    if (!stallId) throw new Error('stallId is required for order');

    let orderRef;
    let orderId = maybeId;

    if (orderId) {
        orderRef = dbRef(`orders/${orderId}`);
    } else {
        orderRef = firebasePush(dbRef('orders'));
        orderId = orderRef.key;
    }

    const now = new Date().toISOString();
    const data = {
        ...order,
        id: orderId,
        dateCreated: order.dateCreated || now
    };

    await set(orderRef, data);

    // indexes
    await set(dbRef(`userOrders/${userId}/${orderId}`), true);
    await set(dbRef(`stallOrders/${stallId}/${orderId}`), true);

    return data;
}

/**
 * Get a single order by ID
 * @example
 * // Fetch an order
 * const order = await getOrder('order-123');
 * console.log(`Order total: $${order.totalAmount}`);
 */
export async function getOrder(id) {
    return getOnce(`orders/${id}`);
}

/**
 * Update an order with partial data
 * @example
 * // Update order notes
 * const updated = await updateOrder('order-123', {
 *     notes: 'No onions please',
 *     deliveryAddress: '123 Main St'
 * });
 */
export async function updateOrder(id, partial) {
    await update(dbRef(`orders/${id}`), {
        ...partial,
        updatedAt: new Date().toISOString()
    });
    return getOrder(id);
}

/**
 * Update order status (and optional extra fields)
 * @example
 * // Mark order as completed
 * const updated = await updateOrderStatus('order-123', 'completed', {
 *     completedAt: new Date().toISOString()
 * });
 * 
 * // Cancel an order
 * await updateOrderStatus('order-123', 'cancelled', {
 *     reason: 'Out of stock'
 * });
 */
export async function updateOrderStatus(id, status, extra = {}) {
    return updateOrder(id, { status, ...extra });
}

/**
 * Delete an order and clean up its index references
 * @example
 * // Delete an order
 * await deleteOrder('order-123');
 */
export async function deleteOrder(id) {
    const order = await getOrder(id);
    if (order) {
        if (order.userId) {
            await remove(dbRef(`userOrders/${order.userId}/${id}`));
        }
        if (order.stallId) {
            await remove(dbRef(`stallOrders/${order.stallId}/${id}`));
        }
    }
    await deleteEntity('orders', id);
}

/**
 * Get all orders by a specific user
 * @example
 * // Get user's order history
 * const userOrders = await listUserOrders('user-789');
 * Object.values(userOrders).forEach(order => {
 *     console.log(`Order ${order.id}: ${order.status} - $${order.totalAmount}`);
 * });
 */
export async function listUserOrders(userId) {
    const ids = await getOnce(`userOrders/${userId}`);
    if (!ids) return null;

    const result = {};
    for (const orderId of Object.keys(ids)) {
        result[orderId] = await getOrder(orderId);
    }
    return result;
}

/**
 * Get all orders for a specific stall
 * @example
 * // Get all orders for a stall
 * const stallOrders = await listStallOrders('stall-001');
 * Object.values(stallOrders).forEach(order => {
 *     console.log(`Order from ${order.userId}: ${order.status}`);
 * });
 */
export async function listStallOrders(stallId) {
    const ids = await getOnce(`stallOrders/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const orderId of Object.keys(ids)) {
        result[orderId] = await getOrder(orderId);
    }
    return result;
}

/**
 * Create Feedback.
 * If `feedback.id` not provided, uses a push key.
 * maintains `stallFeedback` and `userFeedback` indexes.
 * @example
 * // Submit feedback for a stall
 * const feedback = await createFeedback({
 *     userId: 'user-789',
 *     stallId: 'stall-001',
 *     orderId: 'order-123',
 *     rating: 4.5,
 *     comment: 'Great taste and service!',
 *     categories: { taste: 5, service: 4, cleanliness: 4 }
 * });
 */
export async function createFeedback(feedback) {
    const { id: maybeId, userId, stallId } = feedback;
    if (!userId) throw new Error('userId is required for feedback');
    if (!stallId) throw new Error('stallId is required for feedback');

    let fbRef;
    let fbId = maybeId;

    if (fbId) {
        fbRef = dbRef(`feedback/${fbId}`);
    } else {
        fbRef = firebasePush(dbRef('feedback'));
        fbId = fbRef.key;
    }

    const now = new Date().toISOString();
    const data = {
        ...feedback,
        id: fbId,
        dateCreated: feedback.dateCreated || now
    };

    await set(fbRef, data);

    // indexes
    await set(dbRef(`stallFeedback/${stallId}/${fbId}`), true);
    await set(dbRef(`userFeedback/${userId}/${fbId}`), true);

    return data;
}

/**
 * Get a single feedback by ID
 * @example
 * // Fetch feedback details
 * const fb = await getFeedback('feedback-456');
 * console.log(`Rating: ${fb.rating}/5 - ${fb.comment}`);
 */
export async function getFeedback(id) {
    return getOnce(`feedback/${id}`);
}

/**
 * Delete feedback and clean up index references
 * @example
 * // Delete a feedback entry
 * await deleteFeedback('feedback-456');
 */
export async function deleteFeedback(id) {
    const fb = await getFeedback(id);
    if (fb) {
        if (fb.stallId) {
            await remove(dbRef(`stallFeedback/${fb.stallId}/${id}`));
        }
        if (fb.userId) {
            await remove(dbRef(`userFeedback/${fb.userId}/${id}`));
        }
    }
    await deleteEntity('feedback', id);
}

/**
 * Get all feedback for a specific stall
 * @example
 * // Get stall reviews
 * const stall_feedbacks = await listStallFeedback('stall-001');
 * Object.values(stall_feedbacks).forEach(fb => {
 *     console.log(`${fb.rating}/5: ${fb.comment}`);
 * });
 */
export async function listStallFeedback(stallId) {
    const ids = await getOnce(`stallFeedback/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const fbId of Object.keys(ids)) {
        result[fbId] = await getFeedback(fbId);
    }
    return result;
}

/**
 * Get all feedback submitted by a specific user
 * @example
 * // Get user's feedback history
 * const myFeedbacks = await listUserFeedback('user-789');
 * Object.values(myFeedbacks).forEach(fb => {
 *     console.log(`Feedback on stall ${fb.stallId}: ${fb.comment}`);
 * });
 */
export async function listUserFeedback(userId) {
    const ids = await getOnce(`userFeedback/${userId}`);
    if (!ids) return null;

    const result = {};
    for (const fbId of Object.keys(ids)) {
        result[fbId] = await getFeedback(fbId);
    }
    return result;
}

/**
 * Create a Complaint.
 * If `complaint.id` not provided, uses random firebase key generated
 * maintains `stallComplaints` and `userComplaints` indexes.
 * @example
 * // Submit a complaint
 * const complaint = await createComplaint({
 *     userId: 'user-789',
 *     stallId: 'stall-001',
 *     orderId: 'order-123',
 *     title: 'Food quality issue',
 *     description: 'The chicken was undercooked',
 *     category: 'Quality',
 *     severity: 'high',
 *     status: 'open'
 * });
 */
export async function createComplaint(complaint) {
    const { id: maybeId, userId, stallId } = complaint;
    if (!userId) throw new Error('userId is required for complaint');
    if (!stallId) throw new Error('stallId is required for complaint');

    let cRef;
    let cId = maybeId;

    if (cId) {
        cRef = dbRef(`complaints/${cId}`);
    } else {
        cRef = firebasePush(dbRef('complaints'));
        cId = cRef.key;
    }

    const now = new Date().toISOString();
    const data = {
        ...complaint,
        id: cId,
        dateCreated: complaint.dateCreated || now,
        status: complaint.status || 'open'
    };

    await set(cRef, data);

    // indexes
    await set(dbRef(`stallComplaints/${stallId}/${cId}`), true);
    await set(dbRef(`userComplaints/${userId}/${cId}`), true);

    return data;
}

/**
 * Get a single complaint by ID
 * @example
 * // Fetch complaint details
 * const complaint = await getComplaint('complaint-789');
 * console.log(`${complaint.title} - Status: ${complaint.status}`);
 */
export async function getComplaint(id) {
    return getOnce(`complaints/${id}`);
}

/**
 * Update a complaint with partial data
 * @example
 * // Update complaint status
 * const updated = await updateComplaint('complaint-789', {
 *     status: 'resolved',
 *     resolution: 'Refund issued',
 *     assignedTo: 'admin-001'
 * });
 */
export async function updateComplaint(id, partial) {
    await update(dbRef(`complaints/${id}`), {
        ...partial,
        updatedAt: new Date().toISOString()
    });
    return getComplaint(id);
}

/**
 * Delete a complaint and clean up index references
 * @example
 * // Delete a complaint
 * await deleteComplaint('complaint-789');
 */
export async function deleteComplaint(id) {
    const c = await getComplaint(id);
    if (c) {
        if (c.stallId) {
            await remove(dbRef(`stallComplaints/${c.stallId}/${id}`));
        }
        if (c.userId) {
            await remove(dbRef(`userComplaints/${c.userId}/${id}`));
        }
    }
    await deleteEntity('complaints', id);
}

/**
 * Get all complaints for a specific stall
 * @example
 * // Get complaints about a stall
 * const complaints = await listStallComplaints('stall-001');
 * Object.values(complaints).forEach(c => {
 *     console.log(`${c.title} - ${c.status}`);
 * });
 */
export async function listStallComplaints(stallId) {
    const ids = await getOnce(`stallComplaints/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const cId of Object.keys(ids)) {
        result[cId] = await getComplaint(cId);
    }
    return result;
}

/**
 * Get all complaints submitted by a specific user
 * @example
 * // Get user's complaint history
 * const myComplaints = await listUserComplaints('user-789');
 * Object.values(myComplaints).forEach(c => {
 *     console.log(`Complaint about stall ${c.stallId}: ${c.title}`);
 * });
 */
export async function listUserComplaints(userId) {
    const ids = await getOnce(`userComplaints/${userId}`);
    if (!ids) return null;

    const result = {};
    for (const cId of Object.keys(ids)) {
        result[cId] = await getComplaint(cId);
    }
    return result;
}

// helpers

/**
 * Create or overwrite an entity at `/root/{id}`
 */
async function setEntity(root, id, data) {
    const fullData = { ...data, id };
    await set(dbRef(`${root}/${id}`), fullData);
    return fullData;
}

/**
 * Update an entity at `/root/{id}`
 */
async function updateEntity(root, id, partial) {
    await update(dbRef(`${root}/${id}`), partial);
    return getOnce(`${root}/${id}`);
}

/**
 * Delete an entity at `/root/{id}`
 */
async function deleteEntity(root, id) {
    await remove(dbRef(`${root}/${id}`));
}
