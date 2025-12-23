
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCSwWvZNBGbzYgTHLkWPQX32nM7EEF_rLM",
  authDomain: "vempat-a02df.firebaseapp.com",
  projectId: "vempat-a02df",
  storageBucket: "vempat-a02df.firebasestorage.app",
  messagingSenderId: "1038416124446",
  appId: "1:1038416124446:web:10648a1e4d0eaeb3692c0f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
