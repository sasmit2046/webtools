/* ============================================================
   PMS Module: employee.js
   Employee Management Module
   ============================================================ */

/* ===== 9. EMPLOYEES MODULE ===== */
if (!TABLES.includes('employees')) TABLES.push('employees');

const _origSeedData4 = seedData;
seedData = function(c) {
    _origSeedData4(c);
    c.employees = c.employees || [];
};

PG.employees = (el) => {
    if (!hasPerm('employees.view') && !isAdmin()) { el.innerHTML = '<p style="color:var(--danger);font-weight:600;padding:20px">Access Denied</p>'; return; }
    const emps = XDB.get('employees') || [];
    const q = (PG._empSearch || '').toLowerCase();
    const filtered = q ? emps.filter(e => (e.Fullname||'').toLowerCase().includes(q) || (e.EmployeeCode||'').toLowerCase().includes(q) || (e.Designation||'').toLowerCase().includes(q)) : emps;
    el.innerHTML = `
    <div class="panel">
        <div class="panel-head">
            <h5><i class="fas fa-users me-2" style="color:var(--accent)"></i>Employees <small style="color:var(--muted);font-weight:500">(${filtered.length})</small></h5>
            <div style="display:flex;gap:8px;align-items:center">
                <input type="text" class="form-control form-control-sm" placeholder="Search..." style="width:200px" value="${PG._empSearch||''}" oninput="PG._empSearch=this.value;clearTimeout(PG._empT);PG._empT=setTimeout(()=>PG.employees(document.getElementById('content-area')),300)">
                ${hasPerm('employees.add') || isAdmin() ? '<button class="btn-gold-sm" onclick="PG.empForm()"><i class="fas fa-plus me-1"></i>Add Employee</button>' : ''}
            </div>
        </div>
        <div class="panel-body">
        ${filtered.length ? `<div class="table-wrap"><table><thead><tr>
            <th>Code</th><th>Full Name</th><th>Designation</th><th>Department</th><th>Phone</th><th>Status</th><th>Approved</th><th>Actions</th>
        </tr></thead><tbody>
        ${filtered.map(e => `<tr>
            <td><strong>${e.EmployeeCode||'-'}</strong></td>
            <td>${e.Fullname||'-'}<br><small style="color:var(--muted)">${e.NepFullname||''}</small></td>
            <td>${e.Designation||'-'}</td>
            <td>${e.Department||'-'}</td>
            <td>${e.PhoneNumber||'-'}</td>
            <td>${e.IsActive==1?'<span class="badge-green">Active</span>':'<span class="badge-red">Inactive</span>'}</td>
            <td>${e.Status==='approved'?'<span class="badge-green">Approved</span>':e.Status==='rejected'?'<span class="badge-red">Rejected</span>':'<span class="badge-gold">Pending</span>'}</td>
            <td>
                <button class="btn-ssm me-1" onclick="PG.empView(${e.id})"><i class="fas fa-eye"></i></button>
                ${(hasPerm('employees.edit')||isAdmin()) ? `<button class="btn-ism me-1" onclick="PG.empForm(${e.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${(hasPerm('employees.approve')||isAdmin()) && e.Status!=='approved' ? `<button class="btn-teal-sm me-1" onclick="PG.empApprove(${e.id})" title="Approve"><i class="fas fa-check"></i></button>` : ''}
                ${(hasPerm('employees.delete')||isAdmin()) ? `<button class="btn-dsm" onclick="PG.empDel(${e.id})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`).join('')}
        </tbody></table></div>` : '<div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-users" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px"></i>No employees yet</div>'}
        </div>
    </div>`;
};

PG.empForm = (id) => {
    const emps = XDB.get('employees') || [], e = id ? emps.find(x => x.id === id) : null;
    const v = (k, d='') => e?.[k] ?? d;
    App.openModal(id ? 'Edit Employee' : 'Add Employee', `<form onsubmit="PG.empSave(event,${id||0})">
    <div style="background:rgba(201,162,39,.08);padding:8px 12px;border-radius:6px;margin-bottom:14px;font-size:.78rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px">Personal Information</div>
    <div class="row g-3">
        <div class="col-md-4"><label class="form-label">Employee Code *</label><input type="text" class="form-control" name="EmployeeCode" value="${v('EmployeeCode')}" required></div>
        <div class="col-md-4"><label class="form-label">Full Name *</label><input type="text" class="form-control" name="Fullname" value="${v('Fullname')}" required></div>
        <div class="col-md-4"><label class="form-label">Nepali Full Name</label><input type="text" class="form-control" name="NepFullname" value="${v('NepFullname')}"></div>
        <div class="col-md-4"><label class="form-label">Gender</label><select class="form-select" name="Gender"><option value="">--</option>${['Male','Female','Other'].map(g=>`<option${v('Gender')===g?' selected':''}>${g}</option>`).join('')}</select></div>
        <div class="col-md-4"><label class="form-label">Date of Birth</label><input type="date" class="form-control" name="Dob" value="${v('Dob')}"></div>
        <div class="col-md-4"><label class="form-label">PAN Number</label><input type="text" class="form-control" name="PanNumber" value="${v('PanNumber')}"></div>
        <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" name="Email" value="${v('Email')}"></div>
        <div class="col-md-6"><label class="form-label">Phone Number</label><input type="text" class="form-control" name="PhoneNumber" value="${v('PhoneNumber')}"></div>
    </div>
    <div style="background:rgba(201,162,39,.08);padding:8px 12px;border-radius:6px;margin:18px 0 14px;font-size:.78rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px">Service Details</div>
    <div class="row g-3">
        <div class="col-md-4"><label class="form-label">Service Group</label><input type="text" class="form-control" name="ServiceGroup" value="${v('ServiceGroup')}"></div>
        <div class="col-md-4"><label class="form-label">Category / Level</label><input type="text" class="form-control" name="CategoryLevel" value="${v('CategoryLevel')}"></div>
        <div class="col-md-4"><label class="form-label">Designation</label><input type="text" class="form-control" name="Designation" value="${v('Designation')}"></div>
        <div class="col-md-6"><label class="form-label">Department</label><input type="text" class="form-control" name="Department" value="${v('Department')}"></div>
        <div class="col-md-6"><label class="form-label">Service Join Date</label><input type="date" class="form-control" name="ServiceJoindate" value="${v('ServiceJoindate')}"></div>
    </div>
    <div style="background:rgba(201,162,39,.08);padding:8px 12px;border-radius:6px;margin:18px 0 14px;font-size:.78rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px">Bank & Identification</div>
    <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Bank Name</label><input type="text" class="form-control" name="BankName" value="${v('BankName')}"></div>
        <div class="col-md-6"><label class="form-label">Bank Account Number</label><input type="text" class="form-control" name="BankAccountNumber" value="${v('BankAccountNumber')}"></div>
        <div class="col-md-3"><label class="form-label">CIT Number</label><input type="text" class="form-control" name="CitNumber" value="${v('CitNumber')}"></div>
        <div class="col-md-3"><label class="form-label">EPF Number</label><input type="text" class="form-control" name="EpfNumber" value="${v('EpfNumber')}"></div>
        <div class="col-md-3"><label class="form-label">Insurance No</label><input type="text" class="form-control" name="InsuranceNo" value="${v('InsuranceNo')}"></div>
        <div class="col-md-3"><label class="form-label">UCIN Number</label><input type="text" class="form-control" name="UcinNumber" value="${v('UcinNumber')}"></div>
    </div>
    <div style="background:rgba(201,162,39,.08);padding:8px 12px;border-radius:6px;margin:18px 0 14px;font-size:.78rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px">Leave Information</div>
    <div class="row g-3">
        <div class="col-md-3"><label class="form-label">Home Leave</label><input type="number" step="0.5" class="form-control" name="HomeLeave" value="${v('HomeLeave',0)}"></div>
        <div class="col-md-3"><label class="form-label">Sick Leave</label><input type="number" step="0.5" class="form-control" name="SickLeave" value="${v('SickLeave',0)}"></div>
        <div class="col-md-3"><label class="form-label">Unpaid Leave</label><input type="number" step="0.5" class="form-control" name="UnPaidLeave" value="${v('UnPaidLeave',0)}"></div>
        <div class="col-md-3"><label class="form-label">Education Leave</label><input type="number" step="0.5" class="form-control" name="EducationLeave" value="${v('EducationLeave',0)}"></div>
        <div class="col-md-3"><label class="form-label">Maternity Leave</label><input type="number" step="0.5" class="form-control" name="MaternityLeave" value="${v('MaternityLeave',0)}"></div>
        <div class="col-md-3"><label class="form-label">Is Maternity Leave</label><select class="form-select" name="IsMaternityLeave"><option value="0"${v('IsMaternityLeave',0)==0?' selected':''}>No</option><option value="1"${v('IsMaternityLeave')==1?' selected':''}>Yes</option></select></div>
        <div class="col-md-3"><label class="form-label">Maternity Leave Num</label><input type="number" class="form-control" name="MaternityLeaveNum" value="${v('MaternityLeaveNum',0)}"></div>
        <div class="col-md-3"><label class="form-label">Extra Leave</label><input type="number" step="0.5" class="form-control" name="ExtraLeave" value="${v('ExtraLeave',0)}"></div>
    </div>
    <div style="background:rgba(201,162,39,.08);padding:8px 12px;border-radius:6px;margin:18px 0 14px;font-size:.78rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px">Status & Approval</div>
    <div class="row g-3">
        <div class="col-md-3"><label class="form-label">Is Transfer</label><select class="form-select" name="IsTransfer"><option value="0"${v('IsTransfer',0)==0?' selected':''}>No</option><option value="1"${v('IsTransfer')==1?' selected':''}>Yes</option></select></div>
        <div class="col-md-3"><label class="form-label">Is Active</label><select class="form-select" name="IsActive"><option value="1"${v('IsActive',1)==1?' selected':''}>Active</option><option value="0"${v('IsActive')==0?' selected':''}>Inactive</option></select></div>
        <div class="col-md-3"><label class="form-label">Status</label><select class="form-select" name="Status"><option value="pending"${v('Status','pending')==='pending'?' selected':''}>Pending</option><option value="approved"${v('Status')==='approved'?' selected':''}>Approved</option><option value="rejected"${v('Status')==='rejected'?' selected':''}>Rejected</option></select></div>
        <div class="col-md-3"><label class="form-label">Approved By</label><input type="text" class="form-control" name="ApprovedBy" value="${v('ApprovedBy')}" ${(hasPerm('employees.approve')||isAdmin())?'':'readonly'}></div>
        <div class="col-md-6"><label class="form-label">Comment</label><textarea class="form-control" name="Comment" rows="2">${v('Comment')}</textarea></div>
        <div class="col-md-6"><label class="form-label">Reason</label><textarea class="form-control" name="Reason" rows="2">${v('Reason')}</textarea></div>
    </div>
    <div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>
    </form>`, '900px');
};

PG.empSave = (e, id) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const fields = ['EmployeeCode','Fullname','NepFullname','Gender','Dob','ServiceGroup','CategoryLevel','Designation','Department','Email','PanNumber','PhoneNumber','ServiceJoindate','BankName','BankAccountNumber','CitNumber','EpfNumber','InsuranceNo','UcinNumber','HomeLeave','SickLeave','UnPaidLeave','MaternityLeave','IsMaternityLeave','MaternityLeaveNum','EducationLeave','ExtraLeave','IsTransfer','IsActive','Status','ApprovedBy','Comment','Reason'];
    const numFields = ['HomeLeave','SickLeave','UnPaidLeave','MaternityLeave','IsMaternityLeave','MaternityLeaveNum','EducationLeave','ExtraLeave','IsTransfer','IsActive'];
    const data = {};
    fields.forEach(f => { data[f] = numFields.includes(f) ? +(fd.get(f) || 0) : (fd.get(f) || ''); });
    const emps = XDB.get('employees') || [];
    if (id) { const i = emps.findIndex(x => x.id === id); if (i >= 0) emps[i] = { ...emps[i], ...data }; }
    else { if (emps.find(x => x.EmployeeCode === data.EmployeeCode)) { toast('Employee code already exists', 'error'); return; } emps.push({ id: XDB.nextId('employees'), ...data }); }
    XDB.set('employees', emps); App.closeModal(); toast(id ? 'Updated' : 'Added'); PG.employees(document.getElementById('content-area'));
};

