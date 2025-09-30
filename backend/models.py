from pydantic import BaseModel, EmailStr
from typing import Optional

class User(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    enrollment_id: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None

class UserDetails(BaseModel):
    id: str
    full_name: str
    email: str
    role: str

class ScheduleItem(BaseModel):
    course_name: str
    start_time: str
    end_time: str
    teacher_name: str