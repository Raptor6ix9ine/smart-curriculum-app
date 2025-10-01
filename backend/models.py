from pydantic import BaseModel, EmailStr
from typing import Optional

# For the new magic link login
class MagicLinkRequest(BaseModel):
    email: str
    user_id: str # This will be either roll_number or employee_id
    role: str # 'student' or 'teacher'

# For returning user details
class UserDetails(BaseModel):
    id: str
    full_name: str
    email: str
    role: str

# For returning a schedule item
class ScheduleItem(BaseModel):
    schedule_id: str # We need this to generate the QR code
    course_name: str
    start_time: str
    end_time: str
    teacher_name: str

# For the QR code generation request
class QRRequest(BaseModel):
    schedule_id: str

# For the attendance marking request
class MarkAttendanceRequest(BaseModel):
    token: str

# --- NEW: For the Google Login Verification ---
class VerifyRequest(BaseModel):
    email: str
    user_id: str
    role: str