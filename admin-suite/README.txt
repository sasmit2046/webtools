ADMIN SUITE  (Google Sheets + Apps Script, no Node.js, no server)
Login - Dashboard - Dynamic CRUD modules - Roles & permissions (RBAC)

FILES  (keep ALL of them together in one folder)
  login.html            sign-in page  -> OPEN THIS FIRST
  dashboard.html        dashboard (stats, chart, recent records) for any module
  crud.html             records page used by every module (add / view / edit / delete)
  modules.html          Module Builder  (admin)  - create unlimited CRUD modules
  users.html            Users           (admin)  - add users, set roles, reset passwords
  roles.html            Roles & Access  (admin)  - choose View/Create/Edit/Delete per module
  change-password.html  change your own password
  app.css / app.js      shared design + shared code (sidebar, login guard, API)
  app script.js         backend: paste into Google Apps Script

GOOGLE SHEET SETUP
  1. Data tab (Sheet1) for "Contact Messages": row 1 headers
        ID | Name | Number | Email | Message | Date          (ID and Date are optional, they are added/filled for you)
  2. Tab named exactly  login  with headers:  Username | Password | Name | Role
        e.g.  admin | 1234 | Administrator | admin
     (If there is no Role column it is added and every existing user becomes admin.)
  Other tabs (roles, modules, m_<module>) are created automatically.

APPS SCRIPT SETUP
  1. In the sheet: Extensions > Apps Script. Replace all code with "app script.js".
  2. Set sheetName at the top to your contact data tab (not login / roles / modules).
  3. Run  intialSetup  once (authorize when asked).
  4. Run  hashPasswords  once to turn plain-text passwords into hashes.
  5. Deploy > New deployment > Web app: Execute as Me, Who has access: Anyone.
     (Already deployed before? Deploy > Manage deployments > pencil > New version > Deploy.)
  6. If the web app URL is different from the one in app.js, edit  scriptURL  at the top of app.js
     and in login.html.

HOW RBAC WORKS
  - Every user has ONE role (admin, manager, staff, viewer, or any role you create).
  - admin always has full access + the 3 admin pages.
  - Other roles get View / Create / Edit / Delete per module (Roles & Access page).
    Permissions are enforced on the server, not only hidden in the page.
  - Create a module in Module Builder, then give roles access to it in Roles & Access.