PG.empView = (id) => {
    const emp = (XDB.get('employees') || []).find(x => x.id === id); if (!emp) return;
    const row = (l, v) => `<tr><td style="font-weight:600;color:var(--muted);width:40%">${l}</td><td>${v || '-'}</td></tr>`;
    App.openModal(`Employee: ${emp.Fullname}`, `
    <div class="row g-3">
        <div class="col-md-6"><h6 style="color:var(--accent);font-weight:700;margin-bottom:10px"><i class="fas fa-user me-1"></i>Personal</h6>
        <table class="table table-sm">${row('Code',emp.EmployeeCode)}${row('Full Name',emp.Fullname)}${row('Nepali Name',emp.NepFullname)}${row('Gender',emp.Gender)}${row('DOB',emp.Dob)}${row('Email',emp.Email)}${row('Phone',emp.PhoneNumber)}${row('PAN',emp.PanNumber)}</table></div>
        <div class="col-md-6"><h6 style="color:var(--accent);font-weight:700;margin-bottom:10px"><i class="fas fa-briefcase me-1"></i>Service</h6>
        <table class="table table-sm">${row('Designation',emp.Designation)}${row('Department',emp.Department)}${row('Service Group',emp.ServiceGroup)}${row('Category/Level',emp.CategoryLevel)}${row('Join Date',emp.ServiceJoindate)}${row('Status',emp.Status)}${row('Active',emp.IsActive==1?'Yes':'No')}${row('Approved By',emp.ApprovedBy)}</table></div>
        <div class="col-md-6"><h6 style="color:var(--accent);font-weight:700;margin-bottom:10px"><i class="fas fa-university me-1"></i>Bank & ID</h6>
        <table class="table table-sm">${row('Bank',emp.BankName)}${row('Account',emp.BankAccountNumber)}${row('CIT',emp.CitNumber)}${row('EPF',emp.EpfNumber)}${row('Insurance',emp.InsuranceNo)}${row('UCIN',emp.UcinNumber)}</table></div>
        <div class="col-md-6"><h6 style="color:var(--accent);font-weight:700;margin-bottom:10px"><i class="fas fa-calendar-times me-1"></i>Leaves</h6>
        <table class="table table-sm">${row('Home',emp.HomeLeave)}${row('Sick',emp.SickLeave)}${row('Unpaid',emp.UnPaidLeave)}${row('Maternity',emp.MaternityLeave)}${row('Education',emp.EducationLeave)}${row('Extra',emp.ExtraLeave)}</table></div>
        ${emp.Comment||emp.Reason?`<div class="col-12"><h6 style="color:var(--accent);font-weight:700"><i class="fas fa-comment me-1"></i>Notes</h6><p><strong>Comment:</strong> ${emp.Comment||'-'}</p><p><strong>Reason:</strong> ${emp.Reason||'-'}</p></div>`:''}
    </div>
    <div class="mt-3 text-end"><button class="btn-outline-gold" onclick="App.closeModal()">Close</button></div>`, '780px');
};

PG.empApprove = (id) => {
    const emps = XDB.get('employees') || [], i = emps.findIndex(x => x.id === id);
    if (i < 0) return;
    emps[i].Status = 'approved'; emps[i].ApprovedBy = App.user?.name || 'Admin';
    XDB.set('employees', emps); toast('Employee approved'); PG.employees(document.getElementById('content-area'));
};

PG.empDel = (id) => {
    App.openModal('Delete Employee', `<p>Delete this employee? This cannot be undone.</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('employees',XDB.get('employees').filter(x=>x.id!==${id}));App.closeModal();toast('Deleted');PG.employees(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`, '380px');
};

