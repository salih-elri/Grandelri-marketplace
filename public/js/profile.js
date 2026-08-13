/**
 * profile.js — Profile page logic (VITTAGO)
 */

if (!isLoggedIn()) {
  window.location.href = '/index.html';
}

async function loadProfile() {
  const loading = document.getElementById('profile-loading');
  const content = document.getElementById('profile-content');
  const header = document.getElementById('profile-header');
  const reviewsGrid = document.getElementById('profile-reviews');
  const emptyState = document.getElementById('profile-empty');
  const countEl = document.getElementById('review-count');
  
  try {
    const user = await api.get('/users/me');
    
    // Set LocalStorage profile photo for Nav
    if (user.profile_photo_url) {
      localStorage.setItem('profile_photo_url', user.profile_photo_url);
    } else {
      localStorage.removeItem('profile_photo_url');
    }

    loading.classList.add('hidden');
    content.classList.remove('hidden');

    const avatarHtml = user.profile_photo_url
      ? `<img src="${user.profile_photo_url}" alt="Avatar" onerror="this.style.display='none'">`
      : user.username.charAt(0).toUpperCase();

    header.innerHTML = `
      <div class="profile-avatar-lg">
        ${avatarHtml}
      </div>
      <div class="flex-col" style="flex:1;">
        <div class="flex items-center gap-2">
          <h1 style="font-size:2rem; font-weight:800;">${user.display_name || user.username}</h1>
          ${user.role === 'admin' ? '<span class="badge badge-admin">Admin</span>' : ''}
        </div>
        <div class="text-secondary" style="font-size:0.9rem;">@${user.username}</div>
        
        ${user.bio ? `<div class="profile-bio">"${user.bio}"</div>` : ''}

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">${user.num_ratings_given || 0}</span>
            <span class="stat-label">Reviews</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${user.avg_rating_given ? user.avg_rating_given.toFixed(1) : '0.0'}</span>
            <span class="stat-label">Avg Rating</span>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost profile-edit-btn" id="btn-edit-profile">
        Edit Profile
      </button>
    `;

    // Hook up Edit Profile
    document.getElementById('btn-edit-profile').addEventListener('click', () => {
      document.getElementById('profile-edit-section').classList.remove('hidden');
      document.getElementById('edit-display-name').value = user.display_name || '';
      document.getElementById('edit-bio').value = user.bio || '';
      document.getElementById('edit-photo-preview').src = user.profile_photo_url || '';
      document.getElementById('edit-photo-preview').style.display = user.profile_photo_url ? 'block' : 'none';
      window.scrollTo({ top: document.getElementById('profile-edit-section').offsetTop - 100, behavior: 'smooth' });
    });

    // Reviews List
    const reviews = user.reviews || [];
    countEl.textContent = `${reviews.length} reviews`;

    if (reviews.length === 0) {
      emptyState.classList.remove('hidden');
      reviewsGrid.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      reviewsGrid.classList.remove('hidden');
      reviewsGrid.innerHTML = reviews.map(r => {
        const rStars = Array.from({ length: 5 }, (_, i) =>
          `<span class="star ${i < r.rating ? 'filled' : ''}">★</span>`
        ).join('');
        return `
          <div class="review-card" onclick="window.location.href='/item.html?id=${r.item_id}'" style="cursor:pointer;">
            <div style="font-weight:700; color:var(--text-primary); margin-bottom:6px;">${r.item_name}</div>
            <div class="stars" style="margin-bottom:8px;">${rStars}</div>
            <p class="review-text" style="font-size:0.85rem;">${r.review_text.replace(/</g, '&lt;')}</p>
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    loading.classList.add('hidden');
    content.classList.remove('hidden');
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h2 class="empty-title">Failed to load profile</h2>
        <p class="empty-desc">${err.message}</p>
      </div>
    `;
  }
}

// ── Edit Profile Form ──────────────────────────────────────────
const editForm = document.getElementById('profile-edit-form');
const photoInput = document.getElementById('edit-photo-file');
const photoPreview = document.getElementById('edit-photo-preview');

photoInput?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    photoPreview.src = URL.createObjectURL(file);
    photoPreview.style.display = 'block';
  }
});

document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
  document.getElementById('profile-edit-section').classList.add('hidden');
});

editForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const displayName = document.getElementById('edit-display-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const errEl = document.getElementById('edit-error');
  const btn = document.getElementById('btn-save-profile');

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    // 1. Update text fields
    await api.put('/users/me', {
      display_name: displayName || null,
      bio: bio || null,
    });
    
    // 2. Upload photo if selected
    if (photoInput.files.length > 0) {
      const formData = new FormData();
      formData.append('file', photoInput.files[0]);
      
      const token = getToken();
      const res = await fetch('/api/users/me/photo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!res.ok) throw new Error("Failed to upload photo");
      const data = await res.json();
      localStorage.setItem('profile_photo_url', data.profile_photo_url);
    }

    showToast('Profile updated successfully!', 'success');
    document.getElementById('profile-edit-section').classList.add('hidden');
    loadProfile();
    renderNav(); // Reload nav avatar
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
});

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadProfile);
