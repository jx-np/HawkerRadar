import {
    db,
    ref,
    set,
    get,
    update,
    remove,
    child,
    push as firebasePush
} from './realtimedb.js';

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const auth = getAuth();

/* =========================================
    Generic helpers
========================================= */

const dbRef = (path) => ref(db, path);

const snapshotToValue = (snap) => (snap.exists() ? snap.val() : null);

async function getOnce(path) {
    const snap = await get(dbRef(path));
    return snapshotToValue(snap);
}

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

/* =========================================
   Hawker Centres
========================================= */

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
 */

/*
Example use:
await createHawkerCentre({
    id: 1,
    name: "Maxwell Food Centre",
    address: "1 Kadayanallur St, Singapore 069184",
    coverImage: "https://cdn.chimmy.xyz/maxwell-food-centre.jpg",
    priceRange: "$$",
    region: "Central"
});

i doubt yall gonna use this anyway
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

export async function getHawkerCentre(id) {
    return getOnce(`hawkerCentres/${id}`);
}

export async function listHawkerCentres() {
    return getOnce('hawkerCentres');
}

export async function updateHawkerCentre(id, partial) {
    const withUpdatedAt = {
        ...partial,
        updatedAt: new Date().toISOString()
    };

    return updateEntity('hawkerCentres', id, withUpdatedAt);
}

export async function deleteHawkerCentre(id) {
    // does not cascade delete stalls, etc
    await deleteEntity('hawkerCentres', id);
}

/* =========================================
    Stalls
========================================= */

/**
 * Create or overwrite a Stall.
 * Also maintains `hawkerCentreStalls/{hawkerCentreId}/{stallId}` index.
 */
export async function createStall(stall) {
    const { id, hawkerCentreId, ...rest } = stall;
    if (!hawkerCentreId) throw new Error('hawkerCentreId is required for stall');

    const data = await setEntity('stalls', id, { hawkerCentreId, ...rest });

    // index: HawkerCentre → Stalls
    await set(dbRef(`hawkerCentreStalls/${hawkerCentreId}/${id}`), true);

    return data;
}

export async function getStall(id) {
    return getOnce(`stalls/${id}`);
}

export async function listStalls() {
    return getOnce('stalls');
}

export async function listStallsByHawkerCentre(hawkerCentreId) {
    const stallIds = await getOnce(`hawkerCentreStalls/${hawkerCentreId}`);
    if (!stallIds) return null;

    const result = {};
    for (const stallId of Object.keys(stallIds)) {
        result[stallId] = await getStall(stallId);
    }
    return result;
}

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

export async function deleteStall(id) {
    const stall = await getStall(id);
    if (stall && stall.hawkerCentreId) {
        await remove(dbRef(`hawkerCentreStalls/${stall.hawkerCentreId}/${id}`));
    }
    // NOTE: does not auto-delete menuItems, orders, feedback, complaints
    await deleteEntity('stalls', id);
}

/* =========================================
   Menu Items + Promotions
========================================= */

/**
 * Create or overwrite a Menu Item.
 * Also maintains `stallMenuItems/{stallId}/{menuItemId}` index.
 */
export async function createMenuItem(menuItem) {
    const { id, stallId, ...rest } = menuItem;
    if (!stallId) throw new Error('stallId is required for menuItem');

    const data = await setEntity('menuItems', id, { stallId, ...rest });

    // index: Stall → MenuItems
    await set(dbRef(`stallMenuItems/${stallId}/${id}`), true);

    return data;
}

export async function getMenuItem(id) {
    return getOnce(`menuItems/${id}`);
}

export async function listMenuItems() {
    return getOnce('menuItems');
}

export async function listMenuItemsByStall(stallId) {
    const ids = await getOnce(`stallMenuItems/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const menuItemId of Object.keys(ids)) {
        result[menuItemId] = await getMenuItem(menuItemId);
    }
    return result;
}

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
 */
export async function removeMenuItemPromotion(menuItemId, promotionId) {
    await remove(dbRef(`menuItems/${menuItemId}/promotions/${promotionId}`));
}

/* =========================================
   Users + Auth
========================================= */

/**
 * Register a user with Firebase Auth and create a profile in /users
 * @param {{email: string, password: string, nric?: string, name?: string, contactNo?: string, roles?: object}} payload
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

export async function loginWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

export function onAuthChanged(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function logout() {
    await signOut(auth);
}

/**
 * Direct DB-only user creation (e.g. vendor-created users) without Auth.
 * Caller must handle password hashing externally.
 */
export async function createUserDirect(user) {
    const { id, ...rest } = user;
    return setEntity('users', id, rest);
}

export async function getUser(id) {
    return getOnce(`users/${id}`);
}

export async function updateUser(id, partial) {
    return updateEntity('users', id, partial);
}

export async function deleteUser(id) {
    // NOTE: does not delete Auth user; call auth.deleteUser(server-side) if needed
    await deleteEntity('users', id);
}

/* =========================================
   Orders
========================================= */

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

export async function getOrder(id) {
    return getOnce(`orders/${id}`);
}

export async function updateOrder(id, partial) {
    await update(dbRef(`orders/${id}`), {
        ...partial,
        updatedAt: new Date().toISOString()
    });
    return getOrder(id);
}

/**
 * Update order status (and optional extra fields)
 */
export async function updateOrderStatus(id, status, extra = {}) {
    return updateOrder(id, { status, ...extra });
}

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

export async function listUserOrders(userId) {
    const ids = await getOnce(`userOrders/${userId}`);
    if (!ids) return null;

    const result = {};
    for (const orderId of Object.keys(ids)) {
        result[orderId] = await getOrder(orderId);
    }
    return result;
}

export async function listStallOrders(stallId) {
    const ids = await getOnce(`stallOrders/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const orderId of Object.keys(ids)) {
        result[orderId] = await getOrder(orderId);
    }
    return result;
}

/* =========================================
   Feedback
========================================= */

/**
 * Create Feedback.
 * If `feedback.id` not provided, uses a push key.
 * maintains `stallFeedback` and `userFeedback` indexes.
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

export async function getFeedback(id) {
    return getOnce(`feedback/${id}`);
}

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

export async function listStallFeedback(stallId) {
    const ids = await getOnce(`stallFeedback/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const fbId of Object.keys(ids)) {
        result[fbId] = await getFeedback(fbId);
    }
    return result;
}

export async function listUserFeedback(userId) {
    const ids = await getOnce(`userFeedback/${userId}`);
    if (!ids) return null;

    const result = {};
    for (const fbId of Object.keys(ids)) {
        result[fbId] = await getFeedback(fbId);
    }
    return result;
}

/* =========================================
   Complaints
========================================= */

/**
 * Create a Complaint.
 * If `complaint.id` not provided, uses random firebase key generated
 * maintains `stallComplaints` and `userComplaints` indexes.
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

export async function getComplaint(id) {
    return getOnce(`complaints/${id}`);
}

export async function updateComplaint(id, partial) {
    await update(dbRef(`complaints/${id}`), {
        ...partial,
        updatedAt: new Date().toISOString()
    });
    return getComplaint(id);
}

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

export async function listStallComplaints(stallId) {
    const ids = await getOnce(`stallComplaints/${stallId}`);
    if (!ids) return null;

    const result = {};
    for (const cId of Object.keys(ids)) {
        result[cId] = await getComplaint(cId);
    }
    return result;
}

export async function listUserComplaints(userId) {
    const ids = await getOnce(`userComplaints/${userId}`);
    if (!ids) return null;

    const result = {};
    for (const cId of Object.keys(ids)) {
        result[cId] = await getComplaint(cId);
    }
    return result;
}