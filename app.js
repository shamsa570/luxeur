// ================================================================
//  LUXEURS — User Panel JavaScript
//  Public website: mysite.com
//  Admin panel lives separately at: admin.mysite.com
//
//  This file has NO admin logic whatsoever.
//  Admin access is fully blocked — only Firestore role="admin"
//  users can reach the admin panel, which is a separate app.
// ================================================================

// ── State ────────────────────────────────────────────────────────
let products   = [];
let cart       = JSON.parse(localStorage.getItem('luxeurs_cart') || '[]');
let currentUser = null;
let currentSlide = 0;
let slideInterval;
let selectedSize = '';
let detailQty   = 1;

// ── Sample products (seeded into Firestore on first run) ─────────
const SAMPLE_PRODUCTS = [
  { id:'p1',  name:"Royal Embroidered Lawn Suit",  category:"3 Piece", price:4500,  stock:30, sizes:["S","M","L","XL"],    description:"Luxurious 3-piece lawn suit with intricate floral embroidery. Includes kameez, trouser, and dupatta.", image:"https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p2',  name:"Pearl Chiffon Festive Set",    category:"Festive", price:7800,  stock:15, sizes:["S","M","L","XL"],    description:"Elegant festive wear chiffon with pearl embellishments, perfect for weddings.", image:"https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p3',  name:"Silk Co-ord Matching Set",     category:"Co-ord",  price:5200,  stock:25, sizes:["S","M","L","XL"],    description:"Flowy silk co-ordinated set with matching print top and wide-leg trouser.", image:"https://images.unsplash.com/photo-1617922001439-4a2e6562f328?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p4',  name:"Boho Kaftan Dress",             category:"Kaftan",  price:3800,  stock:40, sizes:["Free Size"],         description:"Breezy boho kaftan in premium cotton with hand-block print.", image:"https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p5',  name:"Gold Zari 3-Piece Suit",        category:"3 Piece", price:6200,  stock:20, sizes:["S","M","L","XL"],    description:"Opulent 3-piece suit with gold zari work on pure fabric.", image:"https://images.unsplash.com/photo-1594938298603-c8148c4b984e?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p6',  name:"Linen Festive Kurta",           category:"Festive", price:2900,  stock:50, sizes:["S","M","L","XL","XXL"], description:"Breathable linen kurta with festive embroidery at neckline and cuffs.", image:"https://images.unsplash.com/photo-1603903631918-a3e1d4e3e0e2?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p7',  name:"Floral Print Co-ord",           category:"Co-ord",  price:4100,  stock:35, sizes:["S","M","L","XL"],    description:"Fresh floral print co-ord set in breathable cotton for everyday elegance.", image:"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p8',  name:"Maxi Kaftan Robe",              category:"Kaftan",  price:4500,  stock:22, sizes:["Free Size"],         description:"Full-length maxi kaftan with tie-dye pattern in vibrant colors.", image:"https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p9',  name:"Velvet Bridal 3-Piece",         category:"3 Piece", price:12000, stock:8,  sizes:["S","M","L","XL"],    description:"Luxurious velvet bridal suit with heavy embroidery for special occasions.", image:"https://images.unsplash.com/photo-1622495966027-e0173192c728?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p10', name:"Eid Special Co-ord",            category:"Co-ord",  price:5900,  stock:18, sizes:["S","M","L","XL"],    description:"Special edition Eid co-ord with intricate cutwork details.", image:"https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p11', name:"Classic Lawn Suit",             category:"3 Piece", price:3200,  stock:60, sizes:["S","M","L","XL","XXL"], description:"Timeless everyday lawn suit in cool pastel shades with light embroidery.", image:"https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=533&fit=crop", createdAt:new Date().toISOString() },
  { id:'p12', name:"Summer Kaftan Collection",      category:"Kaftan",  price:2800,  stock:45, sizes:["Free Size"],         description:"Light and airy summer kaftan perfect for beach trips and casual outings.", image:"https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&h=533&fit=crop", createdAt:new Date().toISOString() }
];

// ================================================================
//  FIREBASE — PRODUCTS
// ================================================================
async function loadProducts() {
  if (!isFirebaseConfigured()) {
    products = SAMPLE_PRODUCTS;
    renderProducts('both');
    return;
  }
  try {
    const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      const batch = db.batch();
      SAMPLE_PRODUCTS.forEach(p => batch.set(db.collection('products').doc(p.id), p));
      await batch.commit();
      products = SAMPLE_PRODUCTS;
    } else {
      products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    renderProducts('both');
  } catch (e) {
    console.warn('Firestore error, using local data:', e.message);
    products = SAMPLE_PRODUCTS;
    renderProducts('both');
  }
}

// ================================================================
//  AUTH — USER ONLY (no admin path here)
// ================================================================
auth.onAuthStateChanged(async user => {
  currentUser = user;
  updateNavForUser(user);
});

function updateNavForUser(user) {
  // You can show user name in navbar here if desired
}

async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) { showToast('Please enter email and password', 'error'); return; }

  if (!isFirebaseConfigured()) {
    // Local fallback for development
    const users = JSON.parse(localStorage.getItem('luxeurs_users') || '[]');
    const user  = users.find(u => u.email === email && u.password === pass);
    if (user) {
      currentUser = user;
      showToast('Welcome back, ' + user.name + '!', 'success');
      showPage('home');
    } else {
      showToast('Incorrect email or password', 'error');
    }
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast('Welcome back!', 'success');
    showPage('home');
  } catch (e) {
    showToast('Incorrect email or password', 'error');
  }
}

