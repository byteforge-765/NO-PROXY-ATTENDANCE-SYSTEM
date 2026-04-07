import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import LoginPage from "./pages/LoginPage";
import { DashboardLayout } from "./components/DashboardLayout";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AttendancePage from "./pages/AttendancePage";
import SmartAttendancePage from "./pages/SmartAttendancePage";
import FacultyAttendancePage from "./pages/FacultyAttendancePage";
import ProfilePage from "./pages/ProfilePage";
import TimetablePage from "./pages/TimetablePage";
import StudyMaterialPage from "./pages/StudyMaterialPage";
import FeedbackPage from "./pages/FeedbackPage";
import ClassPage from "./pages/ClassPage";
import AddStudentPage from "./pages/AddStudentPage";
import StudentsListPage from "./pages/StudentsListPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import StudentTransferPage from "./pages/StudentTransferPage";
import PermissionsPage from "./pages/PermissionsPage";
import EmployeesPage from "./pages/EmployeesPage";
import FeeStructurePage from "./pages/FeeStructurePage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import TigerGraphPage from "./pages/TigerGraphPage";

const queryClient = new QueryClient();

function AuthGate() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <LoginPage />;

  const isAdmin = user?.role === "admin";
  const isFaculty = user?.role === "faculty";

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard" element={isAdmin ? <AdminDashboard /> : <StudentDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Attendance */}
        <Route path="/attendance" element={isFaculty ? <FacultyAttendancePage /> : <AttendancePage />} />
        <Route path="/attendance/student" element={isAdmin || isFaculty ? <FacultyAttendancePage /> : <AttendancePage />} />
        <Route path="/attendance/employee" element={<PlaceholderPage title="Employee Attendance" />} />
        <Route path="/attendance/student-report" element={<PlaceholderPage title="Student Attendance Report" />} />
        <Route path="/attendance/employee-report" element={<PlaceholderPage title="Employee Attendance Report" />} />
        <Route path="/attendance/weekdays" element={<PlaceholderPage title="Weekdays" />} />
        <Route path="/smart-attendance" element={<SmartAttendancePage />} />

        {/* Timetable */}
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/timetable/student" element={<TimetablePage />} />
        <Route path="/timetable/teacher" element={<TimetablePage />} />

        {/* Class Management */}
        <Route path="/class" element={<ClassPage />} />
        <Route path="/class/batch" element={<PlaceholderPage title="Batch Management" />} />
        <Route path="/class/subject" element={<PlaceholderPage title="Subject Management" />} />
        <Route path="/class/assign-subject" element={<PlaceholderPage title="Assign Subject" />} />
        <Route path="/class/organization" element={<PlaceholderPage title="Organization" />} />
        <Route path="/class/student-transfer" element={<StudentTransferPage />} />

        {/* Admission / Students */}
        <Route path="/admission/add-student" element={<AddStudentPage />} />
        <Route path="/admission/students" element={<StudentsListPage />} />
        <Route path="/admission/student-category" element={<PlaceholderPage title="Student Category" />} />
        <Route path="/admission/custom-form" element={<PlaceholderPage title="Custom Form" />} />
        {/* Student profile with :id param */}
        <Route path="/admission/student-profile/:id" element={<StudentProfilePage />} />
        <Route path="/admission/student-profile" element={<StudentProfilePage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />

        {/* HR */}
        <Route path="/hr/employees" element={<EmployeesPage />} />
        <Route path="/hr/departments" element={<PlaceholderPage title="Departments" />} />
        <Route path="/hr/designations" element={<PlaceholderPage title="Designations" />} />
        <Route path="/hr/leave-management" element={<PlaceholderPage title="Leave Management" />} />

        {/* Fee */}
        <Route path="/fee/structure" element={<FeeStructurePage />} />
        <Route path="/fee/collect" element={<PlaceholderPage title="Collect Fee" />} />
        <Route path="/fee/report" element={<PlaceholderPage title="Fee Report" />} />
        <Route path="/tigergraph" element={<TigerGraphPage />} />
        <Route path="/fee/concession" element={<PlaceholderPage title="Fee Concession" />} />

        {/* PreAdmission */}
        <Route path="/preadmission/add-enquiry" element={<PlaceholderPage title="Add Enquiry" />} />
        <Route path="/preadmission/enquiries" element={<PlaceholderPage title="Enquiries" />} />
        <Route path="/preadmission/customize-form" element={<PlaceholderPage title="Customize Form" />} />
        <Route path="/preadmission/counselor-settings" element={<PlaceholderPage title="Counselor Settings" />} />

        {/* Library */}
        <Route path="/library/books" element={<PlaceholderPage title="Books" />} />
        <Route path="/library/issue" element={<PlaceholderPage title="Issue Book" />} />
        <Route path="/library/return" element={<PlaceholderPage title="Return Book" />} />
        <Route path="/library/report" element={<PlaceholderPage title="Library Report" />} />

        {/* Transport */}
        <Route path="/transport/routes" element={<PlaceholderPage title="Routes" />} />
        <Route path="/transport/vehicles" element={<PlaceholderPage title="Vehicles" />} />
        <Route path="/transport/assign" element={<PlaceholderPage title="Assign Transport" />} />

        {/* SMS */}
        <Route path="/sms/send" element={<PlaceholderPage title="Send SMS" />} />
        <Route path="/sms/history" element={<PlaceholderPage title="SMS History" />} />
        <Route path="/sms/templates" element={<PlaceholderPage title="SMS Templates" />} />

        {/* Mail */}
        <Route path="/mail/compose" element={<PlaceholderPage title="Compose Mail" />} />
        <Route path="/mail/inbox" element={<PlaceholderPage title="Inbox" />} />
        <Route path="/mail/sent" element={<PlaceholderPage title="Sent Mail" />} />

        {/* Event */}
        <Route path="/event/add" element={<PlaceholderPage title="Add Event" />} />
        <Route path="/event/list" element={<PlaceholderPage title="Events List" />} />

        {/* Hostel */}
        <Route path="/hostel/rooms" element={<PlaceholderPage title="Hostel Rooms" />} />
        <Route path="/hostel/assign" element={<PlaceholderPage title="Assign Hostel" />} />

        {/* Examination */}
        <Route path="/examination/add" element={<PlaceholderPage title="Add Exam" />} />
        <Route path="/examination/schedule" element={<PlaceholderPage title="Exam Schedule" />} />
        <Route path="/examination/result-entry" element={<PlaceholderPage title="Result Entry" />} />
        <Route path="/examination/report-card" element={<PlaceholderPage title="Report Card" />} />

        {/* Report */}
        <Route path="/report/attendance" element={<PlaceholderPage title="Attendance Report" />} />
        <Route path="/report/fee" element={<PlaceholderPage title="Fee Report" />} />
        <Route path="/report/student" element={<PlaceholderPage title="Student Report" />} />

        {/* Former Students */}
        <Route path="/former-students" element={<PlaceholderPage title="Former Students" />} />

        {/* Settings */}
        <Route path="/settings/permissions" element={<PermissionsPage />} />

        {/* Misc */}
        <Route path="/study-material" element={<StudyMaterialPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/results" element={<PlaceholderPage title="Results" />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<AuthGate />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
