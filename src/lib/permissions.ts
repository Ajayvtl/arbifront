type AuthLikeUser = {
    role_id?: number;
    permissions?: string[];
} | null | undefined;

const MODULE_PERMISSION_ALIASES: Record<string, string[]> = {
    hotels: ['menu.system.tenants', 'menu.system.management'],
    agencies: ['agents.view', 'agents.manage', 'menu.agents', 'menu.system.management'],
    developer: ['developer.view'],
    admin_maintenance: ['admin_maintenance.view'],
    compliance: ['compliance.view', 'menu.compliance'],
    audit: ['audit.view', 'menu.audit'],
    finance: ['finance.view', 'finance_hotel.view', 'finance_system.view', 'finance.manage_invoices', 'finance.expenses', 'menu.finance_hotel', 'menu.finance_system'],
    finance_hotel: ['finance_hotel.view', 'finance.view', 'finance.manage_invoices', 'finance.expenses', 'menu.finance'],
    finance_system: ['finance_system.view', 'menu.finance_system'],
    roles: ['roles.view', 'roles.manage', 'menu.roles'],
    settings: ['settings.view.global', 'settings.manage', 'menu.settings'],
    notifications: ['notifications.view', 'settings.view.global', 'menu.notifications'],
    reports: ['reports.view', 'menu.reports'],
    database_admin: ['database.view', 'database.manage', 'database.test', 'database.migrate', 'database.export', 'database.import', 'menu.database_admin'],
    template_db: ['template_db.view', 'template_db.manage', 'template_db.test', 'template_db.migrate', 'template_db.export', 'template_db.import', 'menu.template_db'],
    template_version: ['template_version.view', 'template_version.manage', 'template_version.publish', 'template_version.history', 'menu.template_version'],
    packages: ['packages.view', 'menu.packages', 'settings.view.global'],
    users: ['users.view', 'users.manage', 'menu.users'],
    departments: ['departments.view', 'departments.manage', 'menu.departments'],
    hr: [
        'hr.view',
        'hr.manage',
        'hr.manage_staff',
        'hr.payroll',
        'attendance.view',
        'attendance.manage',
        'attendance.summary',
        'tasks.view',
        'tasks.manage',
        'shifts.view',
        'shifts.manage',
        'employee_status.view',
        'employee_status.manage',
        'warnings.view',
        'warnings.manage',
        'salary_structure.view',
        'salary_structure.manage',
        'payroll.view',
        'payroll.manage',
        'payroll.sync',
        'hr.policies.view',
        'hr.policies.manage',
        'menu.hr'
    ],
    sales: ['sales.view', 'sales.manage', 'menu.sales'],
    marketplace: ['marketplace.view', 'marketplace.manage', 'menu.marketplace']
};

export function hasAnyPermission(user: AuthLikeUser, slugs: string[]): boolean {
    if (!user) return false;
    if (user.role_id === 1) return true;
    const perms = user.permissions || [];
    if (perms.includes('*')) return true;
    return slugs.some((slug) => perms.includes(slug));
}

export function canViewModule(user: AuthLikeUser, moduleSlug: string): boolean {
    const base = [`${moduleSlug}.view`, `menu.${moduleSlug}`];
    const aliases = MODULE_PERMISSION_ALIASES[moduleSlug] || [];
    return hasAnyPermission(user, [...base, ...aliases]);
}

export function canManageHr(user: AuthLikeUser): boolean {
    return hasAnyPermission(user, [
        'hr.manage',
        'hr.manage_staff',
        'hr.payroll',
        'attendance.manage',
        'menu.hr'
    ]);
}