async function registerUser() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPassword').value;
  if (!name || !email || !pass)  { showToast('Please fill all fields', 'error'); return; }
  if (pass.length < 6)           { showToast('Password must be at least 6 characters', 'error'); return; }

  if (!isFirebaseConfigured()) {
    const users = JSON.parse(localStorage.getItem('luxeurs_users') || '[]');
    if (users.find(u => u.email === email)) { showToast('Email already registered', 'error'); return; }
    const user = { id:'u_'+Date.now(), name, email, password:pass, role:'user', createdAt:new Date().toISOString() };
    users.push(user);
    localStorage.setItem('luxeurs_users', JSON.stringify(users));
    currentUser = user;
    showToast('Account created! Welcome, ' + name, 'success');
    showPage('home');
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    // Save user doc in Firestore with role = "user" (never "admin")
    await db.collection('users').doc(cred.user.uid).set({
      name, email, role: 'user', createdAt: new Date().toISOString()
    });
    showToast('Welcome to Luxeurs, ' + name + '!', 'success');
    showPage('home');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function logoutUser() {
  if (isFirebaseConfigured()) auth.signOut().catch(() => {});
  currentUser = null;
  showToast('Signed out', 'success');
  showPage('home');
}

// ================================================================
//  CAROUSEL
// ================================================================
function initCarousel() {
  const slides = document.querySelectorAll('.slide');
  const dotsEl = document.getElementById('carouselDots');
  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => goToSlide(i);
    dotsEl.appendChild(dot);
  });
  startAutoSlide();
}
function goToSlide(index) {
  const slides = document.querySelectorAll('.slide');
  const dots   = document.querySelectorAll('.dot');
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}
function changeSlide(dir) { goToSlide(currentSlide + dir); restartAutoSlide(); }
function startAutoSlide()  { slideInterval = setInterval(() => goToSlide(currentSlide + 1), 4000); }
function restartAutoSlide(){ clearInterval(slideInterval); startAutoSlide(); }

