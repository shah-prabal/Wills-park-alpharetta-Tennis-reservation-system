# Wills Park Tennis Court Booking System

A comprehensive tennis court reservation system for the City of Alpharetta's Wills Park facility. This full-stack application allows users to book tennis courts, view availability, manage reservations, and includes administrative features.

## 🎾 Features

### User Features
- **Authentication System**: Secure user login with JWT tokens
- **Court Booking**: Reserve tennis courts with real-time availability
- **Pricing Calculator**: Automatic pricing based on resident status and membership
- **Reservation Management**: View and manage personal reservations
- **Real-time Notifications**: System notifications for important updates
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

### Admin Features
- **Dashboard Analytics**: Overview of reservations, revenue, and users
- **User Management**: Update user status and membership information
- **Court Maintenance**: Toggle court availability for maintenance
- **Notification System**: Send system-wide notifications to users
- **Comprehensive Reports**: Detailed analytics and reporting

## 🛠️ Technology Stack

- **Frontend**: React 19, Tailwind CSS, Craco
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **Payment Processing**: Stripe integration (demo mode)
- **Process Management**: Supervisor

## 📋 Prerequisites

### For Mac Users
- **Homebrew**: Install from https://brew.sh
- **Python 3.11+**: `brew install python@3.11`
- **Node.js 18+**: `brew install node`
- **MongoDB**: `brew tap mongodb/brew && brew install mongodb-community`
- **Yarn**: `brew install yarn`

### For Linux Users
- Python 3.11+
- Node.js 18+
- MongoDB
- Yarn package manager

## 🚀 Local Development Setup

### Quick Start for Mac Users

### **Recommended Setup for MacBook:**

1. **Install Dependencies**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required packages
brew install python@3.11 node yarn
brew tap mongodb/brew && brew install mongodb-community
```

2. **Setup Project**
```bash
# Navigate to project
cd /app

# Install backend dependencies (Mac users - use pip3 or python3 -m pip)
cd backend

# Try one of these commands (in order of preference):
pip3 install -r requirements.txt
# OR if pip3 doesn't work:
python3 -m pip install -r requirements.txt
# OR if you have brew python:
/usr/local/bin/python3 -m pip install -r requirements.txt

# Install frontend dependencies  
cd ../frontend && yarn install
```

3. **Start Services (3 Terminal Windows)**
```bash
# Terminal 1: MongoDB
brew services start mongodb/brew/mongodb-community

# Terminal 2: Backend API
cd /app/backend && python server.py

# Terminal 3: Frontend App
cd /app/frontend && yarn start
```

4. **Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001

### **Test Accounts:**
- User: `membermock` / `trial123`
- Admin: `AlpharettaStaff1122` / `JVtt3MfdJLGv6Qv0MUC3`

---

### Detailed Setup (All Platforms)

### 1. Clone and Navigate
```bash
git clone [repository-url]
cd /app
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Verify environment variables
cat .env
# Should show:
# MONGO_URL=mongodb://localhost:27017/
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies using Yarn (IMPORTANT: Do not use npm)
yarn install

# Verify environment variables
cat .env
# Should show:
# REACT_APP_BACKEND_URL=https://[your-backend-url]
# WDS_SOCKET_PORT=443
```

### 4. Start Services

#### Option A: Using Supervisor (Linux/Cloud Environment)
```bash
# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# Expected output:
# backend                          RUNNING   pid [number]
# frontend                         RUNNING   pid [number]
# mongodb                          RUNNING   pid [number]
```

#### Option B: Manual Start (Mac/Development - Recommended for Mac)
```bash
# Terminal 1: Start MongoDB
brew services start mongodb/brew/mongodb-community
# Or manually: mongod --config /usr/local/etc/mongod.conf

# Terminal 2: Start Backend
cd /app/backend
python server.py
# Should show: "Uvicorn running on http://0.0.0.0:8001"

# Terminal 3: Start Frontend  
cd /app/frontend
yarn start
# Should show: "You can now view frontend in the browser at http://localhost:3000"
```

#### Option C: Using Background Processes (Mac Alternative)
```bash
# Start MongoDB as background service
brew services start mongodb/brew/mongodb-community

# Start backend in background
cd /app/backend
nohup python server.py > backend.log 2>&1 &

# Start frontend in background
cd /app/frontend
nohup yarn start > frontend.log 2>&1 &
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## 🔧 Service Management

### Mac Users (Homebrew Services)
```bash
# MongoDB service management
brew services start mongodb/brew/mongodb-community
brew services stop mongodb/brew/mongodb-community
brew services restart mongodb/brew/mongodb-community

# Check if MongoDB is running
brew services list | grep mongodb

# Backend and Frontend (manual process management)
# Kill processes if needed:
pkill -f "python server.py"
pkill -f "yarn start"

# Check running processes
ps aux | grep "python server.py"
ps aux | grep "yarn start"
```

