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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/courts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setCurrentPage(user?.is_staff ? 'admin' : 'dashboard');
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const handleLogin = async (username, password) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        // Process payment with Stripe
        if (window.stripe && data.client_secret) {
          const { error } = await window.stripe.confirmCardPayment(data.client_secret, {
            payment_method: {
              card: {
                // In a real app, you'd use Stripe Elements for card input
                // For demo purposes, using test card
                number: '4242424242424242',
                exp_month: 12,
                exp_year: 2025,
                cvc: '123',
              }
            }
          });

          if (error) {
            setError(`Payment failed: ${error.message}`);
          } else {
            setSuccess(`Reservation created! Total cost: $${data.total_cost}`);
            fetchMyReservations();
          }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Wills Park Tennis Courts
              </h1>
              <p className="text-gray-600">City of Alpharetta</p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              handleLogin(username, password);
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-2">
                Don't have an account?{' '}
                <a 
                  href="https://anc.apm.activecommunities.com/alpharetta/createaccount?onlineSiteId=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Sign up here
                </a>
              </p>
              <p className="text-sm text-gray-600">
                Staff member?{' '}
                <button
                  onClick={() => setCurrentPage('staff-login')}
                  className="text-blue-600 hover:underline"
                >
                  Log in here
                </button>
              </p>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Demo Account:</h3>
              <p className="text-sm text-gray-600">
                <strong>Member Demo:</strong> membermock / trial123
              </p>
              <p className="text-xs text-gray-500 mt-2">
                For staff access, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // User Dashboard Component
  const UserDashboard = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [bookingForm, setBookingForm] = useState({
      courtId: '',
      date: selectedDate,
      startTime: '',
      endTime: '',
      attendees: 1
    });

    useEffect(() => {
      fetchCourts();
      fetchMyReservations();
    }, []);

    useEffect(() => {
      if (activeTab === 'book') {
        fetchCourtAvailability(bookingForm.date);
      }
    }, [bookingForm.date, activeTab]);

    const handleBooking = (e) => {
      e.preventDefault();
      const startDateTime = `${bookingForm.date}T${bookingForm.startTime}:00`;
      const endDateTime = `${bookingForm.date}T${bookingForm.endTime}:00`;
      
      createReservation(
        parseInt(bookingForm.courtId),
        startDateTime,
        endDateTime,
        bookingForm.attendees
      );
    };

    const calculatePrice = () => {
      if (!bookingForm.startTime || !bookingForm.endTime) return 0;
      
      const start = new Date(`${bookingForm.date}T${bookingForm.startTime}`);
      const end = new Date(`${bookingForm.date}T${bookingForm.endTime}`);
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
                <span className="text-gray-600">Welcome, {user?.username}</span>
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
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('home');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'home'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('book');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'book'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Book Courts
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('availability');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'availability'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Check Availability
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('reservations');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'reservations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Reservations
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('contact');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'contact'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Contact
              </button>
            </nav>
          </div>

          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl p-8">
                <div className="max-w-4xl">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">
                    Welcome to Wills Park Tennis Courts
                  </h1>
                  <p className="text-xl mb-6 opacity-90">
                    Your premier tennis destination in the heart of Alpharetta. Book courts, check availability, and manage your reservations with ease.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('book');
                      }}
                      className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Book a Court Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('availability');
                      }}
                      className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                    >
                      Check Availability
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">4</div>
                  <div className="text-gray-600">Available Courts</div>
                  <div className="text-sm text-gray-500 mt-2">Courts 1-4 ready for play</div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${user?.is_resident || user?.is_alta_member || user?.is_usta_member ? '4' : '6'}
                  </div>
                  <div className="text-gray-600">Your Hourly Rate</div>
                  <div className="text-sm text-gray-500 mt-2">
                    {user?.is_resident ? 'Resident rate' : 'Non-resident rate'}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">7AM-10PM</div>
                  <div className="text-gray-600">Operating Hours</div>
                  <div className="text-sm text-gray-500 mt-2">Daily availability</div>
                </div>
              </div>

              {/* Court Features */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Court Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🎾</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Professional Courts</h3>
                    <p className="text-gray-600 text-sm">High-quality surfaces for optimal play</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💡</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">LED Lighting</h3>
                    <p className="text-gray-600 text-sm">Play day or night with excellent visibility</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🏐</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Pickleball Ready</h3>
                    <p className="text-gray-600 text-sm">All courts lined for pickleball play</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🅿️</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Free Parking</h3>
                    <p className="text-gray-600 text-sm">Convenient parking available</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('reservations');
                    }}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-xl">📅</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">View My Reservations</h3>
                      <p className="text-gray-600 text-sm">Check your upcoming bookings</p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('contact');
                    }}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all"
                  >
                    <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-xl">📞</span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Contact Us</h3>
                      <p className="text-gray-600 text-sm">Get help or ask questions</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rules & Policies */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-yellow-900 mb-6">Important Booking Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-3">Booking Rules</h3>
                    <ul className="text-yellow-800 text-sm space-y-2">
                      <li>• Minimum reservation: 2 hours</li>
                      <li>• Maximum attendees: 20 per court</li>
                      <li>• Residents: Book up to 7 days in advance</li>
                      <li>• Non-residents: Book up to 5 days in advance</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-3">Pricing</h3>
                    <ul className="text-yellow-800 text-sm space-y-2">
                      <li>• Residents/ALTA/USTA: $4 per hour</li>
                      <li>• Non-residents: $6 per hour</li>
                      <li>• Payment required at booking</li>
                      <li>• Cancellation policy applies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Get in Touch</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-lg">📞</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Phone</p>
                        <p className="text-gray-600">678-297-6130</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-lg">✉️</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Email</p>
                        <p className="text-gray-600">athleticprograms@alpharetta.ga.us</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center mr-4">
                        <span className="text-lg">📍</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Location</p>
                        <p className="text-gray-600">Wills Park Recreation Center<br />11925 Wills Rd, Alpharetta, GA 30009</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monday - Sunday</span>
                        <span className="font-medium text-gray-900">7:00 AM - 10:00 PM</span>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-6">Need Help?</h3>
                  <div className="space-y-3">
                    <a
                      href="https://www.alpharetta.ga.us/government/departments/recreation-parks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <span className="font-medium text-blue-600">Visit City Website</span>
                      <p className="text-sm text-gray-600">alpharetta.ga.us/recreation-parks</p>
                    </a>
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <span className="font-medium text-gray-900">Facility Manager</span>
                      <p className="text-sm text-gray-600">Available during operating hours for assistance</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'book' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">Book a Court</h2>
              
              <form onSubmit={handleBooking} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Court
                    </label>
                    <select
                      value={bookingForm.courtId}
                      onChange={(e) => setBookingForm({...bookingForm, courtId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Select a court</option>
                      {courts.filter(court => court.available).map(court => (
                        <option key={court.id} value={court.id}>
                          {court.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm({...bookingForm, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={bookingForm.startTime}
                      onChange={(e) => setBookingForm({...bookingForm, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={bookingForm.endTime}
                      onChange={(e) => setBookingForm({...bookingForm, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Attendees
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={bookingForm.attendees}
                      onChange={(e) => setBookingForm({...bookingForm, attendees: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Pricing Information</h3>
                  <p className="text-blue-800 text-sm mb-2">
                    <strong>Your Status:</strong> {user?.is_resident ? 'Resident' : 'Non-Resident'}
                    {user?.is_alta_member && ' (ALTA Member)'}
                    {user?.is_usta_member && ' (USTA Member)'}
                  </p>
                  <p className="text-blue-800 text-sm mb-2">
                    <strong>Rate:</strong> ${user?.is_resident || user?.is_alta_member || user?.is_usta_member ? '4' : '6'} per hour
                  </p>
                  <p className="text-blue-800 text-sm font-semibold">
                    <strong>Estimated Cost:</strong> ${calculatePrice()}
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">Booking Rules</h3>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Minimum reservation: 2 hours</li>
                    <li>• Maximum attendees: 20 per court</li>
                    <li>• Residents: 7 days advance booking</li>
                    <li>• Non-residents: 5 days advance booking</li>
                    <li>• Courts available: 7:00 AM - 10:00 PM</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Processing...' : `Book Court - $${calculatePrice()}`}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-6">Court Availability</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    fetchCourtAvailability(e.target.value);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {courts.filter(court => court.available).map(court => (
                  <div key={court.id} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{court.name}</h3>
                    <div className="space-y-2">
                      {reservations
                        .filter(res => res.court_id === court.id)
                        .map(reservation => (
                          <div key={reservation.id} className="bg-red-100 p-2 rounded text-sm">
                            <p className="text-red-800">
                              {new Date(reservation.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                              {new Date(reservation.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <p className="text-red-600 text-xs">Reserved</p>
                          </div>
                        ))}
                      {reservations.filter(res => res.court_id === court.id).length === 0 && (
                        <div className="bg-green-100 p-2 rounded text-sm">
                          <p className="text-green-800">Available all day</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reservations' && (
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

  // Admin Dashboard Component
  const AdminDashboard = () => {
    const [allReservations, setAllReservations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
      fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
      try {
        const [reservationsRes, usersRes, analyticsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/admin/reservations`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${BACKEND_URL}/api/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${BACKEND_URL}/api/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const reservationsData = await reservationsRes.json();
        const usersData = await usersRes.json();
        const analyticsData = await analyticsRes.json();

        setAllReservations(reservationsData.reservations || []);
        setAllUsers(usersData.users || []);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
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
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('overview');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('reservations');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'reservations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                All Reservations
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('users');
                }}
                className={`pb-4 border-b-2 font-medium transition-all duration-200 ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Users
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('analytics');
                }}
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
              
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Resident</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ALTA</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">USTA</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(user => (
                      <tr key={user.id} className="border-t">
                        <td className="px-4 py-3">{user.username}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_resident ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_resident ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_alta_member ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_alta_member ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_usta_member ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_usta_member ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_staff ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_staff ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        📊 Export Monthly Revenue Report
                      </button>
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        📈 Export Usage Analytics
                      </button>
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        👥 Export User Activity Report
                      </button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        📢 Send System Notification
                      </button>
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        🔧 Schedule Maintenance Block
                      </button>
                      <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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