// ================================================================
//  NAVIGATION
// ================================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + name);
  if (target) { target.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  document.getElementById('navLinks').classList.remove('open');
  if (name === 'home')     renderProducts('home');
  if (name === 'shop')     renderProducts('shop');
  if (name === 'cart')     renderCart();
  if (name === 'checkout') renderCheckout();
}
function toggleMenu()   { document.getElementById('navLinks').classList.toggle('open'); }
function toggleSearch() {
  document.getElementById('searchOverlay').classList.toggle('open');
  if (document.getElementById('searchOverlay').classList.contains('open'))
    setTimeout(() => document.getElementById('searchInput').focus(), 100);
}
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

// ================================================================
//  PRODUCT RENDERING
// ================================================================
function renderProducts(target = 'both', filter = 'all') {
  const filtered = filter === 'all' ? products : products.filter(p =>
    p.category.toLowerCase().includes(filter.toLowerCase()));
  const grids = [];
  if (target === 'home' || target === 'both') grids.push({ id:'homeProductGrid', limit:12 });
  if (target === 'shop' || target === 'both') grids.push({ id:'shopProductGrid', limit:null });
  grids.forEach(({ id, limit }) => {
    const grid = document.getElementById(id);
    if (!grid) return;
    const items = limit ? filtered.slice(0, limit) : filtered;
    grid.innerHTML = items.length
      ? items.map(p => productCardHTML(p)).join('')
      : '<div class="loading-spinner">No products found.</div>';
  });
}

function productCardHTML(p) {
  const img = p.image
    ? `<img src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">`
    : `<div style="font-size:5rem;display:flex;align-items:center;justify-content:center;height:100%">👗</div>`;
  return `
    <div class="product-card">
      <div class="product-img" onclick="openProduct('${p.id}')">${img}</div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name" onclick="openProduct('${p.id}')">${p.name}</div>
        <div class="product-price">Rs. ${Number(p.price).toLocaleString()}</div>
        <div class="product-actions">
          <button class="btn-cart" onclick="addToCart('${p.id}')">Add to Cart</button>
          <button class="btn-buy"  onclick="buyNow('${p.id}')">Buy Now</button>
        </div>
      </div>
    </div>`;
}

function filterCategory(cat, btn) {
  if (btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderProducts('shop', cat === 'all' ? 'all' : cat);
  showPage('shop');
}

function searchProducts() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  const grid = document.getElementById('shopProductGrid');
  if (grid) grid.innerHTML = filtered.length
    ? filtered.map(p => productCardHTML(p)).join('')
    : '<div class="loading-spinner">No results found.</div>';
  if (q.length > 1) { document.getElementById('searchOverlay').classList.remove('open'); showPage('shop'); }
}

// ================================================================
//  PRODUCT DETAIL
// ================================================================
function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  selectedSize = ''; detailQty = 1;
  const sizes = (p.sizes || ['S','M','L','XL'])
    .map(s => `<button class="size-btn" onclick="selectSize('${s}',this)">${s}</button>`).join('');
  const img = p.image
    ? `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div style=font-size:8rem>👗</div>'">`
    : `<div style="font-size:8rem;display:flex;align-items:center;justify-content:center;height:100%">👗</div>`;
  document.getElementById('productDetail').innerHTML = `
    <div class="product-gallery">
      <div class="main-img">${img}</div>
      <div class="thumb-row">
        ${[p.image,p.image,p.image].filter(Boolean).map((src,i)=>`
          <div class="thumb ${i===0?'active':''}" onclick="changeThumb(this,'${src}')">
            <img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover">
          </div>`).join('')}
      </div>
    </div>
    <div class="product-detail-info">
      <div class="detail-category">${p.category}</div>
      <h1 class="detail-title">${p.name}</h1>
      <div class="detail-price">Rs. ${Number(p.price).toLocaleString()}</div>
      <p class="detail-desc">${p.description || ''}</p>
      <div>
        <div class="size-label">Select Size</div>
        <div class="size-options">${sizes}</div>
      </div>
      <div>
        <div class="size-label" style="margin-bottom:.5rem">Quantity</div>
        <div class="qty-row">
          <div class="qty-control">
            <button class="qty-btn" onclick="changeQty(-1)">−</button>
            <span class="qty-num" id="qtyDisplay">1</span>
            <button class="qty-btn" onclick="changeQty(1)">+</button>
          </div>
          <span style="color:var(--text-muted);font-size:.8rem">${p.stock} in stock</span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary" onclick="addToCart('${p.id}',true)">Add to Cart</button>
        <button class="btn-buy" style="border-radius:50px;padding:.85rem 2.5rem" onclick="buyNow('${p.id}')">Buy Now</button>
      </div>
    </div>`;
  showPage('product');
}
function changeThumb(el, src) {
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelector('.main-img').innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover">`;
}
function selectSize(size, btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected'); selectedSize = size;
}
function changeQty(dir) {
  detailQty = Math.max(1, detailQty + dir);
  document.getElementById('qtyDisplay').textContent = detailQty;
}

