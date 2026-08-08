# Bazaar — E-Commerce Web Application

> **METU CENG 495 · Cloud Computing · Take Home Exam 1 (Ver. 1.0)**

---

## 🌐 Live Deployment URL

> *(Add your Vercel URL here after deployment — e.g. `https://bazaar-ceng495.vercel.app`)*

---

## 🔑 Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@2026` |
| Regular User | `alice_k` | `User@2026` |
| Regular User | `bob_m` | `User@2026` |
| Regular User | `charlie_r` | `User@2026` |

---

## 📐 Application Architecture

```
Browser (HTML / CSS / Vanilla JS)
          │
          │  REST API calls (fetch)
          ▼
Vercel Serverless Functions
  └── api/index.py  ← FastAPI application
          │
          │  PyMongo (connection pooling)
          ▼
  MongoDB Atlas (Cluster0, ecommerce DB)
        ├── items       collection
        └── users       collection
```

### Why this architecture?
- **FastAPI** was chosen for its modern async support, automatic OpenAPI documentation, clean type-based routing via Pydantic, and native Vercel serverless compatibility via `@vercel/python`.
- **PyMongo** (synchronous) is used instead of Motor (async) because Vercel serverless functions are stateless and short-lived — synchronous I/O is simpler and sufficient at this scale.
- **JWT** (python-jose + bcrypt) provides stateless authentication that works perfectly in serverless environments where sessions cannot be maintained between requests.
- **Vanilla HTML/CSS/JS** for the frontend avoids any build step, making deployment trivially simple.

### MongoDB Design Decision — Minimal Collections
The specification requires taking advantage of NoSQL flexibility with the **fewest collections possible**. This project uses exactly **2 collections**:

1. **`items`** — contains embedded review documents, avg_rating, and category-specific optional fields (battery_life, age, size, material). NoSQL's flexible schema is exploited here — a GPS Watch document has `battery_life`, while a Vinyl has `age` and neither field appears in other categories.

2. **`users`** — contains the user's profile including a denormalized copy of all their reviews with `item_id` and `item_name` references. This allows the profile page to render without a JOIN, at the cost of controlled data duplication (which the delete endpoints keep in sync).

---

## 📂 Folder Structure

```
website_project/
├── api/
│   └── index.py          # FastAPI backend (all endpoints)
├── public/
│   ├── index.html         # Home page — product grid + filtering
│   ├── item.html          # Product detail + rating & review
│   ├── profile.html       # Authenticated user profile
│   ├── admin.html         # Admin CRUD panel
│   ├── css/
│   │   └── style.css      # Global design system
│   └── js/
│       ├── app.js         # Shared: API client, auth, toasts, stars
│       ├── index.js       # Home page logic
│       ├── item.js        # Item detail + review logic
│       ├── profile.js     # Profile page logic
│       └── admin.js       # Admin panel logic
├── requirements.txt       # Python dependencies
├── vercel.json            # Vercel routing config
├── seed.py                # Initial DB population script
├── .env                   # (LOCAL ONLY — not committed)
├── .gitignore
└── README.md
```

---

## 🚀 How to Use the Application

### As an Anonymous Visitor
- Browse all products on the home page.
- Click any category tab to filter products.
- Click **"View Details"** on any product card to see full item info and reviews.
- You **cannot** rate or review items without signing in.

### As a Regular User (`alice_k`, `bob_m`, `charlie_r`)
1. Click **"Sign In"** on the navigation bar.
2. Enter your username and password.
3. Browse products and click **"View Details"** to open an item.
4. Select a star rating (1–5) and write a review.
5. Click **"Submit Review"** — the average rating updates instantly.
6. To **update** a review: submit again. Your new text is appended with `"Edit:"` prefix as required.
7. Click **"Profile"** in the navbar to see your average rating and all your reviews.

### As Admin (`admin`)
1. Log in with admin credentials.
2. You are redirected to the **Admin Panel** automatically from the navbar.
3. **Add Item**: Fill in the form. Category-specific fields (battery life, age, size, material) appear automatically based on the selected category.
4. **Delete Item**: Click 🗑 Delete in the items table — all associated reviews and user records are updated.
5. **Add User**: Fill the username, password, and role.
6. **Delete User**: Click 🗑 Delete in the users table — their reviews are removed from all items and averages are recalculated.

---

## 🛠️ Local Development

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Ensure .env file has correct MONGODB_URI and JWT_SECRET_KEY

# 3. Populate the database (run once)
python seed.py

# 4. Start the development server
uvicorn api.index:app --reload --port 8000

# 5. Open http://localhost:8000/api/docs for Swagger UI
#    Open public/index.html directly in browser OR serve with:
#    python -m http.server 3000 --directory public
#    Then point API calls to localhost:8000
```

> **Note for local dev:** The static frontend uses relative `/api/` paths. To avoid CORS issues locally, either use the Vercel CLI (`vercel dev`) or temporarily change `API_BASE` in `public/js/app.js` to `http://localhost:8000/api`.

---

## ☁️ Deployment to Vercel

1. Push this repo to a **private GitHub repository** (excluding `.env`).
2. Log in to [Vercel](https://vercel.com) and **import** the GitHub repository.
3. In **Settings → Environment Variables**, add:
   - `MONGODB_URI` = `mongodb+srv://...` (from your `.env`)
   - `JWT_SECRET_KEY` = `ceng495-ecommerce-2026-9xK7mP2vL8nR4qT3wZb` (or generate your own)
4. Click **Deploy**. Vercel uses `vercel.json` to route `/api/*` to FastAPI and all other paths to `public/`.
5. After deployment, run `python seed.py` to populate the production database (it reads from `.env` locally and writes to Atlas).

---

## 📦 Tech Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend | Python 3.12 + FastAPI | Modern, fast, Vercel Serverless compatible |
| Database Driver | PyMongo | Simple, synchronous, great Atlas support |
| Auth | JWT (python-jose) + bcrypt | Stateless — works perfectly in serverless |
| Env Config | python-dotenv | Secure credential loading from `.env` |
| Frontend | Vanilla HTML/CSS/JS | Zero build step, instant deployment |
| Hosting | Vercel | Free tier, global CDN, Python support |
| Database | MongoDB Atlas | Free tier, managed NoSQL, flexible schema |
