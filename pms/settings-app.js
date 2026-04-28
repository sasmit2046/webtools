/* ============================================================
   PMS Module: settings-app.js
   App Settings tab + About Software modal
   ============================================================ */

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

