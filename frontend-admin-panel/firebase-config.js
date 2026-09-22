// ================================================================
//  LUXEURS ADMIN PANEL — Firebase Configuration
//  Connects to the SAME Firebase project as the user panel.
//  This file is only in the admin repo — never exposed publicly.
//
//  HOW TO GET YOUR CONFIG:
//  1. Go to https://console.firebase.google.com
//  2. Open your project → Project Settings (gear icon)
//  3. Scroll to "Your apps" → click the Web app (</>)
//  4. Copy the firebaseConfig values below
//  ⚠️  Add this file to .gitignore if you push to a public repo
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBy1SaV78IGMD3pizIhxAZlolVeaGV9GVs",
  authDomain: "luxeurs-897c0.firebaseapp.com",
  projectId: "luxeurs-897c0",
  storageBucket: "luxeurs-897c0.firebasestorage.app",
  messagingSenderId: "944388199449",
  appId: "1:944388199449:web:30a81008975d1f8fe88688"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
