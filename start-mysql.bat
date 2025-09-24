@echo off
echo Starting MySQL Server...
cd "C:\Program Files\MySQL\MySQL Server 8.4\bin"
mysqld.exe --console --skip-grant-tables --skip-networking=false
pause
