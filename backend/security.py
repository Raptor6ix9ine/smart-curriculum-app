from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database import supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user_response = supabase.auth.get_user(token)
        if user_response.user:
            return user_response.user
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")