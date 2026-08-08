"""
seed.py — Populate MongoDB Atlas with initial data.

Run ONCE before or after deployment:
    python seed.py

Creates:
  - 1 admin user
  - 3 regular users
  - 8 items (at least 1 per required category)
  - Each user rates and reviews every item
"""

# -*- coding: utf-8 -*-
import os
import sys
import io
from dotenv import load_dotenv
from pymongo import MongoClient
from passlib.context import CryptContext

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    print("ERROR: MONGODB_URI not found in .env file.")
    sys.exit(1)

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


def hp(password: str) -> str:
    return pwd_context.hash(password)


# ── Users ──────────────────────────────────────────────────────
USERS = [
    {
        "username": "admin",
        "password_hash": hp("Admin@2026"),
        "role": "admin",
        "avg_rating_given": 0.0,
        "num_ratings_given": 0,
        "reviews": [],
    },
    {
        "username": "alice_k",
        "password_hash": hp("User@2026"),
        "role": "user",
        "avg_rating_given": 0.0,
        "num_ratings_given": 0,
        "reviews": [],
    },
    {
        "username": "bob_m",
        "password_hash": hp("User@2026"),
        "role": "user",
        "avg_rating_given": 0.0,
        "num_ratings_given": 0,
        "reviews": [],
    },
    {
        "username": "charlie_r",
        "password_hash": hp("User@2026"),
        "role": "user",
        "avg_rating_given": 0.0,
        "num_ratings_given": 0,
        "reviews": [],
    },
]

# ── Items (8 items, 1+ per required category) ──────────────────
ITEMS_SEED = [
    # ── Vinyls (2) ────────────────────────────────────────────
    {
        "name": "The Dark Side of the Moon — Pink Floyd",
        "description": "An iconic progressive rock masterpiece originally released in 1973. This original UK pressing is in excellent condition with minimal surface noise. Complete with original poster and stickers.",
        "price": 149.99,
        "currency": "USD",
        "seller": "Vinyl Vault Records",
        "image_url": "https://images.unsplash.com/photo-1619983081563-430f63602796?w=600&q=80",
        "category": "Vinyls",
        "condition": "used",
        "age": "1973",
    },
    {
        "name": "Thriller — Michael Jackson (2023 Reissue)",
        "description": "The best-selling album of all time, now reissued on 180g audiophile vinyl. Remastered from the original tapes at Bernie Grundman Mastering. Features all 9 original tracks.",
        "price": 39.99,
        "currency": "USD",
        "seller": "Groove Central",
        "image_url": "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&q=80",
        "category": "Vinyls",
        "condition": "new",
        "age": "1982",
    },
    # ── Antique Furniture (2) ─────────────────────────────────
    {
        "name": "Victorian Mahogany Chesterfield Armchair",
        "description": "An exquisite late Victorian armchair with deep button-tufted leather upholstery and carved mahogany cabriole legs. Recently professionally restored. Original springs intact.",
        "price": 1299.99,
        "currency": "USD",
        "seller": "Heritage Antiques London",
        "image_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
        "category": "Antique Furniture",
        "condition": "used",
        "age": "1885",
        "material": "Mahogany",
    },
    {
        "name": "French Art Deco Oak Dining Table",
        "description": "Stunning Art Deco dining table with geometric inlay work and original finish. Seats 6-8 comfortably. Minor patina consistent with age adds to its character.",
        "price": 2199.99,
        "currency": "USD",
        "seller": "Galerie Meubles Anciens",
        "image_url": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
        "category": "Antique Furniture",
        "condition": "used",
        "age": "1928",
        "material": "Oak",
    },
    # ── GPS Sport Watches (2) ─────────────────────────────────
    {
        "name": "Garmin Fenix 7X Pro Solar",
        "description": "The ultimate multisport GPS smartwatch. Solar charging extends battery life to an incredible 28 days in smartwatch mode. Built-in topographic maps, heart rate, blood oxygen, and advanced training metrics.",
        "price": 799.99,
        "currency": "USD",
        "seller": "TechSport Pro",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
        "category": "GPS Sport Watches",
        "condition": "new",
        "battery_life": "28 days (smartwatch), 89 hours (GPS mode)",
    },
    {
        "name": "Suunto Vertical Titanium Arctic",
        "description": "Designed for outdoor explorers and endurance athletes. Boasts an impressive 60-hour GPS battery life and solar charging. Sapphire crystal, titanium bezel, 100m water resistance.",
        "price": 529.99,
        "currency": "USD",
        "seller": "Nordic Sports Equipment",
        "image_url": "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600&q=80",
        "category": "GPS Sport Watches",
        "condition": "new",
        "battery_life": "60 hours (tour mode), 14 days (smartwatch)",
    },
    # ── Running Shoes (1) ─────────────────────────────────────
    {
        "name": "Nike Air Zoom Pegasus 41",
        "description": "The go-to daily trainer for millions of runners worldwide. Updated with a wider toe box for more natural foot splay and a redesigned Air Zoom unit for snappier energy return.",
        "price": 139.99,
        "currency": "USD",
        "seller": "Runner's World Shop",
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
        "category": "Running Shoes",
        "condition": "new",
        "size": "EU 36–49 / US 4–15",
        "material": "Engineered Mesh upper, Rubber outsole",
    },
    # ── Camping Tents (1) ─────────────────────────────────────
    {
        "name": "MSR Hubba Hubba Bikepack 2-Person Tent",
        "description": "Award-winning ultralight 2-person backpacking tent. At just 1.36 kg, it's the perfect shelter for thru-hikers and bike-packers. Dual-door, dual-vestibule design maximizes interior space.",
        "price": 549.99,
        "currency": "USD",
        "seller": "Mountain Supply Co.",
        "image_url": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80",
        "category": "Camping Tents",
        "condition": "new",
    },
]

