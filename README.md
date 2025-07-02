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

#### Option A: Using Supervisor (Recommended)
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

#### Option B: Manual Start (Development)
```bash
# Terminal 1: Start MongoDB (if not using supervisor)
mongod

# Terminal 2: Start Backend
cd /app/backend
python server.py

# Terminal 3: Start Frontend
cd /app/frontend
yarn start
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## 🔧 Service Management

### Supervisor Commands
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

#### Backend Not Starting
```bash
# Check logs
tail -f /var/log/supervisor/backend.err.log

# Common fixes:
# 1. Check MongoDB is running
# 2. Verify Python dependencies
# 3. Check port 8001 is available
```

#### Frontend Not Loading
```bash
# Check logs
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