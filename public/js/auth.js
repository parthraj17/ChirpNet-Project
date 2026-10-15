// If already logged in, skip straight to the feed.
if (getToken()) {
  window.location.href = '/feed.html';
}

const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');

document.getElementById('show-register').addEventListener('click', () => {
  loginView.classList.add('hidden');
  registerView.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', () => {
  registerView.classList.add('hidden');
  loginView.classList.remove('hidden');
});

// ---- LOGIN ----
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');
  errorBox.classList.add('hidden');

  const emailOrUsername = document.getElementById('login-id').value.trim();
  const password = document.getElementById('login-password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const data = await api('/auth/login', { method: 'POST', body: { emailOrUsername, password } });
    saveSession(data.token, data.user);
    window.location.href = '/feed.html';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});

// ---- REGISTER ----
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById('register-error');
  const submitBtn = document.getElementById('register-submit');
  errorBox.classList.add('hidden');

  const fullName = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const data = await api('/auth/register', { method: 'POST', body: { fullName, username, email, password } });
    saveSession(data.token, data.user);
    window.location.href = '/feed.html';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
