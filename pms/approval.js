/* ============================================================
   PMS Module: approval.js
   Approval Workflow + Calculator Shortcut
   ============================================================ */

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

