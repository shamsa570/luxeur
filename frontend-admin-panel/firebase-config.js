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
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
