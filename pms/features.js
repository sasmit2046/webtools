/* ===== ADDITIONAL FEATURES - Added on top of original PMS code ===== */

/* ===== 1. UNLIMITED ROLES & PERMISSIONS SYSTEM ===== */
const PERMISSIONS = [
    'dashboard.view',
    'programs.view', 'programs.add', 'programs.edit', 'programs.delete',
    'planning.view', 'planning.add', 'planning.edit', 'planning.delete', 'planning.approve',
    'agreements.view', 'agreements.add', 'agreements.edit', 'agreements.delete', 'agreements.print',
    'financial.view', 'financial.add', 'financial.edit', 'financial.delete',
    'reports.view', 'reports.export',
    'users.view', 'users.add', 'users.edit', 'users.delete',
    'settings.view', 'settings.edit',
    'notifications.view',
    'import.programs'
];

// Add roles table to XDB tables list if not present
if (!TABLES.includes('roles')) {
    TABLES.push('roles');
}

// Seed default roles
const _origSeedData = seedData;
seedData = function(c) {
    _origSeedData(c);
    c.roles = c.roles || [
        { id: 1, name: 'admin', label: 'Administrator', permissions: PERMISSIONS.join(','), is_system: 1 },
        { id: 2, name: 'data_entry', label: 'Data Entry', permissions: 'dashboard.view,programs.view,programs.add,programs.edit,planning.view,planning.add,planning.edit,agreements.view,agreements.add,agreements.edit,agreements.print,financial.view,financial.add,reports.view,reports.export,notifications.view,import.programs', is_system: 0 },
        { id: 3, name: 'viewer', label: 'Viewer', permissions: 'dashboard.view,programs.view,planning.view,agreements.view,agreements.print,financial.view,reports.view,notifications.view', is_system: 0 }
    ];
};

// Permission check functions (override originals)
const _origCanWrite = canWrite;
const _origIsAdmin = isAdmin;

window.canWrite = function() {
    if (!App.user) return false;
    return hasPerm('programs.edit') || hasPerm('agreements.edit') || hasPerm('planning.edit');
};

window.isAdmin = function() {
    if (!App.user) return false;
    const roles = XDB.get('roles');
    const userRole = roles.find(r => r.name === App.user.role);
    if (userRole && userRole.name === 'admin') return true;
    return hasPerm('settings.edit') && hasPerm('users.edit');
};

function hasPerm(perm) {
    if (!App.user) return false;
    const roles = XDB.get('roles');
    const userRole = roles.find(r => r.name === App.user.role);
    if (!userRole) return false;
    const perms = (userRole.permissions || '').split(',');
    return perms.includes(perm);
}

function hasAnyPerm(perms) {
    return perms.some(p => hasPerm(p));
}

// Expose globally
window.hasPerm = hasPerm;
window.hasAnyPerm = hasAnyPerm;

