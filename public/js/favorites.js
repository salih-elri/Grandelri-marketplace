document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }

    const container = document.getElementById('favorites-container');
    if (!container) return;

    try {
        const user = await api.get('/users/me');
        if (!user.favorites || user.favorites.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">Your favorites list is empty.</div>';
            return;
        }

        container.innerHTML = '';
        
        for (const itemId of user.favorites) {
            try {
                const item = await api.get('/items/' + itemId);
                const card = document.createElement('div');
                card.className = 'card';
                card.style.position = 'relative';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.overflow = 'hidden';
                
                card.innerHTML = `
                    <button onclick="removeFromFavPage('${item._id}')" class="favorite-btn" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; font-size: 1.1rem;" title="Remove from Favorites">
                        <span style="color: var(--gold);">💛</span>
                    </button>
                    <a href="/item.html?id=${item._id}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex-grow: 1;">
                        <div style="height: 200px; background: #111;">
                            <img src="${item.image_url || 'https://placehold.co/600x400/12122a/7c3aed?text=No+Image'}" 
                                 alt="${item.name}" 
                                 style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="padding: 20px; display: flex; flex-direction: column; flex-grow: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <h3 style="font-size: 1.1rem; color: var(--text-primary); margin: 0;">${item.name}</h3>
                            </div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px; flex-grow: 1;">
                                ${item.description.substring(0, 80)}...
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                                <span style="font-size: 1.25rem; font-weight: 700; color: var(--gold);">
                                    ${new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.price)}
                                </span>
                            </div>
                        </div>
                    </a>
                `;
                container.appendChild(card);
            } catch(e) {
                console.error('Error fetching item', itemId);
            }
        }
    } catch(err) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--danger);">Error loading favorites.</div>';
    }
});

window.removeFromFavPage = async function(itemId) {
    try {
        await api.delete('/users/me/favorites/' + itemId);
        showToast('Removed from favorites.', 'info');
        setTimeout(() => window.location.reload(), 500);
    } catch (err) {
        showToast('Could not remove item.', 'error');
    }
};
