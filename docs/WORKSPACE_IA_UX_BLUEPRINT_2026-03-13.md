# Workspace IA + UX Blueprint (Safe Rollout)
Date: 2026-03-13
Scope: Company (Super Admin) + Tenant UX cleanup without breaking existing functionality

## 1) Non-Negotiable Rules
- Keep existing route paths and APIs stable during IA cleanup.
- Change navigation labels/groups first, not backend behavior.
- Enforce visibility by permissions only (never by frontend role-name string alone).
- Separate control-plane (company) from data-plane (tenant) in UI wording and menus.
- Use one canonical menu source and permission matrix.

## 2) Workspace Model (Odoo/Zoho style)
Use top-level workspace switcher:
- `Company Workspace` (control-plane)
- `Tenant Workspace` (hotel/tenant operations)

Do not mix these two menus on one sidebar.

## 3) Company Workspace Menu (Super Admin / HQ)
Order should be operationally logical:
1. `Overview`
   - Platform Dashboard
   - Alerts / Job Health
2. `Commercial`
   - Plans & Packages
   - Tenants (All)
   - Renewals
   - Platform Invoices
   - Agents / Partners
3. `Product Studio`
   - Modules
   - Module Lifecycle
   - Template DB
   - Template Studio
   - Mid DB / Package DB mappings
4. `People & Access`
   - System Users
   - Roles & Permissions
   - Departments
5. `Finance`
   - SaaS Finance Dashboard
   - Accounting (SaaS)
   - Invoice Templates
6. `Security & Compliance`
   - Audit Logs
   - Sensitive Action Audit
   - Security Audit
7. `Operations`
   - Backups (Main)
   - Product DB Backups
   - Provisioning Jobs
8. `Settings`
   - Company Profile
   - Global Settings
   - Locations / Categories
9. `Developer` (restricted)
   - API / Operations / Docs

## 4) Tenant Workspace Menu (Hotel Operations)
Keep tenant staff focused on daily work:
1. `Command Center`
   - Today’s occupancy, arrivals/departures, pending actions
2. `Reservations`
   - Bookings
   - Guests
   - Front Desk
3. `Inventory & Pricing`
   - Room Types
   - Physical Rooms
   - Rate Plans
   - Availability Calendar
   - Rate Shopper
4. `Operations`
   - Housekeeping
   - Service Requests
   - Compliance / Guest Shield
5. `People`
   - Staff
   - Attendance
   - Leaves
   - Tasks
   - Payroll (if entitled)
6. `Finance`
   - Hotel Finance Overview
   - Guest Invoices
   - Expenses
   - Payment Methods
   - Taxes
7. `Admin`
   - Hotel Settings
   - Amenities Master
   - Coupons
   - Communication
   - Tenant Audit Logs
8. `Marketplace`
   - App Marketplace

## 5) Role Bundles (Human-readable)
Define and show in UI:
- Company: `Super Admin`, `Platform Ops`, `Finance Ops`, `Product Ops`, `Security Auditor`
- Tenant: `Tenant Owner`, `Tenant Admin`, `Front Desk Manager`, `Finance Manager`, `HR Manager`, `Department Lead`, `Staff`

Each role bundle maps to:
- Menu visibility
- Page actions (view/create/update/delete/approve/export)
- Data scope (`global`, `tenant`, `department`, `self`)

## 6) Permission Model (Avoid Confusion)
Apply 3 layers:
1. `Menu permissions`
2. `Action permissions`
3. `Data-scope permissions`

Never grant action without matching menu + scope.

## 7) Field-Level UX Standards
- Lists:
  - required filters at top
  - status badges
  - column presets by role
- Forms:
  - split into sections: `Basic`, `Policy`, `Security`, `Advanced`
  - inline validation + clear required markers
  - immutable fields locked after create (with tooltip)
- Detail pages:
  - `Summary` tab first
  - `Timeline/Audit` tab always present for sensitive entities
- Destructive actions:
  - reason required
  - confirm modal with impact statement

## 8) UI Consistency Rules
- Use one page shell pattern:
  - title + subtitle
  - source badges (`db source`, `scope`, `last sync`)
  - primary actions right-aligned
- Use shared states:
  - loading skeleton
  - empty state with next-action CTA
  - explicit error panel
- Keep naming consistent:
  - use `Tenant` (not mixed with Branch/Hotel in same page)
  - use `Company Workspace` for control-plane

## 9) Safe Rollout Plan (No Breakage)
Phase 1: IA mapping only
- Create `old_menu_item -> new_workspace/menu/group` mapping table (no route changes).

Phase 2: Dual-nav with feature flag
- Add `ENABLE_WORKSPACE_NAV_V2`.
- Keep existing nav as fallback.

Phase 3: Permission matrix hardening
- Validate every menu item has explicit permission + scope guard.
- Add regression snapshot tests for menu visibility by role.

Phase 4: UX standardization pages
- Prioritize high-confusion pages:
  - Users / Roles
  - Departments
  - Finance / Renewals
  - Products / Databases

Phase 5: deprecate old nav labels
- Remove legacy duplicates only after telemetry shows stable usage.

## 10) Immediate Implementation Priority
1. Build workspace switcher + grouped sidebar (feature-flagged).
2. Refactor `nav.ts` into:
   - `companyWorkspaceMenu`
   - `tenantWorkspaceMenu`
   - shared permission guard util.
3. Standardize 4 pages first:
   - Roles & Permissions
   - Staff & Departments
   - Platform Finance
   - Product Databases
4. Add menu visibility regression tests for Super Admin + Tenant Admin + Staff.

