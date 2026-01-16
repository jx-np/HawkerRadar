
const SALT = '1Av7kHTspF2uVCve6wS460cBteeRH3IZ'

export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Verify password against stored hash
 * @param {string} password - Password to verify
 * @param {string} hash - Stored hash
 * @returns {Promise<boolean>} Is password correct
 */
export async function verifyPassword(password, hash) {
    const newHash = await hashPassword(password);
    return newHash === hash;
}