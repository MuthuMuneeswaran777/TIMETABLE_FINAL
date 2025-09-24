# Timetable Scheduling Application

A comprehensive web-based timetable scheduling application built with React, Node.js, MySQL, and Google OR-Tools for optimal timetable generation with constraint satisfaction.

## 🚀 Features

### Admin Portal
- **Dashboard**: Overview of teachers, subjects, departments, rooms, and generated timetables
- **Teachers Management**: Add, edit, delete teachers with department assignments and session limits
- **Subjects Management**: Manage subjects with lab/theory classification and credits
- **Departments Management**: Handle departments with sections, semesters, and years
- **Rooms Management**: Manage classrooms and laboratories with capacity and type
- **Subject Offerings**: Link subjects with teachers and departments, set period constraints
- **Timetable Generator**: Generate optimized timetables with constraint satisfaction

### Teacher Portal
- **Personal Timetable**: View weekly schedule with subject and room details
- **Subject Allocation**: View assigned subjects and weekly session limits
- **Workload Analysis**: Track teaching load and department distribution

### Student Portal
- **Class Timetable**: View department/section timetable with next class info
- **Subject Details**: View all subjects with teacher information and credits
- **Schedule Overview**: Daily and weekly schedule views

### Optimization Engine
- **Google OR-Tools Integration**: Advanced constraint programming for optimal scheduling
- **Constraint Implementation**: All 7 specified constraints (C1-C7) implemented
- **Conflict Resolution**: Automatic detection and resolution of scheduling conflicts
- **Performance Optimization**: Efficient algorithms for large-scale timetable generation

## 🏗️ Architecture

### Frontend (React)
- **Material-UI**: Modern, responsive UI components
- **React Router**: Client-side routing for different portals
- **React Query**: Efficient data fetching and caching
- **Axios**: HTTP client for API communication
- **React Hook Form**: Form handling and validation

### Backend (Node.js + Express)
- **RESTful APIs**: Complete CRUD operations for all entities
- **JWT Authentication**: Secure token-based authentication
- **Role-based Authorization**: Admin, Teacher, Student access control
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Centralized error management

### Database (MySQL)
- **Normalized Schema**: Efficient relational database design
- **Constraints**: Database-level integrity constraints
- **Indexes**: Optimized for query performance
- **Views**: Simplified data access patterns

### Optimization (Python + OR-Tools)
- **Constraint Programming**: Advanced CP-SAT solver
- **Multi-objective Optimization**: Balance multiple scheduling goals
- **Scalable Architecture**: Handle large datasets efficiently

## 📋 Constraints Implemented

### C1: Room Conflicts
No two classes in the same room at the same time within a department.

### C2: Session Separation
Timetable scheduled separately for morning (periods 1-4) and evening (periods 5-8) sessions.

### C3: Teacher Load Limit
Each teacher assigned maximum 2 sessions per day.

### C4: Lab Continuity
Lab sessions must occupy 3 continuous periods in appropriate lab rooms.

### C5: Teacher Conflicts
No overlapping assignments for teachers across different classes.

### C6: Lab Period Restrictions
No lab sessions in the first period of morning (1st) and evening (5th) sessions.

### C7: Department Isolation
No teacher assigned to multiple classes simultaneously; no lab clashes within department.

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MySQL** (v8.0 or higher)
- **Git**

### 1. Clone Repository
```bash
git clone <repository-url>
cd timetable-scheduler
```

### 2. Install Dependencies

#### Root Dependencies
```bash
npm install
```

#### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

#### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

#### Python Dependencies
```bash
cd backend/scripts
pip install -r requirements.txt
cd ../..
```

### 3. Database Setup

#### Create Database
```sql
CREATE DATABASE timetable_scheduler;
```

#### Import Schema
```bash
mysql -u root -p timetable_scheduler < backend/database/schema.sql
```

### 4. Environment Configuration

