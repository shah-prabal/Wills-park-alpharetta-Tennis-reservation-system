import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import stripe
import jwt
from pymongo import MongoClient
import bcrypt

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', "sk_test_51Re2MCPILVO0kCRVCZo2vXLPsBH49CZIo255tgBO1e5cFT7PgMe8xpRSepNYdeK5YI4YfHb8xHVR6TDQwFj6evTF002dP4RmSS")
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', "whsec_SjyfoNTUa8vIjQLMx2x5CJBx1lX0foLQ")
JWT_SECRET = "alpharetta_tennis_secret_key_2025"

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"]
)

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client.alpharetta_tennis

# Security
security = HTTPBearer()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class ReservationRequest(BaseModel):
    court_id: int
    start_time: str
    end_time: str
    attendees: int

class User(BaseModel):
    id: str
    username: str
    email: str
    is_resident: bool
    is_alta_member: bool
    is_usta_member: bool
    is_staff: bool

class Court(BaseModel):
    id: int
    name: str
    available: bool

class Reservation(BaseModel):
    id: str
    user_id: str
    court_id: int
    start_time: str
    end_time: str
    attendees: int
    total_cost: float
    status: str
    payment_intent_id: Optional[str]

# Initialize database with mock data
def init_db():
    # Create mock users
    users_collection = db.users
    
    # Clear existing users
    users_collection.delete_many({})
    
    # Mock member user
    hashed_password = bcrypt.hashpw("trial123".encode('utf-8'), bcrypt.gensalt())
    mock_member = {
        "id": str(uuid.uuid4()),
        "username": "membermock",
        "email": "member@test.com",
        "password": hashed_password,
        "is_resident": True,
        "is_alta_member": False,
        "is_usta_member": False,
        "is_staff": False
    }
    users_collection.insert_one(mock_member)
    
    # Mock staff user
    staff_password = bcrypt.hashpw("JVtt3MfdJLGv6Qv0MUC3".encode('utf-8'), bcrypt.gensalt())
    mock_staff = {
        "id": str(uuid.uuid4()),
        "username": "AlpharettaStaff1122",
        "email": "staff@alpharetta.ga.us",
        "password": staff_password,
        "is_resident": True,
        "is_alta_member": False,
        "is_usta_member": False,
        "is_staff": True
    }
    users_collection.insert_one(mock_staff)
    
    # Initialize courts (only courts 1-4 available for reservation)
    courts_collection = db.courts
    courts_collection.delete_many({})
    
    courts = [
        {"id": 1, "name": "Court 1", "available": True},
        {"id": 2, "name": "Court 2", "available": True},
        {"id": 3, "name": "Court 3", "available": True},
        {"id": 4, "name": "Court 4", "available": True},
        {"id": 5, "name": "Court 5", "available": False},  # Not available for reservation
        {"id": 6, "name": "Court 6", "available": False},  # Not available for reservation
    ]
    
    for court in courts:
        courts_collection.insert_one(court)

# Initialize database on startup
try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print("Database initialization error:", str(e))

# Helper functions
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = db.users.find_one({"id": user_id})
        if user:
            return user
        raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_pricing(is_resident: bool, is_alta: bool, is_usta: bool, hours: float) -> float:
    """Calculate pricing based on user status and hours"""
    if is_resident or is_alta or is_usta:
        return hours * 4.0  # $4 per hour
    else:
        return hours * 6.0  # $6 per hour

def get_hours_between(start_time: str, end_time: str) -> float:
    """Calculate hours between two datetime strings"""
    start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    duration = end - start
    return duration.total_seconds() / 3600

# API Routes