// ================================================================
//  CART
// ================================================================
function addToCart(id, fromDetail = false) {
  const p    = products.find(x => x.id === id);
  if (!p) return;
  const size = fromDetail ? (selectedSize || (p.sizes?.[0] ?? 'M')) : (p.sizes?.[0] ?? 'M');
  const qty  = fromDetail ? detailQty : 1;
  const ex   = cart.find(c => c.id === id && c.size === size);
  if (ex) ex.qty += qty; else cart.push({ id, name:p.name, price:p.price, image:p.image, size, qty });
  saveCart(); updateCartBadge();
  showToast('✓ ' + p.name + ' added to cart', 'success');
}
function buyNow(id)         { addToCart(id); showPage('cart'); }
function removeFromCart(i)  { cart.splice(i,1); saveCart(); updateCartBadge(); renderCart(); }
function updateCartQty(i,d) { cart[i].qty = Math.max(1, cart[i].qty + d); saveCart(); renderCart(); }
function saveCart()         { localStorage.setItem('luxeurs_cart', JSON.stringify(cart)); }
function updateCartBadge()  {
  document.getElementById('cartBadge').textContent = cart.reduce((s,c)=>s+c.qty, 0);
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const summary   = document.getElementById('cartSummary');
  if (!cart.length) {
    container.innerHTML = `<div class="empty-cart"><p>🛍️ Your cart is empty</p><button class="btn-primary" onclick="showPage('shop')">Start Shopping</button></div>`;
    summary.innerHTML = ''; return;
  }
  container.innerHTML = cart.map((item,i) => {
    const img = item.image
      ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
      : `<div style="font-size:2.5rem;display:flex;align-items:center;justify-content:center;height:100%">👗</div>`;
    return `
      <div class="cart-item">
        <div class="cart-item-img">${img}</div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">Rs. ${Number(item.price).toLocaleString()}</div>
          <div class="cart-item-size">Size: ${item.size}</div>
          <div class="cart-item-actions">
            <div class="qty-control">
              <button class="qty-btn" onclick="updateCartQty(${i},-1)">−</button>
              <span class="qty-num">${item.qty}</span>
              <button class="qty-btn" onclick="updateCartQty(${i},1)">+</button>
            </div>
            <button class="cart-remove" onclick="removeFromCart(${i})">✕ Remove</button>
          </div>
        </div>
        <div style="font-weight:700">Rs. ${(item.price*item.qty).toLocaleString()}</div>
      </div>`;
  }).join('');
  const sub  = cart.reduce((s,c)=>s+c.price*c.qty, 0);
  const ship = sub > 5000 ? 0 : 200;
  summary.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>Rs. ${sub.toLocaleString()}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${ship===0?'FREE':'Rs. '+ship}</span></div>
    ${ship===0?'<p style="color:var(--green);font-size:.75rem">🎉 Free shipping on orders over Rs. 5,000!</p>':''}
    <div class="summary-row total"><span>Total</span><span>Rs. ${(sub+ship).toLocaleString()}</span></div>
    <button class="btn-primary full-width" style="margin-top:1rem" onclick="showPage('checkout')">Proceed to Checkout</button>
    <button class="btn-secondary full-width" style="margin-top:.5rem" onclick="showPage('shop')">Continue Shopping</button>`;
}

function renderCheckout() {
  const summary = document.getElementById('orderSummary');
  const sub  = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const ship = sub > 5000 ? 0 : 200;
  summary.innerHTML = `
    <h3>Order Summary</h3>
    ${cart.map(c=>`<div class="summary-row"><span>${c.name} × ${c.qty}</span><span>Rs. ${(c.price*c.qty).toLocaleString()}</span></div>`).join('')}
    <div class="summary-row"><span>Shipping</span><span>${ship===0?'FREE':'Rs. '+ship}</span></div>
    <div class="summary-row total"><span>Total</span><span>Rs. ${(sub+ship).toLocaleString()}</span></div>`;
}

// ================================================================
//  PLACE ORDER
// ================================================================
async function placeOrder() {
  const name    = document.getElementById('chkName').value.trim();
  const phone   = document.getElementById('chkPhone').value.trim();
  const address = document.getElementById('chkAddress').value.trim();
  const city    = document.getElementById('chkCity').value.trim();
  if (!name||!phone||!address||!city) { showToast('Please fill all required fields','error'); return; }
  if (!cart.length)                   { showToast('Your cart is empty','error'); return; }

  const sub     = cart.reduce((s,c)=>s+c.price*c.qty,0);
  const ship    = sub>5000?0:200;
  const orderId = 'LXR-' + Date.now();
  const order   = {
    id: orderId,
    customer: { name, phone, email: document.getElementById('chkEmail').value, address, city, postal: document.getElementById('chkPostal').value },
    items: [...cart], subtotal:sub, shipping:ship, total:sub+ship,
    status: 'processing',
    userId: currentUser?.uid || currentUser?.id || 'guest',
    createdAt: new Date().toISOString()
  };

  if (isFirebaseConfigured()) {
    try { await db.collection('orders').doc(orderId).set(order); } catch(e) { console.error(e); }
  }
  // Always keep a local copy too
  const orders = JSON.parse(localStorage.getItem('luxeurs_orders')||'[]');
  orders.unshift(order);
  localStorage.setItem('luxeurs_orders', JSON.stringify(orders));

  cart = []; saveCart(); updateCartBadge();
  document.getElementById('confirmOrderId').innerHTML = `🔖 Order ID: <strong>${orderId}</strong>`;
  showPage('confirmation');
}

// ================================================================
//  CONTACT
// ================================================================
async function sendMessage() {
  const name    = document.getElementById('cName').value.trim();
  const email   = document.getElementById('cEmail').value.trim();
  const message = document.getElementById('cMessage').value.trim();
  if (!name||!email||!message) { showToast('Please fill all fields','error'); return; }
  if (isFirebaseConfigured()) {
    try { await db.collection('messages').add({ name,email,message, createdAt:new Date().toISOString() }); } catch(e){}
  }
  document.getElementById('cName').value = '';
  document.getElementById('cEmail').value = '';
  document.getElementById('cMessage').value = '';
  showToast("Message sent! We'll reply soon.", 'success');
}

// ================================================================
//  TOAST
// ================================================================
let toastTimeout;
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=>t.classList.remove('show'), 3000);
}

// ================================================================
//  INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  initCarousel();
  loadProducts();
  updateCartBadge();
  showPage('home');

  // Touch swipe carousel
  let tx = 0;
  document.querySelector('.carousel').addEventListener('touchstart', e => { tx = e.touches[0].clientX; });
  document.querySelector('.carousel').addEventListener('touchend',   e => {
    const d = tx - e.changedTouches[0].clientX;
    if (Math.abs(d) > 50) changeSlide(d > 0 ? 1 : -1);
  });
});
