"""
Grandleri E-Commerce Backend v2
FastAPI · MongoDB Atlas · JWT Auth
New in v2: sign-up, search, profile edit, admin review delete, clean review replace
"""

import os
import re as _re
from datetime import datetime, timedelta, timezone
from typing import Optional, List
import bcrypt

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt as jose_jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from pymongo import MongoClient

# Create uploads dir if not exists (will fail gracefully on Vercel's read-only filesystem)
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "uploads")
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
except OSError:
    pass

load_dotenv()

MONGODB_URI: str = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "")
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

VALID_CATEGORIES = [
    "Vinyls",
    "Antique Furniture",
    "GPS Sport Watches",
    "Running Shoes",
    "Camping Tents",
]

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="Grandleri E-Commerce API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Database — module-level singleton + text index bootstrap
# ---------------------------------------------------------------------------

_mongo_client: Optional[MongoClient] = None


def get_db():
    global _mongo_client
    if _mongo_client is None:
        if not MONGODB_URI:
            raise RuntimeError("MONGODB_URI environment variable is not set.")
        _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        db = _mongo_client.get_database("ecommerce")
        # Bootstrap text index for full-text search (idempotent)
        try:
            db.items.create_index(
                [
                    ("name", "text"),
                    ("description", "text"),
                    ("seller", "text"),
                    ("category", "text"),
                ],
                name="items_text_search",
                weights={"name": 10, "category": 5, "seller": 3, "description": 1},
                default_language="english",
            )
        except Exception:
            pass  # Already exists — safe to ignore
    return _mongo_client.get_database("ecommerce")


# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(payload: dict) -> str:
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jose_jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jose_jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return _decode_token(credentials.credentials)


def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        return None
    try:
        return _decode_token(credentials.credentials)
    except HTTPException:
        return None


def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required.")
    return user


def require_regular_user(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("admin", "user"):
        raise HTTPException(status_code=403, detail="Login required.")
    return user


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def serialize(doc: dict) -> dict:
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    doc.pop("score", None)  # remove MongoDB text score
    return doc


def to_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, Exception):
        raise HTTPException(status_code=400, detail="Invalid ID format.")


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterReq(BaseModel):
    username: str
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ItemCreate(BaseModel):
    name: str
    description: str
    price: float
    currency: str = "USD"
    seller: str
    image_url: str
    category: str
    condition: str = "new"
    battery_life: Optional[str] = None
    age: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None


class ReviewRequest(BaseModel):
    rating: int
    review_text: str

class ReplyRequest(BaseModel):
    reply_text: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Routes — Health
# ---------------------------------------------------------------------------


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "grandleri-ecommerce-v2"}


# ---------------------------------------------------------------------------
# Routes — Auth
# ---------------------------------------------------------------------------


@app.post("/api/auth/login", tags=["auth"])
def login(req: LoginRequest):
    db = get_db()
    # Allow login by username or email
    user = db.users.find_one({"$or": [{"username": req.username}, {"email": req.username}]})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Hatalı e-posta veya şifre girdiniz, lütfen tekrar deneyin.")
    token = create_access_token(
        {"sub": user["username"], "role": user["role"], "user_id": str(user["_id"])}
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"],
        "user_id": str(user["_id"]),
        "profile_photo_url": user.get("profile_photo_url", "")
    }


@app.post("/api/auth/register", tags=["auth"], status_code=201)
def register(req: RegisterReq):
    db = get_db()
    if db.users.find_one({"username": req.username}):
        raise HTTPException(status_code=400, detail="Username already taken.")

    hashed_pw = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt())
    
    new_user = {
        "username": req.username,
        "email": req.email,
        "password_hash": hashed_pw.decode("utf-8"),
        "password_plain": req.password,
        "role": "user",
        "bio": "",
        "profile_photo_url": "",
        "num_ratings_given": 0,
        "avg_rating_given": 0.0,
        "reviews": [],
    }
    res = db.users.insert_one(new_user)
    
    # ── Automated Welcome Email ──
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    subject = "Welcome to GRANDELRI Premium Marketplace!"
    body = f"Hello {req.username},\n\nWelcome to GRANDELRI Premium Marketplace!\nWe are thrilled to have you join our exclusive community.\nStart exploring our curated collection of luxury items today.\n\nBest regards,\nThe GRANDELRI Team"

    if smtp_email and smtp_password:
        import smtplib
        from email.message import EmailMessage
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = f"GRANDELRI <{smtp_email}>"
        msg['To'] = req.email
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            print(f"\n[+] Real Welcome Email successfully sent to {req.email} via {smtp_server}\n")
        except Exception as e:
            print(f"\n[-] Failed to send real email to {req.email}. Error: {e}\n")
    else:
        # Fallback Simulation
        print("\n" + "="*50)
        print(f"[SIMULATED EMAIL TO]: {req.email}")
        print("="*50)
        print(f"Subject: {subject}")
        print(f"\n{body}")
        print("="*50 + "\n")
        print("[!] Note: Set SMTP_EMAIL and SMTP_PASSWORD in .env to send real emails.")

    token = create_access_token({"sub": req.username, "role": "user", "user_id": str(res.inserted_id)})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "username": req.username, 
        "user_id": str(res.inserted_id), 
        "role": "user",
        "profile_photo_url": ""
    }