/* ===== ROLES MANAGEMENT UI (in Settings) ===== */
PG._renderRolesTab = () => {
    const roles = XDB.get('roles');
    const sc = document.getElementById('settings-content'); if (!sc) return;
    sc.innerHTML = `
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-user-shield me-2" style="color:var(--accent)"></i>Roles & Permissions</h5>
        <button class="btn-gold-sm" onclick="PG.roleForm()"><i class="fas fa-plus me-1"></i>Add Role</button></div>
        <div class="panel-body">
        ${roles.length ? `<div class="table-wrap"><table><thead><tr><th>Role Name</th><th>Label</th><th>Permissions</th><th>System</th><th>Actions</th></tr></thead><tbody>
        ${roles.map(r => `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.label || r.name}</td>
            <td style="max-width:300px;font-size:.75rem;color:var(--muted);word-break:break-all">${(r.permissions || '').split(',').length} permissions</td>
            <td>${r.is_system ? '<span class="badge-red">System</span>' : '<span class="badge-blue">Custom</span>'}</td>
            <td>
                <button class="btn-ism me-1" onclick="PG.roleForm(${r.id})"><i class="fas fa-edit"></i></button>
                ${!r.is_system ? `<button class="btn-dsm" onclick="PG.roleDel(${r.id})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`).join('')}
        </tbody></table></div>` : `<div style="text-align:center;padding:28px;color:var(--muted)">No roles yet</div>`}
        </div>
    </div>`;
};

PG.roleForm = (id) => {
    const roles = XDB.get('roles'), r = id ? roles.find(x => x.id === id) : null;
    const currentPerms = r ? (r.permissions || '').split(',') : [];
    const groups = {};
    PERMISSIONS.forEach(p => {
        const [mod] = p.split('.');
        if (!groups[mod]) groups[mod] = [];
        groups[mod].push(p);
    });
    const permHTML = Object.entries(groups).map(([mod, perms]) => `
        <div style="margin-bottom:12px">
            <div style="font-weight:700;font-size:.8rem;text-transform:uppercase;color:var(--accent);margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:4px">${mod}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${perms.map(p => `<label style="display:flex;align-items:center;gap:4px;font-size:.82rem;padding:4px 8px;border:1px solid var(--border);border-radius:6px;cursor:pointer;background:${currentPerms.includes(p) ? 'rgba(201,162,39,.1)' : 'var(--card)'}">
                    <input type="checkbox" name="perm" value="${p}" ${currentPerms.includes(p) ? 'checked' : ''}> ${p.split('.')[1]}
                </label>`).join('')}
            </div>
        </div>`).join('');

    App.openModal(id ? 'Edit Role' : 'Add Role', `<form onsubmit="PG.roleSave(event,${id || 0})"><div class="row g-3">
    <div class="col-md-6"><label class="form-label">Role Name (key) *</label><input type="text" class="form-control" name="name" value="${r?.name || ''}" required ${r?.is_system ? 'readonly' : ''}></div>
    <div class="col-md-6"><label class="form-label">Display Label</label><input type="text" class="form-control" name="label" value="${r?.label || ''}"></div>
    <div class="col-12"><label class="form-label">Permissions</label>
    <div style="display:flex;gap:8px;margin-bottom:10px">
        <button type="button" class="btn-ssm" onclick="document.querySelectorAll('[name=perm]').forEach(c=>c.checked=true)">Select All</button>
        <button type="button" class="btn-dsm" onclick="document.querySelectorAll('[name=perm]').forEach(c=>c.checked=false)">Deselect All</button>
    </div>
    <div style="max-height:350px;overflow-y:auto;padding:12px;border:1px solid var(--border);border-radius:8px">${permHTML}</div></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`, '720px');
};

PG.roleSave = (e, id) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name'), label = fd.get('label');
    const perms = fd.getAll('perm').join(',');
    const roles = XDB.get('roles');
    if (id) {
        const i = roles.findIndex(r => r.id === id);
        if (i >= 0) { roles[i].label = label; roles[i].permissions = perms; if (!roles[i].is_system) roles[i].name = name; }
    } else {
        if (roles.find(r => r.name === name)) { toast('Role name exists', 'error'); return; }
        roles.push({ id: XDB.nextId('roles'), name, label: label || name, permissions: perms, is_system: 0 });
    }
    XDB.set('roles', roles); App.closeModal(); toast(id ? 'Updated' : 'Added'); PG.settings(document.getElementById('content-area'));
};

PG.roleDel = (id) => {
    const used = XDB.get('users').some(u => {
        const roles = XDB.get('roles');
        const role = roles.find(r => r.id === id);
        return role && u.role === role.name;
    });
    if (used) { toast('Cannot delete: role in use', 'error'); return; }
    App.openModal('Delete Role', `<p>Delete this role?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('roles',XDB.get('roles').filter(x=>x.id!==${id}));App.closeModal();toast('Deleted');PG.settings(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`, '380px');
};

// Patch settings to add Roles tab
const _origSettings = PG.settings;
PG.settings = (el) => {
    _origSettings(el);
    // Inject roles tab button
    const tabsContainer = el.querySelector('div:first-child');
    if (tabsContainer && !tabsContainer.innerHTML.includes('Roles')) {
        tabsContainer.innerHTML += `<div style="padding:7px 14px;border-radius:8px;border:1.5px solid ${PG._settingsTab === 'roles' ? 'var(--accent)' : 'var(--border)'};background:${PG._settingsTab === 'roles' ? 'var(--accent)' : 'var(--card)'};color:${PG._settingsTab === 'roles' ? '#fff' : 'var(--muted)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s" onclick="PG._setTab('roles')"><i class="fas fa-user-shield me-1"></i>Roles & Permissions</div>`;
    }
    if (PG._settingsTab === 'roles') PG._renderRolesTab();
};

// Patch _renderSettingsTab to handle roles
const _origRenderTab2 = PG._renderSettingsTab;
PG._renderSettingsTab = (tabId, tabs) => {
    if (tabId === 'roles') { PG._renderRolesTab(); return; }
    _origRenderTab2(tabId, tabs);
};

// Patch users page to use dynamic roles
const _origUsersPage = PG.users;
PG.users = (el) => {
    if (!hasPerm('users.view') && !isAdmin()) { el.innerHTML = '<p style="color:var(--danger);font-weight:600">Access Denied</p>'; return; }
    const users = XDB.get('users'), roles = XDB.get('roles');
    el.innerHTML = `<div class="panel"><div class="panel-head"><h5>User Management</h5>${hasPerm('users.add') ? '<button class="btn-gold-sm" onclick="PG.ufForm()"><i class="fas fa-plus me-1"></i>Add User</button>' : ''}</div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr></thead><tbody>${users.map(u => {
        const role = roles.find(r => r.name === u.role);
        return `<tr><td><strong>${u.name}</strong></td><td>${u.email}</td><td><span class="badge-${u.role === 'admin' ? 'red' : 'gold'}">${role ? role.label : u.role}</span></td><td>${u.department_id ? getRef(u.department_id, 'departments') : 'All'}</td><td>${u.id !== 1 ? `${hasPerm('users.edit') ? `<button class="btn-ism me-1" onclick="PG.ufForm(${u.id})"><i class="fas fa-edit"></i></button>` : ''}${hasPerm('users.delete') ? `<button class="btn-dsm" onclick="XDB.set('users',XDB.get('users').filter(x=>x.id!==${u.id}));toast('Deleted');PG.users(document.getElementById('content-area'))"><i class="fas fa-trash"></i></button>` : ''}` : '<span style="color:var(--muted);font-size:.78rem">Protected</span>'}</td></tr>`;
    }).join('')}</tbody></table></div></div></div>`;
};

// Patch user form to show dynamic roles
const _origUfForm = PG.ufForm;
PG.ufForm = (id) => {
    const users = XDB.get('users'), u = id ? users.find(x => x.id === id) : null, depts = XDB.get('departments'), roles = XDB.get('roles');
    App.openModal(id ? 'Edit User' : 'Add User', `<form onsubmit="PG.ufSave(event,${id || 0})"><div class="row g-3"><div class="col-md-6"><label class="form-label">Name *</label><input type="text" class="form-control" name="name" value="${u?.name || ''}" required></div><div class="col-md-6"><label class="form-label">Email *</label><input type="email" class="form-control" name="email" value="${u?.email || ''}" required></div><div class="col-md-4"><label class="form-label">Password${id ? ' (blank=keep)' : ''} *</label><input type="password" class="form-control" name="password"${id ? '' : ' required'} minlength="5"></div><div class="col-md-4"><label class="form-label">Role</label><select class="form-select" name="role">${roles.map(r => `<option value="${r.name}"${u?.role === r.name ? ' selected' : ''}>${r.label || r.name}</option>`).join('')}</select></div><div class="col-md-4"><label class="form-label">Department</label><select class="form-select" name="department_id"><option value="0">All</option>${depts.map(d => `<option value="${d.id}"${u?.department_id === d.id ? ' selected' : ''}>${d.name}</option>`).join('')}</select></div></div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`);
};

/* ===== 2. FLOATING CALCULATOR ===== */
(function initCalculator() {
    const calcHTML = `
    <div id="floating-calc" style="position:fixed;bottom:20px;right:20px;z-index:9000;display:none">
        <div style="background:var(--sidebar);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);width:280px;overflow:hidden">
            <div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between;background:rgba(201,162,39,.15)">
                <span style="font-weight:700;font-size:.85rem;color:#fff"><i class="fas fa-calculator me-2"></i>Calculator</span>
                <div style="display:flex;gap:4px">
                    <button onclick="Calc.minimize()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:.85rem;padding:2px 6px"><i class="fas fa-minus"></i></button>
                    <button onclick="Calc.close()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:.85rem;padding:2px 6px"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div id="calc-body">
                <div style="padding:12px 16px;background:rgba(0,0,0,.15)">
                    <div id="calc-expr" style="font-size:.72rem;color:rgba(255,255,255,.4);min-height:16px;text-align:right;word-break:break-all"></div>
                    <input type="text" id="calc-display" value="0" readonly style="width:100%;background:transparent;border:none;color:#fff;font-size:1.6rem;font-weight:800;text-align:right;font-family:'Outfit',monospace;outline:none">
                </div>
                <div style="padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px" id="calc-buttons"></div>
            </div>
        </div>
    </div>
    <button id="calc-toggle" onclick="Calc.toggle()" style="position:fixed;bottom:20px;right:20px;z-index:8999;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#c9a227,#a88520);color:#fff;border:none;font-size:1.1rem;cursor:pointer;box-shadow:0 4px 15px rgba(201,162,39,.4);transition:all .25s;display:none" title="Calculator">
        <i class="fas fa-calculator"></i>
    </button>`;
    document.body.insertAdjacentHTML('beforeend', calcHTML);

    const btns = [
        ['C', 'ce', '⌫', 'bs', '%', 'op', '÷', 'op'],
        ['7', 'n', '8', 'n', '9', 'n', '×', 'op'],
        ['4', 'n', '5', 'n', '6', 'n', '−', 'op'],
        ['1', 'n', '2', 'n', '3', 'n', '+', 'op'],
        ['±', 'fn', '0', 'n', '.', 'n', '=', 'eq']
    ];
    const grid = document.getElementById('calc-buttons');
    btns.forEach(row => {
        for (let i = 0; i < row.length; i += 2) {
            const label = row[i], type = row[i + 1];
            const bg = type === 'eq' ? 'linear-gradient(135deg,#c9a227,#a88520)' : type === 'op' ? 'rgba(201,162,39,.2)' : type === 'ce' || type === 'bs' ? 'rgba(192,57,43,.15)' : 'rgba(255,255,255,.08)';
            const color = type === 'eq' ? '#fff' : type === 'op' ? '#c9a227' : type === 'ce' || type === 'bs' ? '#c0392b' : 'rgba(255,255,255,.85)';
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `background:${bg};color:${color};border:none;border-radius:8px;padding:12px 0;font-size:.95rem;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Outfit',sans-serif`;
            btn.onmouseenter = () => btn.style.opacity = '.8';
            btn.onmouseleave = () => btn.style.opacity = '1';
            btn.onclick = () => Calc.press(label, type);
            grid.appendChild(btn);
        }
    });
})();

const Calc = {
    expr: '', current: '0', op: null, prev: null, newNum: true,
    toggle() {
        const el = document.getElementById('floating-calc');
        const btn = document.getElementById('calc-toggle');
        if (el.style.display === 'none') { el.style.display = 'block'; btn.style.display = 'none'; }
        else this.close();
    },
    close() { document.getElementById('floating-calc').style.display = 'none'; document.getElementById('calc-toggle').style.display = 'block'; },
    minimize() {
        const body = document.getElementById('calc-body');
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
    },
    press(label, type) {
        const disp = document.getElementById('calc-display'), expr = document.getElementById('calc-expr');
        if (type === 'n') {
            if (label === '.' && this.current.includes('.')) return;
            if (this.newNum) { this.current = label === '.' ? '0.' : label; this.newNum = false; }
            else this.current += label;
        } else if (type === 'op') {
            this.calc();
            this.op = label; this.prev = parseFloat(this.current); this.newNum = true;
            this.expr = this.current + ' ' + label;
        } else if (type === 'eq') {
            this.calc(); this.op = null; this.newNum = true;
            this.expr = '';
        } else if (type === 'ce') {
            this.current = '0'; this.op = null; this.prev = null; this.expr = ''; this.newNum = true;
        } else if (type === 'bs') {
            this.current = this.current.length > 1 ? this.current.slice(0, -1) : '0';
        } else if (type === 'fn' && label === '±') {
            this.current = String(-parseFloat(this.current));
        }
        disp.value = this.current;
        expr.textContent = this.expr;
    },
    calc() {
        if (this.op === null || this.prev === null) return;
        const a = this.prev, b = parseFloat(this.current);
        let r = 0;
        switch (this.op) {
            case '+': r = a + b; break;
            case '−': r = a - b; break;
            case '×': r = a * b; break;
            case '÷': r = b !== 0 ? a / b : 0; break;
            case '%': r = a * (b / 100); break;
        }
        this.current = String(Math.round(r * 1e10) / 1e10);
        this.prev = null;
    }
};

// Show calc button when app is visible
const _origShowApp = App.showApp;
App.showApp = function() {
    _origShowApp.call(this);
    document.getElementById('calc-toggle').style.display = 'block';
};

/* ===== 3. APP NAME SETTINGS ===== */
if (!TABLES.includes('app_settings')) {
    TABLES.push('app_settings');
}

// Seed default settings
const _origSeedData2 = seedData;
seedData = function(c) {
    _origSeedData2(c);
    c.app_settings = c.app_settings || [
        { id: 1, key: 'app_name', value: 'PMS' },
        { id: 2, key: 'app_subtitle', value: 'Planning Management System' },
        { id: 3, key: 'org_name', value: 'Government of Nepal' },
        { id: 4, key: 'version', value: '3.0.0' },
        { id: 5, key: 'developer', value: 'PMS Development Team' }
    ];
};

function getAppSetting(key, fallback) {
    const settings = XDB.get('app_settings') || [];
    const s = settings.find(x => x.key === key);
    return s ? s.value : fallback;
}

function setAppSetting(key, value) {
    const settings = XDB.get('app_settings') || [];
    const idx = settings.findIndex(x => x.key === key);
    if (idx >= 0) settings[idx].value = value;
    else settings.push({ id: XDB.nextId('app_settings'), key, value });
    XDB.set('app_settings', settings);
}

// Update sidebar brand dynamically
const _origBuildSidebar = App.buildSidebar;
App.buildSidebar = function() {
    _origBuildSidebar.call(this);
    const brand = document.querySelector('.sidebar-brand h5');
    const sub = document.querySelector('.sidebar-brand small');
    if (brand) brand.textContent = getAppSetting('app_name', 'PMS');
    if (sub) sub.textContent = getAppSetting('app_subtitle', 'Planning Management System');
};

// App Settings tab in Settings
PG._renderAppSettingsTab = () => {
    const sc = document.getElementById('settings-content'); if (!sc) return;
    sc.innerHTML = `
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-sliders-h me-2" style="color:var(--accent)"></i>Application Settings</h5></div>
        <div class="panel-body">
            <form onsubmit="PG._saveAppSettings(event)">
            <div class="row g-3">
                <div class="col-md-6"><label class="form-label">Application Name</label><input type="text" class="form-control" name="app_name" value="${getAppSetting('app_name', 'PMS')}"></div>
                <div class="col-md-6"><label class="form-label">Subtitle</label><input type="text" class="form-control" name="app_subtitle" value="${getAppSetting('app_subtitle', 'Planning Management System')}"></div>
                <div class="col-md-6"><label class="form-label">Organization Name</label><input type="text" class="form-control" name="org_name" value="${getAppSetting('org_name', 'Government of Nepal')}"></div>
                <div class="col-md-6"><label class="form-label">Developer</label><input type="text" class="form-control" name="developer" value="${getAppSetting('developer', 'PMS Development Team')}"></div>
                <div class="col-md-6"><label class="form-label">Version</label><input type="text" class="form-control" name="version" value="${getAppSetting('version', '3.0.0')}"></div>
            </div>
            <div class="mt-4"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save Settings</button></div>
            </form>
        </div>
    </div>`;
};
PG._saveAppSettings = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    ['app_name', 'app_subtitle', 'org_name', 'developer', 'version'].forEach(k => setAppSetting(k, fd.get(k)));
    toast('Settings saved');
    App.buildSidebar();
    document.title = getAppSetting('app_name', 'PMS') + ' - ' + getAppSetting('app_subtitle', 'Planning Management System');
};

