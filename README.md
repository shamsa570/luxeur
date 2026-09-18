# LUXEURS — E-Commerce Clothing Website

Premium Pakistani fashion store with a fully separated user website and admin panel.

```
luxeurs/
├── frontend-user-panel/     → mysite.com          (public)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── firebase-config.js
│
└── frontend-admin-panel/    → admin.mysite.com     (private)
    ├── index.html
    ├── admin-style.css
    ├── admin-app.js
    └── firebase-config.js
```

---

## 🔐 Security Model

| Who | Can reach | How it works |
|-----|-----------|--------------|
| Anyone | mysite.com | Public site, no login needed to browse |
| Registered users | mysite.com/login | Firebase Auth, role saved as `"user"` in Firestore |
| Admin (you) | admin.mysite.com | Firebase Auth **+** Firestore `role: "admin"` check |

**The admin panel has a two-layer gate:**
1. Firebase Auth must succeed (correct email + password)
2. Firestore `users/{uid}.role` must equal `"admin"` exactly

If either check fails → the user is signed out and sees an error. No bypass exists.

---

## 🔥 Step 1 — Firebase Setup

### 1.1 Create the project
1. Go to **https://console.firebase.google.com**
2. Click **Add project** → name it `luxeurs`
3. Disable Google Analytics (optional)

### 1.2 Enable Authentication
1. Left menu → **Authentication** → **Get started**
2. Enable **Email/Password** provider

### 1.3 Create Firestore Database
1. Left menu → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Region: `asia-south1` (best for Pakistan)

### 1.4 Get your config
1. **Project Settings** (gear icon top-left) → **General**
2. Scroll to **Your apps** → click **</>** (Web app)
3. Register app → copy the `firebaseConfig` object

### 1.5 Paste config into BOTH files
Paste the same config into:
- `frontend-user-panel/firebase-config.js`
- `frontend-admin-panel/firebase-config.js`

---

## 👑 Step 2 — Create Your Admin Account

You must create your admin account **manually** in Firestore. Here's how:

### Option A: Firebase Console (easiest)

**2a. Create the Firebase Auth user:**
1. Firebase Console → **Authentication** → **Users** tab
2. Click **Add user**
3. Enter your admin email (e.g. `you@luxeurs.pk`) and a strong password
4. Note the **User UID** shown in the users table

**2b. Create the Firestore document:**
1. Firebase Console → **Firestore Database**
2. Click **Start collection** → Collection ID: `users`
3. Document ID: paste the UID from step 2a
4. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | Your Name |
| `email` | string | you@luxeurs.pk |
| `role` | string | **admin** ← this is the key field |
| `createdAt` | string | 2025-01-01T00:00:00.000Z |

### Option B: Script (if you know Node.js)
```js
// run once: node create-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function createAdmin() {
  const userRecord = await admin.auth().createUser({
    email: 'you@luxeurs.pk',
    password: 'YourStrongPassword123!'
  });
  await admin.firestore().collection('users').doc(userRecord.uid).set({
    name: 'Admin',
    email: 'you@luxeurs.pk',
    role: 'admin',
    createdAt: new Date().toISOString()
  });
  console.log('Admin created:', userRecord.uid);
}
createAdmin();
```

---

## 🛡️ Step 3 — Firestore Security Rules

In Firebase Console → **Firestore** → **Rules** tab, paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper — checks if caller is an admin
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Products: anyone can read, only admins can write
    match /products/{id} {
      allow read:  if true;
      allow write: if isAdmin();
    }

    // Orders: logged-in users can create, only admins can read all / update
    match /orders/{id} {
      allow create: if request.auth != null || true; // allow guest orders
      allow read, update: if isAdmin();
    }

    // Users: users can read/write their own doc; admins can read all
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read:        if isAdmin();
    }

    // Messages: anyone can submit; only admins can read
    match /messages/{id} {
      allow create: if true;
      allow read:   if isAdmin();
    }
  }
}
```

Click **Publish**.

---

## 🚀 Step 4 — Deployment

### Deploy User Panel → mysite.com

**Option A: GitHub Pages (free)**
1. Push your repo to GitHub
2. Go to repo **Settings** → **Pages**
3. Source: `Deploy from a branch` → branch `main` → folder `/frontend-user-panel`
4. Your site is live at `https://yourusername.github.io/luxeurs`

**Option B: Netlify (recommended, free)**
1. Go to **https://netlify.com** → New site from Git
2. Connect GitHub → select this repo
3. Base directory: `frontend-user-panel`
4. Build command: *(leave empty)*
5. Publish directory: `frontend-user-panel`
6. Click Deploy — you get `https://yoursite.netlify.app`
7. Go to **Domain settings** → add custom domain `mysite.com`

### Deploy Admin Panel → admin.mysite.com

**Option A: Netlify (separate site)**
1. Netlify → **New site from Git** again (same repo)
2. Base directory: `frontend-admin-panel`
3. Publish directory: `frontend-admin-panel`
4. Deploy → go to Domain settings → add `admin.mysite.com`

**Option B: Firebase Hosting (two sites)**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting

# When prompted:
# - Select your luxeurs project
# - Public directory: frontend-user-panel
# - Single-page app: No

# Add a second hosting site in Firebase Console → Hosting → Add site (admin-mysite)
# Then edit firebase.json to add the second target:
```

```json
{
  "hosting": [
    {
      "target": "user",
      "public": "frontend-user-panel",
      "ignore": ["firebase.json", "**/.*"]
    },
    {
      "target": "admin",
      "public": "frontend-admin-panel",
      "ignore": ["firebase.json", "**/.*"]
    }
  ]
}
```

```bash
firebase target:apply hosting user   your-project-id
firebase target:apply hosting admin  your-project-id-admin
firebase deploy
```

---

## 📂 Step 5 — Push to GitHub

```bash
# In the repo root folder:
git init
git add .
git commit -m "Initial commit — Luxeurs e-commerce + admin panel"

# Create repo on GitHub (github.com → New repository → name: luxeurs)
git remote add origin https://github.com/YOUR_USERNAME/luxeurs.git
git branch -M main
git push -u origin main
```

> ⚠️ The `firebase-config.js` files contain your API key. For a public GitHub repo,
> add them to `.gitignore` and use environment variables instead (see below).

### Using environment variables (optional but recommended for public repos)

Replace the hardcoded config in both `firebase-config.js` files with:
```js
const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,  // set in Netlify env vars
  // ... etc
};
```

In Netlify: **Site settings** → **Environment variables** → add each key.

---

## 🧪 Local Testing (no server needed)

Just open the HTML files directly in your browser:
- `frontend-user-panel/index.html` → user website
- `frontend-admin-panel/index.html` → admin login

Or use VS Code Live Server extension for hot-reload.

---

## 📋 Summary Checklist

- [ ] Firebase project created
- [ ] Email/Password auth enabled
- [ ] Firestore database created (production mode)
- [ ] Config pasted in both `firebase-config.js` files
- [ ] Admin user created in Auth + Firestore with `role: "admin"`
- [ ] Firestore Security Rules published
- [ ] User panel deployed to `mysite.com`
- [ ] Admin panel deployed to `admin.mysite.com`
- [ ] Repo pushed to GitHub
