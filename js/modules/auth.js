import { db, ref, set, get, query, equalTo, orderByChild, update } from "../firebase/realtimedb.js";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";
import { log, ValidateEmail, generateId, getCurrentTimestamp, internalError } from "../utils/helpers.js";

// session localstorage
const SESSION_KEY = 'session';
const CURRENT_USER_KEY = 'currentUser';

// enums
export const USER_ROLES = {
    CUSTOMER: 'customer',
    STALL_OWNER: 'stallOwner',
    OPERATOR: 'operator'
};

/*
================================
    Register User
================================
*/

/* if you dont know how to use this its just create something like this

userData = {email, password, fullName, role, phone}

registerUser(userData)

*/
export async function registerUser(userData) {
    try {
        const { email, password, fullName, role, phone = '' } = userData;

        if (!email || !password || !fullName || !role) {
            return internalError(null, "Missing fields. [email,password,fullName,Role]");
        }

        if (!ValidateEmail(email)) {
            return internalError(null, "Invalid email");
        }

        if (!Object.values(USER_ROLES).includes(role)) {
            return internalError(null, "Invalid user role");
        }

        // chk if exists already
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const users = snapshot.val();
            for (const userId in users) {
                if (users[userId].email === email) {
                    return internalError(null, "Email already exists");
                }
            }
        }

        const userId = generateId();
        const hashedPassword = await hashPassword(password);

        const newUser = {
            userId,
            email,
            passwordHash: hashedPassword,
            fullName,
            role,
            phone,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            isActive: true
        };

        await set(ref(db, `users/${userId}`), newUser);

        log('AUTH', `new register: ${email} (${role})`);
        
        return { userId, email, fullName, role };

    } catch (error) {
        log('AUTH', `failed: ${error.message}`, error);
        return internalError(error, `Failed to register`)
    }
}

/* ================================
    Login User

    return {
        userId
        email
        fullName
        role
        sessionToken
    };

Returns internalError if failed

================================ */
export async function loginUser(email, password) {
    try {
        if (!email || !password) {
            return internalError(null, "Email and password are required");
        }

        // find by email
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
            return internalError(null, "Invalid email or password");
        }

        let foundUser = null;
        let foundUserId = null;

        snapshot.forEach((childSnap) => {
            const user = childSnap.val();
            if (user.email === email) {
                foundUser = user;
                foundUserId = childSnap.key;
            }
        });

        if (!foundUser) {
            return internalError(null, "Invalid email or password");
        }

        if (!foundUser.isActive) {
            return internalError(null, "Account is disabled");
        }

        // verify password
        const isPasswordValid = await verifyPassword(password, foundUser.passwordHash, foundUserId);

        if (!isPasswordValid) {
            return internalError(null, "Invalid email or password");
        }

        // generate session
        const sessionToken = generateSessionToken();
        const sessionData = {
            userId: foundUserId,
            email: foundUser.email,
            fullName: foundUser.fullName,
            role: foundUser.role,
            sessionToken,
            loginTime: getCurrentTimestamp(),
            expiresAt: getCurrentTimestamp() + (24 * 60 * 60 * 1000)
        };

        // store in localStorage
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
            userId: foundUserId,
            email: foundUser.email,
            fullName: foundUser.fullName,
            role: foundUser.role,
            phone: foundUser.phone
        }));

        // update lastlog in realtimedb
        await update(ref(db, `users/${foundUserId}`), {
            lastLogin: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
        });

        log('AUTH', `logged in: ${email}`);

        return {
            userId: foundUserId,
            email: foundUser.email,
            fullName: foundUser.fullName,
            role: foundUser.role,
            sessionToken
        };

    } catch (error) {
        log('AUTH', `error: ${error.message}`, error);
        return internalError(error, error.message);
    }
}

export function logoutUser() {
    try {
        const currentUser = getCurrentUser();
        
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        
        if (currentUser) {
            log('AUTH', `User logged out: ${currentUser.email}`);
        }
        
        return true;

    } catch (error) {
        log('AUTH', `Logout error: ${error.message}`, error);
        return internalError(null, error.message);
    }
}

// use this to get currently logged in user, with session token included
export function getCurrentUser() {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) return null;

        const session = JSON.parse(sessionData);

        // validate session
        if (session.expiresAt < getCurrentTimestamp()) {
            logoutUser();
            return null;
        }

        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));

    } catch (error) {
        log('AUTH', `session retrival fail: ${error.message}`);
        return null;
    }
}

export function isAuthenticated() {
    return getCurrentUser() !== null;
}

// rolecheck is like the role to check if this guy has it
// like hasRole('owner');
export function hasRole(roleCheck) {
    const user = getCurrentUser();
    return user && user.role === roleCheck;
}

export function getSessionToken() {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) return null;
        return JSON.parse(sessionData).sessionToken;
    } catch (error) {
        return null;
    }
}

export function isSessionValid() {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);
        return session.expiresAt > getCurrentTimestamp();

    } catch (error) {
        return false;
    }
}

function generateSessionToken() {
    return Math.random().toString(36).substring(2, 15) + 
            Math.random().toString(36).substring(2, 15) + 
            getCurrentTimestamp().toString(36);
}

export async function updateProfile(userId, updates) {
    try {
        if (!userId) {
            return internalError(null, "User ID is required");
        }

        const allowedUpdates = ['fullName', 'phone', 'address'];
        const filteredUpdates = {};

        for (const key of allowedUpdates) {
            if (key in updates) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return internalError(null, "No valid updates provided");
        }

        filteredUpdates.updatedAt = getCurrentTimestamp();

        await update(ref(db, `users/${userId}`), filteredUpdates);

        log('AUTH', `user updated: ${userId}`);
        return true;

    } catch (error) {
        log('AUTH', `user update error: ${error.message}`);
        return internalError(null, error.message);
    }
}

export async function getUserById(userId) {
    try {
        if (!userId) {
            return internalError(null, "User ID is required");
        }

        const snapshot = await get(ref(db, `users/${userId}`));

        if (!snapshot.exists()) {
            return internalError(null, "User not found");
        }

        const user = snapshot.val();

        return user;

    } catch (error) {
        log('AUTH', `retrieve user failed: ${error.message}`);
        return internalError(null, error.message);
    }
}

export async function disableAccount(userId) {
    try {
        if (!userId) {
            return internalError(null, "User ID is required");
        }

        await update(ref(db, `users/${userId}`), {
            isActive: false,
            deactivatedAt: getCurrentTimestamp()
        });

        logoutUser();
        log('AUTH', `Account disabled: ${userId}`);

        return true;

    } catch (error) {
        log('AUTH', `disable account failed error: ${error.message}`);
        return internalError(null, error.message);
    }
}

export async function testfunction123(params) {
    return params;
}