from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from database import supabase # <-- Imports the client

# This is for a password-based login, we can leave it for now
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user_response = supabase.auth.get_user(token)
        if user_response.user:
            return user_response.user
        else:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")