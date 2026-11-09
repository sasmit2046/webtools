/* Version history shown on the About page. Add a new entry on top for every release. */
const APP_VERSION = '3.0.0';   // keep in sync with VERSION in "app script.js"
const APP_VERSIONS = [
  { v: '3.0.0', date: '2026-11-09', title: 'Branding, lookups and widgets', notes: [
    'Settings page: custom app name, tagline, organisation, logo, theme colours and default light/dark mode',
    'Two-column login page with logo and configurable text',
    'Each module has its own colour, and the sidebar uses it',
    'Lookup field type: a dropdown filled from another module\'s records',
    'Dashboard for every module with a widget creator (stat, bar, pie, line, latest records)',
    'About page with the full version history' ] },
  { v: '2.1.0', title: 'Flat design, themes and required messages', notes: [
    'Flat, shadow-free layout', 'Dark / light theme switch', 'Custom message for required fields in the Module Builder' ] },
  { v: '2.0.0', title: 'Admin Suite: dynamic CRUD with RBAC', notes: [
    'Dashboard moved to its own page', 'Module Builder: unlimited CRUD modules, each with its own sheet tab',
    'Users and Roles & Access pages with per-module View / Create / Edit / Delete permissions', 'Redesigned sidebar', 'Shared design and code files' ] },
  { v: '1.7.0', title: 'Dashboard', notes: [ 'Summary cards, 14-day chart and recent entries' ] },
  { v: '1.6.0', title: 'Separate pages and sidebar', notes: [ 'Login on its own page', 'Change password page', 'Sidebar and clearer action buttons' ] },
  { v: '1.5.0', title: 'Login', notes: [ 'Sign in against the "login" sheet tab', 'Salted password hashes, 6-hour sessions, lockout after 5 failed attempts' ] },
  { v: '1.4.0', title: 'View and Delete', notes: [ 'View details window', 'Delete with confirmation; IDs are never reused' ] },
  { v: '1.3.0', title: 'IDs', notes: [ 'ID column with auto-increment', 'Updates are matched by ID instead of row number' ] },
  { v: '1.2.0', title: 'Edit', notes: [ 'Edit action and form', 'Saved record is highlighted and shown after saving' ] },
  { v: '1.1.0', title: 'New look', notes: [ 'Attractive page design', 'Add New in a modal box with a success message' ] },
  { v: '1.0.0', title: 'Contact form', notes: [ 'Contact form saving to Google Sheets', 'Data table of all submissions' ] }
];
