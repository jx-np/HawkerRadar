import { 
    registerUserWithEmail, 
    loginWithEmail, 
    logout as firebaseLogout,
    getUser,
    updateUser,
    onAuthChanged
} from "../firebase/wrapper.js";
import { log, ValidateEmail, internalError } from "../utils/helpers.js";

// session localstorage
const SESSION_KEY = 'session';
const CURRENT_USER_KEY = 'currentUser';

// enums
export const USER_ROLES = {
    CUSTOMER: 'customer',
    STALL_OWNER: 'vendor',
    OPERATOR: 'operator'
};

let cachedUser = null;

// auth listener
onAuthChanged((firebaseUser) => {
    if (firebaseUser) {
        // when log in get info from database
        getUser(firebaseUser.uid).then((userData) => {
            if (userData) {
                cachedUser = userData;
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
            }
        });
    } else {
        // logout
        cachedUser = null;
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(SESSION_KEY);
    }
});

/**
 * Register a new user with Firebase Auth and database profile
 * @param {Object} userData - {email, password, name, role, contactNo}
 * @example
 * const result = await registerUser({
 *     email: 'john@example.com',
 *     password: 'password123',
 *     name: 'John Doe',
 *     role: 'customer',
 *     contactNo: '+6581234567'
 * });
 */
export async function registerUser(userData) {
    try {
        const { email, password, name, fullName, role = 'customer', contactNo, phone } = userData;
        const displayName = name || fullName;
        const phoneNumber = contactNo || phone;

        if (!email || !password || !displayName) {
            return internalError(null, "Missing fields. [email, password, name]");
        }

        if (!ValidateEmail(email)) {
            return internalError(null, "Invalid email");
        }

        // if stallowner must set as vendor everything else will be a normal customer for now.
        const roles = {};
        if (role === 'vendor') {
            roles.vendor = true;
        } else {
            roles.customer = true;
        }

        const user = await registerUserWithEmail({
            email,
            password,
            name: displayName,
            contactNo: phoneNumber,
            roles
        });

        log('AUTH', `new register: ${email}`);
        
        cachedUser = user;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

        return { id: user.id, email: user.email, name: user.name, roles: user.roles };

    } catch (error) {
        log('AUTH', `failed: ${error.message}`, error);
        return internalError(error, `Failed to register: ${error.message}`);
    }
}

/**
 * Login user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Object} User object or error
 */
export async function loginUser(email, password) {
    try {
        if (!email || !password) {
            return internalError(null, "Email and password are required");
        }

        // Login via Firebase Auth
        const authUser = await loginWithEmail(email, password);
        
        if (!authUser) {
            return internalError(null, "Invalid email or password");
        }

        // Fetch user profile from database
        const user = await getUser(authUser.uid);

        if (!user) {
            return internalError(null, "User profile not found");
        }

        // Store in localStorage for quick access
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        
        // Generate and store session token
        const sessionToken = generateSessionToken();
        const sessionData = {
            userId: authUser.uid,
            email: authUser.email,
            sessionToken,
            loginTime: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));

        cachedUser = user;

        log('AUTH', `logged in: ${email}`);

        return {
            id: authUser.uid,
            email: authUser.email,
            name: user.name,
            roles: user.roles,
            sessionToken
        };

    } catch (error) {
        log('AUTH', `login error: ${error.message}`, error);
        return internalError(error, `Login failed: ${error.message}`);
    }
}

export async function logoutUser() {
    try {
        const currentUser = getCurrentUser();
        
        await firebaseLogout();
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        cachedUser = null;
        
        if (currentUser) {
            log('AUTH', `User logged out: ${currentUser.email}`);
        }
        
        return true;

    } catch (error) {
        log('AUTH', `Logout error: ${error.message}`, error);
        return internalError(null, error.message);
    }
}

/**
 * Get the currently logged in user
 * @returns {Object|null} User object or null if not authenticated
 */
export function getCurrentUser() {
    try {
        // Try cache first
        if (cachedUser) {
            return cachedUser;
        }

        // Try localStorage
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        if (stored) {
            const user = JSON.parse(stored);
            
            // Validate session
            const sessionData = localStorage.getItem(SESSION_KEY);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const expiresAt = new Date(session.expiresAt).getTime();
                if (expiresAt < Date.now()) {
                    logoutUser();
                    return null;
                }
            }

            cachedUser = user;
            return user;
        }

        return null;

    } catch (error) {
        log('AUTH', `session retrieval fail: ${error.message}`);
        return null;
    }
}

export function isAuthenticated() {
    return getCurrentUser() !== null;
}

/**
 * Check if current user has a specific role
 * @param {string} roleCheck - Role to check for
 * @returns {boolean}
 */
export function hasRole(roleCheck) {
    const user = getCurrentUser();
    if (!user || !user.roles) return false;
    return user.roles[roleCheck] === true;
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
        const expiresAt = new Date(session.expiresAt).getTime();
        return expiresAt > Date.now();

    } catch (error) {
        return false;
    }
}

function generateSessionToken() {
    return Math.random().toString(36).substring(2, 15) + 
            Math.random().toString(36).substring(2, 15) + 
            Date.now().toString(36);
}

/**
 * Update user profile
 * @param {string} userId 
 * @param {Object} updates - Allowed: fullName, name, phone, contactNo, address
 */
export async function updateProfile(userId, updates) {
    try {
        if (!userId) {
            return internalError(null, "User ID is required");
        }

        const allowedUpdates = ['fullName', 'name', 'phone', 'contactNo', 'address'];
        const filteredUpdates = {};

        for (const key of allowedUpdates) {
            if (key in updates) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return internalError(null, "No valid updates provided");
        }

        const updated = await updateUser(userId, filteredUpdates);

        log('AUTH', `user updated: ${userId}`);
        
        // Update cache
        if (cachedUser && cachedUser.id === userId) {
            cachedUser = { ...cachedUser, ...filteredUpdates };
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(cachedUser));
        }

        return updated;

    } catch (error) {
        log('AUTH', `user update error: ${error.message}`);
        return internalError(null, error.message);
    }
}

/**
 * Get user by ID
 * @param {string} userId 
 */
export async function getUserById(userId) {
    try {
        if (!userId) {
            return internalError(null, "User ID is required");
        }

        const user = await getUser(userId);

        if (!user) {
            return internalError(null, "User not found");
        }

        return user;

    } catch (error) {
        log('AUTH', `retrieve user failed: ${error.message}`);
        return internalError(null, error.message);
    }
}

/**
 * Disable user account
 * @param {string} userId 
 */
export async function disableAccount(userId) {
    try {
        if (!userId) {
            return internalError(null, "User ID is required");
        }

        await updateUser(userId, {
            roles: { customer: false, vendor: false },
            isActive: false,
            deactivatedAt: new Date().toISOString()
        });

        if (cachedUser && cachedUser.id === userId) {
            await logoutUser();
        }

        log('AUTH', `Account disabled: ${userId}`);

        return true;

    } catch (error) {
        log('AUTH', `disable account failed error: ${error.message}`);
        return internalError(null, error.message);
    }
}