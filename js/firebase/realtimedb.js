/*
 * Firebase Configuration Module
 * Centralizes Firebase initialization and database reference
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
    getDatabase,
    ref,
    push,
    set,
    get,
    update,
    remove,
    child,
    onValue,
    query,
    orderByChild,
    equalTo,
    limitToLast
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

/* ================================
   Firebase configuration
================================ */
const firebaseConfig = {
    apiKey: "AIzaSyD08QOXs0MaEbZ0Xcw9DmaWzFQ7vYznmZ4",
    authDomain: "hawktuah-69404.firebaseapp.com",
    databaseURL: "https://hawktuah-69404-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hawktuah-69404",
    storageBucket: "hawktuah-69404.firebasestorage.app",
    messagingSenderId: "320571063525",
    appId: "1:320571063525:web:8a945ae04ed0aa0851280c",
    measurementId: "G-Y3ZCMCEBGX"
};

/* ================================
   Initialize Firebase
================================ */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================================
    Export database utilities
================================ */
export {
    db,
    ref,
    push,
    set,
    get,
    update,
    remove,
    child,
    onValue,
    query,
    orderByChild,
    equalTo,
    limitToLast
};
