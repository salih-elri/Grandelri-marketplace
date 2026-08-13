document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
    return;
  }
  renderNav();
  initSettings();
  initAuthModal(); // from app.js for forgot password flow
});

function initSettings() {
  const emailForm = document.getElementById('email-form');
  const passwordForm = document.getElementById('password-form');
  const pwdErrContainer = document.getElementById('password-error-container');
  const pwdErrText = document.getElementById('password-error-text');
  const forgotBtn = document.getElementById('forgot-pwd-btn');
  const emailInput = document.getElementById('settings-email');

  // Pre-fill email
  api.get('/users/me').then(data => {
      emailInput.value = data.email || '';
  }).catch(err => showToast(err.message, 'error'));

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail = emailInput.value.trim();
    if (!newEmail) return;

    try {
      await api.put('/users/me', { email: newEmail });
      showToast('Email updated successfully', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPwd = document.getElementById('settings-old-password').value;
    const newPwd = document.getElementById('settings-new-password').value;
    const confirmPwd = document.getElementById('settings-confirm-password').value;

    pwdErrContainer.style.display = 'none';

    if (newPwd !== confirmPwd) {
      showToast('New passwords do not match', 'error');
      return;
    }

    try {
      await api.put('/users/me', { old_password: oldPwd, new_password: newPwd });
      showToast('Password updated successfully', 'success');
      passwordForm.reset();
    } catch (err) {
      if (err.message.toLowerCase().includes('incorrect old password')) {
        pwdErrText.textContent = 'Incorrect old password.';
        pwdErrContainer.style.display = 'flex';
      } else {
        showToast(err.message, 'error');
      }
    }
  });

  forgotBtn.addEventListener('click', () => {
      // populate the email in the forgot modal and open it
      const forgotEmailInput = document.getElementById('forgot-email');
      if (forgotEmailInput && emailInput.value) {
          forgotEmailInput.value = emailInput.value;
      }
      openAuthModal('forgot');
  });
}
