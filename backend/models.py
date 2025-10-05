from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    roll_number: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserDetails(BaseModel):
    id: str
    full_name: str
    email: str
    role: str

class ScheduleItem(BaseModel):
    schedule_id: str
    course_name: str
    start_time: str
    end_time: str
    teacher_name: str

class QRRequest(BaseModel):
    schedule_id: str

class MarkAttendanceRequest(BaseModel):
    token: str

# --- NEW MODELS FOR TASKS ---
class Task(BaseModel):
    student_task_id: str
    title: str
    description: str
    category: str
    status: str

class UpdateTaskStatus(BaseModel):
    status: str