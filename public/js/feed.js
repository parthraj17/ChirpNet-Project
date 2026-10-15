requireAuth();

const currentUser = getStoredUser();
let activeTab = 'feed'; // 'feed' | 'explore'
let selectedVibe = null;
let showingNotifications = false;

// ---------- Sidebar user chip ----------
document.getElementById('chip-avatar').src = avatarFallback(currentUser);
document.getElementById('chip-name').textContent = currentUser.full_name;
document.getElementById('chip-username').textContent = '@' + currentUser.username;
document.getElementById('my-profile-link').href = `/profile.html?u=${currentUser.username}`;

document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  window.location.href = '/index.html';
});

// ---------- Composer ----------
const composerText = document.getElementById('composer-text');
const charCount = document.getElementById('char-count');
const postBtn = document.getElementById('post-btn');

document.getElementById('focus-composer').addEventListener('click', () => composerText.focus());

composerText.addEventListener('input', () => {
  const remaining = 500 - composerText.value.length;
  charCount.textContent = remaining;
  charCount.style.color = remaining < 20 ? 'var(--coral)' : 'var(--ink-faint)';
  postBtn.disabled = composerText.value.trim().length === 0;
});

document.getElementById('vibe-picker').addEventListener('click', (e) => {
  const chip = e.target.closest('.vibe-chip');
  if (!chip) return;
  const vibe = chip.dataset.vibe;
  if (selectedVibe === vibe) {
    selectedVibe = null;
  } else {
    selectedVibe = vibe;
  }
  document.querySelectorAll('.vibe-chip').forEach(c => c.classList.toggle('selected', c.dataset.vibe === selectedVibe));
});

postBtn.addEventListener('click', async () => {
  const content = composerText.value.trim();
  if (!content) return;
  postBtn.disabled = true;
  postBtn.textContent = 'Posting...';
  try {
    const newPost = await api('/posts', { method: 'POST', body: { content, vibe: selectedVibe } });
    composerText.value = '';
    charCount.textContent = '500';
    selectedVibe = null;
    document.querySelectorAll('.vibe-chip').forEach(c => c.classList.remove('selected'));
    if (activeTab === 'feed' || activeTab === 'explore') {
      prependPost(newPost);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = 'Chirp';
  }
});

// ---------- Feed tabs ----------
document.querySelectorAll('.feed-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    hideNotifications();
    loadPosts();
  });
});

document.querySelector('.nav-link[data-view="home"]').addEventListener('click', (e) => {
  e.preventDefault();
  hideNotifications();
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'feed'));
  activeTab = 'feed';
  loadPosts();
});

document.querySelector('.nav-link[data-view="explore"]').addEventListener('click', (e) => {
  e.preventDefault();
  hideNotifications();
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'explore'));
  activeTab = 'explore';
  loadPosts();
});

// ---------- Post rendering ----------
const postsContainer = document.getElementById('posts-container');

function postCardHtml(post) {
  const isOwner = post.user_id === currentUser.id;
  return `
  <div class="panel post-card" data-post-id="${post.id}">
    <img class="avatar" src="${avatarFallback({ username: post.username, avatar_url: post.avatar_url })}" alt="" />
    <div class="post-body">
      <div class="post-head">
        <a href="/profile.html?u=${post.username}"><strong>${escapeHtml(post.full_name)}</strong></a>
        <span class="username">@${post.username}</span>
        <span class="dot">·</span>
        <time>${timeAgo(post.created_at)}</time>
      </div>
      ${post.vibe ? `<span class="post-vibe">${escapeHtml(post.vibe)}</span>` : ''}
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${post.image_url ? `<img class="post-image" src="${escapeHtml(post.image_url)}" alt="" />` : ''}
      <div class="post-actions">
        <button class="post-action like-btn ${post.liked_by_me ? 'liked' : ''}">
          ${post.liked_by_me ? '💗' : '🤍'} <span class="like-count">${post.like_count}</span>
        </button>
        <button class="post-action comment-toggle">💬 <span class="comment-count">${post.comment_count}</span></button>
        ${isOwner ? `<button class="post-action delete">🗑 Delete</button>` : ''}
      </div>
      <div class="comment-section hidden"></div>
    </div>
  </div>`;
}

function prependPost(post) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = postCardHtml(post);
  postsContainer.prepend(wrapper.firstElementChild);
}