// Patch settings to add App Settings tab
const _origSettings2 = PG.settings;
PG.settings = (el) => {
    _origSettings2(el);
    const tabsContainer = el.querySelector('div:first-child');
    if (tabsContainer && !tabsContainer.innerHTML.includes('App Settings')) {
        tabsContainer.innerHTML = `<div style="padding:7px 14px;border-radius:8px;border:1.5px solid ${PG._settingsTab === 'app_settings' ? 'var(--accent)' : 'var(--border)'};background:${PG._settingsTab === 'app_settings' ? 'var(--accent)' : 'var(--card)'};color:${PG._settingsTab === 'app_settings' ? '#fff' : 'var(--muted)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s" onclick="PG._setTab('app_settings')"><i class="fas fa-sliders-h me-1"></i>App Settings</div>` + tabsContainer.innerHTML;
    }
    if (PG._settingsTab === 'app_settings') PG._renderAppSettingsTab();
};

// Patch _renderSettingsTab for app_settings
const _origRenderTab3 = PG._renderSettingsTab;
PG._renderSettingsTab = (tabId, tabs) => {
    if (tabId === 'app_settings') { PG._renderAppSettingsTab(); return; }
    if (tabId === 'roles') { PG._renderRolesTab(); return; }
    _origRenderTab3(tabId, tabs);
};

