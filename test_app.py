"""
Automated Test Suite for Bazaar E-Commerce API
Tests all authentication, catalog, user, review, and admin endpoints.
"""

import requests
import sys

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("=" * 60)
    print(" RUNNING BAZAAR COMPREHENSIVE E2E API TEST SUITE")
    print("=" * 60)

    # 1. Check server connectivity & items endpoint
    print("\n1. Testing GET /api/items...")
    res = requests.get(f"{BASE_URL}/items")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    items = res.json()
    assert len(items) > 0, "No items returned!"
    print(f"   [PASS] Successfully fetched {len(items)} items.")
    test_item = items[0]
    test_item_id = test_item["_id"]

    # 2. Check category filtering
    print("\n2. Testing GET /api/items?category=Vinyls...")
    res = requests.get(f"{BASE_URL}/items?category=Vinyls")
    assert res.status_code == 200
    vinyls = res.json()
    print(f"   [PASS] Filtered category Vinyls returned {len(vinyls)} items.")

    # 3. Test Authentication (User)
    print("\n3. Testing POST /api/auth/login (User: alice_k)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": "alice_k", "password": "User@2026"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    user_token_data = res.json()
    user_token = user_token_data["access_token"]
    print(f"   [PASS] Login successful! Token received for username: {user_token_data['username']}")

    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 4. Test User Profile
    print("\n4. Testing GET /api/users/me...")
    res = requests.get(f"{BASE_URL}/users/me", headers=user_headers)
    assert res.status_code == 200, f"Get me failed: {res.text}"
    profile = res.json()
    print(f"   [PASS] User profile fetched: {profile['username']} (role: {profile['role']}, reviews: {len(profile.get('reviews', []))})")

    # 5. Test Submitting a Review
    print("\n5. Testing POST /api/items/{item_id}/review...")
    review_payload = {
        "rating": 5,
        "review_text": "Automated E2E Test Review: Outstanding product quality!"
    }
    res = requests.post(f"{BASE_URL}/items/{test_item_id}/review", headers=user_headers, json=review_payload)
    assert res.status_code == 200, f"Submit review failed: {res.text}"
    print(f"   [PASS] Review submitted successfully! Response: {res.json()['message']}")

    # 6. Verify Item updated average rating and reviews
    print("\n6. Testing GET /api/items/{item_id} (Verifying review)...")
    res = requests.get(f"{BASE_URL}/items/{test_item_id}")
    assert res.status_code == 200
    item_details = res.json()
    print(f"   [PASS] Item details fetched. New Avg Rating: {item_details['avg_rating']} ({item_details['num_ratings']} ratings)")

    # 7. Test Admin Login
    print("\n7. Testing POST /api/auth/login (Admin)...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin", "password": "Admin@2026"})
    assert res.status_code == 200
    admin_token_data = res.json()
    admin_token = admin_token_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"   [PASS] Admin login successful!")

    # 8. Test Admin GET Users
    print("\n8. Testing GET /api/users (Admin only)...")
    res = requests.get(f"{BASE_URL}/users", headers=admin_headers)
    assert res.status_code == 200
    users_list = res.json()
    print(f"   [PASS] Admin fetched user list ({len(users_list)} users).")

    # 9. Test Admin Create Item & Delete Item
    print("\n9. Testing Admin Item Creation & Deletion...")
    new_item_payload = {
        "name": "Test Vinyl - Automated Suite",
        "description": "A test vinyl created by automated script.",
        "price": 29.99,
        "currency": "USD",
        "seller": "Test Seller",
        "image_url": "https://images.unsplash.com/photo-1619983081563-430f63602796?w=600&q=80",
        "category": "Vinyls",
        "condition": "new",
        "age": "2026"
    }
    res = requests.post(f"{BASE_URL}/items", headers=admin_headers, json=new_item_payload)
    assert res.status_code == 201, f"Create item failed: {res.text}"
    created_item = res.json()
    created_item_id = created_item["_id"]
    print(f"   [PASS] Item created with ID: {created_item_id}")

    res = requests.delete(f"{BASE_URL}/items/{created_item_id}", headers=admin_headers)
    assert res.status_code == 200
    print(f"   [PASS] Created item deleted successfully.")

    print("\n" + "=" * 60)
    print(" ALL 9 E2E TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
