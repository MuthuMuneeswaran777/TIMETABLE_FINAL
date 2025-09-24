@echo off
echo ========================================
echo  Timetable Scheduler - MySQL Setup
echo ========================================
echo.
echo This script will help you set up MySQL for the application.
echo Please run this as Administrator for best results.
echo.
echo Step 1: Installing MySQL Service...
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --install
if %errorlevel% equ 0 (
    echo ✅ MySQL service installed successfully
) else (
    echo ❌ Failed to install MySQL service (try running as Administrator)
)
echo.
echo Step 2: Starting MySQL Service...
net start MySQL
if %errorlevel% equ 0 (
    echo ✅ MySQL service started successfully
) else (
    echo ❌ Failed to start MySQL service
)
echo.
echo Step 3: Creating Database...
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS timetable_scheduler;"
if %errorlevel% equ 0 (
    echo ✅ Database created successfully
) else (
    echo ❌ Failed to create database
)
echo.
echo Step 4: Importing Schema...
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root timetable_scheduler < "backend\database\schema.sql"
if %errorlevel% equ 0 (
    echo ✅ Schema imported successfully
) else (
    echo ❌ Failed to import schema
)
echo.
echo Setup complete! You can now restart the backend server.
echo Press any key to continue...
pause
