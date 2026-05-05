/* ============================================================
   PMS Storage Layer Override: SQLite via PHP backend
   Replaces the Excel/File-System-Access XDB methods with
   fetch() calls to api.php. Keeps the SAME public API
   (XDB.get / XDB.set / XDB.nextId / XDB.save) so every
   feature module continues to work without modification.
   Loaded AFTER script.js and BEFORE feature modules.
   ============================================================ */
(function () {
    const API = 'api.php';

    async function call(action, body) {
        const opts = { method: body ? 'POST' : 'GET' };
        if (body) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }
        const r = await fetch(API + '?action=' + action, opts);
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'API error');
        return j;
    }

    // Always supported now — no Chrome-only File System Access API needed.
    XDB.isSupported = function () { return true; };

    // Build a fresh seed cache in memory using the original seedData() (and any
    // patches roles.js etc. applied), then push it to the server.
    XDB.createNew = async function () {
        try {
            await call('reset');
            this.cache = {};
            seedData(this.cache);
            this._ensureTables();
            await this._write();
            this.fileName = 'pms.sqlite';
            this._showLogin();
            toast('Database initialised: pms.sqlite');
        } catch (e) {
            toast('Init failed: ' + e.message, 'error');
        }
    };

    // "Open Existing" simply loads what's already in SQLite. If empty, seed first.
    XDB.browseForFile = async function () {
        try {
            const s = await call('status');
            if (!s.initialized) {
                this.cache = {};
                seedData(this.cache);
                this._ensureTables();
                await this._write();
            } else {
                const r = await call('load');
                this.cache = r.cache || {};
                this._ensureTables();
                // Rebuild financials_nested from financials + expenses
                const fins = this.cache.financials || [];
                const exps = this.cache.expenses || [];
                this.cache.financials_nested = fins.map(f => ({
                    ...f,
                    expenses: exps.filter(e => e.financial_id === f.id)
                                  .map(e => ({ id: e.id, desc: e.desc, amount: e.amount, date: e.date }))
                }));
            }
            this.fileName = s.name || 'pms.sqlite';
            this._showLogin();
            toast('Database opened: ' + this.fileName);
        } catch (e) {
            toast('Open failed: ' + e.message, 'error');
        }
    };

    // The drag-and-drop file input no longer applies; treat as Open Existing.
    XDB.handleFilePick = function () { return this.browseForFile(); };

    // Persist current cache to SQLite. Mirrors the original _write() logic
    // for flattening nested financials -> financials + expenses.
    XDB._write = async function () {
        try {
            const allExps = [];
            (this.cache.financials_nested || []).forEach(f => {
                (f.expenses || []).forEach(e => allExps.push({ ...e, financial_id: f.id }));
            });
            this.cache.expenses = allExps;
            const flatFins = (this.cache.financials_nested || []).map(({ id, agreement_id, budget_allocated }) =>
                ({ id, agreement_id, budget_allocated }));
            this.cache.financials = flatFins;

            // Build a payload that excludes the in-memory derived view.
            const payload = {};
            Object.keys(this.cache).forEach(k => {
                if (k === 'financials_nested') return;
                payload[k] = this.cache[k];
            });

            await call('save', { cache: payload });
            this._setStatus('saved');
        } catch (e) {
            console.error('Write error:', e);
            this._setStatus('error');
            toast('Save failed: ' + e.message, 'error');
        }
    };

    // Switch DB → just log out and return to setup screen.
    XDB.closeAndReopen = function () {
        if (!confirm('Sign out and return to the database screen?')) return;
        App.user = null;
        document.getElementById('app').style.display = 'none';
        document.getElementById('setup-page').style.display = 'flex';
        document.getElementById('setup-main').style.display = 'block';
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('db-indicator').style.display = 'none';
        document.getElementById('file-name-display').style.display = 'none';
        document.getElementById('browse-area').style.display = 'none';
    };

    // On first paint, auto-detect: if DB already initialised, jump straight to login.
    window.addEventListener('DOMContentLoaded', async () => {
        try {
            const s = await call('status');
            if (s.initialized) {
                // Pre-load cache so login works immediately.
                const r = await call('load');
                XDB.cache = r.cache || {};
                XDB._ensureTables();
                const fins = XDB.cache.financials || [];
                const exps = XDB.cache.expenses || [];
                XDB.cache.financials_nested = fins.map(f => ({
                    ...f,
                    expenses: exps.filter(e => e.financial_id === f.id)
                                  .map(e => ({ id: e.id, desc: e.desc, amount: e.amount, date: e.date }))
                }));
                XDB.fileName = s.name || 'pms.sqlite';
                XDB._showLogin();
            }
        } catch (e) {
            // Stay on setup screen if API unreachable.
            console.warn('Status check failed:', e);
        }
    });
})();
