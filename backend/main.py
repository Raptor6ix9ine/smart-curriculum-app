from fastapi import FastAPI, HTTPException, Depends
from database import supabase
from models import MagicLinkRequest, UserDetails, ScheduleItem, QRRequest, MarkAttendanceRequest, VerifyRequest
from security import get_current_user
from datetime import date
import time
import qrcode
import io
from starlette.responses import StreamingResponse

app = FastAPI()

# --- AUTHENTICATION ---
@app.post("/auth/magic-link")
async def send_magic_link(request: MagicLinkRequest):
    id_column = "roll_number" if request.role == 'student' else "employee_id"

    response = supabase.from_("users_view").select("id").eq("email", request.email).eq(id_column, request.user_id).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="No matching user found with that Email and ID.")

    try:
        supabase.auth.sign_in_with_otp({"email": request.email})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not send login link: {e}")

    return {"message": "Login link sent! Please check your email."}

# --- NEW: Endpoint to verify Google Login against our database ---
@app.post("/api/verify-user")
async def verify_user(request: VerifyRequest):
    id_column = "roll_number" if request.role == 'student' else "employee_id"
    
    # Check if a user exists with this exact email AND user_id
    response = supabase.from_("users_view").select("id") \
        .eq("email", request.email) \
        .eq(id_column, request.user_id) \
        .single().execute()

    if response.data:
        return {"status": "ok", "user": response.data}
    else:
        raise HTTPException(status_code=404, detail="The ID you entered does not match the logged-in Google account.")

# --- USER & SCHEDULE DATA ---
@app.get("/api/users/me", response_model=UserDetails)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user.id
    response = supabase.from_("users_view").select("full_name, role").eq("id", user_id).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="User details not found")
        
    return UserDetails(id=user_id, full_name=response.data['full_name'], email=current_user.email, role=response.data['role'])

@app.get("/api/schedules/my-day", response_model=list[ScheduleItem])
async def get_my_daily_schedule(current_user: dict = Depends(get_current_user)):
    user_id = current_user.id
    day_of_week = date.today().weekday() + 1 # Monday=1, Sunday=7

    user_details = await read_users_me(current_user)
    
    # This query now correctly joins tables to get all needed info
    query = supabase.from_("schedules").select("id, start_time, end_time, course:courses(course_name), teacher:profiles(full_name)")
    
    # If the user is a teacher, filter by their ID
    if user_details.role == 'teacher':
        query = query.eq("teacher_id", user_id)
        
    response = query.eq("day_of_week", day_of_week).execute()
    
    if not response.data:
        return []
    
    schedule_list = []
    for item in response.data:
        # Make sure 'teacher' and 'course' are not None before accessing 'full_name' or 'course_name'
        teacher_name = item.get('teacher', {}).get('full_name', 'N/A') if item.get('teacher') else 'N/A'
        course_name = item.get('course', {}).get('course_name', 'N/A') if item.get('course') else 'N/A'
        
        schedule_list.append(ScheduleItem(
            schedule_id=item['id'],
            course_name=course_name,
            start_time=item['start_time'],
            end_time=item['end_time'],
            teacher_name=teacher_name
        ))
    return schedule_list

# --- ATTENDANCE SYSTEM ---
temp_token_store = {}

@app.post("/api/attendance/generate-qr")
async def generate_qr_code(qr_request: QRRequest, current_user: dict = Depends(get_current_user)):
    expiration_time = int(time.time()) + 60
    token_data = f"{qr_request.schedule_id}:{expiration_time}"
    temp_token_store[token_data] = True
    img = qrcode.make(token_data)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/api/attendance/mark")
async def mark_attendance(request: MarkAttendanceRequest, current_user: dict = Depends(get_current_user)):
    if request.token not in temp_token_store:
        raise HTTPException(status_code=400, detail="Invalid or expired QR Code.")
    try:
        schedule_id, expiration_time_str = request.token.split(":")
        if time.time() > int(expiration_time_str):
            raise HTTPException(status_code=400, detail="Expired QR Code.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Malformed QR Code.")
    
    _, error = supabase.from_("attendance_records").insert({
        "student_id": current_user.id, "schedule_id": schedule_id,
        "session_date": str(date.today()), "status": "present"
    }).execute()
    if error:
        raise HTTPException(status_code=500, detail="Failed to record attendance.")
        
    del temp_token_store[request.token]
    return {"message": "Attendance marked successfully!"}