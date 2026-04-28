/* ============================================================
   PMS Module: menu-inject-2.js
   Inject Salary/Leave nav items + register routes
   ============================================================ */

/* ---------- Register salary & leave routes ---------- */
const _origNavigate2 = App.navigate;
App.navigate = function(page) {
    if (page === 'salaries') {
        document.getElementById('page-title').textContent = 'Salary Management';
        if (PG.salaries) PG.salaries(document.getElementById('content-area'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        return;
    }
    if (page === 'leaves') {
        document.getElementById('page-title').textContent = 'Leave Management';
        if (PG.leaves) PG.leaves(document.getElementById('content-area'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        return;
    }
    _origNavigate2.call(this, page);
};

// Provide loadPage alias for compatibility
if (!App.loadPage) App.loadPage = function(p){ return App.navigate(p); };

/* ---------- Inject Salary & Leaves nav items into sidebar ---------- */
const _origBuildSidebar4 = App.buildSidebar;
App.buildSidebar = function() {
    _origBuildSidebar4.call(this);
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    // Add Salary
    if (!nav.innerHTML.includes('>Salary<') && (typeof hasPerm !== 'function' || hasPerm('salary.view') || isAdmin())) {
        const infoSection = Array.from(nav.children).find(c => c.textContent === 'INFO');
        const salHTML = `<div class="nav-item" onclick="App.navigate('salaries')"><i class="fas fa-money-check-alt"></i><span>Salary</span></div>`;
        if (infoSection) infoSection.insertAdjacentHTML('beforebegin', salHTML);
        else nav.innerHTML += salHTML;
    }

    // Add Leaves
    if (!nav.innerHTML.includes('>Leaves<') && (typeof hasPerm !== 'function' || hasPerm('leave.view') || isAdmin())) {
        const infoSection = Array.from(nav.children).find(c => c.textContent === 'INFO');
        const lvHTML = `<div class="nav-item" onclick="App.navigate('leaves')"><i class="fas fa-calendar-check"></i><span>Leaves</span></div>`;
        if (infoSection) infoSection.insertAdjacentHTML('beforebegin', lvHTML);
        else nav.innerHTML += lvHTML;
    }
};

console.log('PMS Features v3.5 loaded: Salary, Leave, Employees menu wired');
