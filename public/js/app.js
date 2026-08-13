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
function renderNav() {
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
      <div style="display: flex; gap: 15px; align-items: center;">
        <a href="#" id="nav-favorites-btn" style="color: var(--text-primary); font-size: 1.2rem;" title="Favorites">❤️</a>
        <a href="#" id="nav-cart-btn" style="color: var(--text-primary); font-size: 1.2rem;" title="Cart">🛒</a>
        
        <div class="settings-dropdown-wrapper" style="position: relative; display: inline-block;">
          <div class="nav-avatar" id="settings-toggle" style="cursor: pointer;">${avatarHtml}</div>
          <div class="settings-dropdown-content" style="display: none; position: absolute; right: 0; background-color: var(--bg-card); min-width: 160px; box-shadow: var(--shadow-card); z-index: 1; border-radius: var(--radius-sm); border: 1px solid var(--border); overflow: hidden; margin-top: 5px;">
            <div style="padding: 10px 15px; border-bottom: 1px solid var(--border); color: var(--text-secondary); font-size: 0.9rem;">
                Hi, <b>${user.username}</b>
            </div>
            <a href="/profile.html" style="color: var(--text-primary); padding: 12px 16px; text-decoration: none; display: block;">👤 Profile</a>
            ${user.role === 'admin' ? `<a href="/admin.html" style="color: var(--text-primary); padding: 12px 16px; text-decoration: none; display: block;">⚙️ Admin</a>` : ''}
            <a href="/settings.html" style="color: var(--text-primary); padding: 12px 16px; text-decoration: none; display: block;">🔧 Settings</a>
            <a href="#" id="btn-logout" style="color: var(--danger); padding: 12px 16px; text-decoration: none; display: block; border-top: 1px solid var(--border);">Sign Out</a>
          </div>
        </div>
      </div>
    `;

    // Dropdown hover logic
    const wrapper = nav.querySelector('.settings-dropdown-wrapper');
    const content = nav.querySelector('.settings-dropdown-content');
    wrapper.addEventListener('mouseenter', () => content.style.display = 'block');
    wrapper.addEventListener('mouseleave', () => content.style.display = 'none');
    
    // Dropdown click logic
    const toggle = document.getElementById('settings-toggle');
    toggle.addEventListener('click', () => {
        window.location.href = '/settings.html';
    });

    document.getElementById('btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuth();
      showToast('Signed out successfully.', 'info');
      setTimeout(() => window.location.reload(), 600);
    });
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

 / /    % %  E - C o m m e r c e   A c t i o n s    % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %
 w i n d o w . t o g g l e F a v o r i t e   =   a s y n c   f u n c t i o n ( i t e m I d ,   e )   { 
     i f ( e )   {   e . p r e v e n t D e f a u l t ( ) ;   e . s t o p P r o p a g a t i o n ( ) ;   } 
     i f ( ! i s L o g g e d I n ( ) )   { 
             s h o w T o a s t ( ' P l e a s e   s i g n   i n   t o   a d d   f a v o r i t e s . ' ,   ' e r r o r ' ) ; 
             o p e n A u t h M o d a l ( ' l o g i n ' ) ; 
             r e t u r n ; 
     } 
     
     t r y   { 
             / /   F i r s t   t r y   a d d i n g 
             a w a i t   a p i . p o s t ( ' / u s e r s / m e / f a v o r i t e s / '   +   i t e m I d ) ; 
             s h o w T o a s t ( ' A d d e d   t o   f a v o r i t e s ! ' ,   ' s u c c e s s ' ) ; 
             c o n s t   i c o n   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' f a v - i c o n - '   +   i t e m I d ) ; 
             i f ( i c o n )   {   i c o n . t e x t C o n t e n t   =   ' d'�' ;   i c o n . s t y l e . c o l o r   =   ' v a r ( - - d a n g e r ) ' ;   } 
     }   c a t c h   ( e r r )   { 
             / /   M a y b e   i t   w a s   a l r e a d y   t h e r e ,   l e t ' s   r e m o v e   i t 
             t r y   { 
                     a w a i t   a p i . d e l e t e ( ' / u s e r s / m e / f a v o r i t e s / '   +   i t e m I d ) ; 
                     s h o w T o a s t ( ' R e m o v e d   f r o m   f a v o r i t e s . ' ,   ' i n f o ' ) ; 
                     c o n s t   i c o n   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' f a v - i c o n - '   +   i t e m I d ) ; 
                     i f ( i c o n )   {   i c o n . t e x t C o n t e n t   =   ' >��' ;   i c o n . s t y l e . c o l o r   =   ' r g b a ( 2 5 5 , 2 5 5 , 2 5 5 , 0 . 8 ) ' ;   } 
             }   c a t c h   ( e r r 2 )   { 
                     s h o w T o a s t ( ' C o u l d   n o t   u p d a t e   f a v o r i t e s . ' ,   ' e r r o r ' ) ; 
             } 
     } 
 } ; 
 
 w i n d o w . a d d T o C a r t   =   a s y n c   f u n c t i o n ( i t e m I d )   { 
     i f ( ! i s L o g g e d I n ( ) )   { 
             s h o w T o a s t ( ' P l e a s e   s i g n   i n   t o   a d d   t o   c a r t . ' ,   ' e r r o r ' ) ; 
             o p e n A u t h M o d a l ( ' l o g i n ' ) ; 
             r e t u r n ; 
     } 
     t r y   { 
             a w a i t   a p i . p o s t ( ' / u s e r s / m e / c a r t / '   +   i t e m I d ) ; 
             s h o w T o a s t ( ' A d d e d   t o   c a r t ! ' ,   ' s u c c e s s ' ) ; 
     }   c a t c h   ( e r r )   { 
             s h o w T o a s t ( ' I t e m   m i g h t   a l r e a d y   b e   i n   c a r t . ' ,   ' i n f o ' ) ; 
     } 
 } ; 
  
 