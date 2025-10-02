from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from models import UserCreate, UserLogin, UserDetails, ScheduleItem, QRRequest, MarkAttendanceRequest
from security import get_current_user
from datetime import date, datetime, timedelta, timezone
import uuid
import qrcode
import io
from starlette.responses import StreamingResponse

app = FastAPI()

origins = ["*"] 
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- THIS FUNCTION HAS BEEN CORRECTED ---
@app.post("/auth/register")
async def register(user_data: UserCreate):
    try:
        # Step 1: Create the user in Supabase Auth
        auth_response = supabase.auth.sign_up({"email": user_data.email, "password": user_data.password})
        if not auth_response.user: 
             raise Exception("Supabase could not create user account.")
        
        user_id = auth_response.user.id
        
        # Step 2: Create the user's profile in our public profiles table
        profile_data = user_data.model_dump(exclude={"password", "email"}) 
        profile_data["id"] = str(user_id)
        
        # This part has been simplified. If an error occurs here,
        # the 'except' block below will catch it automatically.
        supabase.from_("profiles").insert(profile_data).execute()
            
        return {"message": "User registered successfully!"}
    except Exception as e:
        # This will now correctly catch any error from the process
        # and report it to the frontend.
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/login")
async def login(user_data: UserLogin):
    try:
        response = supabase.auth.sign_in_with_password({"email": user_data.email, "password": user_data.password})
        return response
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid login credentials: {e}")

# --- All other endpoints below are correct and unchanged ---

@app.get("/api/users/me", response_model=UserDetails)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user.id)
    response = supabase.from_("users_view").select("full_name, role, email").eq("id", user_id).single().execute()
    if not response.data: raise HTTPException(status_code=404, detail="User details not found")
    return UserDetails(id=user_id, full_name=response.data['full_name'], email=response.data['email'], role=response.data['role'])

@app.get("/api/schedules/my-day", response_model=list[ScheduleItem])
async def get_my_daily_schedule(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user.id)
    day_of_week = date.today().weekday() + 1
    user_details = await read_users_me(current_user)
    
    query = supabase.from_("schedules").select("id, start_time, end_time, course:courses(id, course_name), teacher:profiles(full_name)")
    
    if user_details.role == 'teacher':
        query = query.eq("teacher_id", user_id)
    else:
        enrolled_courses_res = supabase.from_("enrollments").select("course_id").eq("student_id", user_id).execute()
        if not enrolled_courses_res.data: return []
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

@app.post("/api/attendance/generate-qr")
async def generate_qr_code(qr_request: QRRequest, current_user: dict = Depends(get_current_user)):
    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=60)
    _, error = supabase.from_("qr_tokens").insert({"token": token, "schedule_id": qr_request.schedule_id, "expires_at": str(expires_at)}).execute()
    if error: raise HTTPException(status_code=500, detail="Could not create QR token.")
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/api/attendance/mark")
async def mark_attendance(request: MarkAttendanceRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    token_res = supabase.from_("qr_tokens").select("schedule_id, expires_at").eq("token", request.token).single().execute()
    if not token_res.data: raise HTTPException(status_code=400, detail="Invalid QR Code.")
    expires_at = datetime.fromisoformat(token_res.data['expires_at'].replace('Z', '+00:00'))
    if now > expires_at: raise HTTPException(status_code=400, detail="Expired QR Code.")
    schedule_id = token_res.data['schedule_id']
    _, error = supabase.from_("attendance_records").insert({"student_id": str(current_user.id), "schedule_id": schedule_id, "session_date": str(date.today()), "status": "present"}).execute()
    if error: raise HTTPException(status_code=500, detail="Failed to record attendance or already marked.")
    supabase.from_("qr_tokens").delete().eq("token", request.token).execute()
    return {"message": "Attendance marked successfully!"}