@app.post("/api/auth/forgot-password", tags=["auth"])
def forgot_password(req: ForgotPasswordRequest, request: Request):
    db = get_db()
    user = db.users.find_one({"email": req.email})
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    token = create_access_token({"sub": user["username"], "purpose": "reset_password"})
    base_url = str(request.base_url).rstrip("/")
    reset_link = f"{base_url}/reset-password.html?token={token}"

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    subject = "Password Reset Request"
    body = f"Hello {user['username']},\n\nWe received a request to reset your password.\nClick the link below to set a new password:\n\n{reset_link}\n\nIf you didn't request this, you can safely ignore this email."

    if smtp_email and smtp_password:
        import smtplib
        from email.message import EmailMessage
        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = f"GRANDELRI <{smtp_email}>"
        msg['To'] = req.email
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            print(f"\n[+] Real Reset Email successfully sent to {req.email} via {smtp_server}\n")
        except Exception as e:
            print(f"\n[-] Failed to send real email to {req.email}. Error: {e}\n")
    else:
        print("\n" + "="*50)
        print(f"[SIMULATED EMAIL TO]: {req.email}")
        print("="*50)
        print(f"Subject: {subject}")
        print(f"\n{body}")
        print("="*50 + "\n")

    return {"message": "If that email is registered, a reset link has been sent."}


@app.post("/api/auth/reset-password", tags=["auth"])
def reset_password(req: ResetPasswordRequest):
    try:
        payload = _decode_token(req.token)
        if payload.get("purpose") != "reset_password":
            raise HTTPException(status_code=400, detail="Invalid token purpose.")
        username = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    db = get_db()
    user = db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    hashed_pw = bcrypt.hashpw(req.new_password.encode("utf-8"), bcrypt.gensalt())
    
    db.users.update_one(
        {"username": username},
        {"$set": {
            "password_hash": hashed_pw.decode("utf-8"),
            "password_plain": req.new_password
        }}
    )

    return {"message": "Password updated successfully."}


# ---------------------------------------------------------------------------
# Routes — Items
# ---------------------------------------------------------------------------


@app.get("/api/items/search", tags=["items"])
def search_items(q: str = Query(..., min_length=1)):
    """Regex search on items to support partial autocomplete."""
    db = get_db()
    pattern = _re.compile(_re.escape(q), _re.IGNORECASE)
    results = list(
        db.items.find(
            {"$or": [{"name": pattern}, {"category": pattern}, {"seller": pattern}]},
            {"reviews": 0},
        ).limit(12)
    )
    return [serialize(r) for r in results]


@app.get("/api/items", tags=["items"])
def list_items(category: Optional[str] = Query(None)):
    db = get_db()
    query = {}
    if category:
        if category not in VALID_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category.")
        query["category"] = category
    items = list(db.items.find(query, {"reviews": 0}))
    return [serialize(i) for i in items]


@app.get("/api/items/{item_id}", tags=["items"])
def get_item(item_id: str, user: dict = Depends(get_optional_user)):
    db = get_db()
    item = db.items.find_one({"_id": to_oid(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    
    # Filter hidden reviews for non-admins
    is_admin = user and user.get("role") == "admin"
    if not is_admin and "reviews" in item:
        item["reviews"] = [r for r in item["reviews"] if not r.get("hidden")]

    return serialize(item)


@app.post("/api/items", status_code=201, tags=["items"])
def create_item(item: ItemCreate, admin: dict = Depends(require_admin)):
    db = get_db()
    if item.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {VALID_CATEGORIES}")
    doc = {k: v for k, v in item.model_dump().items() if v is not None}
    doc["avg_rating"] = 0.0
    doc["num_ratings"] = 0
    doc["reviews"] = []
    result = db.items.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@app.delete("/api/items/{item_id}", tags=["items"])
def delete_item(item_id: str, admin: dict = Depends(require_admin)):
    db = get_db()
    oid = to_oid(item_id)
    item = db.items.find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    for review in item.get("reviews", []):
        username = review.get("username")
        if not username:
            continue
        user_doc = db.users.find_one({"username": username})
        if not user_doc:
            continue
        new_reviews = [r for r in user_doc.get("reviews", []) if r.get("item_id") != item_id]
        ratings = [r["rating"] for r in new_reviews]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        db.users.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"reviews": new_reviews, "avg_rating_given": avg, "num_ratings_given": len(new_reviews)}},
        )

    db.items.delete_one({"_id": oid})
    return {"message": "Item and associated reviews deleted successfully."}