#### Backend Environment
Create `backend/.env` file:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=timetable_scheduler

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# OR-Tools Python Script Path
PYTHON_PATH=python
ORTOOLS_SCRIPT_PATH=./scripts/timetable_optimizer.py
```

### 5. Start Application

#### Development Mode (All Services)
```bash
npm run dev
```

#### Individual Services

**Backend Only:**
```bash
npm run server
```

**Frontend Only:**
```bash
npm run client
```

### 6. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health

## 👥 Default Users

The application comes with pre-configured demo users:

### Admin
- **Email**: admin@example.com
- **Password**: password123

### Teacher
- **Email**: john.smith@example.com
- **Password**: password123

### Student
- **Email**: alice.brown@example.com
- **Password**: password123

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout

### Admin Endpoints
- `GET /api/teachers` - Get all teachers
- `POST /api/teachers` - Create teacher
- `PUT /api/teachers/:id` - Update teacher
- `DELETE /api/teachers/:id` - Delete teacher

- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

- `GET /api/subject-offerings` - Get all subject offerings
- `POST /api/subject-offerings` - Create subject offering
- `PUT /api/subject-offerings/:id` - Update subject offering
- `DELETE /api/subject-offerings/:id` - Delete subject offering

### Timetable Endpoints
- `GET /api/timetables` - Get timetables
- `GET /api/timetables/:id` - Get specific timetable
- `POST /api/timetables/generate` - Generate new timetable
- `DELETE /api/timetables/:id` - Delete timetable
- `GET /api/timetables/:id/validate` - Validate timetable constraints

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/department/:id` - Get department dashboard
- `GET /api/dashboard/performance` - Get system performance metrics

### Student/Teacher Endpoints
- `GET /api/students/timetable` - Get student timetable
- `GET /api/students/subjects` - Get student subjects
- `GET /api/teachers/:id/timetable` - Get teacher timetable
- `GET /api/teachers/:id/allocations` - Get teacher allocations

## 🔧 Configuration

### Database Configuration
Modify `backend/config/database.js` for custom database settings.

### OR-Tools Configuration
Adjust optimization parameters in `backend/scripts/timetable_optimizer.py`:
- `max_time_in_seconds`: Solver timeout
- `num_search_workers`: Parallel processing threads
- Constraint weights and priorities

### Frontend Configuration
Update API endpoints in frontend environment files if needed.

## 🚀 Deployment

### Production Build

#### Frontend
```bash
cd frontend
npm run build
```

#### Backend
```bash
cd backend
npm start
```

### Environment Variables
Set production environment variables:
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-domain.com`
- Update database credentials
- Use secure JWT secret

### Database Migration
Run schema updates and ensure proper indexes for production load.

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
Test complete timetable generation workflow:
1. Create departments, teachers, subjects, rooms
2. Set up subject offerings
3. Generate timetable
4. Validate constraints

## 📊 Performance Optimization

### Database Optimization
- Proper indexing on frequently queried columns
- Query optimization for large datasets
- Connection pooling for concurrent requests

### Frontend Optimization
- Code splitting and lazy loading
- Efficient state management with React Query
- Optimized bundle size

### Backend Optimization
- Caching frequently accessed data
- Async processing for heavy operations
- Rate limiting for API protection

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Error
- Verify MySQL service is running
- Check database credentials in `.env`
- Ensure database exists and schema is imported

#### OR-Tools Import Error
- Install Python dependencies: `pip install ortools`
- Verify Python path in environment variables
- Check Python version compatibility (3.8+)

#### Frontend Build Error
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (16+)
- Verify all dependencies are installed

#### Timetable Generation Fails
- Check subject offerings are properly configured
- Verify room availability for lab subjects
- Ensure teacher workload limits are reasonable
- Review constraint conflicts in logs

### Debug Mode
Enable debug logging:
```env
NODE_ENV=development
DEBUG=true
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google OR-Tools** for constraint programming capabilities
- **Material-UI** for beautiful React components
- **Express.js** for robust backend framework
- **MySQL** for reliable data storage

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

---

**Built with ❤️ for efficient timetable management**
