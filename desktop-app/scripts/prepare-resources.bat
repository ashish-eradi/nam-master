@echo off
setlocal

REM ============================================================
REM  NAM School Portal — Prepare resources\ before installer build
REM
REM  Run this script once from the desktop-app\scripts\ folder:
REM    cd desktop-app\scripts
REM    prepare-resources.bat
REM
REM  Manual prerequisites (see steps 3 and 4 below):
REM    - Python 3.11 embeddable zip extracted to resources\python\
REM    - PostgreSQL 14 Windows binaries extracted to resources\postgres\
REM ============================================================

cd /d "%~dp0\.."

echo.
echo === Step 1: Build React frontend ===
cd "..\frontend\school-portal"
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
call npm run build
if errorlevel 1 ( echo ERROR: Frontend build failed & exit /b 1 )

REM Copy build output to resources\frontend\
set FRONTEND_DEST=%~dp0..\resources\frontend
if not exist "%FRONTEND_DEST%" mkdir "%FRONTEND_DEST%"
xcopy /E /I /Y dist "%FRONTEND_DEST%"
echo Frontend copied to resources\frontend\

cd /d "%~dp0\.."

echo.
echo === Step 2: Copy backend source ===
set BACKEND_SRC=..\backend
set BACKEND_DEST=resources\backend

if not exist "%BACKEND_DEST%\app"     mkdir "%BACKEND_DEST%\app"
if not exist "%BACKEND_DEST%\alembic" mkdir "%BACKEND_DEST%\alembic"

xcopy /E /I /Y "%BACKEND_SRC%\app"     "%BACKEND_DEST%\app\"
xcopy /E /I /Y "%BACKEND_SRC%\alembic" "%BACKEND_DEST%\alembic\"
copy /Y "%BACKEND_SRC%\alembic.ini"    "%BACKEND_DEST%\alembic.ini"
echo Backend source copied to resources\backend\

echo.
echo === Step 3: Portable Python (MANUAL) ===
echo.
echo   If resources\python\python.exe does not exist, do the following:
echo.
echo   a) Download Python 3.11 embeddable package for Windows x64:
echo      https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip
echo.
echo   b) Extract the ZIP into:  desktop-app\resources\python\
echo.
echo   c) Edit  resources\python\python311._pth  and uncomment the line:
echo        import site
echo.
echo   d) Download get-pip.py:
echo      https://bootstrap.pypa.io/get-pip.py
echo      Save it to  resources\python\get-pip.py
echo.
echo   e) Run:
echo      resources\python\python.exe resources\python\get-pip.py
echo.
echo   f) Install backend dependencies:
echo      resources\python\python.exe -m pip install -r ..\backend\requirements.txt
echo      resources\python\python.exe -m pip install uvicorn[standard]
echo.

echo === Step 4: PostgreSQL 14 Windows binaries (MANUAL) ===
echo.
echo   If resources\postgres\bin\pg_ctl.exe does not exist, do the following:
echo.
echo   a) Download the PostgreSQL 14 Windows ZIP (binaries only) from:
echo      https://www.enterprisedb.com/download-postgresql-binaries
echo      (select version 14.x, Windows x86-64)
echo.
echo   b) Extract the archive. You need only these two folders:
echo        pgsql\bin\   ->  desktop-app\resources\postgres\bin\
echo        pgsql\lib\   ->  desktop-app\resources\postgres\lib\
echo        pgsql\share\ ->  desktop-app\resources\postgres\share\
echo.
echo   Required executables in resources\postgres\bin\:
echo     postgres.exe  pg_ctl.exe  initdb.exe  createdb.exe  pg_dump.exe
echo     pg_isready.exe  psql.exe  (plus supporting DLLs)
echo.

echo.
echo === Step 5: Build the installer ===
echo.
echo   cd desktop-app
echo   npm install
echo   npm run build
echo.
echo   Output: desktop-app\dist\NAM School Portal Setup.exe
echo.
echo Done. Verify resources\ layout before running npm run build.
echo.
endlocal
