requireAuth();

const currentUser = getStoredUser();
const params = new URLSearchParams(window.location.search);
const targetUsername = params.get('u') || currentUser.username;

document.getElementById('chip-avatar').src = avatarFallback(currentUser);
document.getElementById('chip-name').textContent = currentUser.full_name;
document.getElementById('chip-username').textContent = '@' + currentUser.username;
document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession();
  window.location.href = '/index.html';
});

const headerEl = document.getElementById('profile-header');
const postsEl = document.getElementById('profile-posts');

function postCardHtml(post, isOwner) {
  return `
  <div class="panel post-card" data-post-id="${post.id}">
    <img class="avatar" src="${avatarFallback({ username: post.username, avatar_url: post.avatar_url })}" alt="" />
    <div class="post-body">
      <div class="post-head">
        <strong>${escapeHtml(post.full_name)}</strong>
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
    </div>
  </div>`;
}

async function loadProfile() {
  try {
    const profile = await api(`/users/${targetUsername}`);

    headerEl.querySelector('.profile-info').innerHTML = `
      <img class="avatar-lg" src="${avatarFallback(profile)}" alt="" />
      <h2>${escapeHtml(profile.full_name)}</h2>
      <div class="username">@${profile.username}</div>
      ${profile.bio ? `<div class="bio">${escapeHtml(profile.bio)}</div>` : ''}
      <div class="profile-stats">
        <div><strong>${profile.postCount}</strong> <span>Chirps</span></div>
        <div><strong>${profile.followerCount}</strong> <span>Followers</span></div>
        <div><strong>${profile.followingCount}</strong> <span>Following</span></div>
      </div>
      <div class="profile-actions">
        ${profile.isSelf
          ? `<button class="btn-outline" id="edit-profile-btn">Edit profile</button>`
          : `<button class="btn-outline ${profile.isFollowing ? 'following' : ''}" id="follow-btn">${profile.isFollowing ? 'Following' : 'Follow'}</button>`}
      </div>
    `;

    if (profile.isSelf) {
      document.getElementById('edit-profile-btn').addEventListener('click', () => openEditModal(profile));
    } else {
      document.getElementById('follow-btn').addEventListener('click', async (e) => {
        const btn = e.target;
        try {
          const { following } = await api(`/users/${profile.username}/follow`, { method: 'POST' });
          btn.textContent = following ? 'Following' : 'Follow';
          btn.classList.toggle('following', following);
        } catch (err) { alert(err.message); }
      });
    }

    loadPosts(profile.isSelf);
    loadFollowLists();
  } catch (err) {
    headerEl.querySelector('.profile-info').innerHTML = `<p>Couldn't load this profile: ${escapeHtml(err.message)}</p>`;
  }
}

async function loadPosts(isSelf) {
  postsEl.innerHTML = `<div class="empty-state">Loading chirps...</div>`;
  try {
    const posts = await api(`/posts/user/${targetUsername}`);
    postsEl.innerHTML = posts.length
      ? posts.map(p => postCardHtml(p, isSelf)).join('')
      : `<div class="panel empty-state"><div class="icon">🪺</div><p>No chirps yet.</p></div>`;
  } catch {
    postsEl.innerHTML = `<div class="panel empty-state">Couldn't load chirps.</div>`;
  }
}

postsEl.addEventListener('click', async (e) => {
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
  }

  if (e.target.closest('.delete')) {
    if (!confirm('Delete this chirp?')) return;
    try {
      await api(`/posts/${postId}`, { method: 'DELETE' });
      card.remove();
    } catch (err) { alert(err.message); }
  }
});

async function loadFollowLists() {
  try {
    const [followers, following] = await Promise.all([
      api(`/users/${targetUsername}/followers`),
      api(`/users/${targetUsername}/following`),
    ]);
    document.getElementById('followers-list').innerHTML = followers.length
      ? followers.map(userRowHtml).join('')
      : `<p style="color:var(--ink-faint);font-size:0.85rem;">No followers yet.</p>`;
    document.getElementById('following-list').innerHTML = following.length
      ? following.map(userRowHtml).join('')
      : `<p style="color:var(--ink-faint);font-size:0.85rem;">Not following anyone yet.</p>`;
  } catch { /* ignore */ }
}

function userRowHtml(u) {
  return `
    <a href="/profile.html?u=${u.username}" class="search-result-row">
      <img src="${avatarFallback(u)}" alt="" />
      <div class="names"><strong>${escapeHtml(u.full_name)}</strong><span>@${u.username}</span></div>
    </a>`;
}

// ---------- Edit profile modal ----------
const modalBackdrop = document.getElementById('edit-modal-backdrop');

function openEditModal(profile) {
  document.getElementById('edit-fullname').value = profile.full_name || '';
  document.getElementById('edit-avatar').value = profile.avatar_url || '';
  document.getElementById('edit-bio').value = profile.bio || '';
  modalBackdrop.classList.remove('hidden');
}

document.getElementById('edit-cancel').addEventListener('click', () => modalBackdrop.classList.add('hidden'));

document.getElementById('edit-save').addEventListener('click', async () => {
  const fullName = document.getElementById('edit-fullname').value.trim();
  const avatarUrl = document.getElementById('edit-avatar').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  try {
    const updated = await api('/users/me', { method: 'PUT', body: { fullName, avatarUrl, bio } });
    saveSession(getToken(), updated);
    modalBackdrop.classList.add('hidden');
    loadProfile();
  } catch (err) {
    alert(err.message);
  }
});

loadProfile();
