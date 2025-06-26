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
        
    def test_admin_user_editing(self):
        """Test admin user editing functionality"""
        if not self.user or not self.user.get('is_staff', False):
            print("⚠️ Skipping admin user editing test - current user is not staff")
            return False
            
        # First get all users
        success, response = self.run_test(
            "Admin - Get Users for Editing",
            "GET",
            "admin/users",
            200
        )
        
        if not success or 'users' not in response:
            print("❌ Failed to get users for editing test")
            return False
            
        users = response['users']
        if not users:
            print("❌ No users available for testing user editing")
            return False
            
        # Find a non-staff user to edit
        test_user = next((user for user in users if not user.get('is_staff', False)), None)
        if not test_user:
            print("❌ No non-staff users available for testing user editing")
            return False
            
        user_id = test_user['id']
        print(f"Testing user editing for user: {test_user['username']} (ID: {user_id})")
        
        # Test updating resident status
        current_resident_status = test_user.get('is_resident', False)
        new_resident_status = not current_resident_status
        
        success1, response1 = self.run_test(
            "Admin - Update User Resident Status",
            "PUT",
            f"admin/users/{user_id}",
            200,
            data={"is_resident": new_resident_status}
        )
        
        # Test updating ALTA member status
        current_alta_status = test_user.get('is_alta_member', False)
        new_alta_status = not current_alta_status
        
        success2, response2 = self.run_test(
            "Admin - Update User ALTA Status",
            "PUT",
            f"admin/users/{user_id}",
            200,
            data={"is_alta_member": new_alta_status}
        )
        
        # Test updating USTA member status
        current_usta_status = test_user.get('is_usta_member', False)
        new_usta_status = not current_usta_status
        
        success3, response3 = self.run_test(
            "Admin - Update User USTA Status",
            "PUT",
            f"admin/users/{user_id}",
            200,
            data={"is_usta_member": new_usta_status}
        )
        
        # Verify changes persisted by getting the user again
        success4, response4 = self.run_test(
            "Admin - Verify User Changes",
            "GET",
            "admin/users",
            200
        )
        
        verification_passed = False
        if success4 and 'users' in response4:
            updated_users = response4['users']
            updated_user = next((u for u in updated_users if u['id'] == user_id), None)
            
            if updated_user:
                verification_passed = True
                
                if updated_user.get('is_resident') != new_resident_status:
                    print(f"❌ Resident status change not persisted. Expected: {new_resident_status}, Got: {updated_user.get('is_resident')}")
                    verification_passed = False
                else:
                    print(f"✅ Resident status change persisted correctly: {updated_user.get('is_resident')}")
                    
                if updated_user.get('is_alta_member') != new_alta_status:
                    print(f"❌ ALTA member status change not persisted. Expected: {new_alta_status}, Got: {updated_user.get('is_alta_member')}")
                    verification_passed = False
                else:
                    print(f"✅ ALTA member status change persisted correctly: {updated_user.get('is_alta_member')}")
                    
                if updated_user.get('is_usta_member') != new_usta_status:
                    print(f"❌ USTA member status change not persisted. Expected: {new_usta_status}, Got: {updated_user.get('is_usta_member')}")
                    verification_passed = False
                else:
                    print(f"✅ USTA member status change persisted correctly: {updated_user.get('is_usta_member')}")
                
                if verification_passed:
                    print("✅ All user status changes persisted correctly")
            else:
                print("❌ Could not find updated user in response")
                verification_passed = False
        else:
            print("❌ Failed to verify user changes")
            verification_passed = False
        
        # Test security - attempt to modify a staff account
        staff_user = next((user for user in users if user.get('is_staff', False)), None)
        if staff_user:
            staff_id = staff_user['id']
            success5, response5 = self.run_test(
                "Admin - Attempt to Modify Staff Account",
                "PUT",
                f"admin/users/{staff_id}",
                403,  # Should be forbidden
                data={"is_resident": not staff_user.get('is_resident', True)}
            )
            
            if success5:
                print("✅ Security check passed - Cannot modify staff accounts")
            else:
                print("❌ Security check failed - Was able to modify staff account")
                verification_passed = False
        
        return success1 and success2 and success3 and verification_passed

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
        # Test admin user editing functionality
        tester.test_admin_user_editing()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())