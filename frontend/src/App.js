import React, { useState, useEffect } from 'react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Re2MCPILVO0kCRV7JN4UiSYfbK1Cfmnsmgz0OO5706JtssWlDCgqqG36RMOC8jrzMn5krKWgxmrTd97NTktje7I00vj07zsqi';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [courts, setCourts] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Remove from unread notifications
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Check for notifications when user logs in
  useEffect(() => {
    if (token && user && !user.is_staff) {
      fetchNotifications();
      // Check for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [token, user]);

  // Load Stripe
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      window.stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    };
    document.head.appendChild(script);
  }, []);

  // Check authentication on load
  useEffect(() => {
    if (token) {
      // Simple check without causing re-renders
      const checkAuth = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/api/courts`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            localStorage.removeItem('token');
            setToken(null);
            setCurrentPage('login');
          }
        } catch (err) {
          console.error('Auth check failed:', err);
        }
      };
      checkAuth();
    }
  }, [token]);

  // Remove the problematic fetchUserProfile function
  
  const handleLogin = async (username, password) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setCurrentPage(data.user.is_staff ? 'admin' : 'dashboard');
        setSuccess('Login successful!');
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setCurrentPage('login');
  };

  const fetchCourts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/courts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setCourts(data.courts);
      }
    } catch (err) {
      console.error('Failed to fetch courts:', err);
    }
  };

  const fetchCourtAvailability = async (date) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/courts/availability?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error('Failed to fetch availability:', err);
    }
  };

  const fetchMyReservations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/reservations/my`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    }
  };

  const createReservation = async (courtId, startTime, endTime, attendees) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          court_id: courtId,
          start_time: startTime,
          end_time: endTime,
          attendees: parseInt(attendees)
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // For demo purposes, simulate successful payment
        // In production, you would use Stripe Elements for proper payment processing
        if (data.client_secret) {
          setSuccess(`Reservation created successfully! Total cost: $${data.total_cost}`);
          fetchMyReservations();
        } else {
          setError('Payment processing failed - no client secret received');
        }
      } else {
        setError(data.detail || 'Reservation failed');
      }
    } catch (err) {
      setError('Reservation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Login Page Component
  const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            {/* Logo/Header Section */}
            <div className="text-center mb-10">
              <div className="feature-icon feature-icon-blue mx-auto mb-6" style={{width: '5rem', height: '5rem'}}>
                <span className="text-4xl">🎾</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Wills Park Tennis Courts
              </h1>
              <p className="text-xl text-gray-600">City of Alpharetta</p>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto mt-4 rounded-full"></div>
            </div>

            <div className="card shadow-professional-lg">
              {error && (
                <div className="alert alert-error">
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              {success && (
                <div className="alert alert-success">
                  <p className="font-semibold">{success}</p>
                </div>
              )}

              <form onSubmit={(e) => {
                e.preventDefault();
                handleLogin(username, password);
              }}>
                <div className="mb-6">
                  <label className="form-label text-lg">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-input text-lg"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div className="mb-8">
                  <label className="form-label text-lg">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input text-lg"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-xl py-4 btn-hover-effect"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner mr-3"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <a 
                    href="https://anc.apm.activecommunities.com/alpharetta/createaccount?onlineSiteId=0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                  >
                    Sign up here
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // User Dashboard Component - SIMPLE VERSION THAT WORKS
  const UserDashboard = () => {
    const [currentTab, setCurrentTab] = useState('home');
    const [bookingData, setBookingData] = useState({
      courtId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      attendees: 1
    });

    // SIMPLE tab switching function
    const goToTab = (tabName) => {
      setCurrentTab(tabName);
    };

    const handleBooking = (e) => {
      e.preventDefault();
      const startDateTime = `${bookingData.date}T${bookingData.startTime}:00`;
      const endDateTime = `${bookingData.date}T${bookingData.endTime}:00`;
      
      createReservation(
        parseInt(bookingData.courtId),
        startDateTime,
        endDateTime,
        bookingData.attendees
      );
    };

    const calculatePrice = () => {
      if (!bookingData.startTime || !bookingData.endTime) return 0;
      
      const start = new Date(`${bookingData.date}T${bookingData.startTime}`);
      const end = new Date(`${bookingData.date}T${bookingData.endTime}`);
      const hours = (end - start) / (1000 * 60 * 60);
      
      const isResident = user?.is_resident || user?.is_alta_member || user?.is_usta_member;
      const rate = isResident ? 4 : 6;
      
      return (hours * rate).toFixed(2);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Wills Park Tennis Courts
              </h1>
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                {notifications.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      className="relative p-2 text-gray-600 hover:text-gray-800"
                    >
                      <span className="text-xl">🔔</span>
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications.length}
                      </span>
                    </button>
                  </div>
                )}
                <span className="text-gray-600">Welcome, {user?.username}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
            
            {/* Notification Messages */}
            {notifications.length > 0 && (
              <div className="mt-4 space-y-2">
                {notifications.map(notification => (
                  <div key={notification.id} className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-blue-800 font-medium">📢 System Notification</p>
                        <p className="text-blue-700">{notification.message}</p>
                        <p className="text-blue-600 text-sm mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notification.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <nav className="flex space-x-8 border-b">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Home button clicked');
                  goToTab('home');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  currentTab === 'home'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Book button clicked');
                  goToTab('book');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  currentTab === 'book'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Book Courts
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Availability button clicked');
                  goToTab('availability');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  currentTab === 'availability'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Check Availability
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Reservations button clicked');
                  goToTab('reservations');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  currentTab === 'reservations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Reservations
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Contact button clicked');
                  goToTab('contact');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  currentTab === 'contact'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Contact
              </button>
            </nav>
          </div>

          {currentTab === 'home' && (
            <div className="space-y-8">
              {/* Hero Section with YOUR tennis courts image */}
              <div 
                className="text-white rounded-2xl p-12 shadow-lg relative overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(30, 64, 175, 0.8), rgba(5, 150, 105, 0.8)), url('https://i.imgur.com/SEHbnIB.jpeg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  minHeight: '400px'
                }}
              >
                <div className="relative z-10 max-w-4xl">
                  <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                    Welcome to Wills Park Tennis Courts
                  </h1>
                  <p className="text-xl mb-8 opacity-95 leading-relaxed">
                    Experience premier tennis facilities in the heart of Alpharetta. Our state-of-the-art courts offer the perfect venue for players of all skill levels.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => goToTab('book')}
                      className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all duration-300 shadow-lg"
                    >
                      Book a Court Now
                    </button>
                    <button
                      type="button"
                      onClick={() => goToTab('availability')}
                      className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-300"
                    >
                      Check Availability
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎾</span>
                  </div>
                  <div className="text-4xl font-bold text-blue-600 mb-3">4</div>
                  <div className="text-gray-800 font-semibold text-lg mb-2">Available Courts</div>
                  <div className="text-gray-600">Courts 1-4 can be reserved for play</div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💰</span>
                  </div>
                  <div className="text-4xl font-bold text-green-600 mb-3">
                    ${user?.is_resident || user?.is_alta_member || user?.is_usta_member ? '4' : '6'}
                  </div>
                  <div className="text-gray-800 font-semibold text-lg mb-2">Your Hourly Rate</div>
                  <div className="text-gray-600">
                    {user?.is_resident ? 'Resident pricing' : 'Non-resident pricing'}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⏰</span>
                  </div>
                  <div className="text-4xl font-bold text-purple-600 mb-3">7AM-10PM</div>
                  <div className="text-gray-800 font-semibold text-lg mb-2">Operating Hours</div>
                  <div className="text-gray-600">Daily court availability</div>
                </div>
              </div>

              {/* Court Features - REMOVED PICKLEBALL */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Professional Court Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">🏆</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Professional Courts</h3>
                    <p className="text-gray-700 leading-relaxed">Championship-quality surfaces designed for optimal performance and player safety</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">💡</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">LED Lighting</h3>
                    <p className="text-gray-700 leading-relaxed">State-of-the-art LED lighting system for perfect visibility during evening play</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-3xl">🅿️</span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Free Parking</h3>
                    <p className="text-gray-700 leading-relaxed">Ample complimentary parking spaces available for all court users</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => goToTab('reservations')}
                    className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-6">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">View My Reservations</h3>
                      <p className="text-gray-600">Check your upcoming bookings and manage your schedule</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => goToTab('contact')}
                    className="flex items-center p-6 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-6">
                      <span className="text-2xl">📞</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 text-lg mb-2">Contact Us</h3>
                      <p className="text-gray-600">Get assistance or ask questions about our facilities</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* YOUR Tennis Courts Photo */}
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <img 
                  src="https://i.imgur.com/SEHbnIB.jpeg" 
                  alt="Wills Park Tennis Courts"
                  className="w-full h-64 md:h-80 object-cover"
                />
                <div className="bg-white p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Wills Park Tennis Complex</h2>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Our premium tennis facility features six (4 of which can be reserved) professional courts designed to meet the highest standards. Located in the beautiful Wills Park, we offer an unparalleled tennis experience in Alpharetta.
                  </p>
                </div>
              </div>

              {/* Rules & Policies */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-8">
                <h2 className="text-3xl font-bold text-yellow-900 mb-8 text-center">Important Booking Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    <h3 className="font-bold text-yellow-900 mb-4 text-xl">📋 Booking Rules</h3>
                    <ul className="text-gray-700 space-y-3">
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Minimum reservation: 2 hours</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Maximum attendees: 20 per court</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Residents: Book up to 7 days in advance</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Non-residents: Book up to 5 days in advance</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    <h3 className="font-bold text-yellow-900 mb-4 text-xl">💳 Pricing</h3>
                    <ul className="text-gray-700 space-y-3">
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Residents/ALTA/USTA: $4 per hour</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Non-residents: $6 per hour</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Secure payment required at booking</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Flexible cancellation policy available</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'contact' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Contact Information</h2>
              
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Get in Touch</h3>
                    <div className="space-y-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-6">
                          <span className="text-2xl">📞</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">Phone</p>
                          <p className="text-gray-700 text-lg">678-297-6130</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-6">
                          <span className="text-2xl">✉️</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">Email</p>
                          <p className="text-gray-700 text-lg">athleticprograms@alpharetta.ga.us</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-6">
                          <span className="text-2xl">📍</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg">Location</p>
                          <p className="text-gray-700 text-lg">Wills Park Recreation Center<br />11925 Wills Rd, Alpharetta, GA 30009</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Operating Hours</h3>
                    <div className="bg-blue-50 rounded-xl p-6 mb-8">
                      <div className="text-center">
                        <div className="flex justify-center items-center mb-2">
                          <span className="text-gray-700 font-semibold text-lg">Monday - Sunday</span>
                        </div>
                        <span className="font-bold text-blue-700 text-lg">7:00 AM - 10:00 PM</span>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Need Help?</h3>
                    <div className="space-y-4">
                      <a
                        href="https://www.alpharetta.ga.us/government/departments/recreation-parks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-center"
                      >
                        <span className="font-bold text-blue-600 text-lg">Visit City Website</span>
                        <p className="text-gray-600 mt-2">alpharetta.ga.us/recreation-parks</p>
                      </a>
                      <div className="p-6 border-2 border-gray-200 rounded-xl text-center">
                        <span className="font-bold text-gray-900 text-lg">Facility Manager</span>
                        <p className="text-gray-600 mt-2">Available during operating hours for assistance</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'availability' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Real-Time Court Availability</h2>
                
                <div className="mb-8 max-w-md mx-auto">
                  <label className="block text-lg font-semibold text-gray-700 mb-3 text-center">
                    Select Date
                  </label>
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="date"
                      value={bookingData.date}
                      onChange={(e) => {
                        console.log('Date changed to:', e.target.value);
                        const newDate = e.target.value;
                        setBookingData(prev => ({...prev, date: newDate}));
                        fetchCourtAvailability(newDate);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg text-center"
                    />
                  </div>
                  <p className="text-center text-gray-600 mt-2">
                    {new Date(bookingData.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {courts.filter(court => court.available).map(court => {
                    const courtReservations = reservations.filter(res => res.court_id === court.id);
                    const isFullyBooked = courtReservations.length >= 8; // Assuming 8 possible time slots per day
                    
                    return (
                      <div 
                        key={court.id} 
                        className={`relative rounded-2xl p-6 border-2 transition-all duration-300 ${
                          isFullyBooked 
                            ? 'border-red-300 bg-red-50' 
                            : courtReservations.length > 0 
                              ? 'border-yellow-300 bg-yellow-50' 
                              : 'border-green-300 bg-green-50'
                        }`}
                      >
                        {/* Court Header */}
                        <div className="text-center mb-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            isFullyBooked 
                              ? 'bg-red-200' 
                              : courtReservations.length > 0 
                                ? 'bg-yellow-200' 
                                : 'bg-green-200'
                          }`}>
                            <span className="text-2xl">🎾</span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-xl">{court.name}</h3>
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-2 ${
                            isFullyBooked 
                              ? 'bg-red-200 text-red-800' 
                              : courtReservations.length > 0 
                                ? 'bg-yellow-200 text-yellow-800' 
                                : 'bg-green-200 text-green-800'
                          }`}>
                            {isFullyBooked ? 'Fully Booked' : courtReservations.length > 0 ? 'Partially Booked' : 'Available'}
                          </div>
                        </div>

                        {/* Availability Summary */}
                        <div className="text-center mb-4">
                          <div className="text-2xl font-bold text-gray-800">
                            {8 - courtReservations.length}/8
                          </div>
                          <div className="text-sm text-gray-600">Time Slots Available</div>
                        </div>

                        {/* Time Slots */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-800 text-sm mb-3">
                            {courtReservations.length > 0 ? 'Reserved Times:' : 'No Reservations Today!'}
                          </h4>
                          
                          {courtReservations.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {courtReservations.map(reservation => (
                                <div 
                                  key={reservation.id} 
                                  className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-semibold text-gray-800 text-sm">
                                        {new Date(reservation.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                        {new Date(reservation.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {reservation.attendees} player{reservation.attendees > 1 ? 's' : ''}
                                      </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                      reservation.status === 'confirmed' 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {reservation.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <div className="text-4xl mb-2">🎉</div>
                              <div className="text-sm text-gray-600">
                                Perfect! This court is completely free today.
                              </div>
                              <button
                                type="button"
                                onClick={() => goToTab('book')}
                                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                              >
                                Book Now
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Peak Hours Indicator */}
                        {courtReservations.length > 4 && (
                          <div className="mt-4 p-2 bg-orange-100 rounded-lg">
                            <div className="text-center text-orange-800 text-xs font-semibold">
                              🔥 Popular Day - Limited Availability
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall Summary - FIXED CALCULATIONS */}
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Today's Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {courts.filter(court => court.available).length || 4}
                      </div>
                      <div className="text-sm text-gray-600">Available Courts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {reservations.length || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Reservations Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(4 * 8) - (reservations.length || 0)}
                      </div>
                      <div className="text-sm text-gray-600">Available Time Slots</div>
                    </div>
                  </div>
                  
                  {/* Additional debug info */}
                  <div className="mt-4 p-3 bg-white rounded text-xs text-gray-600">
                    <p>Courts data: {courts.length} total, {courts.filter(c => c.available).length} available</p>
                    <p>Reservations data: {reservations.length} for {bookingData.date}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => goToTab('book')}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 shadow-lg mr-4"
                  >
                    Book Available Court
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowStr = tomorrow.toISOString().split('T')[0];
                      setBookingData({...bookingData, date: tomorrowStr});
                      fetchCourtAvailability(tomorrowStr);
                    }}
                    className="bg-gray-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-700 transition-all duration-300 shadow-lg"
                  >
                    Check Tomorrow
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'reservations' && (
            <div className="card fade-in-up">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">My Reservations</h2>
              
              {reservations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="feature-icon feature-icon-blue mx-auto mb-6">
                    <span className="text-4xl">📅</span>
                  </div>
                  <p className="text-gray-500 text-xl mb-6">No reservations found.</p>
                  <button
                    type="button"
                    onClick={() => goToTab('book')}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Book Your First Court
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {reservations.map(reservation => (
                    <div key={reservation.id} className="card card-hover">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-900 text-xl mb-2">
                            Court {reservation.court_id}
                          </h3>
                          <p className="text-gray-700 text-lg mb-1">
                            {new Date(reservation.start_time).toLocaleDateString()} | 
                            {new Date(reservation.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {new Date(reservation.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-gray-600">
                            Attendees: {reservation.attendees}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`status-badge ${
                            reservation.status === 'confirmed' 
                              ? 'status-confirmed'
                              : reservation.status === 'pending'
                              ? 'status-pending'
                              : 'status-cancelled'
                          }`}>
                            {reservation.status}
                          </span>
                          <p className="text-gray-900 font-bold mt-2 text-xl">
                            ${reservation.total_cost}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentTab === 'book' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Book a Court</h2>
              
              <form onSubmit={handleBooking} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Court Selection
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {courts.filter(court => court.available).map(court => (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => setBookingData({...bookingData, courtId: court.id})}
                          className={`p-4 border-2 rounded-xl text-center transition-all duration-200 ${
                            bookingData.courtId === court.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="text-2xl mb-2">🎾</div>
                          <div className="font-semibold">{court.name}</div>
                          <div className="text-sm text-gray-600">Available</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Date
                    </label>
                    <input
                      type="date"
                      value={bookingData.date}
                      onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={bookingData.startTime}
                      onChange={(e) => setBookingData({...bookingData, startTime: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={bookingData.endTime}
                      onChange={(e) => setBookingData({...bookingData, endTime: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-lg font-semibold text-gray-700 mb-3">
                      Number of Attendees
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={bookingData.attendees}
                      onChange={(e) => setBookingData({...bookingData, attendees: e.target.value})}
                      className="w-full max-w-xs px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-lg"
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <h3 className="font-bold text-blue-900 mb-4 text-xl">💰 Pricing Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-blue-800 mb-2">
                        <strong>Your Status:</strong> {user?.is_resident ? 'Resident' : 'Non-Resident'}
                        {user?.is_alta_member && ' (ALTA Member)'}
                        {user?.is_usta_member && ' (USTA Member)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-800 mb-2">
                        <strong>Rate:</strong> ${user?.is_resident || user?.is_alta_member || user?.is_usta_member ? '4' : '6'} per hour
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-800 font-bold text-xl">
                        <strong>Total Cost:</strong> ${calculatePrice()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                  <h3 className="font-bold text-yellow-900 mb-4 text-xl">📋 Booking Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ul className="text-yellow-800 space-y-2">
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Minimum reservation: 2 hours</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Maximum attendees: 20 per court</li>
                    </ul>
                    <ul className="text-yellow-800 space-y-2">
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Residents: 7 days advance booking</li>
                      <li className="flex items-center"><span className="text-yellow-600 mr-2">•</span>Non-residents: 5 days advance booking</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !calculatePrice()}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold text-xl transition-all"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      Processing...
                    </div>
                  ) : (
                    `Book Court - $${calculatePrice()}`
                  )}
                </button>
              </form>
            </div>
          )}



          {currentTab === 'reservations' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">My Reservations</h2>
              
              {reservations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No reservations found.</p>
              ) : (
                <div className="space-y-4">
                  {reservations.map(reservation => (
                    <div key={reservation.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Court {reservation.court_id}
                          </h3>
                          <p className="text-gray-600">
                            {new Date(reservation.start_time).toLocaleDateString()} | 
                            {new Date(reservation.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {new Date(reservation.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                          <p className="text-gray-600">
                            Attendees: {reservation.attendees}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            reservation.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : reservation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {reservation.status}
                          </span>
                          <p className="text-gray-900 font-semibold mt-1">
                            ${reservation.total_cost}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Admin Dashboard Component - COMPLETELY REWRITTEN
  const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [allReservations, setAllReservations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [analytics, setAnalytics] = useState({});

    useEffect(() => {
      fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [reservationsRes, usersRes, analyticsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/admin/reservations`, { headers }),
          fetch(`${BACKEND_URL}/api/admin/users`, { headers }),
          fetch(`${BACKEND_URL}/api/admin/analytics`, { headers })
        ]);

        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json();
          setAllReservations(reservationsData.reservations || []);
        }
        
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setAllUsers(usersData.users || []);
        }
        
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
        setError('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    const handleAdminTabChange = (tabName) => {
      console.log('Admin changing tab to:', tabName);
      setActiveTab(tabName);
    };

    const updateUserStatus = async (userId, field, newValue, userName) => {
      const confirmMessage = `Are you sure you want to change this user's info?\n\nUser: ${userName}\nChanging: ${field}\nNew Value: ${newValue ? 'Yes' : 'No'}`;
      
      if (window.confirm(confirmMessage)) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ [field]: newValue })
          });

          if (response.ok) {
            // Refresh admin data to show updated values
            fetchAdminData();
            setSuccess(`User ${field} updated successfully`);
            setTimeout(() => setSuccess(''), 3000);
          } else {
            const errorData = await response.json();
            setError(errorData.detail || 'Failed to update user');
            setTimeout(() => setError(''), 3000);
          }
        } catch (err) {
          setError('Failed to update user');
          setTimeout(() => setError(''), 3000);
        }
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard - Wills Park Tennis
              </h1>
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Staff: {user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <nav className="flex space-x-8 border-b">
              <button
                type="button"
                onClick={() => handleAdminTabChange('overview')}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => handleAdminTabChange('reservations')}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'reservations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Reservations
              </button>
              <button
                type="button"
                onClick={() => handleAdminTabChange('users')}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Users
              </button>
              <button
                type="button"
                onClick={() => handleAdminTabChange('analytics')}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics & Reports
              </button>
            </nav>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Reservations</h3>
                <p className="text-3xl font-bold text-blue-600">{analytics.total_reservations || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmed Bookings</h3>
                <p className="text-3xl font-bold text-green-600">{analytics.confirmed_reservations || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold text-green-600">${analytics.total_revenue || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-gray-600">{analytics.total_users || 0}</p>
              </div>
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">All Reservations</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Court</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date & Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Attendees</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cost</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allReservations.map(reservation => (
                      <tr key={reservation.id} className="border-t">
                        <td className="px-4 py-3">Court {reservation.court_id}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p>{new Date(reservation.start_time).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(reservation.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                              {new Date(reservation.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{reservation.user_id}</td>
                        <td className="px-4 py-3">{reservation.attendees}</td>
                        <td className="px-4 py-3">${reservation.total_cost}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            reservation.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : reservation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {reservation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">User Management</h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-700">{success}</p>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Resident</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ALTA</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">USTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(user => (
                      <tr key={user.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{user.username}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user.id, 'is_resident', !user.is_resident, user.username)}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 ${
                              user.is_resident 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {user.is_resident ? 'Yes' : 'No'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user.id, 'is_alta_member', !user.is_alta_member, user.username)}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 ${
                              user.is_alta_member 
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {user.is_alta_member ? 'Yes' : 'No'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user.id, 'is_usta_member', !user.is_usta_member, user.username)}
                            className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all duration-200 ${
                              user.is_usta_member 
                                ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {user.is_usta_member ? 'Yes' : 'No'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {allUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No users found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold mb-6">Financial Reports</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Total Revenue</h3>
                    <p className="text-2xl font-bold text-green-700">${analytics.total_revenue || 0}</p>
                    <p className="text-sm text-green-600">All confirmed bookings</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Average Booking Value</h3>
                    <p className="text-2xl font-bold text-blue-700">
                      ${analytics.confirmed_reservations > 0 ? 
                        ((analytics.total_revenue || 0) / analytics.confirmed_reservations).toFixed(2) : 
                        '0.00'}
                    </p>
                    <p className="text-sm text-blue-600">Per reservation</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900 mb-2">Conversion Rate</h3>
                    <p className="text-2xl font-bold text-purple-700">
                      {analytics.total_reservations > 0 ? 
                        Math.round((analytics.confirmed_reservations / analytics.total_reservations) * 100) : 
                        0}%
                    </p>
                    <p className="text-sm text-purple-600">Confirmed vs total</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Export Options</h3>
                    <div className="space-y-2">
                      <button 
                        type="button"
                        onClick={() => {
                          // Generate CSV export
                          const csvData = allReservations.map(res => 
                            `${res.id},${res.court_id},${res.start_time},${res.end_time},${res.total_cost},${res.status}`
                          ).join('\n');
                          const blob = new Blob([`ID,Court,Start Time,End Time,Cost,Status\n${csvData}`], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'monthly_revenue_report.csv';
                          a.click();
                        }}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        📊 Export Monthly Revenue Report
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          // Generate usage analytics CSV
                          const csvData = courts.map(court => 
                            `${court.name},${allReservations.filter(res => res.court_id === court.id).length}`
                          ).join('\n');
                          const blob = new Blob([`Court,Total Bookings\n${csvData}`], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'usage_analytics.csv';
                          a.click();
                        }}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        📈 Export Usage Analytics
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          // Generate user activity CSV
                          const csvData = allUsers.map(user => 
                            `${user.username},${user.email},${user.is_resident ? 'Resident' : 'Non-Resident'}`
                          ).join('\n');
                          const blob = new Blob([`Username,Email,Status\n${csvData}`], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'user_activity_report.csv';
                          a.click();
                        }}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        👥 Export User Activity Report
                      </button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button 
                        type="button"
                        onClick={async () => {
                          const message = prompt('Enter notification message:');
                          if (message && message.trim()) {
                            try {
                              const response = await fetch(`${BACKEND_URL}/api/admin/notifications`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ message: message.trim() })
                              });
                              
                              if (response.ok) {
                                setSuccess(`Notification sent to all users: "${message}"`);
                                setTimeout(() => setSuccess(''), 3000);
                              } else {
                                const errorData = await response.json();
                                setError(errorData.detail || 'Failed to send notification');
                                setTimeout(() => setError(''), 3000);
                              }
                            } catch (err) {
                              setError('Failed to send notification');
                              setTimeout(() => setError(''), 3000);
                            }
                          }
                        }}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        📢 Send System Notification
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const date = prompt('Enter maintenance date (YYYY-MM-DD):');
                          if (date) {
                            alert(`Maintenance scheduled for ${date}`);
                            // In real app, this would block court availability
                          }
                        }}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        🔧 Schedule Maintenance Block
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          // Generate court usage report
                          const report = courts.map(court => {
                            const bookings = allReservations.filter(res => res.court_id === court.id);
                            const revenue = bookings.reduce((sum, res) => sum + res.total_cost, 0);
                            return `${court.name}: ${bookings.length} bookings, $${revenue} revenue`;
                          }).join('\n');
                          
                          const blob = new Blob([`Court Usage Report\n${new Date().toDateString()}\n\n${report}`], { type: 'text/plain' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'court_usage_report.txt';
                          a.click();
                        }}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        📋 Generate Court Usage Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render appropriate page
  if (currentPage === 'login' || currentPage === 'staff-login') {
    return <LoginPage />;
  } else if (currentPage === 'admin' && user?.is_staff) {
    return <AdminDashboard />;
  } else if (currentPage === 'dashboard') {
    return <UserDashboard />;
  }

  return <LoginPage />;
}

export default App;