@app.get("/")
async def root():
    return {"message": "Alpharetta Tennis Court Booking API", "status": "running"}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    user = db.users.find_one({"username": request.username})
    
    if not user or not bcrypt.checkpw(request.password.encode('utf-8'), user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token_data = {
        "user_id": user["id"],
        "username": user["username"],
        "is_staff": user["is_staff"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_resident": user["is_resident"],
            "is_alta_member": user["is_alta_member"],
            "is_usta_member": user["is_usta_member"],
            "is_staff": user["is_staff"]
        }
    }

@app.get("/api/courts")
async def get_courts():
    courts = list(db.courts.find({}, {"_id": 0}))
    return {"courts": courts}

@app.get("/api/courts/availability")
async def get_court_availability(date: str):
    """Get real-time court availability for a specific date"""
    try:
        target_date = datetime.fromisoformat(date)
        reservations = list(db.reservations.find({
            "start_time": {"$gte": target_date.isoformat()},
            "end_time": {"$lt": (target_date + timedelta(days=1)).isoformat()},
            "status": {"$in": ["confirmed", "pending"]}
        }, {"_id": 0}))
        
        # Get available courts (1-4 only)
        courts = list(db.courts.find({"available": True}, {"_id": 0}))
        
        return {
            "courts": courts,
            "reservations": reservations,
            "date": date
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reservations")
async def create_reservation(request: ReservationRequest, user: dict = Depends(get_current_user)):
    # Validate court availability
    court = db.courts.find_one({"id": request.court_id, "available": True})
    if not court:
        raise HTTPException(status_code=400, detail="Court not available for reservation")
    
    # Check minimum reservation time (120 minutes)
    hours = get_hours_between(request.start_time, request.end_time)
    if hours < 2:
        raise HTTPException(status_code=400, detail="Minimum reservation time is 2 hours")
    
    # Check maximum attendees
    if request.attendees > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 attendees per court")
    
    # Check advance booking restrictions
    start_time = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
    now = datetime.utcnow()
    days_ahead = (start_time.date() - now.date()).days
    
    if user["is_resident"] and days_ahead > 7:
        raise HTTPException(status_code=400, detail="Residents cannot book more than 7 days in advance")
    elif not user["is_resident"] and days_ahead > 5:
        raise HTTPException(status_code=400, detail="Non-residents cannot book more than 5 days in advance")
    
    # Check for conflicts
    existing_reservation = db.reservations.find_one({
        "court_id": request.court_id,
        "status": {"$in": ["confirmed", "pending"]},
        "$or": [
            {"start_time": {"$lt": request.end_time}, "end_time": {"$gt": request.start_time}}
        ]
    })
    
    if existing_reservation:
        raise HTTPException(status_code=400, detail="Court is already reserved for this time")
    
    # Calculate pricing
    total_cost = calculate_pricing(
        user["is_resident"], 
        user["is_alta_member"], 
        user["is_usta_member"], 
        hours
    )
    
    # For demo purposes, create reservation without actual Stripe payment
    try:
        # Create reservation
        reservation_id = str(uuid.uuid4())
        reservation = {
            "id": reservation_id,
            "user_id": user["id"],
            "court_id": request.court_id,
            "start_time": request.start_time,
            "end_time": request.end_time,
            "attendees": request.attendees,
            "total_cost": total_cost,
            "status": "confirmed",  # Auto-confirm for demo purposes
            "payment_intent_id": f"demo_payment_{reservation_id[:8]}",
            "created_at": datetime.utcnow().isoformat()
        }
        
        db.reservations.insert_one(reservation)
        
        return {
            "reservation_id": reservation_id,
            "client_secret": f"demo_secret_{reservation_id[:8]}",
            "total_cost": total_cost
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reservation creation error: {str(e)}")

@app.get("/api/reservations/my")
async def get_my_reservations(user: dict = Depends(get_current_user)):
    reservations = list(db.reservations.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("start_time", 1))
    return {"reservations": reservations}

@app.post("/api/stripe/webhook")
async def stripe_webhook(request: dict):
    """Handle Stripe webhook events"""
    try:
        # In production, verify the webhook signature
        if request.get("type") == "payment_intent.succeeded":
            payment_intent = request["data"]["object"]
            
            # Update reservation status
            db.reservations.update_one(
                {"payment_intent_id": payment_intent["id"]},
                {"$set": {"status": "confirmed"}}
            )
            
        elif request.get("type") == "payment_intent.payment_failed":
            payment_intent = request["data"]["object"]
            
            # Cancel reservation
            db.reservations.update_one(
                {"payment_intent_id": payment_intent["id"]},
                {"$set": {"status": "cancelled"}}
            )
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Admin routes
@app.get("/api/admin/reservations")
async def get_all_reservations(user: dict = Depends(get_current_user)):
    if not user["is_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    reservations = list(db.reservations.find({}, {"_id": 0}).sort("start_time", 1))
    return {"reservations": reservations}

@app.get("/api/admin/users")
async def get_all_users(user: dict = Depends(get_current_user)):
    if not user["is_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Get only regular users (exclude staff accounts)
    users = list(db.users.find({"is_staff": {"$ne": True}}, {"_id": 0, "password": 0}))
    return {"users": users}

@app.post("/api/admin/courts/{court_id}/maintenance")
async def toggle_court_maintenance(court_id: int, user: dict = Depends(get_current_user)):
    if not user["is_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    court = db.courts.find_one({"id": court_id})
    if not court:
        raise HTTPException(status_code=404, detail="Court not found")
    
    new_status = not court["available"]
    db.courts.update_one(
        {"id": court_id},
        {"$set": {"available": new_status}}
    )
    
    return {"message": f"Court {court_id} {'enabled' if new_status else 'disabled'}"}

@app.post("/api/admin/notifications")
async def send_notification(request: dict, user: dict = Depends(get_current_user)):
    if not user["is_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    message = request.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Create notification document
    notification = {
        "id": str(uuid.uuid4()),
        "message": message,
        "sender": user["username"],
        "created_at": datetime.utcnow().isoformat(),
        "read_by": []  # Track who has read this notification
    }
    
    # Store notification in database
    db.notifications.insert_one(notification)
    
    return {"message": "Notification sent successfully", "notification_id": notification["id"]}

@app.get("/api/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    # Get all notifications that this user hasn't read yet
    notifications = list(db.notifications.find(
        {"read_by": {"$ne": user["id"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(10))
    
    return {"notifications": notifications}

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    # Mark notification as read by this user
    result = db.notifications.update_one(
        {"id": notification_id},
        {"$addToSet": {"read_by": user["id"]}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@app.put("/api/admin/users/{user_id}")
async def update_user_status(user_id: str, request: dict, user: dict = Depends(get_current_user)):
    if not user["is_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Find the user to update
    target_user = db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent modifying staff accounts
    if target_user.get("is_staff", False):
        raise HTTPException(status_code=403, detail="Cannot modify staff accounts")
    
    # Update allowed fields
    update_fields = {}
    if "is_resident" in request:
        update_fields["is_resident"] = bool(request["is_resident"])
    if "is_alta_member" in request:
        update_fields["is_alta_member"] = bool(request["is_alta_member"])
    if "is_usta_member" in request:
        update_fields["is_usta_member"] = bool(request["is_usta_member"])
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Update the user
    result = db.users.update_one(
        {"id": user_id},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="User update failed")
    
    return {"message": "User updated successfully", "updated_fields": update_fields}

@app.get("/api/admin/analytics")
async def get_analytics(user: dict = Depends(get_current_user)):
    if not user["is_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Basic analytics - EXCLUDE STAFF ACCOUNTS
    total_reservations = db.reservations.count_documents({})
    confirmed_reservations = db.reservations.count_documents({"status": "confirmed"})
    total_revenue = list(db.reservations.aggregate([
        {"$match": {"status": "confirmed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_cost"}}}
    ]))
    
    # Count only regular users (exclude staff accounts)
    total_users = db.users.count_documents({"is_staff": {"$ne": True}})
    
    revenue = total_revenue[0]["total"] if total_revenue else 0
    
    return {
        "total_reservations": total_reservations,
        "confirmed_reservations": confirmed_reservations,
        "total_revenue": revenue,
        "total_users": total_users
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)