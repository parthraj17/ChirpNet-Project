-- ============================================
-- ChirpNet Database Schema (PostgreSQL)
-- ============================================
-- Run this once against your "chirpnet" database:
--   psql -U postgres -d chirpnet -f database/schema.sql
-- ============================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- USERS
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(30) UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    bio           VARCHAR(280) DEFAULT '',
    avatar_url    TEXT DEFAULT '',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- POSTS ("chirps")
CREATE TABLE posts (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     VARCHAR(500) NOT NULL,
    image_url   TEXT DEFAULT NULL,
    vibe        VARCHAR(20) DEFAULT NULL, -- ChirpNet's unique twist: mood tag e.g. 'excited','thoughtful','funny'
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- FOLLOWS (self-referencing many-to-many)
CREATE TABLE follows (
    id            SERIAL PRIMARY KEY,
    follower_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

-- LIKES
CREATE TABLE likes (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

-- COMMENTS
CREATE TABLE comments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     VARCHAR(300) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who receives it
    from_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who triggered it
    type          VARCHAR(20) NOT NULL, -- 'like', 'comment', 'follow'
    post_id       INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
