@echo off
setlocal enabledelayedexpansion

set BASE=http://localhost:8080

echo Run: Register user...
for /f "tokens=*" %%i in ('curl -s -X POST "%BASE%/api/v1/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"smoke@example.com\",\"password\":\"SmokePass123\"}"') do set REGISTER_RESPONSE=%%i
echo Register Response: %REGISTER_RESPONSE%

REM Extract user ID manually (simple approach for demo)
for /f "tokens=2 delims=:" %%a in ('echo %REGISTER_RESPONSE% ^| findstr /r "\"id\""') do (
    set USER_ID=%%a
    set USER_ID=!USER_ID:"=!
    set USER_ID=!USER_ID:}=!
    set USER_ID=!USER_ID: =!
)
echo User created: %USER_ID%

echo Login...
for /f "tokens=*" %%i in ('curl -s -X POST "%BASE%/api/v1/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"smoke@example.com\",\"password\":\"SmokePass123\"}"') do set LOGIN_RESPONSE=%%i
echo Login Response: %LOGIN_RESPONSE%

echo Register a file...
curl -s -X POST "%BASE%/api/v1/files/register" -H "Content-Type: application/json" -H "X-User-Id: %USER_ID%" -d "{\"filename\":\"smoke.txt\",\"hash\":\"deadbeef\",\"size_bytes\":100,\"mime_type\":\"text/plain\"}"

echo.
echo Done