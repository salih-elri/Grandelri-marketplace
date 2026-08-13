/**
 * admin.js — Admin panel logic (VITTAGO)
 */

if (!isLoggedIn() || !isAdmin()) {
  window.location.href = '/index.html';
}

// ── Load Items ─────────────────────────────────────────────────
async function loadItems() {
  const tbody = document.getElementById('items-tbody');
  const countEl = document.getElementById('items-count');
  
  try {
    const items = await api.get('/items');
    countEl.textContent = `${items.length} items`;
    
    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No items found.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${item.image_url}" alt="" style="width:36px;height:36px;border-radius:4px;object-fit:cover;background:var(--bg-secondary);">
            <a href="/item.html?id=${item._id}" target="_blank" style="font-weight:600;color:var(--text-primary);">${item.name}</a>
          </div>
        </td>
        <td><span class="badge badge-category">${item.category}</span></td>
        <td style="color:var(--gold); font-weight:600;">${formatPrice(item.price, item.currency)}</td>
        <td>⭐ ${item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '0.0'} <span class="text-muted">(${item.num_ratings})</span></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteItem('${item._id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);">Error: ${err.message}</td></tr>`;
  }
}

// ── Load Users ─────────────────────────────────────────────────
async function loadUsers() {
  const tbody = document.getElementById('users-tbody');
  const countEl = document.getElementById('users-count');
  
  try {
    const users = await api.get('/users');
    countEl.textContent = `${users.length} users`;
    
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const roleBadge = u.role === 'admin' 
        ? `<span class="badge badge-admin">Admin</span>` 
        : `<span class="badge" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);">User</span>`;
        
      const avatar = u.profile_photo_url 
        ? `<img src="${u.profile_photo_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`
        : `<div style="width:28px;height:28px;border-radius:50%;background:var(--gold-subtle);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:700;font-size:0.75rem;">${u.username.charAt(0).toUpperCase()}</div>`;
        
      const emailText = u.email || '<span class="text-muted text-sm">N/A</span>';
      
      // Attempt to show plain password if available, otherwise truncate the hash.
      const pwd = u.password_plain || u.password_hash || '';
      const pwdFormatted = u.password_plain ? pwd : (pwd ? pwd.substring(0, 12) + '...' : '<span class="text-muted text-sm">N/A</span>');

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              ${avatar}
              <span style="font-weight:600;color:var(--text-primary);">${u.username}</span>
            </div>
          </td>
          <td style="color:var(--text-secondary);font-size:0.9rem;">${emailText}</td>
          <td>${roleBadge}</td>
          <td>${u.num_ratings_given || 0}</td>
          <td style="font-family:monospace;font-size:0.8rem;color:var(--danger);">${pwdFormatted}</td>
          <td>
            ${u.role === 'admin' 
              ? `<span class="text-muted text-sm">Protected</span>` 
              : `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u._id}', '${u.username}')">Delete</button>`
            }
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);">Error: ${err.message}</td></tr>`;
  }
}

// ── Delete Actions ─────────────────────────────────────────────
async function deleteItem(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  try {
    await api.delete(`/items/${id}`);
    showToast('Item deleted.', 'success');
    loadItems();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteUser(id, username) {
  if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;
  try {
    await api.delete(`/users/${id}`);
    showToast('User deleted.', 'success');
    loadUsers();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ── Dynamic Category Fields ────────────────────────────────────
document.getElementById('item-category').addEventListener('change', (e) => {
  const cat = e.target.value;
  const show = (id) => document.getElementById(id).classList.remove('hidden');
  const hide = (id) => document.getElementById(id).classList.add('hidden');
  
  hide('field-battery'); hide('field-age'); hide('field-size'); hide('field-material');
  
  if (cat === 'GPS Sport Watches') show('field-battery');
  if (cat === 'Antique Furniture') { show('field-age'); show('field-material'); }
  if (cat === 'Running Shoes') show('field-size');
});

// ── Add Item ───────────────────────────────────────────────────
document.getElementById('add-item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('add-item-error');
  const btn = document.getElementById('btn-add-item');
  
  const payload = {
    name: document.getElementById('item-name').value,
    description: document.getElementById('item-desc').value,
    price: parseFloat(document.getElementById('item-price').value),
    currency: document.getElementById('item-currency').value,
    seller: document.getElementById('item-seller').value,
    image_url: document.getElementById('item-image').value,
    category: document.getElementById('item-category').value,
    condition: document.getElementById('item-condition').value,
  };

  if (payload.category === 'GPS Sport Watches') payload.battery_life = document.getElementById('item-battery').value || null;
  if (payload.category === 'Antique Furniture') {
    payload.age = document.getElementById('item-age').value || null;
    payload.material = document.getElementById('item-material').value || null;
  }
  if (payload.category === 'Running Shoes') payload.size = document.getElementById('item-size').value || null;

  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    await api.post('/items', payload);
    showToast('Item added successfully.', 'success');
    e.target.reset();
    document.getElementById('item-category').dispatchEvent(new Event('change'));
    loadItems();
    errEl.classList.remove('visible');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Add Item';
  }
});

// ── Add User ───────────────────────────────────────────────────
document.getElementById('add-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('add-user-error');
  const btn = document.getElementById('btn-add-user');
  
  const payload = {
    username: document.getElementById('user-username').value,
    password: document.getElementById('user-password').value,
    role: document.getElementById('user-role').value,
  };

  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    await api.post('/users', payload);
    showToast('User added successfully.', 'success');
    e.target.reset();
    loadUsers();
    errEl.classList.remove('visible');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = '+ Add User';
  }
});

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  loadUsers();
});
