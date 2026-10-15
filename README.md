# ChirpNet — Your Space to Share & Connect 🐦

A full-stack social media app built with:

- **Frontend:** HTML, CSS, vanilla JavaScript (no framework, no build step)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT (JSON Web Tokens) + bcrypt password hashing

Everything lives in **one folder** and the Express server serves the frontend directly, so you only ever run **one command** to start the whole app.

## Features

- Email/username + password authentication (register & login), passwords hashed with bcrypt
- Create posts ("chirps") up to 500 characters, optional image URL
- **Vibe tags** — tag a chirp with a mood (excited, thoughtful, funny, curious, grateful) — ChirpNet's own twist, with a live "Trending vibes" panel
- Like / unlike posts
- Comment on posts
- Follow / unfollow users
- Two feeds: **Following** (people you follow) and **Explore** (everyone)
- User profiles: bio, avatar, followers/following counts, edit-profile modal
- Follower / following lists
- Search for people by name/username
- "Who to follow" suggestions
- In-app notifications (likes, comments, follows) with an unread badge
- Delete your own posts and comments
- Fully responsive layout (sidebar collapses on mobile)

## Folder structure

```
ChirpNet/
├── server.js                 # Express app entry point
├── package.json
├── .env.example               # copy to .env and fill in your values
├── config/
│   └── db.js                  # PostgreSQL connection pool
├── middleware/
│   └── authMiddleware.js      # JWT verification
├── routes/
│   ├── authRoutes.js          # /api/auth (register, login)
│   ├── userRoutes.js          # /api/users (profile, follow, search)
│   ├── postRoutes.js          # /api/posts (feed, explore, CRUD)
│   ├── likeRoutes.js          # /api/likes
│   ├── commentRoutes.js       # /api/comments
│   └── notificationRoutes.js  # /api/notifications
├── database/
│   └── schema.sql             # run this once to create all tables
└── public/                    # the frontend (served as static files)
    ├── index.html              # login / register page
    ├── feed.html                # main feed
    ├── profile.html              # profile page
    ├── css/style.css
    └── js/
        ├── api.js               # shared fetch helper
        ├── auth.js               # login/register logic
        ├── feed.js                 # feed page logic
        └── profile.js               # profile page logic
```

## Prerequisites

Install these on your laptop first:

1. **Node.js** (v18 or newer) — [nodejs.org](https://nodejs.org)
   Check with: `node -v`
2. **PostgreSQL** (v14 or newer) — [postgresql.org/download](https://www.postgresql.org/download/)
   Check with: `psql --version`

## Step-by-step setup

### 1. Get the project onto your machine
Download/copy the whole `ChirpNet` folder to your laptop and open a terminal inside it.

```bash
cd ChirpNet
```

### 2. Install backend dependencies
```bash
npm install
```
This installs Express, pg, bcryptjs, jsonwebtoken, cors, dotenv (and nodemon for development).

### 3. Create the PostgreSQL database
Open a terminal and log into PostgreSQL:
```bash
psql -U postgres
```
Then, inside the `psql` prompt, create the database:
```sql
CREATE DATABASE chirpnet;
\q
```

### 4. Create the database tables
Run the schema file against your new database (from the `ChirpNet` folder, in your normal terminal, not inside `psql`):
```bash
psql -U postgres -d chirpnet -f database/schema.sql
```
This creates the `users`, `posts`, `follows`, `likes`, `comments`, and `notifications` tables.

### 5. Configure environment variables
Copy the example file:
```bash
cp .env.example .env
```
Open `.env` in a text editor and fill in your real PostgreSQL password and a random JWT secret:
```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=chirpnet
DB_PASSWORD=your_actual_postgres_password
DB_PORT=5432

JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=7d

PORT=5000
```
> Tip: for `JWT_SECRET` you can generate a random string with:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 6. Start the server
For normal use:
```bash
npm start
```
Or, for development (auto-restarts on file changes):
```bash
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database: chirpnet
🐦 ChirpNet server running at http://localhost:5000
```

### 7. Open the app
Go to **http://localhost:5000** in your browser. You'll land on the login/register page. Click "Create an account" to sign up, then you'll be taken straight into your feed.

Open the same URL in a second browser (or an incognito window) to create a second account and test following, liking, and commenting between two users.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` connecting to Postgres | Make sure the PostgreSQL service is running (`pg_ctl status` or check Services on Windows / `brew services list` on Mac). |
| `password authentication failed for user "postgres"` | Double-check `DB_PASSWORD` in `.env` matches your actual Postgres password. |
| `relation "users" does not exist` | You skipped step 4 — run the `schema.sql` file against the `chirpnet` database. |
| Port 5000 already in use | Change `PORT` in `.env` to something else, e.g. `5050`, and restart. |
| Blank page / styles missing | Make sure you're loading `http://localhost:5000` (served by Express), not opening `index.html` directly as a file. |

## Notes on scope & possible next steps

This is a solid, working core of a social platform. Things you could add next if you want to keep building:
- Image uploads (currently posts accept an image **URL**, not a file upload — adding real uploads would need something like `multer` + cloud storage)
- Real-time updates via WebSockets (right now notifications refresh every 20 seconds via polling)
- Direct messages between users
- Reposting / quote-chirps
- Password reset via email
- Pagination / infinite scroll (feeds currently cap at 50 posts)

Enjoy building on ChirpNet! 🐦
