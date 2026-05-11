@echo off
echo ========================================================
echo   Auto Deploy to GitHub (to be pulled by EC2 Server)
echo ========================================================
echo.

git add .
git commit -m "Auto upload from local IDE (Hongsam SPA ERP)"
git push origin main

echo.
echo ========================================================
echo   Upload Complete. Live server will update shortly.
echo ========================================================
timeout /t 5
