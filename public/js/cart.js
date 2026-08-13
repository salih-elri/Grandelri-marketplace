document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        window.location.href = '/index.html';
        return;
    }

    const container = document.getElementById('cart-container');
    if (!container) return;

    try {
        const user = await api.get('/users/me');
        if (!user.cart || user.cart.length === 0) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">Your cart is empty.</div>';
            return;
        }

        container.innerHTML = '';
        let total = 0;
        
        for (const itemId of user.cart) {
            try {
                const item = await api.get('/items/' + itemId);
                total += item.price;
                const card = document.createElement('div');
                card.className = 'card';
                card.style.position = 'relative';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.overflow = 'hidden';
                
                card.innerHTML = `
                    <div style="height: 200px; background: #111;">
                        <img src="${item.image_url || 'https://placehold.co/600x400/12122a/7c3aed?text=No+Image'}" 
                             alt="${item.name}" 
                             style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="padding: 20px; display: flex; flex-direction: column; flex-grow: 1;">
                        <h3 style="margin-bottom: 8px; font-size: 1.1rem; color: var(--text-primary);">${item.name}</h3>
                        <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px; flex-grow: 1;">
                            ${item.description.substring(0, 80)}...
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                            <span style="font-size: 1.25rem; font-weight: 700; color: var(--gold);">
                                ${new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.price)}
                            </span>
                            <button onclick="removeFromCartPage('${item._id}')" class="btn btn-danger btn-sm">Remove</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            } catch(e) {
                console.error('Error fetching item', itemId);
            }
        }
        
        const summary = document.createElement('div');
        summary.style.gridColumn = '1 / -1';
        summary.style.display = 'flex';
        summary.style.justifyContent = 'space-between';
        summary.style.alignItems = 'center';
        summary.style.padding = '20px';
        summary.style.background = 'var(--bg-card)';
        summary.style.borderRadius = 'var(--radius-md)';
        summary.style.marginTop = '20px';
        
        summary.innerHTML = `
            <div>
                <h2 style="color: var(--text-primary);">Total: <span style="color: var(--gold);">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}</span></h2>
            </div>
            <button class="btn btn-primary" onclick="window.location.href='/checkout.html'">Proceed to Checkout</button>
        `;
        container.appendChild(summary);

    } catch(err) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--danger);">Error loading cart.</div>';
    }
});

window.removeFromCartPage = async function(itemId) {
    try {
        await api.delete('/users/me/cart/' + itemId);
        showToast('Removed from cart.', 'info');
        setTimeout(() => window.location.reload(), 500);
    } catch (err) {
        showToast('Could not remove item.', 'error');
    }
};
