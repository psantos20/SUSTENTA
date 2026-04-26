import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqZ2UUX7fvpf_fBWzvJfONEsFV18S1T88",
  authDomain: "sustenta-b202e.firebaseapp.com",
  projectId: "sustenta-b202e",
  storageBucket: "sustenta-b202e.firebasestorage.app",
  messagingSenderId: "327587034744",
  appId: "1:327587034744:web:d14ede535121a7d2af1f8d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

