// Menu Definitions
// Icons are referenced by string name and mapped in IconMap (src/lib/iconMapping.ts)

export interface AppMenuItem {
    name: string;
    href?: string;
    icon?: string;
    module?: string;
    section?: string;
    exact?: boolean;
    permissions?: string[];
    children?: AppMenuItem[];
}

// Super Admin menu trimmed to core platform controls only.
export const SUPER_ADMIN_MENU: AppMenuItem[] = [
    { section: "Platform", name: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
    { section: "Platform", name: "Companies", href: "/admin/hotels", icon: "BuildingOffice2Icon", module: "hotels" },
    { section: "Platform", name: "Admin Access", href: "/admin/platform-admins", icon: "Shield", module: "users" },
    { section: "Platform", name: "System Users", href: "/admin/users", icon: "Users", module: "users" },
    { section: "Finance", name: "Finance (Platform)", href: "/finance/platform", icon: "FileText", module: "finance_system" },
    { section: "Monitoring", name: "Blockchain Events", href: "/admin/developer/operations", icon: "Activity", module: "developer" },
    { section: "System", name: "Global Settings", href: "/admin/settings/general", icon: "GlobeAltIcon", module: "settings" }
];

// MLM End User (Distributor) Menu
export const MLM_END_USER_MENU: AppMenuItem[] = [
    { section: "Overview", name: "Dashboard", href: "/dapp/dashboard", icon: "LayoutDashboard" },
    { section: "Overview", name: "Transactions", href: "/dapp/transactions", icon: "Wallet" },
    { section: "Overview", name: "ROI Tracker", href: "/dapp/roi", icon: "BarChart3" },
    { section: "Overview", name: "My Network", href: "/dapp/network", icon: "Users" },
    { section: "Overview", name: "Genealogy Tree", href: "/dapp/genealogy", icon: "Activity" },
    { section: "Earnings", name: "Commissions", href: "/dapp/commissions", icon: "FileText" },
    { section: "Earnings", name: "E-Wallet", href: "/dapp/wallet", icon: "Calculator" },
    { section: "Earnings", name: "Payout Requests", href: "/dapp/payouts", icon: "ShoppingCart" },
    { section: "Business", name: "Packages", href: "/dapp/packages", icon: "ShoppingBag" },
    { section: "Business", name: "Referrals", href: "/dapp/referrals", icon: "Users" },
    { section: "Business", name: "Ranks & Rewards", href: "/dapp/ranks", icon: "Shield" },
    { section: "Support", name: "Support Tickets", href: "/dapp/support", icon: "MessageSquare" },
    { section: "Support", name: "Profile & KYC", href: "/dapp/profile", icon: "UserCircle" },
    { section: "Support", name: "Notifications", href: "/dapp/notifications", icon: "Bell" },
];

// MLM Company Admin (Tenant Company) Menu
export const COMPANY_ADMIN_MENU: AppMenuItem[] = [
    { section: "Overview", name: "Command Center", href: "/admin/dashboard", icon: "LayoutDashboard" },
    { section: "Network Operations", name: "Member Registry", href: "/admin/company/members", icon: "Users" },
    { section: "Compensation", name: "Commission Runs", href: "/admin/company/commissions", icon: "Calculator" },
    { section: "Compensation", name: "Direct Income", href: "/admin/company/direct-income", icon: "Wallet" },
    { section: "Developer", name: "ROI Increment (Working)", href: "/admin/company/working-gain", icon: "BarChart3" },
    { section: "Developer", name: "Level Income", href: "/admin/company/level-income", icon: "GitBranch" },
    { section: "Compensation", name: "Payment Logs", href: "/admin/company/transactions", icon: "Wallet" },
    { section: "Compensation", name: "Payout Queue", href: "/admin/company/payouts", icon: "FileText" },
    { section: "Compensation", name: "E-Wallet Ledger", href: "/admin/company/ledger", icon: "CircleStackIcon" },
    { section: "Developer", name: "Bonus Campaigns", href: "/admin/company/bonuses", icon: "Tag" },
    { section: "Developer", name: "Plan Catalog", href: "/admin/company/plans", icon: "ShoppingBag" },
    { section: "Developer", name: "Wallet Types", href: "/admin/company/wallet-types", icon: "Wallet" },
    { section: "Developer", name: "Network Settings", href: "/admin/company/network-settings", icon: "Activity" },
    { section: "Developer", name: "Testing Tools", href: "/admin/company/testing", icon: "FlaskConical" },
    { section: "Developer", name: "Company Settings", href: "/admin/settings/general", icon: "Settings" },
];

// HMIS Menu Structure (for Tenant Admins/Staff)
export const TENANT_MENU: AppMenuItem[] = [
    { section: "Overview", name: "Command Center", href: "/", icon: "LayoutDashboard" },
    {
        section: "Revenue",
        name: "Rate Shopper",
        icon: "Activity",
        href: "/pricing",
        module: "inventory", // grouped
        children: [
            { name: "Market Intelligence", href: "/pricing/intel" },
            { name: "Parity Alerts", href: "/pricing/alerts" },
            { name: "Rate Manager", href: "/pricing/rates" },
        ]
    },
    {
        section: "Operations",
        name: "Hotel Ops",
        icon: "Users",
        href: "/ops",
        children: [
            { name: "Reception", href: "/ops/reception", module: "front_desk" },
            { name: "Front Desk", href: "/ops/front-desk", module: "front_desk" },
            { name: "Concierge", href: "/ops/concierge", module: "front_desk" },
            { name: "Housekeeping", href: "/ops/housekeeping", module: "housekeeping" },
        ]
    },
    {
        section: "Operations",
        name: "Inventory",
        icon: "FlaskConical",
        href: "/rooms",
        module: "inventory",
        children: [
            { name: "Room Types", href: "/rooms/types" },
            { name: "Physical Rooms", href: "/rooms/physical" },
            { name: "Rate Plans", href: "/rooms/rate-plans" },
            { name: "Availability", href: "/rooms/calendar" }, // Assuming Calendar exists
        ]
    },
    {
        section: "Finance & HR",
        name: "Finance",
        icon: "FileText",
        href: "/finance/hotel",
        module: "finance_hotel",
        children: [
            { name: "Overview", href: "/finance/hotel", permissions: ['finance_hotel.view', 'finance.view'] },
            { name: "Guest Invoices", href: "/finance/hotel/invoices", permissions: ['finance_hotel.view', 'finance.view', 'finance.manage_invoices'] },
            { name: "Expenses", href: "/finance/expenses", permissions: ['finance.expenses', 'finance.view'] },
        ]
    },
    { section: "Finance & HR", name: "Accounting", href: "/accounting", icon: "Calculator", module: "accounting" },
    {
        section: "Finance & HR",
        name: "HR & Staff",
        icon: "Users",
        href: "/hr",
        module: "hr",
        children: [
            { name: "My Profile", href: "/admin/hr/my-profile", permissions: ["hr.view", "hr.manage", "hr.manage_staff"] },
            { name: "Reports", href: "/admin/hr/reports", permissions: ["reports.view", "hr.manage", "hr.manage_staff"] },
            {
                name: "Org Workflow",
                href: "/admin/hr/org-workflow",
                permissions: ["roles.manage", "hr.manage", "hr.manage_staff", "hr.view"],
                children: [
                    { name: "Approval Inbox", href: "/admin/hr/org-workflow/inbox", permissions: ["hr.view", "hr.manage", "hr.manage_staff"] },
                    { name: "My Requests", href: "/admin/hr/org-workflow/requests", permissions: ["hr.view", "hr.manage", "hr.manage_staff"] },
                    { name: "Designer", href: "/admin/hr/org-workflow", exact: true, permissions: ["roles.manage", "hr.manage", "hr.manage_staff"] }
                ]
            },
            { name: "Attendance Insights", href: "/admin/hr/attendance-insights", permissions: ["attendance.summary", "attendance.manage", "hr.manage"] },
            { name: "Attendance", href: "/admin/hr/attendance", permissions: ["attendance.view", "attendance.manage", "hr.view", "hr.manage"] },
            { name: "Leave Requests", href: "/admin/hr/leaves", permissions: ["hr.view", "hr.manage", "hr.manage_staff"] },
            { name: "Work Allotment", href: "/admin/hr/tasks", permissions: ["tasks.view", "tasks.manage", "hr.view", "hr.manage"] },
            { name: "Employee Status", href: "/admin/hr/employee-status", permissions: ["employee_status.view", "employee_status.manage", "hr.manage", "hr.manage_staff"] },
            { name: "Warnings", href: "/admin/hr/warnings", permissions: ["warnings.view", "warnings.manage", "hr.manage", "hr.manage_staff"] },
            { name: "Payroll Sync", href: "/admin/hr/payroll-sync", permissions: ["payroll.sync", "hr.payroll", "hr.manage"] },
            { name: "Payroll", href: "/admin/hr/payroll", permissions: ["payroll.view", "payroll.manage", "hr.payroll", "hr.manage"] },
            { name: "Salary Structure", href: "/admin/hr/salary-structures", permissions: ["salary_structure.view", "salary_structure.manage", "hr.payroll", "hr.manage"] },
            { name: "Contracts", href: "/admin/hr/contracts", permissions: ["hr.view", "hr.manage"] },
            { name: "Staff Profiles", href: "/admin/hr/employees", permissions: ["hr.view", "hr.manage", "hr.manage_staff"] },
            { name: "HR Policies", href: "/admin/hr/policies", permissions: ["hr.policies.view", "hr.policies.manage", "hr.manage"] },
            { name: "Shift Management", href: "/admin/hr/shifts", permissions: ["shifts.view", "shifts.manage", "hr.manage", "hr.manage_staff"] },
            { name: "Job Positions", href: "/admin/hr/positions", permissions: ["hr.view", "hr.manage"] },
            { name: "Departments", href: "/admin/settings/departments", permissions: ["departments.view", "hr.manage"] },
        ]
    },
    { section: "Revenue", name: "Bookings", href: "/bookings", icon: "ShoppingCart", module: "bookings" },
    { section: "Revenue", name: "Guests", href: "/guests", icon: "Users", module: "guests" },
    { section: "Revenue", name: "Reviews", href: "/reviews", icon: "Shield", module: "guests" },
    { section: "Revenue", name: "Referrals", href: "/referrals", icon: "Users", module: "guests" },
    { section: "Administration", name: "Reports & Analytics", href: "/reports", icon: "BarChart3", module: "reports" },
    { section: "Administration", name: "App Marketplace", href: "/admin/marketplace", icon: "ShoppingBag", module: "marketplace" },
    {
        section: "Administration",
        name: "Admin",
        icon: "Settings",
        href: "/admin",
        children: [
            { name: "Guest Shield", href: "/admin/compliance", module: "compliance" },
            { name: "Amenities Master", href: "/admin/hotel/amenities", module: "settings" },
            { name: "Hotel Settings", href: "/admin/hotel", module: "settings" },
            { name: "Staff Members", href: "/settings/staff", module: "users" },
            {
                name: "Staff Roles",
                href: "/settings/roles",
                module: "roles",
                children: [
                    { name: "All Roles", href: "/settings/roles", exact: true, permissions: ['roles.view', 'roles.manage'] },
                    { name: "Add Role", href: "/settings/roles/create", permissions: ['roles.manage'] }
                ]
            },
            { name: "Taxes", href: "/settings/taxes", module: "settings" },
            { name: "Payment Methods", href: "/settings/payment-methods", module: "finance" },
            { name: "Coupons", href: "/settings/coupons", module: "settings" },
            { name: "Communication", href: "/settings/communication", module: "notifications" },
            { name: "Company Settings", href: "/admin/settings/general", module: "settings" },
            { name: "Audit Logs", href: "/admin/audit", module: "audit" },
        ]
    }
];
