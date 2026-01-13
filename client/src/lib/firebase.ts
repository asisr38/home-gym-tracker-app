import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAKOM42cQgKXZ120RulKubFnAha_EA4CJM",
  authDomain: "home-gym-tracker-app.firebaseapp.com",
  projectId: "home-gym-tracker-app",
  storageBucket: "home-gym-tracker-app.firebasestorage.app",
  messagingSenderId: "909647876394",
  appId: "1:909647876394:web:5f618dce755c3a3c5e8e53",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : undefined;