/* ===== 4. ABOUT SOFTWARE MODAL ===== */
window.showAbout = function() {
    App.openModal('About Software', `
    <div style="text-align:center;padding:20px 10px">
        <div style="width:70px;height:70px;background:linear-gradient(135deg,#c9a227,#a88520);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#fff;margin:0 auto 16px"><i class="fas fa-landmark"></i></div>
        <h3 style="font-family:'Outfit',sans-serif;font-weight:800;margin-bottom:4px">${getAppSetting('app_name', 'PMS')}</h3>
        <p style="color:var(--accent);font-weight:600;font-size:.82rem;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px">${getAppSetting('app_subtitle', 'Planning Management System')}</p>
        <div style="background:#faf8f4;border-radius:10px;padding:16px;text-align:left;font-size:.85rem;margin-bottom:16px">
            <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px">
                <strong>Version:</strong><span>${getAppSetting('version', '3.0.0')}</span>
                <strong>Organization:</strong><span>${getAppSetting('org_name', 'Government of Nepal')}</span>
                <strong>Developer:</strong><span>${getAppSetting('developer', 'PMS Development Team')}</span>
                <strong>Database:</strong><span>Excel (.xlsx) File System</span>
                <strong>Technology:</strong><span>HTML5, CSS3, JavaScript, SheetJS</span>
                <strong>Browser:</strong><span>Chrome / Edge (File System Access API)</span>
            </div>
        </div>
        <div style="font-size:.78rem;color:var(--muted);line-height:1.7">
            <p>This system manages government planning programs, budgets, agreements, financial tracking, and comprehensive reporting with Excel-based data storage.</p>
            <p style="margin-top:8px"><strong>Features:</strong> Dynamic Roles & Permissions, Multi-user Support, Nepali Calendar, Letter Templates, Budget Tracking, Work Reports, Excel Import/Export</p>
        </div>
        <div class="mt-3"><button class="btn-outline-gold" onclick="App.closeModal()">Close</button></div>
    </div>`, '520px');
};

