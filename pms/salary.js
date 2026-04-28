/* ============================================================
   PMS Module: salary.js
   Salary Management + Payslip
   ============================================================ */

/* ============================================================
   v3.4 — SALARY & LEAVE MANAGEMENT MODULE
   ============================================================ */

PERMISSIONS.push(
    'salary.view','salary.edit','salary.delete',
    'leave.view','leave.apply','leave.approve','leave.delete','leave.types.manage'
);

['salaries','leave_types','leave_applications'].forEach(t => { if (!TABLES.includes(t)) TABLES.push(t); });

const _origCacheInit2 = XDB.init || (() => {});
TABLES.forEach(t => { if (XDB.cache && !XDB.cache[t]) XDB.cache[t] = []; });

// Seed default leave types if empty
(function seedLeaveTypes() {
    setTimeout(() => {
        const lt = XDB.get('leave_types') || [];
        if (!lt.length) {
            const defaults = [
                { name: 'Home Leave', code: 'home', annual_quota: 12, paid: 1, color: '#10b981' },
                { name: 'Sick Leave', code: 'sick', annual_quota: 12, paid: 1, color: '#f59e0b' },
                { name: 'Unpaid Leave', code: 'unpaid', annual_quota: 30, paid: 0, color: '#6b7280' },
                { name: 'Maternity Leave', code: 'maternity', annual_quota: 98, paid: 1, color: '#ec4899' },
                { name: 'Education Leave', code: 'education', annual_quota: 10, paid: 1, color: '#3b82f6' },
                { name: 'Extra Leave', code: 'extra', annual_quota: 5, paid: 0, color: '#8b5cf6' }
            ];
            defaults.forEach(d => lt.push({ id: XDB.nextId('leave_types'), ...d, created_at: Date.now() }));
            XDB.set('leave_types', lt);
        }
    }, 500);
})();

