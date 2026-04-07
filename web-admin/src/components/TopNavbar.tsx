import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { Search, Bell, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/class": "Class",
  "/class/batch": "Batch",
  "/class/subject": "Subject",
  "/class/assign-subject": "Assign Subject",
  "/class/organization": "Organization",
  "/class/student-transfer": "Student Transfer",
  "/admission/add-student": "Add Student",
  "/admission/students": "Students",
  "/admission/student-category": "Student Category",
  "/admission/custom-form": "Custom Form",
  "/admission/student-profile": "Student Profile",
  "/attendance": "My Attendance",
  "/attendance/student": "Student Attendance",
  "/attendance/employee": "Employee Attendance",
  "/attendance/student-report": "Student Report",
  "/attendance/employee-report": "Employee Report",
  "/attendance/weekdays": "Weekdays",
  "/smart-attendance": "Smart Attendance",
  "/fee/structure": "Fee Structure",
  "/fee/collect": "Collect Fee",
  "/fee/report": "Fee Report",
  "/fee/concession": "Fee Concession",
  "/timetable": "Timetable",
  "/timetable/student": "Student Timetable",
  "/timetable/teacher": "Teacher Timetable",
  "/hr/employees": "Employees",
  "/hr/departments": "Departments",
  "/hr/designations": "Designations",
  "/hr/leave-management": "Leave Management",
  "/profile": "Profile",
  "/study-material": "Study Material",
  "/feedback": "Feedback",
  "/results": "Results",
  "/settings/permissions": "Permissions",
  "/preadmission/add-enquiry": "Add Enquiry",
  "/preadmission/enquiries": "Enquiries",
  "/library/books": "Books",
  "/library/issue": "Issue Book",
  "/library/return": "Return Book",
  "/transport/routes": "Routes",
  "/transport/vehicles": "Vehicles",
  "/sms/send": "Send SMS",
  "/mail/compose": "Compose Mail",
  "/mail/inbox": "Inbox",
  "/event/add": "Add Event",
  "/event/list": "Events",
  "/hostel/rooms": "Hostel Rooms",
  "/examination/add": "Add Exam",
  "/examination/schedule": "Exam Schedule",
  "/examination/result-entry": "Result Entry",
  "/examination/report-card": "Report Card",
  "/report/attendance": "Attendance Report",
  "/report/fee": "Fee Report",
  "/report/student": "Student Report",
  "/former-students": "Former Students",
};

export function TopNavbar() {
  const { user } = useAuth();
  const location = useLocation();
  const currentPage = breadcrumbMap[location.pathname] || location.pathname.split("/").pop() || "Dashboard";

  return (
    <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Dashboard</span>
          {currentPage !== "Dashboard" && (
            <>
              <span>›</span>
              <span className="text-foreground font-medium">{currentPage}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center bg-muted rounded-lg px-3 py-1.5 gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="search..."
            className="bg-transparent border-none outline-none text-sm w-36 placeholder:text-muted-foreground"
          />
        </div>

        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-secondary text-[10px] font-bold text-secondary-foreground rounded-full flex items-center justify-center">0</span>
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-foreground leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