// Add About button to sidebar
const _origBuildSidebar2 = App.buildSidebar;
App.buildSidebar = function() {
    _origBuildSidebar2.call(this);
    const nav = document.getElementById('sidebar-nav');
    if (nav && !nav.innerHTML.includes('About')) {
        nav.innerHTML += `<div class="nav-section">INFO</div><div class="nav-item" onclick="showAbout()"><i class="fas fa-info-circle"></i><span>About</span></div>`;
    }
};

/* ===== 5. PROGRAM IMPORT TOOL ===== */
window.importPrograms = function() {
    App.openModal('Import Programs', `
    <div style="text-align:center;padding:10px">
        <div style="width:60px;height:60px;background:rgba(26,107,90,.1);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:var(--success);margin:0 auto 14px"><i class="fas fa-file-import"></i></div>
        <h5 style="margin-bottom:4px">Import Programs from Excel</h5>
        <p style="font-size:.82rem;color:var(--muted);margin-bottom:18px">Upload an Excel file (.xlsx) containing program data. The file should have columns matching the program fields.</p>
        <div style="background:#faf8f4;border-radius:10px;padding:14px;text-align:left;font-size:.78rem;color:var(--muted);margin-bottom:18px;line-height:1.7">
            <strong>Expected Columns:</strong><br>
            Program_Name, Register_No, Ward_Number, Budget_Amount, parent_id (optional)<br><br>
            <strong>Optional Columns:</strong><br>
            budge_title_id, program_type_id, budget_source_id, budget_area_id, department_id, budget_level_id, work_type_id, budget_type_id, isSelected, isCompleted
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn-teal-sm" onclick="document.getElementById('import-file').click()"><i class="fas fa-upload me-1"></i>Upload Excel File</button>
            <button class="btn-outline-gold" onclick="PG._downloadTemplate()"><i class="fas fa-download me-1"></i>Download Template</button>
        </div>
        <input type="file" id="import-file" accept=".xlsx,.xls" style="display:none" onchange="PG._handleImport(this.files[0])">
        <div id="import-preview" style="margin-top:16px"></div>
    </div>`, '600px');
};

