import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AppLayout from './components/Layout/Layout';
import LoginPage from './pages/Login';
import LicenseExpired from './pages/LicenseExpired';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentManagement from './pages/StudentManagement';
import Employees from './pages/Employees';
import Subjects from './pages/Subjects';
import ClassesPage from './pages/ClassesPage';
import Attendance from './pages/Attendance';
import Finance from './pages/Finance';
import FeeCollection from './pages/FeeCollection';
import FinancialReports from './pages/FinancialReports';
import Library from './pages/Library';
import Transport from './pages/Transport';
import Exams from './pages/Exams';
import MarksEntry from './pages/MarksEntry';
import Announcements from './pages/Announcements';
import Timetable from './pages/Timetable';
import Reports from './pages/Reports';
import HostelPage from './pages/Hostel';
import MiscellaneousFeesPage from './pages/MiscellaneousFees';
import YearPlanner from './pages/YearPlanner';
import Certificates from './pages/Certificates';
import SMSNotifications from './pages/SMSNotifications';
import Parents from './pages/Parents';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/license-expired" element={<LicenseExpired />} />
        <Route path="/" element={<PrivateRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="admission" element={<Students />} />
            <Route path="student-management" element={<StudentManagement />} />
            <Route path="parents" element={<Parents />} />
            <Route path="employees" element={<Employees />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="accounts" element={<Finance />} />
            <Route path="fee-collection" element={<FeeCollection />} />
            <Route path="financial-reports" element={<FinancialReports />} />
            <Route path="library" element={<Library />} />
            <Route path="transport" element={<Transport />} />
            <Route path="exams" element={<Exams />} />
            <Route path="marks-entry" element={<MarksEntry />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="year-planner" element={<YearPlanner />} />
            <Route path="reports" element={<Reports />} />
            <Route path="hostel" element={<HostelPage />} />
            <Route path="miscellaneous-fees" element={<MiscellaneousFeesPage />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="sms-notifications" element={<SMSNotifications />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
