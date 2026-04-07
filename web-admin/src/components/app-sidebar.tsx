import { useState } from "react";
import {
  LayoutDashboard, Users, Settings as SettingsIcon, LogOut, GraduationCap,
  CalendarCheck, CalendarDays, BookOpen, CreditCard, Building2, Bus,
  MessageSquare, Mail, Calendar, Home as HomeIcon, UserPlus, Clipboard,
  FileText, ChevronDown, ChevronRight, ClipboardList, Library, BedDouble, Award, Network
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar, SidebarContent, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  icon: any;
  url?: string;
  children?: { title: string; url: string }[];
}

const fullNav: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  {
    title: "PreAdmission", icon: UserPlus, children: [
      { title: "Add Enquiry", url: "/preadmission/add-enquiry" },
      { title: "Enquiries", url: "/preadmission/enquiries" },
      { title: "Customize Form", url: "/preadmission/customize-form" },
      { title: "Counselor Settings", url: "/preadmission/counselor-settings" },
    ]
  },
  {
    title: "Class", icon: SettingsIcon, children: [
      { title: "Class", url: "/class" },
      { title: "Batch", url: "/class/batch" },
      { title: "Subject", url: "/class/subject" },
      { title: "Assign Subject", url: "/class/assign-subject" },
      { title: "Organization", url: "/class/organization" },
      { title: "Student Transfer", url: "/class/student-transfer" },
    ]
  },
  {
    title: "Admission", icon: GraduationCap, children: [
      { title: "Add Student", url: "/admission/add-student" },
      { title: "Students", url: "/admission/students" },
      { title: "Student Category", url: "/admission/student-category" },
      { title: "Custom Form", url: "/admission/custom-form" },
    ]
  },
  {
    title: "HR", icon: Users, children: [
      { title: "Employees", url: "/hr/employees" },
      { title: "Departments", url: "/hr/departments" },
      { title: "Designations", url: "/hr/designations" },
      { title: "Leave Management", url: "/hr/leave-management" },
    ]
  },
  {
    title: "Attendance", icon: CalendarCheck, children: [
      { title: "Student Attendance", url: "/attendance/student" },
      { title: "Employee Attendance", url: "/attendance/employee" },
      { title: "Student Report", url: "/attendance/student-report" },
      { title: "Employee Report", url: "/attendance/employee-report" },
      { title: "Weekdays", url: "/attendance/weekdays" },
    ]
  },
  {
    title: "Fee", icon: CreditCard, children: [
      { title: "Fee Structure", url: "/fee/structure" },
      { title: "Collect Fee", url: "/fee/collect" },
      { title: "Fee Report", url: "/fee/report" },
      { title: "Concession", url: "/fee/concession" },
    ]
  },
  {
    title: "Library", icon: Library, children: [
      { title: "Books", url: "/library/books" },
      { title: "Issue Book", url: "/library/issue" },
      { title: "Return Book", url: "/library/return" },
      { title: "Library Report", url: "/library/report" },
    ]
  },
  {
    title: "Transport", icon: Bus, children: [
      { title: "Routes", url: "/transport/routes" },
      { title: "Vehicles", url: "/transport/vehicles" },
      { title: "Assign Transport", url: "/transport/assign" },
    ]
  },
  {
    title: "SMS", icon: MessageSquare, children: [
      { title: "Send SMS", url: "/sms/send" },
      { title: "SMS History", url: "/sms/history" },
      { title: "Templates", url: "/sms/templates" },
    ]
  },
  {
    title: "Mail", icon: Mail, children: [
      { title: "Compose", url: "/mail/compose" },
      { title: "Inbox", url: "/mail/inbox" },
      { title: "Sent", url: "/mail/sent" },
    ]
  },
  {
    title: "Event", icon: Calendar, children: [
      { title: "Add Event", url: "/event/add" },
      { title: "Events List", url: "/event/list" },
    ]
  },
  {
    title: "TimeTable", icon: CalendarDays, children: [
      { title: "Student Timetable", url: "/timetable/student" },
      { title: "Teacher Timetable", url: "/timetable/teacher" },
    ]
  },
  {
    title: "Hostel", icon: BedDouble, children: [
      { title: "Rooms", url: "/hostel/rooms" },
      { title: "Assign Hostel", url: "/hostel/assign" },
    ]
  },
  {
    title: "Examination", icon: ClipboardList, children: [
      { title: "Add Exam", url: "/examination/add" },
      { title: "Exam Schedule", url: "/examination/schedule" },
      { title: "Result Entry", url: "/examination/result-entry" },
      { title: "Report Card", url: "/examination/report-card" },
    ]
  },
  {
    title: "Report", icon: FileText, children: [
      { title: "Attendance Report", url: "/report/attendance" },
      { title: "Fee Report", url: "/report/fee" },
      { title: "Student Report", url: "/report/student" },
    ]
  },
  { title: "Former Student", icon: Award, url: "/former-students" },
];

const studentNav: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Profile", icon: Users, url: "/profile" },
  {
    title: "Attendance", icon: CalendarCheck, children: [
      { title: "My Attendance", url: "/attendance" },
      { title: "Smart Attendance", url: "/smart-attendance" },
    ]
  },
  { title: "Timetable", icon: CalendarDays, url: "/timetable" },
  { title: "Study Material", icon: BookOpen, url: "/study-material" },
  { title: "Feedback", icon: MessageSquare, url: "/feedback" },
  { title: "Results", icon: ClipboardList, url: "/results" },
  { title: "TigerGraph Analytics", icon: Network, url: "/tigergraph" },
];

const facultyNav: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  {
    title: "Attendance", icon: CalendarCheck, children: [
      { title: "Mark Attendance", url: "/attendance/student" },
      { title: "Smart Attendance", url: "/smart-attendance" },
      { title: "Student Report", url: "/attendance/student-report" },
    ]
  },
  { title: "Timetable", icon: CalendarDays, url: "/timetable" },
  { title: "Students", icon: Users, url: "/admission/students" },
  { title: "Study Material", icon: BookOpen, url: "/study-material" },
  { title: "Feedback", icon: MessageSquare, url: "/feedback" },
  { title: "TigerGraph Analytics", icon: Network, url: "/tigergraph" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const navItems = user?.role === "admin" ? fullNav : user?.role === "faculty" ? facultyNav : studentNav;

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border shrink-0 bg-[hsl(var(--sidebar-background))]">
        <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-sidebar-primary-foreground tracking-tight">CampusERP</span>}
      </div>
      <SidebarContent className="px-2 pt-3 bg-[hsl(var(--sidebar-background))] overflow-y-auto">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            if (item.children && !collapsed) {
              const isOpen = openMenus[item.title];
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0 opacity-70" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                  </button>
                  {isOpen && (
                    <div className="ml-4 pl-4 border-l border-sidebar-border space-y-0.5 mt-0.5 mb-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.url}
                          to={child.url}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        >
                          {child.title}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const url = item.url || (item.children ? item.children[0].url : "/");
            return (
              <NavLink
                key={item.title}
                to={url}
                end={url === "/dashboard"}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              >
                <item.icon className="w-[18px] h-[18px] shrink-0 opacity-70" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            );
          })}
        </nav>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border bg-[hsl(var(--sidebar-background))]">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