### Linux Users (Supervisor Commands)
```bash
# Restart all services
sudo supervisorctl restart all

# Restart individual services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Stop services
sudo supervisorctl stop all

# View service status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

## 👥 Test Accounts

### Regular User
- **Username**: `membermock`
- **Password**: `trial123`
- **Status**: Resident member

### Admin/Staff User
- **Username**: `AlpharettaStaff1122`
- **Password**: `JVtt3MfdJLGv6Qv0MUC3`
- **Status**: Staff member with admin privileges

## 🧪 Testing the Application

### 1. Frontend-Backend Communication Test
```bash
# Test backend API directly
curl http://localhost:8001/api/courts

# Should return JSON with court data
```

### 2. Authentication Test
```bash
# Test login endpoint
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "membermock", "password": "trial123"}'

# Should return JWT token and user data
```

### 3. Frontend Access Test
- Navigate to http://localhost:3000
- Login with test credentials
- Verify all features work: booking, availability, reservations

## 🏗️ Application Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI       │    │   MongoDB       │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│   Port 3000     │    │   Port 8001     │    │   Port 27017    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components
- **Frontend**: React SPA with Tailwind CSS
- **Backend**: RESTful API with FastAPI
- **Database**: MongoDB with collections for users, courts, reservations
- **Authentication**: JWT-based authentication system
- **Payment**: Stripe integration for payment processing

## 📊 API Endpoints

### Public Endpoints
- `POST /api/auth/login` - User authentication

### Protected Endpoints
- `GET /api/courts` - List all courts
- `GET /api/courts/availability` - Check court availability
- `POST /api/reservations` - Create new reservation
- `GET /api/reservations/my` - Get user's reservations
- `GET /api/notifications` - Get user notifications

### Admin Endpoints
- `GET /api/admin/reservations` - All reservations
- `GET /api/admin/users` - All users
- `GET /api/admin/analytics` - System analytics
- `POST /api/admin/notifications` - Send notifications

## 🔒 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://[your-backend-url]
WDS_SOCKET_PORT=443
```

## 🚨 Troubleshooting

### Common Issues

#### Mac-Specific Issues

**MongoDB Not Starting**
```bash
# Check MongoDB status
brew services list | grep mongodb

# Start MongoDB if not running
brew services start mongodb/brew/mongodb-community

# Check MongoDB logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

**Port Already in Use (Mac)**
```bash
# Find what's using port 3000 or 8001
lsof -ti:3000
lsof -ti:8001

# Kill process using the port
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:8001)
```

**Permission Issues (Mac)**
```bash
# Fix npm/yarn permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/.yarn
```

#### General Issues

**Backend Not Starting**
```bash
# Check logs (Mac - if running manually)
cat backend.log

# Check logs (Linux - supervisor)
tail -f /var/log/supervisor/backend.err.log

# Common fixes:
# 1. Check MongoDB is running
# 2. Verify Python dependencies
# 3. Check port 8001 is available
```

**Frontend Not Loading**
```bash
# Check logs (Mac - if running manually)
cat frontend.log

# Check logs (Linux - supervisor)  
tail -f /var/log/supervisor/frontend.err.log

# Common fixes:
# 1. Ensure dependencies installed with yarn (not npm)
# 2. Check port 3000 is available
# 3. Verify REACT_APP_BACKEND_URL is set
```

#### CORS Issues
- Ensure backend CORS middleware is properly configured
- Check that frontend is making requests to correct backend URL

#### Database Connection Issues

**Mac MongoDB Check**
```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ismaster')"
# Or with newer MongoDB:
mongosh --eval "db.adminCommand('ismaster')"
```

**Linux MongoDB Check**
```bash
# Check MongoDB status
sudo supervisorctl status mongodb

# Check MongoDB connection
mongo --eval "db.adminCommand('ismaster')"
```

## 🔄 Development Workflow

### Making Changes

1. **Backend Changes**:
   - Modify Python files in `/app/backend/`
   - Hot reload is enabled via uvicorn
   - Or restart: `sudo supervisorctl restart backend`

2. **Frontend Changes**:
   - Modify React files in `/app/frontend/src/`
   - Hot reload is enabled via Craco
   - Or restart: `sudo supervisorctl restart frontend`

3. **Database Changes**:
   - MongoDB data persists between restarts
   - Use MongoDB shell or GUI tools for direct database access

### Adding New Dependencies

#### Backend
```bash
cd /app/backend
pip install [package-name]
# Add to requirements.txt
echo "[package-name]==[version]" >> requirements.txt
```

#### Frontend
```bash
cd /app/frontend
yarn add [package-name]
# Automatically updates package.json
```

## 📱 Production Considerations

### Security
- Change default JWT secret in production
- Use environment-specific Stripe keys
- Implement proper HTTPS
- Secure MongoDB with authentication

### Performance
- Implement database indexing
- Add caching layer (Redis)
- Optimize React bundle size
- Use production-grade WSGI server

### Monitoring
- Set up logging aggregation
- Monitor API response times
- Track user activities
- Set up alerting for critical errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is developed for the City of Alpharetta's tennis court management system.

## 📞 Support

For technical support or questions:
- Email: athleticprograms@alpharetta.ga.us
- Phone: Check City of Alpharetta website for current contact information

---

**Last Updated**: July 2025
**Version**: 1.0.0