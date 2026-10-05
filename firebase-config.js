import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-zraWngmV4JUJI_GH14fM54eIRQH_Zic",
  authDomain: "prosper-mc.firebaseapp.com",
  projectId: "prosper-mc",
  storageBucket: "prosper-mc.firebasestorage.app",
  messagingSenderId: "16010683901",
  appId: "1:16010683901:web:49a39aa51f8b5fc9f1bc54",
  measurementId: "G-RWQ27E465C"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
