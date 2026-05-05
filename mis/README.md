# Planning Management System — PHP + SQLite build

Drop-in port of the original Excel-based PMS. **Layout, forms, modals,
and the unlimited roles & permissions system are unchanged.** Only the
storage layer was replaced: instead of writing an `.xlsx` file via the
Chrome File-System-Access API, data is persisted to `pms.sqlite`
through a small PHP backend (`api.php`).

## Install (XAMPP / Windows)

1. Copy this whole `pms` folder into `C:\xampp\htdocs\`
   so the path becomes `C:\xampp\htdocs\pms\`.
2. Start **Apache** from the XAMPP control panel.
   (MySQL is not needed — SQLite is built into PHP.)
3. Open Chrome / Edge and go to: <http://localhost/pms/>
4. Click **Create New Database** the first time. The file
   `pms.sqlite` is created next to `api.php`.

### Default logins
- `admin@pms.gov.np` / `admin123`
- `dataentry@pms.gov.np` / `data123`
- `viewer@pms.gov.np` / `view123`

## File layout

| File | Role |
|---|---|
| `index.php` | App shell (same markup as the original `index.html`) |
| `api.php` | JSON API: `?action=status|load|save|reset` |
| `db.php` | Opens / creates the SQLite database |
| `pms.sqlite` | Auto-created on first run (do **not** commit) |
| `xdb-php.js` | Overrides `XDB.createNew/browseForFile/_write/...` to use the API |
| `script.js`, `roles.js`, ... | **Unchanged** original frontend modules |

## How the storage swap works

The original app already exposed a single storage object `XDB` with
methods `get(table)`, `set(table, rows)`, `nextId(table)`, and `save()`.
Every feature module (roles, salary, leave, employee, ...) talks to
`XDB` only — never to Excel directly.

`xdb-php.js` keeps the in-memory `XDB.cache` exactly as before, but
replaces `_write()` (Excel save) with a `fetch('api.php?action=save')`
call. On boot it calls `?action=status` and, if a DB already exists,
`?action=load` to repopulate the cache before showing the login screen.

The SQLite schema is intentionally trivial:

```
CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
```

Each "table" the JS app uses (`users`, `roles`, `programs`, `plans`,
`agreements`, ...) is one row whose `v` is a JSON array of records.
This mirrors how the Excel version stored each table as one sheet,
so no module code had to change.

## Backups

- **Easiest:** copy `pms.sqlite` somewhere safe.
- The in-app **Backup** menu still exports the full DB to Excel, so
  the existing one-click backup/restore flow keeps working.

## Notes / limitations

- Authentication is still client-side (same as the original). The
  PHP API has no auth layer — fine for a single-user XAMPP install
  on `localhost`, **not** for public hosting. If you want server-side
  auth, ask and I'll add a session-based guard around `api.php`.
- The "drag & drop .xlsx" panel on the setup screen is hidden in the
  PHP build (the file-input handler now just calls `browseForFile`).
- Requires PHP ≥ 7.4 with `pdo_sqlite` (enabled by default in XAMPP).
