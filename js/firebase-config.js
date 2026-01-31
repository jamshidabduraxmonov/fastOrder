// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_2Uw6GfCexWEH4NXjzVNoz-X2Qs-sXTQ",
  authDomain: "foodorder-ba72c.firebaseapp.com",
  projectId: "foodorder-ba72c",
  storageBucket: "foodorder-ba72c.firebasestorage.app",
  messagingSenderId: "636321354656",
  appId: "1:636321354656:web:45f02acdb8435b71508ac5",
  measurementId: "G-W3LVRBJZPL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const storage = getStorage(app);

// Export for use in other files
export { db, storage };