async function loadPosts() {
  postsContainer.innerHTML = `<div class="empty-state">Loading chirps...</div>`;
  try {
    const endpoint = activeTab === 'feed' ? '/posts/feed' : '/posts/explore';
    const posts = await api(endpoint);
    if (posts.length === 0) {
      postsContainer.innerHTML = `
        <div class="panel empty-state">
          <div class="icon">🪺</div>
          <p>${activeTab === 'feed' ? "Nothing here yet. Follow people from Explore to fill your feed." : "No chirps yet. Be the first!"}</p>
        </div>`;
      return;
    }
    postsContainer.innerHTML = posts.map(postCardHtml).join('');
    renderTrendingVibes(posts);
  } catch (err) {
    postsContainer.innerHTML = `<div class="panel empty-state">Couldn't load chirps: ${escapeHtml(err.message)}</div>`;
  }
}

// Event delegation for like / comment / delete / comment-submit
postsContainer.addEventListener('click', async (e) => {
  const card = e.target.closest('.post-card');
  if (!card) return;
  const postId = card.dataset.postId;

  if (e.target.closest('.like-btn')) {
    const btn = card.querySelector('.like-btn');
    const countEl = btn.querySelector('.like-count');
    try {
      const { liked } = await api(`/likes/${postId}`, { method: 'POST' });
      btn.classList.toggle('liked', liked);
      btn.innerHTML = `${liked ? '💗' : '🤍'} <span class="like-count">${parseInt(countEl.textContent) + (liked ? 1 : -1)}</span>`;
    } catch (err) { alert(err.message); }
    return;
  }

  if (e.target.closest('.comment-toggle')) {
    const section = card.querySelector('.comment-section');
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden') && !section.dataset.loaded) {
      await loadComments(postId, section);
    }
    return;
  }

  if (e.target.closest('.delete')) {
    if (!confirm('Delete this chirp?')) return;
    try {
      await api(`/posts/${postId}`, { method: 'DELETE' });
      card.remove();
    } catch (err) { alert(err.message); }
    return;
  }

  if (e.target.closest('.comment-submit')) {
    const input = card.querySelector('.comment-input');
    const content = input.value.trim();
    if (!content) return;
    try {
      const comment = await api(`/comments/${postId}`, { method: 'POST', body: { content } });
      const list = card.querySelector('.comment-list');
      list.insertAdjacentHTML('beforeend', commentHtml(comment));
      input.value = '';
      const countEl = card.querySelector('.comment-count');
      countEl.textContent = parseInt(countEl.textContent) + 1;
    } catch (err) { alert(err.message); }
    return;
  }
});

// Enter key submits comment
postsContainer.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
    e.target.closest('.comment-section').querySelector('.comment-submit').click();
  }
});

function commentHtml(c) {
  return `
    <div class="comment-row">
      <img src="${avatarFallback(c)}" alt="" />
      <div class="comment-bubble"><strong>${escapeHtml(c.full_name)}</strong> ${escapeHtml(c.content)}</div>
    </div>`;
}

async function loadComments(postId, section) {
  section.innerHTML = 'Loading comments...';
  try {
    const post = await api(`/posts/${postId}`);
    section.dataset.loaded = '1';
    section.innerHTML = `
      <div class="comment-list">${post.comments.map(commentHtml).join('') || '<p style="color:var(--ink-faint);font-size:0.85rem;">No comments yet. Say something!</p>'}</div>
      <div class="comment-form">
        <input type="text" class="comment-input" placeholder="Write a comment..." maxlength="300" />
        <button class="comment-submit">Reply</button>
      </div>`;
  } catch (err) {
    section.innerHTML = `<p style="color:var(--coral);font-size:0.85rem;">Couldn't load comments.</p>`;
  }
}

