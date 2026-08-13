/**
 * app.js v2 — Shared: API client, auth, toast, stars, nav, auth modals (login + signup)
 * Site: VITTAGO Premium Marketplace
 */

const API_BASE = '/api';
const SITE_NAME = 'VITTAGO';

// ── Auth ───────────────────────────────────────────────────────
function getToken()   { return localStorage.getItem('token'); }
function getUser()    { return JSON.parse(localStorage.getItem('user') || 'null'); }
function isLoggedIn() { return !!getToken(); }
function isAdmin()    { return getUser()?.role === 'admin'; }

function setAuth(data) {
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify({
    user_id:  data.user_id,
    username: data.username,
    role:     data.role,
  }));
  if (data.profile_photo_url) {
    localStorage.setItem('profile_photo_url', data.profile_photo_url);
  } else {
    localStorage.removeItem('profile_photo_url');
  }
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('profile_photo_url');
}

// ── API client ─────────────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(API_BASE + endpoint, options);
  } catch (err) {
    throw new Error('Network error. Please check your connection.');
  }

  let data;
  const ct = res.headers.get('content-type') || '';
  data = ct.includes('application/json') ? await res.json() : { detail: await res.text() };

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/index.html';
    return;
  }

  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

const api = {
  get:    (ep)       => apiRequest('GET',    ep),
  post:   (ep, body) => apiRequest('POST',   ep, body),
  put:    (ep, body) => apiRequest('PUT',    ep, body),
  patch:  (ep, body) => apiRequest('PATCH',  ep, body),
  delete: (ep)       => apiRequest('DELETE', ep),
};

// ── Toast ──────────────────────────────────────────────────────
function ensureToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: '★' };
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Stars ──────────────────────────────────────────────────────
function renderStars(container, value = 0, interactive = false, onChange = null) {
  container.innerHTML = '';
  container.className = 'stars';
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star' + (i <= Math.round(value) ? ' filled' : '');
    star.textContent = '★';
    star.dataset.value = i;
    if (interactive) {
      star.classList.add('interactive');
      star.addEventListener('mouseenter', () => {
        container.querySelectorAll('.star').forEach((s, idx) => s.classList.toggle('hovered', idx < i));
      });
      star.addEventListener('mouseleave', () => {
        container.querySelectorAll('.star').forEach(s => s.classList.remove('hovered'));
      });
      star.addEventListener('click', () => {
        container.querySelectorAll('.star').forEach((s, idx) => s.classList.toggle('filled', idx < i));
        container.dataset.selected = i;
        if (onChange) onChange(i);
      });
    }
    container.appendChild(star);
  }
  if (!interactive && value > 0) {
    const label = document.createElement('span');
    label.className = 'rating-label';
    label.textContent = parseFloat(value).toFixed(1);
    container.appendChild(label);
  }
}

