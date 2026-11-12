ADMIN SUITE  (Google Sheets + Apps Script, no Node.js, no server)
Login - Dashboard - Dynamic CRUD modules - Roles & permissions (RBAC)

FILES  (keep ALL of them together in one folder)
  config.js             your Apps Script web app URL (edit ONE place: scriptURL)
  index.html            START PAGE: open this file. It sends you to the dashboard (if signed in) or to login.html
  login.html            two-column sign-in page
  dashboard.html        overview dashboard for any module
  crud.html             records page used by every module (add / view / edit / delete)
  mdash.html            per-module dashboard with the widget creator (bar, pie, line, number, latest records)
  modules.html          Module Builder  (admin): fields, colour, lookups, required messages
  users.html            Users           (admin)
  roles.html            Roles & Access  (admin): View / Create / Edit / Delete per module
  settings.html         Settings        (admin): app name, logo, login text, theme colours, default mode
  letter-templates.html Letter Templates: design letters with {{ Field }} placeholders from CRUD columns
  letter-generate.html  Generate Letter: pick a template + records, preview, edit, save, download
  letters.html          Generated Letters: view, Word / PDF download, print, delete
  letters.js            letter engine (placeholders, letterhead, Word / PDF / print)
  email.html            Email Settings  (admin): on/off, sender, per-module rules, test email, email log
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
  The login tab also gets  Email | Notify  columns (added for you). Notify = Yes means "Receive email" is ON.
  Other tabs (roles, modules, settings, emaillog, m_<module>) are created automatically.

APPS SCRIPT SETUP
  1. In the sheet: Extensions > Apps Script. Replace all code with "app script.js".
  2. Set sheetName at the top to your contact data tab (not login / roles / modules).
  3. Run  intialSetup  once (authorize when asked).
  4. Run  hashPasswords  once to turn plain-text passwords into hashes.
  5. EMAIL (new): in the Apps Script editor choose the function  authorizeEmail  and click Run. Approve the
     permission to send email. Do this ONCE before redeploying, otherwise the web app cannot send mail.
  6. Deploy > New deployment > Web app: Execute as Me, Who has access: Anyone.
     (Already deployed before? Deploy > Manage deployments > pencil > New version > Deploy.)
  7. If the web app URL is different, edit  scriptURL  in config.js (one place only).

LETTERS
  1. Letter Templates > New Template: choose the primary CRUD module (and optional extra modules). Every column
     appears as a clickable field. Click one to insert it as {{ Field Name }} where your cursor is (fields of extra
     modules are written {{ module.Field }}). System fields: date, date_long, time, letter_no, user, app_name, org.
  2. Generate Letter: choose the template, pick one record per module, press "Generate preview", edit the text
     if needed and "Save letter". The letter number (e.g. HR/2026/0001) is added automatically.
  3. Saved letters live in the "letters" sheet tab (templates in "letter_templates"). In Generated Letters you can
     view, download as Word (.doc, opens in Word / LibreOffice) or PDF, print and delete them.
  4. Give people access in Roles & Access: "Letter Templates" (View/Create/Edit/Delete) and
     "Letters" (View = open and download, Create = generate, Delete). To fill a letter a person also needs View
     permission on each CRUD module the template uses.
  5. The logo in the letterhead is the one uploaded in Settings. PDF creation uses an online library (needs internet).

EMAIL NOTIFICATIONS
  1. Email Settings: turn emails ON, set sender name / reply-to / footer, press "Send test email".
  2. Users page: give each user an email address and switch "Receive email" ON or OFF (per user).
  3. Email Settings > Configure (per module): enable it, choose the subject, when to send (created / updated),
     the default fields and which roles receive it.
  4. When someone saves a record, the form shows "Send this record by email" with the fields and their values.
     They can untick fields, or switch the email off for that record.
  Only users who have Receive email ON and permission to open that module are emailed. If sending fails
  the record is still saved. Gmail allows about 100 emails per day (Google Workspace about 1,500).

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
