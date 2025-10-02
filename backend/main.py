from fastapi import FastAPI, HTTPException, Depends
from database import supabase
from models import MagicLinkRequest, UserDetails, ScheduleItem, QRRequest, MarkAttendanceRequest
from security import get_current_user
from datetime import date, datetime, timedelta, timezone
import time
import qrcode
import io
import uuid
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

# --- USER & SCHEDULE DATA ---
@app.get("/api/users/me", response_model=UserDetails)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user.id
    response = supabase.from_("users_view").select("full_name, role").eq("id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User details not found")
    return UserDetails(id=user_id, full_name=response.data['full_name'], email=current_user.email, role=response.data['role'])

# This endpoint is now fixed to show the correct schedule for students
@app.get("/api/schedules/my-day", response_model=list[ScheduleItem])
async def get_my_daily_schedule(current_user: dict = Depends(get_current_user)):
    user_id = current_user.id
    day_of_week = date.today().weekday() + 1
    user_details = await read_users_me(current_user)
    
    query = supabase.from_("schedules").select("id, start_time, end_time, course:courses(id, course_name), teacher:profiles(full_name)")
    
    if user_details.role == 'teacher':
        query = query.eq("teacher_id", user_id)
    else: # Student logic: find enrolled courses, then get schedules for those courses
        enrolled_courses_res = supabase.from_("enrollments").select("course_id").eq("student_id", user_id).execute()
        if not enrolled_courses_res.data:
            return []
        course_ids = [item['course_id'] for item in enrolled_courses_res.data]
        query = query.in_("course_id", course_ids)
        
    response = query.eq("day_of_week", day_of_week).execute()
    
    if not response.data: return []
    
    schedule_list = []
    for item in response.data:
        teacher_name = item.get('teacher', {}).get('full_name', 'N/A') if item.get('teacher') else 'N/A'
        course_name = item.get('course', {}).get('course_name', 'N/A') if item.get('course') else 'N/A'
        schedule_list.append(ScheduleItem(schedule_id=item['id'], course_name=course_name, start_time=item['start_time'], end_time=item['end_time'], teacher_name=teacher_name))
    return schedule_list

# --- ATTENDANCE SYSTEM (NOW RELIABLE) ---
@app.post("/api/attendance/generate-qr")
async def generate_qr_code(qr_request: QRRequest, current_user: dict = Depends(get_current_user)):
    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=60)
    
    # Store token in the database
    _, error = supabase.from_("qr_tokens").insert({
        "token": token,
        "schedule_id": qr_request.schedule_id,
        "expires_at": str(expires_at)
    }).execute()
    
    if error:
        raise HTTPException(status_code=500, detail="Could not create QR token.")
        
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/api/attendance/mark")
async def mark_attendance(request: MarkAttendanceRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    
    # Find token in the database
    token_res = supabase.from_("qr_tokens").select("schedule_id, expires_at").eq("token", request.token).single().execute()
    
    if not token_res.data:
        raise HTTPException(status_code=400, detail="Invalid QR Code.")
        
    # Check for expiration
    expires_at = datetime.fromisoformat(token_res.data['expires_at'])
    if now > expires_at:
        raise HTTPException(status_code=400, detail="Expired QR Code.")
    
    schedule_id = token_res.data['schedule_id']
    
    # Mark attendance
    _, error = supabase.from_("attendance_records").insert({
        "student_id": current_user.id, "schedule_id": schedule_id,
        "session_date": str(date.today()), "status": "present"
    }).execute()
    
    if error:
        raise HTTPException(status_code=500, detail="Failed to record attendance or already marked.")
        
    # Delete the used token
    supabase.from_("qr_tokens").delete().eq("token", request.token).execute()
    
    return {"message": "Attendance marked successfully!"}