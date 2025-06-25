import requests
import sys
from datetime import datetime, timedelta
import json

class TennisCourtAPITester:
    def __init__(self, base_url="https://851b1ca6-6412-4cb6-b95e-4d1d4e435eb7.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.courts = []

    def run_test(self, name, method, endpoint, expected_status, data=None, auth=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        print(f"\n🔑 Testing login with {username}...")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password},
            auth=False
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user = response.get('user', {})
            print(f"✅ Login successful for {username}")
            print(f"User details: {json.dumps(self.user, indent=2)}")
            return True
        print(f"❌ Login failed for {username}")
        return False

    def test_get_courts(self):
        """Test getting available courts"""
        success, response = self.run_test(
            "Get Courts",
            "GET",
            "courts",
            200
        )
        if success and 'courts' in response:
            self.courts = response['courts']
            print(f"✅ Retrieved {len(self.courts)} courts")
            print(f"Courts: {json.dumps(self.courts, indent=2)}")
            return True
        return False

    def test_court_availability(self, date=None):
        """Test court availability for a specific date"""
        if date is None:
            date = datetime.now().isoformat().split('T')[0]
        
        success, response = self.run_test(
            "Court Availability",
            "GET",
            f"courts/availability?date={date}",
            200
        )
        if success:
            print(f"✅ Retrieved availability for {date}")
            print(f"Reservations: {len(response.get('reservations', []))}")
            return True
        return False

    def test_my_reservations(self):
        """Test getting user's reservations"""
        success, response = self.run_test(
            "My Reservations",
            "GET",
            "reservations/my",
            200
        )
        if success:
            reservations = response.get('reservations', [])
            print(f"✅ Retrieved {len(reservations)} user reservations")
            if reservations:
                print(f"First reservation: {json.dumps(reservations[0], indent=2)}")
            return True
        return False

    def test_create_reservation(self):
        """Test creating a reservation"""
        if not self.courts:
            print("❌ No courts available for testing reservation creation")
            return False
            
        # Find an available court
        available_courts = [court for court in self.courts if court.get('available', False)]
        if not available_courts:
            print("❌ No available courts for testing reservation creation")
            return False
            
        court_id = available_courts[0]['id']
        
        # Create a reservation for tomorrow
        tomorrow = datetime.now() + timedelta(days=1)
        date = tomorrow.strftime('%Y-%m-%d')
        
        # 2-hour reservation from 10 AM to 12 PM
        start_time = f"{date}T10:00:00"
        end_time = f"{date}T12:00:00"
        
        success, response = self.run_test(
            "Create Reservation",
            "POST",
            "reservations",
            200,
            data={
                "court_id": court_id,
                "start_time": start_time,
                "end_time": end_time,
                "attendees": 4
            }
        )
        
        if success:
            print(f"✅ Created reservation for court {court_id}")
            print(f"Reservation details: {json.dumps(response, indent=2)}")
            return True
        return False

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not self.user or not self.user.get('is_staff', False):
            print("⚠️ Skipping admin tests - current user is not staff")
            return False
            
        # Test getting all reservations
        success1, response1 = self.run_test(
            "Admin - All Reservations",
            "GET",
            "admin/reservations",
            200
        )
        
        # Test getting all users
        success2, response2 = self.run_test(
            "Admin - All Users",
            "GET",
            "admin/users",
            200
        )
        
        # Test analytics
        success3, response3 = self.run_test(
            "Admin - Analytics",
            "GET",
            "admin/analytics",
            200
        )
        
        if success1 and success2 and success3:
            print("✅ All admin endpoints working correctly")
            print(f"Analytics: {json.dumps(response3, indent=2)}")
            return True
        return False

def main():
    # Setup
    tester = TennisCourtAPITester()
    
    # Test member login
    member_success = tester.test_login("membermock", "trial123")
    if not member_success:
        print("❌ Member login failed, stopping tests")
        return 1
        
    # Test basic endpoints
    tester.test_get_courts()
    tester.test_court_availability()
    tester.test_my_reservations()
    
    # Test reservation creation
    tester.test_create_reservation()
    
    # Logout by clearing token
    tester.token = None
    tester.user = None
    
    # Test staff login
    staff_success = tester.test_login("AlpharettaStaff1122", "JVtt3MfdJLGv6Qv0MUC3")
    if staff_success:
        # Test admin endpoints
        tester.test_admin_endpoints()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())