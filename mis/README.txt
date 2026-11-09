ADMIN SUITE  (Google Sheets + Apps Script, no Node.js, no server)
Login - Dashboard - Dynamic CRUD modules - Roles & permissions (RBAC)

FILES  (keep ALL of them together in one folder)
  config.js             your Apps Script web app URL (edit ONE place: scriptURL)
  login.html            two-column sign-in page  -> OPEN THIS FIRST
  dashboard.html        overview dashboard for any module
  crud.html             records page used by every module (add / view / edit / delete)
  mdash.html            per-module dashboard with the widget creator (bar, pie, line, number, latest records)
  modules.html          Module Builder  (admin): fields, colour, lookups, required messages
  users.html            Users           (admin)
  roles.html            Roles & Access  (admin): View / Create / Edit / Delete per module
  settings.html         Settings        (admin): app name, logo, login text, theme colours, default mode
  change-password.html  change your own password
  about.html            version, backend check and full version history
  app.css / app.js / charts.js / theme.js / version.js   shared design and code
  logo.png              (optional) your logo, e.g. the Nepal Government emblem - used on the login page
                        when no logo has been uploaded in Settings
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
  6. If the web app URL is different, edit  scriptURL  in config.js (one place only).

BRANDING
  Settings page: app name, tagline, organisation, logo, login text, primary + sidebar colour, default mode.
  The login page is public, so it loads these settings before sign-in.
  Logo: upload it in Settings, or save the official emblem as logo.png next to login.html.

LOOKUPS AND WIDGETS
  Field type "lookup" fills a dropdown from another module's records (e.g. Staff -> Department).
  Every module has a Dashboard tab. Admins add widgets (number card, bar, pie, line, latest records).
  Each module has its own colour (Module Builder) that the sidebar uses.

MODULE BUILDER TIP
  Tick "Required" on a field and type a message in "Required message" (e.g. "Please enter the employee name").
  That message is shown in the form and returned by the server when the field is empty.

HOW RBAC WORKS
  - Every user has ONE role (admin, manager, staff, viewer, or any role you create).
  - admin always has full access + the 3 admin pages.
  - Other roles get View / Create / Edit / Delete per module (Roles & Access page).
    Permissions are enforced on the server, not only hidden in the page.
  - Create a module in Module Builder, then give roles access to it in Roles & Access.
