/* ============================================================
   PMS Module: roles.js
   Unlimited Roles & Permissions System + Roles UI
   ============================================================ */

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