// ---------- Trending vibes (ChirpNet's own twist) ----------
function renderTrendingVibes(posts) {
  const counts = {};
  posts.forEach(p => { if (p.vibe) counts[p.vibe] = (counts[p.vibe] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const el = document.getElementById('trending-vibes');
  if (sorted.length === 0) {
    el.innerHTML = `<p style="color:var(--ink-faint);font-size:0.85rem;">Tag a chirp with a vibe to get things started.</p>`;
    return;
  }
  el.innerHTML = sorted.map(([vibe, count]) => `
    <div class="vibe-tag-row">
      <span class="vibe-name">${escapeHtml(vibe)}</span>
      <span class="vibe-count">${count} chirp${count > 1 ? 's' : ''}</span>
    </div>`).join('');
}

// ---------- Notifications ----------
const notifPanel = document.getElementById('notifications-panel');
const notifBadge = document.getElementById('notif-badge');
const notifNavLink = document.querySelector('.nav-link[data-view="notifications"]');

function hideNotifications() {
  showingNotifications = false;
  notifPanel.classList.add('hidden');
  postsContainer.classList.remove('hidden');
  document.querySelector('.feed-tabs').classList.remove('hidden');
  notifNavLink.classList.remove('active');
}

notifNavLink.addEventListener('click', async (e) => {
  e.preventDefault();
  showingNotifications = true;
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  notifNavLink.classList.add('active');
  postsContainer.classList.add('hidden');
  document.querySelector('.feed-tabs').classList.add('hidden');
  notifPanel.classList.remove('hidden');
  notifPanel.innerHTML = 'Loading...';

  try {
    const notifs = await api('/notifications');
    notifPanel.innerHTML = notifs.length === 0
      ? `<div class="empty-state"><div class="icon">🔔</div><p>No notifications yet.</p></div>`
      : notifs.map(notifHtml).join('');
    await api('/notifications/mark-read', { method: 'PUT' });
    refreshNotifBadge();
  } catch (err) {
    notifPanel.innerHTML = `<div class="empty-state">Couldn't load notifications.</div>`;
  }
});

function notifHtml(n) {
  const icons = { like: '💗', comment: '💬', follow: '➕' };
  const verbs = { like: 'liked your chirp', comment: 'commented on your chirp', follow: 'started following you' };
  return `
    <div class="notif-row ${n.is_read ? '' : 'unread'}">
      <img src="${avatarFallback({ username: n.from_username, avatar_url: n.from_avatar_url })}" alt="" />
      <div>
        <div class="notif-text"><strong>${escapeHtml(n.from_full_name)}</strong> ${verbs[n.type] || ''}</div>
        <div class="notif-time">${timeAgo(n.created_at)} ago</div>
      </div>
    </div>`;
}

async function refreshNotifBadge() {
  try {
    const { count } = await api('/notifications/unread-count');
    if (count > 0) {
      notifBadge.textContent = count > 9 ? '9+' : count;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  } catch { /* ignore */ }
}

// ---------- Search ----------
const searchInput = document.getElementById('search-input');
const searchPanel = document.getElementById('search-results-panel');
let searchTimeout;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (!q) { searchPanel.classList.add('hidden'); return; }
  searchTimeout = setTimeout(async () => {
    try {
      const users = await api(`/users/search?q=${encodeURIComponent(q)}`);
      searchPanel.classList.remove('hidden');
      searchPanel.innerHTML = `<h3>People</h3>` + (users.length
        ? users.map(u => `
          <a href="/profile.html?u=${u.username}" class="search-result-row">
            <img src="${avatarFallback(u)}" alt="" />
            <div class="names"><strong>${escapeHtml(u.full_name)}</strong><span>@${u.username}</span></div>
          </a>`).join('')
        : `<p style="color:var(--ink-faint);font-size:0.85rem;">No one found.</p>`);
    } catch { /* ignore */ }
  }, 300);
});

// ---------- Suggestions (who to follow) ----------
async function loadSuggestions() {
  const el = document.getElementById('suggestions');
  try {
    const posts = await api('/posts/explore');
    const seen = new Map();
    posts.forEach(p => {
      if (p.user_id !== currentUser.id && !seen.has(p.user_id)) {
        seen.set(p.user_id, { id: p.user_id, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url });
      }
    });
    const candidates = Array.from(seen.values()).slice(0, 5);
    if (candidates.length === 0) {
      el.innerHTML = `<p style="color:var(--ink-faint);font-size:0.85rem;">No suggestions yet.</p>`;
      return;
    }
    el.innerHTML = candidates.map(u => `
      <div class="suggestion-row" data-username="${u.username}">
        <a href="/profile.html?u=${u.username}"><img src="${avatarFallback(u)}" alt="" /></a>
        <div class="names">
          <a href="/profile.html?u=${u.username}"><strong>${escapeHtml(u.full_name)}</strong></a>
          <span>@${u.username}</span>
        </div>
        <button class="follow-btn">Follow</button>
      </div>`).join('');
  } catch { el.innerHTML = ''; }
}

document.getElementById('suggestions').addEventListener('click', async (e) => {
  const btn = e.target.closest('.follow-btn');
  if (!btn) return;
  const row = btn.closest('.suggestion-row');
  const username = row.dataset.username;
  try {
    const { following } = await api(`/users/${username}/follow`, { method: 'POST' });
    btn.textContent = following ? 'Following' : 'Follow';
    btn.classList.toggle('following', following);
  } catch (err) { alert(err.message); }
});

// ---------- Init ----------
loadPosts();
loadSuggestions();
refreshNotifBadge();
setInterval(refreshNotifBadge, 20000);