// ── Navigation ─────────────────────────────────────────────────
async function renderNav() {
  const nav = document.getElementById('nav-auth');
  if (!nav) return;
  const user = getUser();

  if (!user) {
    nav.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-open-login">Sign In</button>
      <button class="btn btn-primary btn-sm" id="btn-open-signup">Sign Up</button>
    `;
    document.getElementById('btn-open-login')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('btn-open-signup')?.addEventListener('click', () => openAuthModal('signup'));
  } else {
    const photoUrl = localStorage.getItem('profile_photo_url') || '';
    const initial = user.username.charAt(0).toUpperCase();
    const avatarHtml = photoUrl
      ? `<img src="${photoUrl}" alt="avatar" onerror="this.style.display='none'">`
      : initial;

    nav.innerHTML = `
      <div style="display: flex; gap: 20px; align-items: center;">
        
        <!-- Favorites Dropdown -->
        <div class="hover-dropdown-wrapper" id="nav-fav-wrapper">
          <a href="/favorites.html" style="color: var(--gold); font-size: 1.2rem; text-decoration: none;" title="Favorites">💛</a>
          <div class="hover-dropdown-content" id="nav-fav-dropdown">
            <div class="dropdown-empty">Loading favorites...</div>
          </div>
        </div>
        
        <!-- Cart Dropdown -->
        <div class="hover-dropdown-wrapper" id="nav-cart-wrapper">
          <a href="/cart.html" style="color: var(--text-primary); font-size: 1.2rem; text-decoration: none;" title="Cart">🛒</a>
          <div class="hover-dropdown-content" id="nav-cart-dropdown">
            <div class="dropdown-empty">Loading cart...</div>
          </div>
        </div>
        
        <!-- Profile Link -->
        <a href="/profile.html" class="nav-avatar" style="text-decoration: none; cursor: pointer; border: 2px solid var(--border);" title="Profile">${avatarHtml}</a>
        
        <!-- Settings Dropdown -->
        <div class="hover-dropdown-wrapper" id="nav-settings-wrapper">
          <a href="/settings.html" style="color: var(--text-primary); font-size: 1.2rem; text-decoration: none;" title="Settings">⚙️</a>
          <div class="hover-dropdown-content">
            <div style="padding: 10px 15px; border-bottom: 1px solid var(--border); color: var(--text-secondary); font-size: 0.9rem;">
                Hi, <b>${user.username}</b>
            </div>
            <a href="/profile.html" class="dropdown-item">👤 Profile</a>
            ${user.role === 'admin' ? `<a href="/admin.html" class="dropdown-item">🛡️ Admin</a>` : ''}
            <a href="/security.html" class="dropdown-item">🔒 Security</a>
            <a href="#" id="btn-logout" class="dropdown-item dropdown-item-danger" style="border-top: 1px solid var(--border);">🚪 Sign Out</a>
          </div>
        </div>

      </div>
    `;

    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuth();
      showToast('Signed out successfully.', 'info');
      setTimeout(() => window.location.reload(), 600);
    });
    
    // Fetch user data to populate cart and favorites
    try {
        const userData = await api.get('/users/me');
        
        // Populate Favorites
        const favDropdown = document.getElementById('nav-fav-dropdown');
        if (userData.favorites && userData.favorites.length > 0) {
            favDropdown.innerHTML = '';
            for (const itemId of userData.favorites) {
                try {
                    const item = await api.get('/items/' + itemId);
                    favDropdown.innerHTML += `
                        <a href="/item.html?id=${item._id}" class="dropdown-product">
                            <img src="${item.image_url || 'https://placehold.co/40x40/12122a/7c3aed?text=No+Image'}" alt="${item.name}">
                            <div class="dropdown-product-info">
                                <span class="dropdown-product-name">${item.name}</span>
                                <span class="dropdown-product-price">${new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.price)}</span>
                            </div>
                        </a>
                    `;
                } catch(e) {}
            }
        } else {
            favDropdown.innerHTML = `<div class="dropdown-empty">Your favorites list is empty.</div>`;
        }
        
        // Populate Cart
        const cartDropdown = document.getElementById('nav-cart-dropdown');
        if (userData.cart && userData.cart.length > 0) {
            cartDropdown.innerHTML = '';
            for (const itemId of userData.cart) {
                try {
                    const item = await api.get('/items/' + itemId);
                    cartDropdown.innerHTML += `
                        <a href="/item.html?id=${item._id}" class="dropdown-product">
                            <img src="${item.image_url || 'https://placehold.co/40x40/12122a/7c3aed?text=No+Image'}" alt="${item.name}">
                            <div class="dropdown-product-info">
                                <span class="dropdown-product-name">${item.name}</span>
                                <span class="dropdown-product-price">${new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.price)}</span>
                            </div>
                        </a>
                    `;
                } catch(e) {}
            }
            // Add checkout button to cart
            cartDropdown.innerHTML += `
                <div style="padding: 10px;">
                    <a href="/checkout.html" class="btn btn-primary" style="width: 100%; text-align: center; display: block;">Checkout</a>
                </div>
            `;
        } else {
            cartDropdown.innerHTML = `<div class="dropdown-empty">Your cart is empty.</div>`;
        }
        
    } catch (err) {
        console.error("Could not fetch user cart/favorites", err);
    }
  }
}

// ── Auth Modal (Login + Sign Up) ───────────────────────────────
function openAuthModal(tab = 'login') {
  const overlay = document.getElementById('auth-modal');
  if (!overlay) return;
  overlay.classList.add('open');
  switchAuthTab(tab);
}

function closeAuthModal() {
  const overlay = document.getElementById('auth-modal');
  if (overlay) overlay.classList.remove('open');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('login-form-wrap')?.classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form-wrap')?.classList.toggle('hidden', tab !== 'signup');
  document.getElementById('forgot-form-wrap')?.classList.toggle('hidden', tab !== 'forgot');
  // Clear errors
  document.getElementById('login-error')?.classList.remove('visible');
  document.getElementById('signup-error')?.classList.remove('visible');
  document.getElementById('forgot-error')?.classList.remove('visible');
}

// Keep backwards compatibility for pages that call openLoginModal
function openLoginModal() { openAuthModal('login'); }
function closeLoginModal() { closeAuthModal(); }

function initAuthModal() {
  const overlay = document.getElementById('auth-modal');
  if (!overlay) return;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeAuthModal(); });
  overlay.querySelector('#modal-close')?.addEventListener('click', closeAuthModal);

  // Tab switching
  overlay.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  // ── Login ──────────────────────────────────────────────────
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const username  = document.getElementById('login-username')?.value.trim();
    const password  = document.getElementById('login-password')?.value;
    const errorEl   = document.getElementById('login-error');
    const submitBtn = loginForm.querySelector('[type="submit"]');

    if (!username || !password) {
      if (errorEl) { errorEl.textContent = 'Please enter username and password.'; errorEl.classList.add('visible'); }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      const data = await api.post('/auth/login', { username, password });
      setAuth(data);
      closeAuthModal();
      showToast(`Welcome back, ${data.username}!`, 'success');
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      if (errorEl) { errorEl.textContent = err.message; errorEl.classList.add('visible'); }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });

  // ── Sign Up ────────────────────────────────────────────────
  const signupForm = document.getElementById('signup-form');
  signupForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const username  = document.getElementById('signup-username')?.value.trim();
    const email     = document.getElementById('signup-email')?.value.trim();
    const password  = document.getElementById('signup-password')?.value;
    const confirm   = document.getElementById('signup-confirm')?.value;
    const errorEl   = document.getElementById('signup-error');
    const submitBtn = signupForm.querySelector('[type="submit"]');

    if (!username || !email || !password) {
      if (errorEl) { errorEl.textContent = 'All fields are required.'; errorEl.classList.add('visible'); }
      return;
    }
    if (password !== confirm) {
      if (errorEl) { errorEl.textContent = 'Passwords do not match.'; errorEl.classList.add('visible'); }
      return;
    }
    if (password.length < 6) {
      if (errorEl) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.classList.add('visible'); }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const data = await api.post('/auth/register', { username, email, password });
      setAuth(data);
      closeAuthModal();
      showToast(`Welcome to ${SITE_NAME}, ${data.username}!`, 'success');
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      if (errorEl) { errorEl.textContent = err.message; errorEl.classList.add('visible'); }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  // ── Forgot Password ──────────────────────────────────────────
  const forgotForm = document.getElementById('forgot-form');
  forgotForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('forgot-email')?.value.trim();
    const errorEl = document.getElementById('forgot-error');
    const submitBtn = forgotForm.querySelector('[type="submit"]');

    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (errorEl) {
        errorEl.textContent = res.message;
        errorEl.style.color = 'var(--success)';
        errorEl.classList.add('visible');
      }
      submitBtn.textContent = 'Sent!';
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.color = 'var(--danger)';
        errorEl.classList.add('visible');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Reset Link';
    }
  });
}

// ── Bootstrap ────────────────────────────────────────────────────
const CATEGORIES = ['Vinyls','Antique Furniture','GPS Sport Watches','Running Shoes','Camping Tents'];
const CATEGORY_ICONS = {
  'Vinyls':'🎵','Antique Furniture':'🪑','GPS Sport Watches':'⌚','Running Shoes':'👟','Camping Tents':'⛺'
};

function formatPrice(price, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function getAvatarUrl(user) {
  if (user?.profile_photo_url) return user.profile_photo_url;
  return null;
}

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  initAuthModal();
});

// ── E-Commerce Actions ──────────────────────────────────────────
window.toggleFavorite = async function(itemId, e) {
  if(e) { e.preventDefault(); e.stopPropagation(); }
  if(!isLoggedIn()) {
      showToast('Please sign in to add favorites.', 'error');
      openAuthModal('login');
      return;
  }
  
  try {
      await api.post('/users/me/favorites/' + itemId);
      showToast('Added to favorites!', 'success');
      const icon = document.getElementById('fav-icon-' + itemId);
      if(icon) { icon.textContent = '💛'; icon.style.color = 'var(--gold)'; }
      renderNav();
  } catch (err) {
      try {
          await api.delete('/users/me/favorites/' + itemId);
          showToast('Removed from favorites.', 'info');
          const icon = document.getElementById('fav-icon-' + itemId);
          if(icon) { icon.textContent = '🤍'; icon.style.color = 'rgba(255,255,255,0.8)'; }
          renderNav();
      } catch (err2) {
          showToast('Could not update favorites.', 'error');
      }
  }
};

window.addToCart = async function(itemId) {
  if(!isLoggedIn()) {
      showToast('Please sign in to add to cart.', 'error');
      openAuthModal('login');
      return;
  }
  try {
      await api.post('/users/me/cart/' + itemId);
      showToast('Added to cart!', 'success');
      renderNav();
  } catch (err) {
      showToast('Item might already be in cart.', 'info');
  }
};
