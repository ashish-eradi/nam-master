@echo off
setlocal
cd /d "%~dp0.."

echo ============================================================
echo  NAM School Launcher - Build Docker Images for Distribution
echo ============================================================
echo.

REM Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker Desktop is not running. Please start it first.
  pause & exit /b 1
)

echo [1/5] Building backend image...
docker compose -f docker-compose.offline.yml build backend
if errorlevel 1 ( echo FAILED & pause & exit /b 1 )

echo [2/5] Building school-portal image...
docker compose -f docker-compose.offline.yml build school-portal
if errorlevel 1 ( echo FAILED & pause & exit /b 1 )

echo [3/5] Pulling postgres:14 image...
docker pull postgres:14
if errorlevel 1 ( echo FAILED & pause & exit /b 1 )

mkdir desktop-app\assets\images 2>nul

echo [4/5] Saving images to desktop-app\assets\images\ ...
echo   Saving backend...
docker save nam-master-backend -o desktop-app\assets\images\backend.tar
if errorlevel 1 ( echo FAILED to save backend & pause & exit /b 1 )

echo   Saving school-portal...
docker save nam-master-school-portal -o desktop-app\assets\images\school-portal.tar
if errorlevel 1 ( echo FAILED to save school-portal & pause & exit /b 1 )

echo   Saving postgres:14...
docker save postgres:14 -o desktop-app\assets\images\db.tar
if errorlevel 1 ( echo FAILED to save db & pause & exit /b 1 )

echo.
echo [5/5] Done! Images saved:
dir /b desktop-app\assets\images\
echo.
echo ============================================================
echo  Now run:  cd desktop-app  and  npm run build
echo  This will produce:  desktop-app\dist\NAM School Launcher Setup.exe
echo ============================================================
pause