# ---------------------------------------------------------------------------
# Routes — Reviews
# ---------------------------------------------------------------------------


@app.post("/api/items/{item_id}/reviews/{review_username}/reply", tags=["reviews"])
def submit_reply(item_id: str, review_username: str, req: ReplyRequest, user: dict = Depends(require_regular_user)):
    db = get_db()
    oid = to_oid(item_id)
    item = db.items.find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    item_reviews = item.get("reviews", [])
    review_idx = next((i for i, r in enumerate(item_reviews) if r.get("username") == review_username), None)
    
    if review_idx is None:
        raise HTTPException(status_code=404, detail="Review not found.")

    replies = item_reviews[review_idx].get("replies", [])
    
    # Check if this user's profile photo exists
    user_doc = db.users.find_one({"username": user["sub"]})
    photo_url = user_doc.get("profile_photo_url", "") if user_doc else ""

    new_reply = {
        "username": user["sub"],
        "reply_text": req.reply_text,
        "profile_photo_url": photo_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    replies.append(new_reply)
    item_reviews[review_idx]["replies"] = replies

    db.items.update_one({"_id": oid}, {"$set": {"reviews": item_reviews}})
    return {"message": "Reply added successfully."}


@app.post("/api/items/{item_id}/review", tags=["reviews"])
def submit_review(item_id: str, req: ReviewRequest, user: dict = Depends(require_regular_user)):
    if not (1 <= req.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    db = get_db()
    oid = to_oid(item_id)
    item = db.items.find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    username = user["sub"]
    user_id = user["user_id"]
    item_reviews: list = item.get("reviews", [])

    existing_idx = next(
        (i for i, r in enumerate(item_reviews) if r.get("username") == username), None
    )

    if existing_idx is not None:
        # REPLACE review entirely (no "Edit:" prefix — clean replace per user request)
        item_reviews[existing_idx] = {
            **item_reviews[existing_idx],
            "rating": req.rating,
            "review_text": req.review_text,
            "updated": True,
        }
        action = "updated"
    else:
        item_reviews.append(
            {
                "user_id": user_id,
                "username": username,
                "rating": req.rating,
                "review_text": req.review_text,
                "updated": False,
                "hidden": False,
            }
        )
        action = "added"

    ratings = [r["rating"] for r in item_reviews]
    new_avg = round(sum(ratings) / len(ratings), 2)

    db.items.update_one(
        {"_id": oid},
        {"$set": {"reviews": item_reviews, "avg_rating": new_avg, "num_ratings": len(item_reviews)}},
    )

    # Sync user record
    user_doc = db.users.find_one({"_id": ObjectId(user_id)})
    user_reviews: list = user_doc.get("reviews", [])
    user_idx = next((i for i, r in enumerate(user_reviews) if r.get("item_id") == item_id), None)

    if user_idx is not None:
        user_reviews[user_idx] = {
            "item_id": item_id,
            "item_name": item["name"],
            "rating": req.rating,
            "review_text": req.review_text,
        }
    else:
        user_reviews.append(
            {"item_id": item_id, "item_name": item["name"], "rating": req.rating, "review_text": req.review_text}
        )

    user_ratings = [r["rating"] for r in user_reviews]
    user_avg = round(sum(user_ratings) / len(user_ratings), 2) if user_ratings else 0.0

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"reviews": user_reviews, "avg_rating_given": user_avg, "num_ratings_given": len(user_reviews)}},
    )

    return {"message": f"Review {action} successfully.", "avg_rating": new_avg}


@app.delete("/api/items/{item_id}/reviews/{username}", tags=["reviews"])
def delete_review(item_id: str, username: str, admin: dict = Depends(require_admin)):
    """Admin-only: permanently delete a specific user's review from an item."""
    db = get_db()
    oid = to_oid(item_id)
    item = db.items.find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    original_reviews = item.get("reviews", [])
    new_reviews = [r for r in original_reviews if r.get("username") != username]

    if len(new_reviews) == len(original_reviews):
        raise HTTPException(status_code=404, detail="Review by that user not found.")

    ratings = [r["rating"] for r in new_reviews]
    new_avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

    db.items.update_one(
        {"_id": oid},
        {"$set": {"reviews": new_reviews, "avg_rating": new_avg, "num_ratings": len(new_reviews)}},
    )

    # Remove from the user's own record
    user_doc = db.users.find_one({"username": username})
    if user_doc:
        user_reviews = [r for r in user_doc.get("reviews", []) if r.get("item_id") != item_id]
        user_ratings = [r["rating"] for r in user_reviews]
        user_avg = round(sum(user_ratings) / len(user_ratings), 2) if user_ratings else 0.0
        db.users.update_one(
            {"username": username},
            {"$set": {"reviews": user_reviews, "avg_rating_given": user_avg, "num_ratings_given": len(user_reviews)}},
        )

    return {"message": f"Review by '{username}' deleted.", "avg_rating": new_avg}


