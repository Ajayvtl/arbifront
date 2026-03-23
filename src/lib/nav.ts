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

// Super Admin Menu (sectioned to avoid cross-domain clutter)
export const SUPER_ADMIN_MENU: AppMenuItem[] = [
    { section: "Platform", name: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
    { section: "Platform", name: "Branch", href: "/admin/hotels", icon: "BuildingOffice2Icon", module: "hotels" },
    { section: "Platform", name: "Agencies & Partners", href: "/admin/agents", icon: "UserGroupIcon", module: "agencies" },
    { section: "Platform", name: "System Users", href: "/admin/users", icon: "Users", module: "users" },
    {
        section: "Platform",
        name: "HR & Staff (System)",
        href: "/hr",
        icon: "Users",
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
            { name: "Departments", href: "/admin/settings/departments", permissions: ["departments.view", "hr.manage"] }
        ]
    },
    {
        section: "Access & Security",
        name: "Modules Roles",
        href: "/settings/roles",
        icon: "Shield",
        module: "roles",
        children: [
            { name: "All Roles", href: "/settings/roles", exact: true, permissions: ["roles.view", "roles.manage"] },
            { name: "Add Role", href: "/settings/roles/create", permissions: ["roles.manage"] },
            { name: "Role Templates", href: "/settings/roles/templates", permissions: ["roles.manage"] }
        ]
    },
    {
        section: "Catalog & Provisioning",
        name: "Products",
        href: "/admin/products",
        icon: "CircleStackIcon",
        module: "settings",
        children: [
            { name: "Tenant (All)", href: "/admin/products/tenants", permissions: ["packages.view", "packages.manage", "menu.packages"] },
            { name: "Categories", href: "/admin/settings/categories", permissions: ["settings.view.global", "settings.manage"] },
            { name: "Locations", href: "/admin/products/locations", permissions: ["locations.add.global", "locations.edit.global", "locations.delete.global"] },
            { name: "Modules", href: "/admin/products/modules", permissions: ["settings.manage", "roles.manage"] },
            { name: "Packages", href: "/admin/products/packages", permissions: ["packages.view", "packages.manage"] },
            {
                name: "Product Roles",
                href: "/admin/products/roles",
                children: [
                    { name: "All Roles", href: "/admin/products/roles", exact: true },
                    { name: "Add Role", href: "/admin/products/roles/create" }
                ]
            },
            { name: "Pkg DB", href: "/admin/products/pkg-databases", permissions: ["database.view", "database.manage", "database.test", "database.export", "database.import"] },
            { name: "Mid DB", href: "/admin/settings/databases", permissions: ["database.view", "database.manage", "settings.view.global"] },
            { name: "Template DB", href: "/admin/products/template-databases", permissions: ["template_db.view", "template_db.manage"] },
            { name: "Template Studio", href: "/admin/products/template-studio", permissions: ["template_version.view", "template_version.manage", "template_version.publish", "template_version.history"] },
            { name: "Module Lifecycle", href: "/admin/products/module-lifecycle", permissions: ["settings.manage", "roles.manage"] }
        ]
    },
    {
        section: "Finance",
        name: "Finance (Platform)",
        href: "/finance/platform",
        icon: "FileText",
        module: "finance_system",
        children: [
            { name: "Dashboard", href: "/finance/platform", permissions: ["finance_system.view", "finance_system.manage"] },
            { name: "Invoices", href: "/finance/platform/invoices", permissions: ["finance_system.view", "finance_system.manage"] },
            { name: "Renewals", href: "/finance/platform/renewals", permissions: ["finance_system.view", "finance_system.manage"] },
            { name: "Templates", href: "/finance/platform/templates", permissions: ["finance_system.view", "finance_system.manage"] }
        ]
    },
    { section: "Finance", name: "Accounting (SaaS)", href: "/accounting", icon: "Calculator", module: "accounting" },
    { section: "Operations", name: "Reports & Analytics", href: "/reports", icon: "BarChart3", module: "reports" },
    {
        section: "Operations",
        name: "Global Settings",
        href: "/admin/settings",
        icon: "GlobeAltIcon",
        module: "settings",
        children: [
            { name: "Company Profile", href: "/admin/settings/company" },
            { name: "Roles & Permissions", href: "/admin/settings/roles" },
            { name: "General Settings", href: "/admin/settings/general" }
        ]
    },
    {
        section: "Operations",
        name: "Maintenance",
        href: "/admin/maintenance",
        icon: "Shield",
        module: "admin_maintenance",
        children: [
            { name: "Pages", href: "/admin/maintenance/pages" },
            { name: "Backup (Main)", href: "/admin/maintenance/backup" },
            { name: "Product Databases", href: "/admin/maintenance/product-db-backup" },
            { name: "Security Audit", href: "/admin/maintenance/security-audit", permissions: ["audit.view"] }
        ]
    },
    { section: "Access & Security", name: "Guest Shield", href: "/admin/compliance", icon: "Shield", module: "compliance" },
    { section: "Access & Security", name: "Audit Logs", href: "/admin/audit", icon: "FileText", module: "audit" },
    {
        section: "Operations",
        name: "Developer",
        href: "/admin/developer",
        icon: "FlaskConical",
        module: "developer",
        children: [
            { name: "API", href: "/admin/developer/api" },
            { name: "Operations", href: "/admin/developer/operations" },
            { name: "Documentation", href: "/admin/developer/documentation" }
        ]
    }
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
