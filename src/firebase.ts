// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC0DZ3ImTMfjuibypzxXn26H2mQ4L4ZQpI",
  authDomain: "jejuapp-6de1d.firebaseapp.com",
  projectId: "jejuapp-6de1d",
  storageBucket: "jejuapp-6de1d.firebasestorage.app",
  messagingSenderId: "130184475330",
  appId: "1:130184475330:web:bdcd2f20b5b2ee07e7015b",
  measurementId: "G-W0B6GEVL9X",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app); 
export const storage = getStorage(app);