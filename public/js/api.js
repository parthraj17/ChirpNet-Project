// Small fetch wrapper shared by every page.
// Attaches the JWT (stored in localStorage) to every request automatically.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('chirpnet_token');
}

function getStoredUser() {
  const raw = localStorage.getItem('chirpnet_user');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem('chirpnet_token', token);
  localStorage.setItem('chirpnet_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('chirpnet_token');
  localStorage.removeItem('chirpnet_user');
}

// Redirect to login if there's no token. Call at the top of protected pages.
function requireAuth() {
  if (!getToken()) {
    window.location.href = '/index.html';
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401 || res.status === 403) {
    // Token missing/expired -> send back to login
    if (path !== '/auth/login' && path !== '/auth/register') {
      clearSession();
      window.location.href = '/index.html';
    }
  }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
}

// Turns a timestamp into "5m", "2h", "3d" etc.
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  const units = [
    ['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60],
  ];
  for (const [label, secs] of units) {
    const val = Math.floor(seconds / secs);
    if (val >= 1) return `${val}${label}`;
  }
  return 'now';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function avatarFallback(user) {
  return user?.avatar_url && user.avatar_url.trim()
    ? user.avatar_url
    : `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.username || 'chirp')}`;
}
