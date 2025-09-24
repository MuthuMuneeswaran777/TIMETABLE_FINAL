# Quick Setup Guide

This guide will help you get the Timetable Scheduling Application running quickly.

## 🚀 Quick Start (5 minutes)

### Step 1: Prerequisites Check
Ensure you have installed:
- [Node.js](https://nodejs.org/) (v16+)
- [Python](https://python.org/) (v3.8+)
- [MySQL](https://mysql.com/) (v8.0+)

### Step 2: Clone and Install
```bash
# Clone repository
git clone <your-repo-url>
cd timetable-scheduler

# Install all dependencies
npm run install-deps
```

### Step 3: Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE timetable_scheduler;
exit

# Import schema with sample data
mysql -u root -p timetable_scheduler < backend/database/schema.sql
```

### Step 4: Environment Configuration
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit the .env file with your database credentials
# Minimum required changes:
# DB_PASSWORD=your_mysql_password
```

### Step 5: Install Python Dependencies
```bash
cd backend/scripts
pip install -r requirements.txt
cd ../..
```

### Step 6: Start Application
```bash
# Start both frontend and backend
npm run dev
```

### Step 7: Access Application
Open your browser and go to: http://localhost:3000

## 🔑 Login Credentials

Use these demo accounts to explore the application:

**Admin Portal:**
- Email: `admin@example.com`
- Password: `password123`

**Teacher Portal:**
- Email: `john.smith@example.com`
- Password: `password123`

**Student Portal:**
- Email: `alice.brown@example.com`
- Password: `password123`

## 🧪 Test the System

### 1. Admin Workflow
1. Login as admin
2. Navigate to "Timetable Generator"
3. Select "Computer Science Engineering" department
4. Click "Generate Timetable"
5. View the generated optimized timetable

### 2. Teacher Workflow
1. Login as teacher (john.smith@example.com)
2. View "My Timetable" to see assigned classes
3. Check "Subject Allocation" for workload details

### 3. Student Workflow
1. Login as student (alice.brown@example.com)
2. View "My Timetable" for class schedule
3. Check "Subject Details" for course information

## 🔧 Troubleshooting

### Database Issues
```bash
# If database connection fails:
# 1. Check MySQL service is running
sudo service mysql start  # Linux
brew services start mysql # macOS

# 2. Verify credentials in backend/.env
# 3. Test connection
mysql -u root -p -e "SELECT 1;"
```

### Python/OR-Tools Issues
```bash
# If OR-Tools installation fails:
pip install --upgrade pip
pip install ortools==9.7.2996

# For M1 Mac users:
pip install --pre ortools
```

### Port Conflicts
If ports 3000 or 5000 are in use:
```bash
# Frontend (React)
PORT=3001 npm start

# Backend (Express)
PORT=5001 npm run server
```

### Node.js Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# For frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📱 Development Commands

```bash
# Start development servers
npm run dev          # Both frontend and backend
npm run client       # Frontend only
npm run server       # Backend only

# Build for production
npm run build        # Build frontend
cd backend && npm start  # Start production backend

# Database operations
mysql -u root -p timetable_scheduler < backend/database/schema.sql  # Reset DB
```

## 🎯 Next Steps

After successful setup:

1. **Explore Features**: Try all three portals (Admin, Teacher, Student)
2. **Generate Timetables**: Test the OR-Tools optimization engine
3. **Customize Data**: Add your own departments, teachers, and subjects
4. **Review Constraints**: Understand how C1-C7 constraints work
5. **Check Performance**: Monitor timetable generation times

## 📞 Need Help?

If you encounter issues:

1. Check the main [README.md](./README.md) for detailed documentation
2. Review error logs in the terminal
3. Verify all prerequisites are correctly installed
4. Ensure database schema is properly imported

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in backend/.env
2. Update `FRONTEND_URL` to your domain
3. Use a secure `JWT_SECRET`
4. Configure proper database credentials
5. Set up SSL certificates
6. Use a process manager like PM2 for the backend

---

**You're all set! Happy scheduling! 🎉**