# ── Reviews from regular users ─────────────────────────────────
REVIEWS_BY_USER = {
    "alice_k": [
        {"idx": 0, "rating": 5, "text": "Absolutely stunning condition for a 50-year-old record. The music sounds incredible on my turntable."},
        {"idx": 1, "rating": 4, "text": "Great reissue, warm sound. Packaging could be better but the vinyl itself is flawless."},
        {"idx": 2, "rating": 5, "text": "Unbelievable craftsmanship. This chair is the centerpiece of my living room now."},
        {"idx": 3, "rating": 4, "text": "Beautiful table, exactly as described. Delivery took a while but worth the wait."},
        {"idx": 4, "rating": 5, "text": "Best GPS watch I've ever owned. The solar charging is a game changer for long hikes."},
        {"idx": 5, "rating": 4, "text": "Excellent battery life and maps. The titanium bezel feels incredibly premium."},
        {"idx": 6, "rating": 5, "text": "My new favourite daily trainer. The wider toe box is a huge improvement over previous versions."},
        {"idx": 7, "rating": 5, "text": "Set up in under 10 minutes on my last bikepacking trip. Incredibly lightweight."},
    ],
    "bob_m": [
        {"idx": 0, "rating": 4, "text": "A must-have for any serious vinyl collector. The sleeve has some age-related wear but the record is mint."},
        {"idx": 1, "rating": 5, "text": "Pristine pressing, no warps or crackles. MJ at his peak. Highly recommend!"},
        {"idx": 2, "rating": 4, "text": "Very comfortable and well-made. The leather is soft and the woodwork is exceptional."},
        {"idx": 3, "rating": 5, "text": "I measured every detail against auction catalogues — this is the real deal, authentically 1928."},
        {"idx": 4, "rating": 4, "text": "Feature-packed and durable. Slightly complex UI to learn but once you do it's great."},
        {"idx": 5, "rating": 5, "text": "Used it on a 3-day mountain trail without charging once. Absolutely love the solar panel."},
        {"idx": 6, "rating": 4, "text": "Very comfortable for long runs. True to size. Cushioning is spot on."},
        {"idx": 7, "rating": 4, "text": "Solid tent. Survived a rainy night without any leaks. Setup instructions could be clearer."},
    ],
    "charlie_r": [
        {"idx": 0, "rating": 5, "text": "The holy grail of rock vinyl. I've been searching for an original pressing for years. Mint!"},
        {"idx": 1, "rating": 3, "text": "Decent quality reissue but I've heard better masterings. Still enjoyable for casual listening."},
        {"idx": 2, "rating": 5, "text": "Restored to perfection. The carving detail on the legs is breathtaking. Museum quality!"},
        {"idx": 3, "rating": 4, "text": "Gorgeous piece. I refinished the top slightly and it now looks brand new. Highly recommended."},
        {"idx": 4, "rating": 5, "text": "Worth every penny. Replaced my old running watch and this is on another level entirely."},
        {"idx": 5, "rating": 4, "text": "Superb for trail running and cycling. Accurate GPS lock and heart rate tracking."},
        {"idx": 6, "rating": 5, "text": "These shoes are so light! PR'd my last half marathon in them. Incredible energy return."},
        {"idx": 7, "rating": 5, "text": "The roomiest 2-person ultralight tent I've tested. Inner pocket placement is thoughtful."},
    ],
}