PG._downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
        Program_Name: 'Sample Program', Register_No: 'PRJ-001', Ward_Number: 1, Budget_Amount: 1000000,
        parent_id: 0, budge_title_id: 1, program_type_id: 1, budget_source_id: 1, budget_area_id: 1,
        department_id: 1, budget_level_id: 1, work_type_id: 1, budget_type_id: 1, isSelected: 1, isCompleted: 0
    }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Programs');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const b = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'PMS_Program_Import_Template.xlsx'; l.click();
    toast('Template downloaded');
};

PG._handleImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            if (!data.length) { toast('No data found', 'error'); return; }

            const preview = document.getElementById('import-preview');
            preview.innerHTML = `
            <div style="text-align:left;margin-top:10px">
                <div style="font-weight:700;font-size:.85rem;margin-bottom:8px"><i class="fas fa-eye me-1" style="color:var(--accent)"></i>Preview: ${data.length} programs found</div>
                <div class="table-wrap" style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
                    <table><thead><tr><th>Name</th><th>Reg No</th><th>Ward</th><th>Budget</th></tr></thead>
                    <tbody>${data.slice(0, 20).map(r => `<tr><td>${r.Program_Name || '-'}</td><td>${r.Register_No || '-'}</td><td>${r.Ward_Number || '-'}</td><td>${fmt(r.Budget_Amount || 0)}</td></tr>`).join('')}
                    ${data.length > 20 ? `<tr><td colspan="4" style="text-align:center;color:var(--muted)">...and ${data.length - 20} more</td></tr>` : ''}
                    </tbody></table>
                </div>
                <div class="mt-3 d-flex gap-2">
                    <button class="btn-gold-sm" onclick="PG._confirmImport()"><i class="fas fa-check me-1"></i>Import ${data.length} Programs</button>
                    <button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button>
                </div>
            </div>`;
            PG._importData = data;
        } catch (err) { toast('Invalid file: ' + err.message, 'error'); }
    };
    reader.readAsArrayBuffer(file);
};

