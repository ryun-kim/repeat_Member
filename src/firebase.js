import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyATcqOLxM51AW8ti7o7ixMqKqo-X28Y1Ew",
  authDomain: "repeatmember.firebaseapp.com",
  projectId: "repeatmember",
  storageBucket: "repeatmember.firebasestorage.app",
  messagingSenderId: "982234137332",
  appId: "1:982234137332:web:212fa56c560edabf9b54a1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);