@app.patch("/api/items/{item_id}/reviews/{username}/visibility", tags=["reviews"])
def toggle_review_visibility(item_id: str, username: str, admin: dict = Depends(require_admin)):
    """Admin-only: toggle the hidden status of a review."""
    db = get_db()
    oid = to_oid(item_id)
    item = db.items.find_one({"_id": oid})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    reviews = item.get("reviews", [])
    review = next((r for r in reviews if r.get("username") == username), None)
    if not review:
        raise HTTPException(status_code=404, detail="Review by that user not found.")

    new_hidden_state = not review.get("hidden", False)
    review["hidden"] = new_hidden_state

    # Re-calculate avg rating ONLY considering non-hidden reviews?
    # Usually hidden reviews shouldn't count towards the average.
    visible_reviews = [r for r in reviews if not r.get("hidden", False)]
    ratings = [r["rating"] for r in visible_reviews]
    new_avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

    db.items.update_one(
        {"_id": oid},
        {"$set": {"reviews": reviews, "avg_rating": new_avg, "num_ratings": len(visible_reviews)}},
    )

    return {"message": f"Review visibility set to {'hidden' if new_hidden_state else 'visible'}.", "hidden": new_hidden_state, "avg_rating": new_avg}


# ---------------------------------------------------------------------------
# Routes — Users
# ---------------------------------------------------------------------------


@app.get("/api/users/me", tags=["users"])
def get_my_profile(user: dict = Depends(get_current_user)):
    db = get_db()
    user_doc = db.users.find_one({"_id": ObjectId(user["user_id"])})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")
    doc = serialize(user_doc)
    doc.pop("password_hash", None)
    return doc


@app.put("/api/users/me", tags=["users"])
def update_my_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    db = get_db()
    oid = ObjectId(user["user_id"])
    update_fields = {}
    if req.display_name is not None:
        update_fields["display_name"] = req.display_name.strip()
    if req.bio is not None:
        update_fields["bio"] = req.bio.strip()
    if req.profile_photo_url is not None:
        update_fields["profile_photo_url"] = req.profile_photo_url.strip()

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update.")

    db.users.update_one({"_id": oid}, {"$set": update_fields})
    return {"message": "Profile updated."}


@app.post("/api/users/me/photo", tags=["users"])
def upload_profile_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a local profile photo."""
    db = get_db()
    oid = ObjectId(user["user_id"])
    
    # Save file
    timestamp = int(datetime.utcnow().timestamp())
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"user_{user['sub']}_{timestamp}.{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(file.file.read())
        
    photo_url = f"/uploads/{filename}"
    
    db.users.update_one({"_id": oid}, {"$set": {"profile_photo_url": photo_url}})
    return {"message": "Photo uploaded.", "profile_photo_url": photo_url}


@app.get("/api/users", tags=["users"])
def list_users(admin: dict = Depends(require_admin)):
    db = get_db()
    # We allow the admin to see email and password hash
    users = list(db.users.find({}, {"reviews": 0}))
    return [serialize(u) for u in users]


@app.post("/api/users", status_code=201, tags=["users"])
def create_user(req: UserCreate, admin: dict = Depends(require_admin)):
    db = get_db()
    if req.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'.")
    if db.users.find_one({"username": req.username}):
        raise HTTPException(status_code=409, detail="Username already exists.")
    doc = {
        "username": req.username,
        "password_hash": hash_password(req.password),
        "role": req.role,
        "display_name": req.username,
        "bio": "",
        "profile_photo_url": "",
        "avg_rating_given": 0.0,
        "num_ratings_given": 0,
        "reviews": [],
    }
    result = db.users.insert_one(doc)
    return {"user_id": str(result.inserted_id), "username": req.username, "role": req.role}


@app.delete("/api/users/{user_id}", tags=["users"])
def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    db = get_db()
    oid = to_oid(user_id)
    user_doc = db.users.find_one({"_id": oid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")
    if user_doc.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete the admin account.")

    username = user_doc["username"]
    for item in list(db.items.find({"reviews.username": username})):
        updated = [r for r in item.get("reviews", []) if r.get("username") != username]
        ratings = [r["rating"] for r in updated]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        db.items.update_one(
            {"_id": item["_id"]},
            {"$set": {"reviews": updated, "avg_rating": avg, "num_ratings": len(updated)}},
        )

    db.users.delete_one({"_id": oid})
    return {"message": f"User '{username}' deleted."}