PG._confirmImport = () => {
    if (!PG._importData || !PG._importData.length) return;
    const progs = XDB.get('programs');
    let added = 0, skipped = 0;
    PG._importData.forEach(row => {
        if (!row.Program_Name) { skipped++; return; }
        if (progs.find(p => p.Program_Name === row.Program_Name && p.Register_No === row.Register_No)) { skipped++; return; }
        progs.push({
            id: XDB.nextId('programs'),
            Program_Name: row.Program_Name || '',
            Register_No: row.Register_No || '',
            Ward_Number: +(row.Ward_Number || 0),
            Budget_Amount: +(row.Budget_Amount || 0),
            parent_id: +(row.parent_id || 0),
            budge_title_id: +(row.budge_title_id || 0),
            program_type_id: +(row.program_type_id || 0),
            budget_source_id: +(row.budget_source_id || 0),
            budget_area_id: +(row.budget_area_id || 0),
            department_id: +(row.department_id || 0),
            budget_level_id: +(row.budget_level_id || 0),
            work_type_id: +(row.work_type_id || 0),
            budget_type_id: +(row.budget_type_id || 0),
            isSelected: +(row.isSelected || 0),
            isCompleted: +(row.isCompleted || 0)
        });
        added++;
    });
    XDB.set('programs', progs);
    App.closeModal();
    toast(`Imported ${added} programs${skipped ? `, ${skipped} skipped` : ''}`);
    PG._importData = null;
    PG.programs(document.getElementById('content-area'));
};

