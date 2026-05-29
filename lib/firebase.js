import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
 
const firebaseConfig = {
  apiKey: "AIzaSyDZuO8ken2eYAGtYuL4BV2G0D2HUUY0u2U",
  authDomain: "sprout-1335a.firebaseapp.com",
  projectId: "sprout-1335a",
  storageBucket: "sprout-1335a.firebasestorage.app",
  messagingSenderId: "554547675112",
  appId: "1:554547675112:web:526f166571298f771dae5d",
  databaseURL: "https://sprout-1335a-default-rtdb.asia-southeast1.firebasedatabase.app/",
};
 
// Prevent duplicate initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
 
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);


