
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Children from './pages/Children';
import Grades from './pages/Grades';
import Attendance from './pages/Attendance';
import Profile from './pages/Profile';
import Announcements from './pages/Announcements';
import Timetable from './pages/Timetable';
import Library from './pages/Library';
import Fees from './pages/Fees';
import PaymentHistory from './pages/PaymentHistory';
import Messages from './pages/Messages';
import AppLayout from './components/Layout/Layout';
import PrivateRoute from './components/PrivateRoute';
import 'antd/dist/reset.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/children" element={<Children />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/payment-history" element={<PaymentHistory />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
