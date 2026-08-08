/**
 * index.js — Home page logic (GRANDELRI)
 * Fetches items, renders product grid, handles category filter & search.
 */

let currentCategory = '';
let searchTimeout = null;

// ── Render a single product card ───────────────────────────────
function renderProductCard(item) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', item.name);

  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < Math.round(item.avg_rating || 0) ? 'filled' : ''}">★</span>`
  ).join('');

  const condClass = item.condition === 'new' ? 'badge-condition-new' : 'badge-condition-used';
  const condLabel = item.condition === 'new' ? 'New' : 'Used';

  card.innerHTML = `
    <div class="product-card-image">
      <img
        src="${item.image_url || 'https://placehold.co/400x300/12122a/7c3aed?text=No+Image'}"
        alt="${item.name}"
        loading="lazy"
        onerror="this.src='https://placehold.co/400x300/12122a/7c3aed?text=No+Image'"
      />
    </div>
    <div class="product-card-body">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span class="badge badge-category">${CATEGORY_ICONS[item.category] || ''} ${item.category}</span>
        <span class="badge ${condClass}">${condLabel}</span>
      </div>
      <div class="product-card-name">${item.name}</div>
      <div class="stars" style="margin:0;">
        ${stars}
        <span class="rating-label">${item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : 'No ratings'} (${item.num_ratings || 0})</span>
      </div>
      <div class="product-card-meta">
        <span class="product-card-price">${formatPrice(item.price, item.currency || 'USD')}</span>
        <span class="product-card-seller">by ${item.seller}</span>
      </div>
      <button
        class="btn btn-ghost btn-sm"
        style="margin-top:4px;"
        onclick="window.location.href='/item.html?id=${item._id}'"
        aria-label="View details for ${item.name}"
      >
        View Details →
      </button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (!e.target.closest('button')) {
      window.location.href = `/item.html?id=${item._id}`;
    }
  });

  return card;
}

// ── Render skeleton loading cards ──────────────────────────────
function renderSkeletons(grid, count = 8) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    grid.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line skeleton-line-sm"></div>
          <div class="skeleton skeleton-line skeleton-line-lg"></div>
          <div class="skeleton skeleton-line skeleton-line-md"></div>
          <div class="skeleton skeleton-line skeleton-line-sm"></div>
        </div>
      </div>
    `;
  }
}

// ── Load and display items ─────────────────────────────────────
async function loadItems(category = '') {
  const grid = document.getElementById('product-grid');
  const countEl = document.getElementById('item-count');
  if (!grid) return;

  renderSkeletons(grid, 8);

  try {
    const endpoint = category ? `/items?category=${encodeURIComponent(category)}` : '/items';
    const items = await api.get(endpoint);

    grid.innerHTML = '';

    if (!items || items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">📭</div>
          <p class="empty-title">No items found</p>
          <p class="empty-desc">Try a different category or check back later.</p>
        </div>
      `;
      if (countEl) countEl.textContent = '0 items';
      return;
    }

    items.forEach(item => grid.appendChild(renderProductCard(item)));
    if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon">⚠️</div>
        <p class="empty-title">Failed to load items</p>
        <p class="empty-desc">${err.message}</p>
      </div>
    `;
  }
}

// ── Category filter ────────────────────────────────────────────
function setupFilter() {
  const tabs = document.querySelectorAll('.filter-tab');
  const hero = document.querySelector('.hero');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Collapse hero section on filter
      if (hero) hero.classList.add('collapsed');

      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentCategory = tab.dataset.category;
      loadItems(currentCategory);
    });
  });
}

// ── Hero CTA based on auth state ───────────────────────────────
function renderHeroCta() {
  const cta = document.getElementById('hero-cta');
  if (!cta) return;

  if (!isLoggedIn()) {
    cta.innerHTML = `
      <button class="btn btn-primary btn-lg" id="hero-signup">
        Join the Marketplace
      </button>
    `;
    document.getElementById('hero-signup')?.addEventListener('click', () => openAuthModal('signup'));
  } else {
    const user = getUser();
    cta.innerHTML = `
      <p class="text-secondary" style="font-size:0.95rem;">
        Welcome back to <strong style="color:var(--gold)">GRANDELRI</strong>, <strong>${user.username}</strong>!
      </p>
    `;
  }
}

// ── Search & Autocomplete ──────────────────────────────────────
function initSearch() {
  const input = document.getElementById('search-input');
  const ghost = document.getElementById('search-ghost');
  const clearBtn = document.getElementById('search-clear');
  const dropdown = document.getElementById('search-dropdown');
  if (!input) return;

  // Render search results
  function renderSearchSuggestions(results, query) {
    if (!results || results.length === 0) {
      dropdown.innerHTML = `<div class="search-no-results">No matches found for "${query}"</div>`;
      dropdown.classList.add('open');
      if (ghost) ghost.value = '';
      return;
    }

    // Autocomplete ghost logic
    if (ghost) {
      const topMatch = results[0].name;
      if (topMatch.toLowerCase().startsWith(query.toLowerCase())) {
        ghost.value = query + topMatch.substring(query.length);
      } else {
        ghost.value = '';
      }
    }

    dropdown.innerHTML = results.map(item => `
      <div class="search-suggestion" onclick="window.location.href='/item.html?id=${item._id}'">
        <img src="${item.image_url}" alt="${item.name}" class="suggestion-img" onerror="this.src='https://placehold.co/100/12122a/7c3aed?text=?'" />
        <div class="suggestion-info">
          <div class="suggestion-name">${item.name}</div>
          <div class="suggestion-meta">${item.category} • by ${item.seller}</div>
        </div>
        <div class="suggestion-price">${formatPrice(item.price, item.currency)}</div>
      </div>
    `).join('');
    dropdown.classList.add('open');
  }

  // Handle typing
  input.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length > 0) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
      dropdown.classList.remove('open');
    }

    if (val.length < 2) {
      dropdown.classList.remove('open');
      if (ghost) ghost.value = '';
      return;
    }

    // Debounce API calls
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      try {
        const results = await api.get(`/items/search?q=${encodeURIComponent(val)}`);
        renderSearchSuggestions(results, val);
      } catch (err) {
        dropdown.innerHTML = `<div class="search-no-results" style="color:var(--danger)">Error: ${err.message}</div>`;
        dropdown.classList.add('open');
      }
    }, 300);
  });

  // Accept autocomplete on Tab or Right Arrow
  input.addEventListener('keydown', (e) => {
    if (ghost && ghost.value && (e.key === 'Tab' || e.key === 'ArrowRight')) {
      e.preventDefault();
      input.value = ghost.value;
      input.dispatchEvent(new Event('input')); // Trigger update
    }
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    input.value = '';
    if (ghost) ghost.value = '';
    clearBtn.classList.remove('visible');
    dropdown.classList.remove('open');
    input.focus();
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      dropdown.classList.remove('open');
    }
  });

  // Re-open on focus if input has value
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) {
      dropdown.classList.add('open');
    }
  });
}

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderHeroCta();
  setupFilter();
  initSearch();
  loadItems();
});
