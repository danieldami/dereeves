@echo off
REM WebRTC TURN Server Setup Script for Windows
REM This script helps you quickly configure a TURN server for your video calling app

echo ========================================
echo   WebRTC TURN Server Setup (Windows)
echo ========================================
echo.

REM Check if frontend/.env.local already exists
if exist "frontend\.env.local" (
    echo WARNING: frontend\.env.local already exists!
    echo.
    set /p overwrite="Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo Setup cancelled.
        exit /b 1
    )
)

echo.
echo Choose a TURN server option:
echo.
echo 1. Free Public TURN (OpenRelay) - Good for testing
echo 2. Xirsys - Enter your credentials
echo 3. Twilio - Enter your credentials
echo 4. Custom TURN server
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto openrelay
if "%choice%"=="2" goto xirsys
if "%choice%"=="3" goto twilio
if "%choice%"=="4" goto custom
echo Invalid choice. Setup cancelled.
exit /b 1

:openrelay
echo Configuring OpenRelay (free public TURN server)...
(
echo # Free public TURN server for testing
echo # Note: This server has limited capacity and may not always work
echo # For production, use Xirsys or Twilio
echo NEXT_PUBLIC_TURN_URL=turn:openrelay.metered.ca:80
echo NEXT_PUBLIC_TURN_USERNAME=openrelayproject
echo NEXT_PUBLIC_TURN_CREDENTIAL=openrelayproject
) > frontend\.env.local
echo Configuration saved!
goto success

:xirsys
echo.
echo Xirsys TURN Server Configuration
echo Get your credentials from: https://xirsys.com/dashboard
echo.
set /p turn_url="Enter TURN URL (e.g., turn:your-server.xirsys.com:3478): "
set /p username="Enter Username: "
set /p credential="Enter Credential: "

(
echo # Xirsys TURN Server Configuration
echo NEXT_PUBLIC_TURN_URL=%turn_url%
echo NEXT_PUBLIC_TURN_USERNAME=%username%
echo NEXT_PUBLIC_TURN_CREDENTIAL=%credential%
) > frontend\.env.local
echo Configuration saved!
goto success

:twilio
echo.
echo Twilio TURN Server Configuration
echo Get your credentials from: https://www.twilio.com/console/voice/sdks/turn-credentials
echo.
set /p turn_url="Enter TURN URL (e.g., turn:global.turn.twilio.com:3478): "
set /p username="Enter Username: "
set /p credential="Enter Credential: "

(
echo # Twilio TURN Server Configuration
echo NEXT_PUBLIC_TURN_URL=%turn_url%
echo NEXT_PUBLIC_TURN_USERNAME=%username%
echo NEXT_PUBLIC_TURN_CREDENTIAL=%credential%
) > frontend\.env.local
echo Configuration saved!
goto success

:custom
echo.
echo Custom TURN Server Configuration
echo.
set /p turn_url="Enter TURN URL (e.g., turn:your-server.com:3478): "
set /p username="Enter Username: "
set /p credential="Enter Credential: "

(
echo # Custom TURN Server Configuration
echo NEXT_PUBLIC_TURN_URL=%turn_url%
echo NEXT_PUBLIC_TURN_USERNAME=%username%
echo NEXT_PUBLIC_TURN_CREDENTIAL=%credential%
) > frontend\.env.local
echo Configuration saved!
goto success

:success
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your frontend server:
echo    cd frontend
echo    npm run dev
echo.
echo 2. Test your configuration:
echo    - Open browser console (F12)
echo    - Make a video call
echo    - Look for: "Using TURN server from env"
echo    - Look for: "ICE candidate: relay"
echo.
echo 3. If issues persist, read WEBRTC_TROUBLESHOOTING.md
echo.
echo Happy calling!
pause

