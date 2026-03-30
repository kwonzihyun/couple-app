import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCU1-QzLmmygXbhZwJztaTNSyN6vKpzgRI",
  authDomain: "couple-app-e6812.firebaseapp.com",
  projectId: "couple-app-e6812",
  storageBucket: "couple-app-e6812.firebasestorage.app",
  messagingSenderId: "289518730887",
  appId: "1:289518730887:web:c2584e47aad78da84b0222"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
