/* ============================================================
   PMS Module: menu-inject-1.js
   Inject Wards tab + Employees nav item
   ============================================================ */

/* ===== Inject Wards tab into Settings + Employees nav item ===== */
const _origSettings3 = PG.settings;
PG.settings = (el) => {
    _origSettings3(el);
    const tabsContainer = el.querySelector('div:first-child');
    if (tabsContainer && !tabsContainer.innerHTML.includes('Wards')) {
        tabsContainer.innerHTML += `<div style="padding:7px 14px;border-radius:8px;border:1.5px solid ${PG._settingsTab==='wards'?'var(--accent)':'var(--border)'};background:${PG._settingsTab==='wards'?'var(--accent)':'var(--card)'};color:${PG._settingsTab==='wards'?'#fff':'var(--muted)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s" onclick="PG._setTab('wards')"><i class="fas fa-map-marked-alt me-1"></i>Wards</div>`;
    }
    if (PG._settingsTab === 'wards') PG._renderWardsTab();
};

const _origRenderTab4 = PG._renderSettingsTab;
PG._renderSettingsTab = (tabId, tabs) => {
    if (tabId === 'wards') { PG._renderWardsTab(); return; }
    if (tabId === 'app_settings') { PG._renderAppSettingsTab(); return; }
    if (tabId === 'roles') { PG._renderRolesTab(); return; }
    _origRenderTab4(tabId, tabs);
};

// Add Employees to sidebar nav
const _origBuildSidebar3 = App.buildSidebar;
App.buildSidebar = function() {
    _origBuildSidebar3.call(this);
    const nav = document.getElementById('sidebar-nav');
    if (nav && !nav.innerHTML.includes('Employees') && (hasPerm('employees.view') || isAdmin())) {
        // Insert before INFO section
        const infoSection = Array.from(nav.children).find(c => c.textContent === 'INFO');
        const empHTML = `<div class="nav-section">HR</div><div class="nav-item" onclick="App.navigate('employees')"><i class="fas fa-users"></i><span>Employees</span></div>`;
        if (infoSection) infoSection.insertAdjacentHTML('beforebegin', empHTML);
        else nav.innerHTML += empHTML;
    }
};

// Register employees route in App.navigate
const _origNavigate = App.navigate;
App.navigate = function(page) {
    if (page === 'employees') {
        document.getElementById('page-title').textContent = 'Employees';
        PG.employees(document.getElementById('content-area'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        return;
    }
    _origNavigate.call(this, page);
};

