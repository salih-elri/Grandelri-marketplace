/**
 * item.js — Single item detail & review page (GRANDELRI)
 */

let currentItemId = null;

async function loadItem() {
  const params = new URLSearchParams(window.location.search);
  currentItemId = params.get('id');
  if (!currentItemId) {
    window.location.href = '/index.html';
    return;
  }

  const container = document.getElementById('item-detail');
  const loading = document.getElementById('item-loading');

  try {
    const item = await api.get(`/items/${currentItemId}`);
    
    loading.classList.add('hidden');
    container.classList.remove('hidden');

    const condClass = item.condition === 'new' ? 'badge-condition-new' : 'badge-condition-used';
    const condLabel = item.condition === 'new' ? 'New' : 'Used';

    const starsHtml = Array.from({ length: 5 }, (_, i) =>
      `<span class="star ${i < Math.round(item.avg_rating || 0) ? 'filled' : ''}">★</span>`
    ).join('');

    // Extra attrs
    const attrs = [];
    if (item.category) attrs.push({ label: 'Category', value: `${CATEGORY_ICONS[item.category] || ''} ${item.category}` });
    if (item.seller) attrs.push({ label: 'Seller', value: item.seller });
    if (item.condition) attrs.push({ label: 'Condition', value: condLabel });
    if (item.battery_life) attrs.push({ label: 'Battery Life', value: item.battery_life });
    if (item.age) attrs.push({ label: 'Age / Year', value: item.age });
    if (item.size) attrs.push({ label: 'Size', value: item.size });
    if (item.material) attrs.push({ label: 'Material', value: item.material });

    container.innerHTML = `
      <div class="item-detail-grid">
        <div class="item-detail-image">
          <img src="${item.image_url || 'https://placehold.co/600x600/12122a/7c3aed?text=No+Image'}" 
               alt="${item.name}" 
               onerror="this.src='https://placehold.co/600x600/12122a/7c3aed?text=No+Image'" />
        </div>
        
        <div class="item-detail-info">
          <div style="display:flex; gap:8px;">
            <span class="badge badge-category">${item.category}</span>
            <span class="badge ${condClass}">${condLabel}</span>
          </div>
          
          <h1 class="item-detail-name">${item.name}</h1>
          
          <div class="stars">
            ${starsHtml}
            <span class="rating-label">${item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : 'No ratings yet'} (${item.num_ratings || 0} reviews)</span>
          </div>
          
          <div class="item-detail-price">${formatPrice(item.price, item.currency)}</div>
          
          <p class="text-secondary" style="font-size:1.05rem; line-height:1.7;">${item.description}</p>
          
          <div class="gold-divider" style="margin:20px 0;"><span class="gold-divider-icon">✦</span></div>

          <div class="item-detail-attrs">
            ${attrs.map(a => `
              <div class="attr-row">
                <span class="attr-label">${a.label}</span>
                <span class="attr-value">${a.value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    renderReviews(item.reviews || [], item.name);

  } catch (err) {
    loading.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❌</div>
        <h2 class="empty-title">Item not found</h2>
        <p class="empty-desc">${err.message}</p>
        <a href="/index.html" class="btn btn-primary mt-4">Return Home</a>
      </div>
    `;
  }
}

// ── Reviews ────────────────────────────────────────────────────
function renderReviews(reviews, itemName) {
  const section = document.getElementById('reviews-section');
  section.classList.remove('hidden');

  const user = getUser();
  const hasReviewed = user ? reviews.some(r => r.username === user.username) : false;

  let html = `
    <div class="section-header">
      <h2 class="section-title">Reviews</h2>
      <span class="text-sm text-secondary font-bold">${reviews.length} total</span>
    </div>
  `;

  // Review form
  if (!user) {
    html += `
      <div class="review-form-card" style="text-align:center;">
        <p class="text-secondary mb-4">Please sign in to leave a review for ${itemName}.</p>
        <button class="btn btn-primary" onclick="openAuthModal('login')">Sign In</button>
      </div>
    `;
  } else {
    // If the user already reviewed, we will just show the form with "Update Your Review" 
    // instead of "Write a Review", since the backend completely replaces it now.
    html += `
      <div class="review-form-card" id="review-form-container">
        <h3 class="section-title" style="font-size:1.2rem; margin-bottom:16px;">
          ${hasReviewed ? 'Update Your Review' : 'Write a Review'}
        </h3>
        <form id="review-form" class="flex-col gap-4">
          <div>
            <label class="form-label" style="display:block; margin-bottom:8px;">Your Rating</label>
            <div id="star-input"></div>
          </div>
          <div class="form-group">
            <label class="form-label" for="review-text">Your Review</label>
            <textarea id="review-text" class="form-textarea" placeholder="What did you think of this item?" required></textarea>
          </div>
          <div class="error-msg" id="review-error"></div>
          <div>
            <button type="submit" class="btn btn-primary">Submit Review</button>
          </div>
        </form>
      </div>
    `;
  }

  // Review List
  if (reviews.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <p class="empty-title">No reviews yet</p>
        <p class="empty-desc">Be the first to review this item!</p>
      </div>
    `;
  } else {
    html += `<div class="reviews-grid">`;
    // Sort reviews: current user first, then newest
    const sortedReviews = [...reviews].sort((a, b) => {
      if (user && a.username === user.username) return -1;
      if (user && b.username === user.username) return 1;
      return 0; // Simple sort for now
    });

    sortedReviews.forEach(r => {
      const isMine = user && user.username === r.username;
      
      const rStars = Array.from({ length: 5 }, (_, i) =>
        `<span class="star ${i < r.rating ? 'filled' : ''}">★</span>`
      ).join('');

      // Admin action buttons
      let adminActions = '';
      if (isAdmin()) {
        const isHidden = r.hidden;
        const hideLabel = isHidden ? 'Unhide' : 'Hide';
        adminActions = `
          <div class="review-admin-actions">
            <button class="review-action-btn" onclick="toggleReviewVisibility('${r.username}')" title="${hideLabel} Review">
              ${hideLabel}
            </button>
            <button class="review-action-btn danger" onclick="deleteReview('${r.username}')" title="Delete Review">
              Delete
            </button>
          </div>
        `;
      }

      // If user is not admin and review is hidden, skip rendering
      if (r.hidden && !isAdmin()) return;

      const updatedBadge = r.updated ? '<span class="review-updated-badge">Edited</span>' : '';
      const avatar = r.username.charAt(0).toUpperCase();
      const hiddenBadge = r.hidden ? '<span class="badge" style="background:rgba(244,63,94,0.1);color:var(--danger);border:1px solid rgba(244,63,94,0.2);">Hidden</span>' : '';

      html += `
        <div class="review-card" id="review-card-${r.username}" ${isMine ? 'style="border-color:var(--gold-dark);"' : ''} ${r.hidden ? 'style="opacity:0.6;"' : ''}>
          ${adminActions}
          <div class="review-header">
            <div class="review-avatar">${avatar}</div>
            <div style="display:flex; flex-direction:column;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="review-username">${r.username}</span>
                ${updatedBadge}
                ${hiddenBadge}
                ${isMine ? '<span class="badge" style="background:var(--gold-subtle);color:var(--gold);">You</span>' : ''}
              </div>
              <div class="stars" style="margin-top:2px;">${rStars}</div>
            </div>
          </div>
          <p class="review-text" style="margin-bottom: 12px;">${r.review_text.replace(/</g, '&lt;')}</p>
          
          <!-- Replies Section -->
          <div class="review-replies" style="margin-left: 20px; padding-left: 15px; border-left: 2px solid var(--border); display: flex; flex-direction: column; gap: 10px;">
            ${(r.replies || []).map(reply => `
              <div class="reply-card" style="background: rgba(255,255,255,0.02); padding: 10px 14px; border-radius: 8px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  ${reply.profile_photo_url 
                    ? `<img src="${reply.profile_photo_url}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">`
                    : `<div style="width:20px;height:20px;border-radius:50%;background:var(--gold-subtle);display:flex;align-items:center;justify-content:center;color:var(--gold);font-weight:bold;font-size:10px;">${reply.username.charAt(0).toUpperCase()}</div>`
                  }
                  <span style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">${reply.username}</span>
                  ${user && reply.username === user.username ? '<span class="badge" style="background:var(--gold-subtle);color:var(--gold);font-size:0.6rem;padding:2px 6px;">You</span>' : ''}
                </div>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">${reply.reply_text.replace(/</g, '&lt;')}</p>
              </div>
            `).join('')}
            
            ${user ? `
              <div class="reply-action-container" style="margin-top: 5px;">
                <button class="btn btn-ghost btn-sm reply-toggle-btn" onclick="toggleReplyForm('${r.username}')" style="padding: 4px 10px; font-size: 0.75rem;">Reply</button>
                <form id="reply-form-${r.username}" class="reply-form hidden" style="margin-top: 10px; display: none; flex-direction: column; gap: 8px;" onsubmit="submitReply(event, '${r.username}')">
                  <textarea id="reply-text-${r.username}" class="form-textarea" placeholder="Write a reply..." style="min-height: 60px; font-size: 0.85rem; padding: 8px;" required></textarea>
                  <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="toggleReplyForm('${r.username}')" style="padding: 6px 12px; font-size: 0.75rem;">Cancel</button>
                    <button type="submit" class="btn btn-primary btn-sm" style="padding: 6px 12px; font-size: 0.75rem;">Post Reply</button>
                  </div>
                </form>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  section.innerHTML = html;

  if (user) {
    const starInput = document.getElementById('star-input');
    renderStars(starInput, 0, true);

    const form = document.getElementById('review-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = parseInt(starInput.dataset.selected || '0');
      const text = document.getElementById('review-text').value.trim();
      const errEl = document.getElementById('review-error');
      
      if (!rating) {
        errEl.textContent = 'Please select a rating (1-5 stars).';
        errEl.classList.add('visible');
        return;
      }
      
      try {
        const btn = form.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        await api.post(`/items/${currentItemId}/review`, { rating, review_text: text });
        showToast('Review submitted successfully!', 'success');
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.add('visible');
        form.querySelector('button').disabled = false;
        form.querySelector('button').textContent = 'Submit Review';
      }
    });
  }
}

// ── Admin Actions: Delete & Hide Review ───────────────────────
async function toggleReviewVisibility(username) {
  try {
    const res = await api.patch(`/items/${currentItemId}/reviews/${username}/visibility`);
    showToast(`Review is now ${res.hidden ? 'hidden' : 'visible'}.`, 'success');
    
    // Smooth transition
    const card = document.getElementById(`review-card-${username}`);
    if (card) {
      card.style.opacity = '0';
      setTimeout(() => loadItem(), 300);
    } else {
      loadItem();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ── Global Reply Functions ─────────────────────────────────────────
window.toggleReplyForm = function(username) {
  const form = document.getElementById(`reply-form-${username}`);
  const btn = form.previousElementSibling;
  
  if (form.style.display === 'none' || form.classList.contains('hidden')) {
    form.style.display = 'flex';
    form.classList.remove('hidden');
    btn.style.display = 'none';
  } else {
    form.style.display = 'none';
    form.classList.add('hidden');
    btn.style.display = 'inline-flex';
  }
};

window.submitReply = async function(e, reviewUsername) {
  e.preventDefault();
  const textInput = document.getElementById(`reply-text-${reviewUsername}`);
  const text = textInput.value.trim();
  if (!text) return;

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Posting...';

  try {
    await api.post(`/items/${currentItemId}/reviews/${reviewUsername}/reply`, { reply_text: text });
    showToast('Reply added successfully!', 'success');
    setTimeout(() => window.location.reload(), 500);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

async function deleteReview(username) {
  if (!confirm(`Are you sure you want to permanently delete the review from ${username}?`)) return;
  try {
    const card = document.getElementById(`review-card-${username}`);
    if (card) {
      card.classList.add('fading-out'); // custom class for animation
    }
    
    await api.delete(`/items/${currentItemId}/reviews/${username}`);
    showToast(`Review by ${username} has been deleted.`, 'success');
    
    if (card) {
      setTimeout(() => loadItem(), 400); // wait for animation
    } else {
      loadItem();
    }
  } catch (err) {
    showToast(`Failed to delete review: ${err.message}`, 'error');
  }
}

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadItem);