def main():
    print("Connecting to MongoDB Atlas...")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)

    # Test connection
    client.admin.command("ping")
    print("[OK] Connected successfully.")

    db = client.get_database("ecommerce")

    # ── Clear existing data ──────────────────────────────────
    print("\nClearing existing data...")
    db.users.drop()
    db.items.drop()
    print("   Cleared 'users' and 'items' collections.")

    # ── Insert users ─────────────────────────────────────────
    print("\nInserting users...")
    result = db.users.insert_many(USERS)
    user_ids = {USERS[i]["username"]: str(result.inserted_ids[i]) for i in range(len(USERS))}
    print(f"   Inserted {len(USERS)} users: {list(user_ids.keys())}")

    # ── Insert items (without reviews first) ─────────────────
    print("\nInserting items...")
    items_to_insert = []
    for item_data in ITEMS_SEED:
        doc = item_data.copy()
        doc["avg_rating"] = 0.0
        doc["num_ratings"] = 0
        doc["reviews"] = []
        items_to_insert.append(doc)

    result = db.items.insert_many(items_to_insert)
    item_ids = [str(iid) for iid in result.inserted_ids]
    print(f"   Inserted {len(item_ids)} items.")

    # ── Add reviews ───────────────────────────────────────────
    print("\nAdding reviews...")
    regular_users = [u for u in USERS if u["role"] == "user"]

    for user_data in regular_users:
        username = user_data["username"]
        user_reviews_seed = REVIEWS_BY_USER.get(username, [])
        user_review_records = []

        for rev in user_reviews_seed:
            item_idx = rev["idx"]
            item_id  = item_ids[item_idx]
            item_doc = db.items.find_one({"_id": result.inserted_ids[item_idx]}) or \
                       db.items.find_one({"_id": __import__('bson').ObjectId(item_id)})

            review_entry = {
                "user_id":     user_ids[username],
                "username":    username,
                "rating":      rev["rating"],
                "review_text": rev["text"],
                "updated":     False,
            }

            # Append to item's reviews
            db.items.update_one(
                {"_id": __import__('bson').ObjectId(item_id)},
                {"$push": {"reviews": review_entry}},
            )

            user_review_records.append({
                "item_id":     item_id,
                "item_name":   ITEMS_SEED[item_idx]["name"],
                "rating":      rev["rating"],
                "review_text": rev["text"],
            })

        # Recalculate each item's avg_rating after all reviews
        # (done below after all users)

        # Update user record
        ratings = [r["rating"] for r in user_review_records]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        db.users.update_one(
            {"username": username},
            {"$set": {
                "reviews":          user_review_records,
                "avg_rating_given": avg,
                "num_ratings_given":len(user_review_records),
            }},
        )
        print(f"   Added {len(user_review_records)} reviews for '{username}' (avg given: {avg})")

    # ── Recalculate item averages ─────────────────────────────
    print("\nRecalculating item averages...")
    for item_id in item_ids:
        from bson import ObjectId
        item_doc = db.items.find_one({"_id": ObjectId(item_id)})
        reviews  = item_doc.get("reviews", [])
        ratings  = [r["rating"] for r in reviews]
        avg      = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        db.items.update_one(
            {"_id": ObjectId(item_id)},
            {"$set": {"avg_rating": avg, "num_ratings": len(reviews)}},
        )

    print("\n[OK] Seed data loaded successfully!\n")
    print("=" * 50)
    print("  Login credentials")
    print("=" * 50)
    print("  Admin  - username: admin      password: Admin@2026")
    print("  User 1 - username: alice_k    password: User@2026")
    print("  User 2 - username: bob_m      password: User@2026")
    print("  User 3 - username: charlie_r  password: User@2026")
    print("=" * 50)

    client.close()


if __name__ == "__main__":
    main()