// Add Import button to Programs page
const _origPrograms = PG.programs;
PG.programs = (el, page) => {
    _origPrograms(el, page);
    // Inject import button next to Add Program
    const panelHead = el.querySelector('.panel-head');
    if (panelHead && hasPerm('import.programs') && !panelHead.innerHTML.includes('Import')) {
        const addBtn = panelHead.querySelector('.btn-gold-sm');
        if (addBtn) {
            addBtn.insertAdjacentHTML('beforebegin', `<button class="btn-teal-sm me-2" onclick="importPrograms()"><i class="fas fa-file-import me-1"></i>Import</button>`);
        }
    }
};

/* ===== 6. DYNAMIC PAGE LOADING SUPPORT ===== */
// The existing App.navigate already handles dynamic content loading.
// Pages are loaded as JS rendering functions into #content-area.
// This system is already "dynamic" - each page function renders its content.

/* ===== 7. APPROVAL WORKFLOW ENHANCEMENT ===== */
// Already exists in planning (approve/reject). Add approval for budget details.
const _origDetailBudget = PG._detailBudget;
PG._detailBudget = function(agrId, a, bd) {
    _origDetailBudget(agrId, a, bd);
    // Add approve buttons for budget if admin
    if (bd && hasPerm('planning.approve')) {
        const tc = document.getElementById('detail-tab-content');
        if (tc) {
            const panels = tc.querySelectorAll('.panel-head');
            panels.forEach(ph => {
                if (ph.textContent.includes('Estimate') && bd.EstStatus === 'pending') {
                    ph.insertAdjacentHTML('beforeend', ` <button class="btn-ssm ms-2" onclick="PG._approveBudget(${agrId},'EstStatus','approved')"><i class="fas fa-check"></i> Approve</button>`);
                }
                if (ph.textContent.includes('Valuation') && bd.ValStatus === 'pending') {
                    ph.insertAdjacentHTML('beforeend', ` <button class="btn-ssm ms-2" onclick="PG._approveBudget(${agrId},'ValStatus','approved')"><i class="fas fa-check"></i> Approve</button>`);
                }
            });
        }
    }
};

PG._approveBudget = (agrId, field, status) => {
    const bds = XDB.get('budget_details'), bd = bds.find(b => b.agreement_id === agrId);
    if (bd) { bd[field] = status; XDB.set('budget_details', bds); toast('Approved'); PG.agreementDetail(agrId, 'budget'); }
};

/* ===== KEYBOARD SHORTCUT FOR CALCULATOR ===== */
document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') { e.preventDefault(); Calc.toggle(); }
});

console.log('PMS Features v3.0 loaded: Roles, Calculator, App Settings, About, Import');