/* ---------- SALARY MANAGEMENT ---------- */
PG.salaries = (el) => {
    if (!hasPerm('salary.view') && !isAdmin()) {
        el.innerHTML = '<p style="color:var(--danger);font-weight:600;padding:20px">Access Denied</p>';
        return;
    }
    const emps = XDB.get('employees') || [];
    const sals = XDB.get('salaries') || [];
    const q = (PG._salSearch || '').toLowerCase();
    const filtered = emps.filter(e => !q || (e.Fullname||'').toLowerCase().includes(q) || (e.EmployeeCode||'').toLowerCase().includes(q));

    el.innerHTML = `<div class="card-soft">
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5><i class="fas fa-money-check-alt me-2" style="color:var(--accent)"></i>Salary Sheet <small style="color:var(--muted);font-weight:500">(${filtered.length} employees)</small></h5>
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <input type="text" class="form-control form-control-sm" placeholder="Search employee..." style="width:200px" value="${PG._salSearch||''}" oninput="PG._salSearch=this.value;clearTimeout(PG._salT);PG._salT=setTimeout(()=>PG.salaries(document.getElementById('content-area')),300)">
                <button class="btn-outline-gold btn-sm" onclick="PG.salExportAll()"><i class="fas fa-file-excel me-1"></i>Export</button>
            </div>
        </div>
        ${filtered.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Code</th><th>Employee</th><th>Designation</th><th>Basic</th><th>Grade</th><th>Allowances</th><th>Gross</th><th>Deductions</th><th class="text-end">Net Salary</th><th>Actions</th></tr></thead>
            <tbody>${filtered.map(e => {
                const s = sals.find(x => x.employee_id === e.id) || {};
                const basic = +s.basic_salary || 0;
                const grade = +s.grade_amount || 0;
                const allow = (+s.allowance_office||0) + (+s.allowance_transport||0) + (+s.allowance_dearness||0);
                const gross = basic + grade + allow;
                const pf = +s.pf_amount || 0;
                const cit = +s.cit_amount || 0;
                const tax = +s.tax_amount || 0;
                const insurance = +s.insurance_amount || 0;
                const otherDed = +s.other_deduction || 0;
                const ded = pf + cit + tax + insurance + otherDed;
                const net = gross - ded;
                return `<tr>
                    <td><strong>${e.EmployeeCode||'-'}</strong></td>
                    <td>${e.Fullname||'-'}</td>
                    <td style="font-size:.78rem;color:var(--muted)">${e.Designation||'-'}</td>
                    <td>NPR ${basic.toLocaleString()}</td>
                    <td>NPR ${grade.toLocaleString()}</td>
                    <td>NPR ${allow.toLocaleString()}</td>
                    <td><strong style="color:var(--teal,#0891b2)">NPR ${gross.toLocaleString()}</strong></td>
                    <td style="color:var(--danger)">NPR ${ded.toLocaleString()}</td>
                    <td class="text-end"><strong style="color:var(--accent);font-size:1rem">NPR ${net.toLocaleString()}</strong></td>
                    <td>
                        ${(hasPerm('salary.edit')||isAdmin()) ? `<button class="btn-ism me-1" onclick="PG.salForm(${e.id})" title="Edit Salary"><i class="fas fa-edit"></i></button>` : ''}
                        <button class="btn-outline-gold btn-sm me-1" onclick="PG.salPayslip(${e.id})" title="Payslip"><i class="fas fa-file-invoice"></i></button>
                        ${(hasPerm('salary.delete')||isAdmin()) && s.id ? `<button class="btn-dsm" onclick="PG.salDel(${e.id})" title="Delete Salary"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>` : '<div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-money-bill" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px"></i>No employees. Add employees first.</div>'}
    </div>`;
};

PG.salForm = (empId) => {
    const emp = (XDB.get('employees') || []).find(e => e.id === empId);
    if (!emp) { toast('Employee not found', 'error'); return; }
    const s = (XDB.get('salaries') || []).find(x => x.employee_id === empId) || {};
    const v = k => s[k] ?? '';
    App.openModal(`Salary - ${emp.Fullname}`, `<form onsubmit="PG.salSave(event,${empId})">
        <div style="background:var(--card);padding:10px;border-radius:8px;margin-bottom:14px;font-size:.82rem">
            <strong>${emp.EmployeeCode}</strong> · ${emp.Designation||'-'} · ${emp.Department||'-'}
        </div>
        <h6 style="color:var(--accent);font-size:.85rem;margin-bottom:10px"><i class="fas fa-plus-circle me-1"></i>Earnings</h6>
        <div class="row g-3">
            <div class="col-md-4"><label class="form-label">Basic Salary *</label><input type="number" step="0.01" class="form-control" name="basic_salary" value="${v('basic_salary')}" required oninput="PG._salPreview()"></div>
            <div class="col-md-4"><label class="form-label">Grade Amount</label><input type="number" step="0.01" class="form-control" name="grade_amount" value="${v('grade_amount')}" oninput="PG._salPreview()"></div>
            <div class="col-md-4"><label class="form-label">Grade Level</label><input type="text" class="form-control" name="grade_level" value="${v('grade_level')}"></div>
            <div class="col-md-4"><label class="form-label">Office Allowance</label><input type="number" step="0.01" class="form-control" name="allowance_office" value="${v('allowance_office')}" oninput="PG._salPreview()"></div>
            <div class="col-md-4"><label class="form-label">Transport Allowance</label><input type="number" step="0.01" class="form-control" name="allowance_transport" value="${v('allowance_transport')}" oninput="PG._salPreview()"></div>
            <div class="col-md-4"><label class="form-label">Dearness Allowance</label><input type="number" step="0.01" class="form-control" name="allowance_dearness" value="${v('allowance_dearness')}" oninput="PG._salPreview()"></div>
        </div>
        <h6 style="color:var(--danger);font-size:.85rem;margin:16px 0 10px"><i class="fas fa-minus-circle me-1"></i>Deductions</h6>
        <div class="row g-3">
            <div class="col-md-3"><label class="form-label">Provident Fund (PF)</label><input type="number" step="0.01" class="form-control" name="pf_amount" value="${v('pf_amount')}" oninput="PG._salPreview()"></div>
            <div class="col-md-3"><label class="form-label">CIT</label><input type="number" step="0.01" class="form-control" name="cit_amount" value="${v('cit_amount')}" oninput="PG._salPreview()"></div>
            <div class="col-md-3"><label class="form-label">Tax (TDS)</label><input type="number" step="0.01" class="form-control" name="tax_amount" value="${v('tax_amount')}" oninput="PG._salPreview()"></div>
            <div class="col-md-3"><label class="form-label">Insurance</label><input type="number" step="0.01" class="form-control" name="insurance_amount" value="${v('insurance_amount')}" oninput="PG._salPreview()"></div>
            <div class="col-md-6"><label class="form-label">Other Deduction</label><input type="number" step="0.01" class="form-control" name="other_deduction" value="${v('other_deduction')}" oninput="PG._salPreview()"></div>
            <div class="col-md-6"><label class="form-label">Effective Date</label><input type="date" class="form-control" name="effective_date" value="${v('effective_date')||new Date().toISOString().slice(0,10)}"></div>
            <div class="col-12"><label class="form-label">Remarks</label><textarea class="form-control" name="remarks" rows="2">${v('remarks')||''}</textarea></div>
        </div>
        <div id="salPreview" style="margin-top:14px;padding:12px;background:var(--card);border-radius:8px;border:1px solid var(--border)"></div>
        <div class="mt-3 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>
    </form>`, '780px');
    setTimeout(() => PG._salPreview(), 50);
};

PG._salPreview = () => {
    const f = document.querySelector('#modalBody form, .modal form');
    if (!f) return;
    const num = n => +(f.elements[n]?.value || 0);
    const basic = num('basic_salary'), grade = num('grade_amount');
    const allow = num('allowance_office') + num('allowance_transport') + num('allowance_dearness');
    const gross = basic + grade + allow;
    const ded = num('pf_amount') + num('cit_amount') + num('tax_amount') + num('insurance_amount') + num('other_deduction');
    const net = gross - ded;
    const p = document.getElementById('salPreview');
    if (p) p.innerHTML = `<div class="row g-2 text-center" style="font-size:.85rem">
        <div class="col"><div style="color:var(--muted);font-size:.7rem">GROSS</div><strong style="color:var(--teal,#0891b2)">NPR ${gross.toLocaleString()}</strong></div>
        <div class="col"><div style="color:var(--muted);font-size:.7rem">DEDUCTIONS</div><strong style="color:var(--danger)">NPR ${ded.toLocaleString()}</strong></div>
        <div class="col"><div style="color:var(--muted);font-size:.7rem">NET PAY</div><strong style="color:var(--accent);font-size:1.1rem">NPR ${net.toLocaleString()}</strong></div>
    </div>`;
};

PG.salSave = (ev, empId) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const data = { employee_id: empId };
    fd.forEach((val, key) => { data[key] = val; });
    const sals = XDB.get('salaries') || [];
    const idx = sals.findIndex(x => x.employee_id === empId);
    if (idx >= 0) {
        sals[idx] = { ...sals[idx], ...data, updated_at: Date.now() };
    } else {
        sals.push({ id: XDB.nextId('salaries'), ...data, created_at: Date.now() });
    }
    XDB.set('salaries', sals);
    App.closeModal();
    toast('Salary saved', 'success');
    PG.salaries(document.getElementById('content-area'));
};

PG.salDel = (empId) => {
    App.openModal('Delete Salary', `<p>Delete this employee's salary record? This cannot be undone.</p>
        <div class="mt-3 d-flex gap-2">
            <button class="btn-dsm" onclick="(()=>{const sals=XDB.get('salaries').filter(x=>x.employee_id!==${empId});XDB.set('salaries',sals);App.closeModal();toast('Salary deleted');PG.salaries(document.getElementById('content-area'))})()"><i class="fas fa-trash me-1"></i>Delete</button>
            <button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button>
        </div>`, '400px');
};

PG.salPayslip = (empId) => {
    const emp = (XDB.get('employees') || []).find(e => e.id === empId);
    const s = (XDB.get('salaries') || []).find(x => x.employee_id === empId);
    if (!emp) return;
    if (!s) { toast('No salary set for this employee', 'warning'); return; }
    const basic = +s.basic_salary||0, grade = +s.grade_amount||0;
    const ao = +s.allowance_office||0, at = +s.allowance_transport||0, ad = +s.allowance_dearness||0;
    const gross = basic + grade + ao + at + ad;
    const pf = +s.pf_amount||0, cit = +s.cit_amount||0, tax = +s.tax_amount||0, ins = +s.insurance_amount||0, oth = +s.other_deduction||0;
    const ded = pf + cit + tax + ins + oth;
    const net = gross - ded;
    const header = (typeof PG._buildLetterHeaderHTML === 'function') ? PG._buildLetterHeaderHTML() : '';
    const footer = (typeof PG._buildLetterFooterHTML === 'function') ? PG._buildLetterFooterHTML() : '';
    const html = `<div id="payslipPrint" style="background:#fff;color:#000;padding:18px">
        ${header}
        <h4 style="text-align:center;margin:10px 0;border-bottom:2px solid #c9a227;padding-bottom:8px">SALARY PAYSLIP</h4>
        <table style="width:100%;font-size:.85rem;margin-bottom:12px"><tr>
            <td><strong>Employee:</strong> ${emp.Fullname||'-'}</td><td><strong>Code:</strong> ${emp.EmployeeCode||'-'}</td></tr>
            <tr><td><strong>Designation:</strong> ${emp.Designation||'-'}</td><td><strong>Department:</strong> ${emp.Department||'-'}</td></tr>
            <tr><td><strong>Bank:</strong> ${emp.BankName||'-'}</td><td><strong>A/C:</strong> ${emp.BankAccountNumber||'-'}</td></tr>
            <tr><td colspan="2"><strong>Effective Date:</strong> ${s.effective_date||'-'}</td></tr>
        </table>
        <div style="display:flex;gap:14px">
            <table style="flex:1;border-collapse:collapse;font-size:.85rem">
                <thead><tr style="background:#c9a227;color:#fff"><th colspan="2" style="padding:6px;text-align:left">EARNINGS</th></tr></thead>
                <tbody>
                    <tr><td style="padding:5px;border:1px solid #ddd">Basic Salary</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${basic.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Grade Amount</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${grade.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Office Allowance</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${ao.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Transport</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${at.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Dearness</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${ad.toLocaleString()}</td></tr>
                    <tr style="background:#fef9e7;font-weight:bold"><td style="padding:6px;border:1px solid #ddd">GROSS</td><td style="padding:6px;border:1px solid #ddd;text-align:right">NPR ${gross.toLocaleString()}</td></tr>
                </tbody>
            </table>
            <table style="flex:1;border-collapse:collapse;font-size:.85rem">
                <thead><tr style="background:#dc2626;color:#fff"><th colspan="2" style="padding:6px;text-align:left">DEDUCTIONS</th></tr></thead>
                <tbody>
                    <tr><td style="padding:5px;border:1px solid #ddd">Provident Fund</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${pf.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">CIT</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${cit.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Tax (TDS)</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${tax.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Insurance</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${ins.toLocaleString()}</td></tr>
                    <tr><td style="padding:5px;border:1px solid #ddd">Other</td><td style="padding:5px;border:1px solid #ddd;text-align:right">${oth.toLocaleString()}</td></tr>
                    <tr style="background:#fee2e2;font-weight:bold"><td style="padding:6px;border:1px solid #ddd">TOTAL</td><td style="padding:6px;border:1px solid #ddd;text-align:right">NPR ${ded.toLocaleString()}</td></tr>
                </tbody>
            </table>
        </div>
        <div style="margin-top:14px;padding:12px;background:#fef9e7;border:2px solid #c9a227;border-radius:6px;text-align:center;font-size:1.1rem">
            <strong>NET PAY: NPR ${net.toLocaleString()}</strong>
        </div>
        ${footer}
    </div>
    <div class="mt-3 d-flex gap-2"><button class="btn-gold-sm" onclick="PG._printEl('payslipPrint')"><i class="fas fa-print me-1"></i>Print</button><button class="btn-outline-gold" onclick="App.closeModal()">Close</button></div>`;
    App.openModal('Payslip', html, '820px');
};

PG._printEl = (id) => {
    const c = document.getElementById(id); if (!c) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Print</title></head><body>${c.outerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>{w.print();w.close()},250);
};

PG.salExportAll = () => {
    const emps = XDB.get('employees') || [], sals = XDB.get('salaries') || [];
    const rows = emps.map(e => {
        const s = sals.find(x => x.employee_id === e.id) || {};
        const gross = (+s.basic_salary||0)+(+s.grade_amount||0)+(+s.allowance_office||0)+(+s.allowance_transport||0)+(+s.allowance_dearness||0);
        const ded = (+s.pf_amount||0)+(+s.cit_amount||0)+(+s.tax_amount||0)+(+s.insurance_amount||0)+(+s.other_deduction||0);
        return { Code: e.EmployeeCode, Name: e.Fullname, Designation: e.Designation, Basic: +s.basic_salary||0, Grade: +s.grade_amount||0, Allowances: (+s.allowance_office||0)+(+s.allowance_transport||0)+(+s.allowance_dearness||0), Gross: gross, PF: +s.pf_amount||0, CIT: +s.cit_amount||0, Tax: +s.tax_amount||0, Insurance: +s.insurance_amount||0, Other: +s.other_deduction||0, Deductions: ded, Net: gross-ded };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Salary');
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([out], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `salary_${Date.now()}.xlsx`; a.click();
    URL.revokeObjectURL(url); toast('Exported', 'success');
};

