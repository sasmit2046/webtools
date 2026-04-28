# Planning Management System (PMS)

Vanilla HTML/JS application backed by an Excel (.xlsx) file as the database.
Open `index.html` in **Chrome or Edge** (requires File System Access API).

## File structure

| File | Purpose |
|---|---|
| `index.html` | App shell: setup page, login, sidebar, modal, script loader |
| `style.css` | All styling, theme tokens, Bootstrap overrides |
| `script.js` | **Core engine** — Excel DB layer (`XDB`), `App` shell, base pages: dashboard, programs, planning, agreements, financial, reports, users, notifications, settings |
| `roles.js` | Unlimited roles & permissions system + Roles tab in Settings |
| `calculator.js` | Floating calculator widget (F2 to toggle) |
| `settings-app.js` | App-name/branding settings + About dialog |
| `import-program.js` | Bulk Excel import for Programs |
| `approval.js` | Approval workflow + keyboard shortcuts |
| `wards.js` | Wards management (Settings tab) |
| `employee.js` | Employee module (40+ HR fields) |
| `menu-inject-1.js` | Wires Wards tab + Employees nav item |
| `backup.js` | One-click full DB Excel backup & restore |
| `letter.js` | Letter header/footer settings; auto-applied to all letters |
| `salary.js` | Salary sheet (basic, grade, PF, CIT, tax) + payslip |
| `leave.js` | Leave types, applications, approval, balance calculator |
| `menu-inject-2.js` | Wires Salary + Leaves nav items |

## Load order

Modules patch core functions (Settings tabs, sidebar, permissions) so load order
matters and is fixed by `index.html`. Do not reorder.

## Default login

- admin@pms.gov.np / admin123
- dataentry@pms.gov.np / data123
- viewer@pms.gov.np / view123
