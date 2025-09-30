from fastapi import FastAPI, HTTPException, Depends
from database import supabase
from models import User, Token, UserCreate, UserDetails, ScheduleItem
from security import get_current_user
from datetime import date

app = FastAPI()

@app.post("/auth/register")
async def register(user_data: UserCreate):
    if user_data.role not in ['student', 'teacher']:
        raise HTTPException(status_code=400, detail="Invalid role specified.")
    try:
        sign_up_response = supabase.auth.sign_up({"email": user_data.email, "password": user_data.password})
        if not sign_up_response.user:
            raise HTTPException(status_code=400, detail="Could not create user.")
        user_id = sign_up_response.user.id
        update_data = {
            "full_name": user_data.full_name, "role": user_data.role,
            "enrollment_id": user_data.enrollment_id, "employee_id": user_data.employee_id,
            "department": user_data.department
        }
        _, error = supabase.from_("users").update(update_data).eq("id", user_id).execute()
        if error:
            raise HTTPException(status_code=500, detail=f"Error saving user details: {error.message}")
        return {"message": "User registered successfully. Please check your email to verify."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=Token)
async def login(user: User):
    try:
        response = supabase.auth.sign_in_with_password({"email": user.email, "password": user.password})
        if response.session and response.session.access_token:
            return {"access_token": response.session.access_token, "token_type": "bearer"}
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/users/me", response_model=UserDetails)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user.id
    response = supabase.from_("users").select("full_name, role").eq("id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User details not found")
    return UserDetails(id=user_id, full_name=response.data['full_name'], email=current_user.email, role=response.data['role'])

@app.get("/api/schedules/my-day", response_model=list[ScheduleItem])
async def get_my_daily_schedule(current_user: dict = Depends(get_current_user)):
    mock_schedule = [
        {"course_name": "Data Structures", "start_time": "09:00", "end_time": "10:00", "teacher_name": "Dr. Alan"},
        {"course_name": "Algorithms", "start_time": "11:00", "end_time": "12:00", "teacher_name": "Dr. Alan"},
    ]
    return mock_schedule