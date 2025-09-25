// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

const firebaseConfig = {
  // Your config details here...
  apiKey: "AIzaSyD3PQC4JIGByQXfRX4ItTGUFdHIhsDRV3I",
  authDomain: "civiceye-60327.firebaseapp.com",
  projectId: "civiceye-60327",
  storageBucket: "civiceye-60327.appspot.com",
  messagingSenderId: "386549114060",
  appId: "1:386549114060:web:a36ffac1d2b53210040e69"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Add this line

export { db, auth, storage }; // Export storage