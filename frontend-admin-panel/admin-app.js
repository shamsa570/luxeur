// ================================================================
//  LUXEURS — Admin Panel JavaScript
//  Deployed at: admin.mysite.com (separate from mysite.com)
//
//  SECURITY MODEL:
//  1. User logs in with Firebase Auth (email + password)
//  2. We immediately query Firestore: users/{uid}.role
//  3. If role !== "admin"  → kick them out, show error
//  4. If Firestore doc missing → kick them out
//  5. Dashboard HTML is hidden until step 2 passes
//  6. All Firestore write operations also server-side checked
//     via Security Rules (see README → Firestore Rules section)
//
//  There is NO hardcoded admin email/password bypass.
//  The ONLY way in is: valid Firebase Auth + Firestore role="admin"
// ================================================================

let allProducts = [];
let allOrders   = [];
let allUsers    = [];
let currentAdminUser = null;

// ── UI helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showScreen(name) {
  $('loginScreen').style.display    = name === 'login'     ? 'flex'  : 'none';
  $('checkingScreen').style.display = name === 'checking'  ? 'flex'  : 'none';
  $('dashboardScreen').style.display= name === 'dashboard' ? 'flex'  : 'none';
}

function showLoginError(msg) {
  const el = $('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}
function clearLoginError() { $('loginError').style.display = 'none'; }

// ── TOAST ────────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg; t.className = 'toast show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── DATE ─────────────────────────────────────────────────────────
function updateTopbarDate() {
  $('topbarDate').textContent = new Date().toLocaleDateString('en-PK', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
}

// ================================================================
//  STEP 1 — Firebase Auth state listener
//  Runs on every page load. If no session → show login.
//  If session found → go straight to role check.
// ================================================================
auth.onAuthStateChanged(async user => {
  if (!user) {
    showScreen('login');
    return;
  }
  // User is signed in — verify role before showing anything
  showScreen('checking');
  await verifyAdminRole(user);
});

// ================================================================
//  STEP 2 — Firestore role verification
//  This is THE security gate. Even if someone guesses the URL,
//  they see the checking spinner, then get kicked out.
// ================================================================
async function verifyAdminRole(user) {
  try {
    const doc = await db.collection('users').doc(user.uid).get();

    if (!doc.exists) {
      // User authenticated but no Firestore profile → not admin
      await auth.signOut();
      showScreen('login');
      showLoginError('⛔ No admin account found. Access denied.');
      return;
    }

    const data = doc.data();

    if (data.role !== 'admin') {
      // Authenticated user but role is "user" or anything else
      await auth.signOut();
      showScreen('login');
      showLoginError('⛔ Your account does not have admin privileges.');
      return;
    }

    // ✅ VERIFIED: role === "admin"
    currentAdminUser = { ...user, name: data.name || user.email };
    $('adminEmailDisplay').textContent = user.email;
    updateTopbarDate();
    showScreen('dashboard');
    loadAllData();

  } catch (err) {
    console.error('Role verification failed:', err);
    // On any Firestore error, deny access — fail secure
    await auth.signOut();
    showScreen('login');
    showLoginError('⚠️ Could not verify admin access. Please try again.');
  }
}

// ================================================================
//  LOGIN HANDLER
// ================================================================
async function doAdminLogin() {
  clearLoginError();
  const email = $('adminEmail').value.trim();
  const pass  = $('adminPassword').value;

  if (!email || !pass) { showLoginError('Please enter your email and password.'); return; }

  const btn = $('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';

  try {
    // Firebase Auth — just authenticates, does NOT grant admin access
    await auth.signInWithEmailAndPassword(email, pass);
    // onAuthStateChanged fires → verifyAdminRole() runs automatically
  } catch (err) {
    btn.disabled = false; btn.textContent = 'Sign In';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      showLoginError('❌ Incorrect email or password.');
    } else if (err.code === 'auth/too-many-requests') {
      showLoginError('⏳ Too many failed attempts. Try again later.');
    } else {
      showLoginError('Something went wrong: ' + err.message);
    }
  }
}

// ================================================================
//  LOGOUT
// ================================================================
async function doLogout() {
  await auth.signOut();
  currentAdminUser = null;
  showScreen('login');
  clearLoginError();
  $('adminEmail').value    = '';
  $('adminPassword').value = '';
}

// ================================================================
//  SECTION NAVIGATION
// ================================================================
function showSection(name, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  $('sec-' + name).classList.add('active');
  if (btn) btn.classList.add('active');

  const titles = { dashboard:'Dashboard', orders:'Orders', products:'Products', users:'Customers', messages:'Messages' };
  $('sectionTitle').textContent = titles[name] || name;

  if (name === 'orders')   renderOrdersTable('allOrdersTable', allOrders);
  if (name === 'products') renderProductsGrid();
  if (name === 'users')    renderUsersTable();
  if (name === 'messages') loadMessages();
}

// ================================================================
//  DATA LOADING
// ================================================================
async function loadAllData() {
  await Promise.all([ loadProducts(), loadOrders(), loadUsersData() ]);
}

async function loadProducts() {
  try {
    const snap = await db.collection('products').orderBy('createdAt','desc').get();
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('s-products').textContent = allProducts.length;
  } catch (e) { console.error('Products:', e.message); }
}

async function loadOrders() {
  try {
    const snap = await db.collection('orders').orderBy('createdAt','desc').get();
    allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboardStats();
    renderOrdersTable('recentOrdersTable', allOrders.slice(0, 8));
  } catch (e) { console.error('Orders:', e.message); }
}

async function loadUsersData() {
  try {
    const snap = await db.collection('users').get();
    allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const customers = allUsers.filter(u => u.role !== 'admin');
    $('s-users').textContent = customers.length;
  } catch (e) { console.error('Users:', e.message); }
}

async function loadMessages() {
  try {
    const snap = await db.collection('messages').orderBy('createdAt','desc').get();
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = $('messagesTable');
    if (!msgs.length) { el.innerHTML = '<div class="empty-state">No messages yet.</div>'; return; }
    el.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th></tr></thead>
        <tbody>
          ${msgs.map(m => `
            <tr>
              <td>${m.name}</td>
              <td>${m.email}</td>
              <td style="max-width:300px">${m.message}</td>
              <td style="color:var(--muted)">${new Date(m.createdAt).toLocaleDateString('en-PK')}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { $('messagesTable').innerHTML = '<div class="empty-state">Could not load messages.</div>'; }
}

// ================================================================
//  DASHBOARD STATS
// ================================================================
function renderDashboardStats() {
  const total     = allOrders.length;
  const processing = allOrders.filter(o => o.status === 'processing').length;
  const shipped   = allOrders.filter(o => o.status === 'shipped').length;
  const delivered = allOrders.filter(o => o.status === 'delivered').length;
  const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
  const revenue   = allOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);

  $('s-total').textContent     = total;
  $('s-processing').textContent = processing;
  $('s-shipped').textContent   = shipped;
  $('s-delivered').textContent  = delivered;
  $('s-cancelled').textContent  = cancelled;
  $('s-revenue').textContent   = 'Rs. ' + revenue.toLocaleString();
}

// ================================================================
//  ORDERS TABLE
// ================================================================
function renderOrdersTable(containerId, orders) {
  const el = $(containerId);
  if (!el) return;
  if (!orders.length) { el.innerHTML = '<div class="empty-state">No orders found.</div>'; return; }
  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Order ID</th><th>Customer</th><th>City</th>
          <th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Update</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td><strong style="font-size:.75rem">${o.id}</strong></td>
            <td>
              ${o.customer?.name || 'N/A'}<br>
              <small style="color:var(--muted)">${o.customer?.phone || ''}</small>
            </td>
            <td>${o.customer?.city || '—'}</td>
            <td>${(o.items||[]).length}</td>
            <td style="font-weight:700">Rs. ${(o.total||0).toLocaleString()}</td>
            <td><span class="badge badge-${o.status}">${o.status}</span></td>
            <td style="color:var(--muted)">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-PK') : '—'}</td>
            <td>
              <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                <option value="processing" ${o.status==='processing'?'selected':''}>Processing</option>
                <option value="shipped"    ${o.status==='shipped'?'selected':''}>Shipped</option>
                <option value="delivered"  ${o.status==='delivered'?'selected':''}>Delivered</option>
                <option value="cancelled"  ${o.status==='cancelled'?'selected':''}>Cancelled</option>
              </select>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function filterOrders(status) {
  const filtered = status === 'all' ? allOrders : allOrders.filter(o => o.status === status);
  renderOrdersTable('allOrdersTable', filtered);
}

async function updateOrderStatus(orderId, status) {
  try {
    await db.collection('orders').doc(orderId).update({ status });
    const o = allOrders.find(x => x.id === orderId);
    if (o) o.status = status;
    renderDashboardStats();
    showToast('Order updated to ' + status, 'success');
  } catch (e) {
    showToast('Update failed: ' + e.message, 'error');
  }
}

// ================================================================
//  PRODUCTS GRID
// ================================================================
function renderProductsGrid() {
  const grid = $('productsGrid');
  if (!allProducts.length) { grid.innerHTML = '<div class="empty-state">No products yet. Add one!</div>'; return; }
  grid.innerHTML = allProducts.map(p => `
    <div class="product-admin-card">
      <div class="product-admin-img">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">`
          : '👗'}
      </div>
      <div class="product-admin-info">
        <h4>${p.name}</h4>
        <div class="price">Rs. ${Number(p.price).toLocaleString()}</div>
        <div class="meta">${p.category} · Stock: ${p.stock || 0}</div>
      </div>
      <div class="product-admin-actions">
        <button class="btn-edit"   onclick="openProductModal('${p.id}')">✏️ Edit</button>
        <button class="btn-delete" onclick="deleteProduct('${p.id}')">🗑️ Del</button>
      </div>
    </div>`).join('');
}

// ================================================================
//  PRODUCT CRUD
// ================================================================
function openProductModal(id = null) {
  // Reset form
  ['pId','pName','pPrice','pImage','pDesc','pStock'].forEach(f => { if ($(f)) $(f).value = ''; });
  $('pCategory').value = '3 Piece';
  $('pSizes').value    = 'S, M, L, XL';
  $('modalTitle').textContent = id ? 'Edit Product' : 'Add Product';

  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (p) {
      $('pId').value       = p.id;
      $('pName').value     = p.name;
      $('pPrice').value    = p.price;
      $('pCategory').value = p.category;
      $('pImage').value    = p.image || '';
      $('pDesc').value     = p.description || '';
      $('pStock').value    = p.stock || '';
      $('pSizes').value    = (p.sizes || []).join(', ');
    }
  }
  $('productModal').classList.add('open');
}

function closeProductModal() { $('productModal').classList.remove('open'); }
function maybeCloseModal(e)  { if (e.target === $('productModal')) closeProductModal(); }

async function saveProduct() {
  const id    = $('pId').value;
  const name  = $('pName').value.trim();
  const price = parseFloat($('pPrice').value);
  const cat   = $('pCategory').value;
  if (!name || !price || !cat) { showToast('Name, price, and category are required', 'error'); return; }

  const data = {
    name, price, category: cat,
    image:       $('pImage').value.trim(),
    description: $('pDesc').value.trim(),
    stock:       parseInt($('pStock').value) || 0,
    sizes:       $('pSizes').value.split(',').map(s => s.trim()).filter(Boolean),
    updatedAt:   new Date().toISOString()
  };

  try {
    if (id) {
      await db.collection('products').doc(id).update(data);
      const idx = allProducts.findIndex(p => p.id === id);
      if (idx !== -1) allProducts[idx] = { ...allProducts[idx], ...data };
      showToast('Product updated!', 'success');
    } else {
      const newId  = 'p_' + Date.now();
      const newDoc = { id: newId, ...data, createdAt: new Date().toISOString() };
      await db.collection('products').doc(newId).set(newDoc);
      allProducts.unshift(newDoc);
      showToast('Product added!', 'success');
    }
    $('s-products').textContent = allProducts.length;
    closeProductModal();
    renderProductsGrid();
  } catch (e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await db.collection('products').doc(id).delete();
    allProducts = allProducts.filter(p => p.id !== id);
    $('s-products').textContent = allProducts.length;
    renderProductsGrid();
    showToast('Product deleted', 'success');
  } catch (e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ================================================================
//  USERS TABLE
// ================================================================
function renderUsersTable() {
  const el = $('usersTable');
  const customers = allUsers.filter(u => u.role !== 'admin');
  if (!customers.length) { el.innerHTML = '<div class="empty-state">No registered customers yet.</div>'; return; }
  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
      <tbody>
        ${customers.map(u => `
          <tr>
            <td>${u.name || u.displayName || 'N/A'}</td>
            <td>${u.email}</td>
            <td><span class="badge badge-${u.role === 'admin' ? 'admin' : 'user'}">${u.role || 'user'}</span></td>
            <td style="color:var(--muted)">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PK') : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}
