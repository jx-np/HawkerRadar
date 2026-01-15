
export function generateId() {
    // from google else i would have imported some UUID library
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function getCurrentTimestamp() {
    return Date.now();
}

// date to readable
export function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

export function internalError(error = null, reason = null) {
    return {
        error,
        reason,
        timestamp: getCurrentTimestamp()
    }
}

/**
 * Log message with category
 * @param {string} type ('AUTH', 'ORDER')
 * @param {string} message - Log message
 * @param {any} data - other data like objects or wtv
 */
export function log(type, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] [${type}] ${message}`;
    
    if (data) {
        console.log(logMsg, data);
    } else {
        console.log(logMsg);
    }
}

export function ValidateEmail(email) {
    // From google. Simple email regex
    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    return emailRegex.test(email);
}
