// ================================================================
//  LUXEURS — Firebase Configuration (User Panel)
//  Same Firebase project as admin panel — shared Firestore + Auth
//
//  HOW TO GET YOUR CONFIG:
//  1. Go to https://console.firebase.google.com
//  2. Open your project → Project Settings (gear icon)
//  3. Scroll to "Your apps" → click the Web app (</>)
//  4. Copy the firebaseConfig values below
// ================================================================

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase (guard against double-init)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();

// Helper — true once you've pasted real values
function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
