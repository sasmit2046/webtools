/* ============================================================
   PMS Module: leave.js
   Leave Management + Balance Calculator
   ============================================================ */

/* ---------- LEAVE MANAGEMENT ---------- */
PG.leaves = (el) => {
    if (!hasPerm('leave.view') && !isAdmin()) {
        el.innerHTML = '<p style="color:var(--danger);font-weight:600;padding:20px">Access Denied</p>';
        return;
    }
    const apps = XDB.get('leave_applications') || [];
    const types = XDB.get('leave_types') || [];
    const emps = XDB.get('employees') || [];
    const tab = PG._leaveTab || 'applications';

    el.innerHTML = `<div class="card-soft">
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5><i class="fas fa-calendar-check me-2" style="color:var(--accent)"></i>Leave Management</h5>
            <div class="d-flex gap-2 flex-wrap">
                ${(hasPerm('leave.apply')||isAdmin()) ? '<button class="btn-gold-sm" onclick="PG.leaveApply()"><i class="fas fa-plus me-1"></i>Apply Leave</button>' : ''}
                ${(hasPerm('leave.types.manage')||isAdmin()) ? '<button class="btn-outline-gold btn-sm" onclick="PG.leaveTypes()"><i class="fas fa-cog me-1"></i>Leave Types</button>' : ''}
                <button class="btn-outline-gold btn-sm" onclick="PG.leaveBalance()"><i class="fas fa-chart-pie me-1"></i>Balance</button>
            </div>
        </div>
        <div class="d-flex gap-2 mb-3" style="border-bottom:1px solid var(--border);padding-bottom:8px">
            ${['applications','pending','approved','rejected'].map(t => `<div onclick="PG._leaveTab='${t}';PG.leaves(document.getElementById('content-area'))" style="padding:6px 14px;border-radius:6px;cursor:pointer;font-size:.8rem;font-weight:600;background:${tab===t?'var(--accent)':'transparent'};color:${tab===t?'#fff':'var(--muted)'}">${t.charAt(0).toUpperCase()+t.slice(1)}</div>`).join('')}
        </div>
        ${(() => {
            const filtered = tab === 'applications' ? apps : apps.filter(a => (a.status||'pending') === tab);
            if (!filtered.length) return '<div style="text-align:center;padding:40px;color:var(--muted)"><i class="fas fa-calendar" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px"></i>No leave applications</div>';
            return `<div class="table-wrap"><table>
                <thead><tr><th>#</th><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead>
                <tbody>${filtered.sort((a,b)=>b.created_at-a.created_at).map(a => {
                    const emp = emps.find(e => e.id === a.employee_id);
                    const lt = types.find(t => t.id === a.leave_type_id);
                    const status = a.status || 'pending';
                    const badgeClass = status==='approved'?'badge-teal':status==='rejected'?'badge-red':'badge-gold';
                    return `<tr>
                        <td>${a.id}</td>
                        <td><strong>${emp?.Fullname||'?'}</strong><br><small style="color:var(--muted)">${emp?.EmployeeCode||''}</small></td>
                        <td><span style="padding:3px 8px;border-radius:4px;background:${lt?.color||'#888'}22;color:${lt?.color||'#888'};font-size:.75rem;font-weight:600">${lt?.name||'?'}</span></td>
                        <td style="font-size:.78rem">${a.from_date}</td>
                        <td style="font-size:.78rem">${a.to_date}</td>
                        <td><strong>${a.days}</strong></td>
                        <td style="font-size:.75rem;max-width:200px">${a.reason||'-'}</td>
                        <td><span class="${badgeClass}">${status.toUpperCase()}</span></td>
                        <td style="font-size:.72rem;color:var(--muted)">${new Date(a.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-outline-gold btn-sm me-1" onclick="PG.leaveView(${a.id})" title="View"><i class="fas fa-eye"></i></button>
                            ${(hasPerm('leave.approve')||isAdmin()) && status==='pending' ? `<button class="btn-teal-sm me-1" onclick="PG.leaveApprove(${a.id},'approved')" title="Approve"><i class="fas fa-check"></i></button><button class="btn-dsm me-1" onclick="PG.leaveApprove(${a.id},'rejected')" title="Reject"><i class="fas fa-times"></i></button>` : ''}
                            ${(hasPerm('leave.delete')||isAdmin()) ? `<button class="btn-dsm" onclick="PG.leaveDel(${a.id})"><i class="fas fa-trash"></i></button>` : ''}
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table></div>`;
        })()}
    </div>`;
};

PG._calcLeaveDays = (from, to) => {
    if (!from || !to) return 0;
    const d1 = new Date(from), d2 = new Date(to);
    return Math.max(0, Math.floor((d2 - d1) / 86400000) + 1);
};

PG._calcUsedLeave = (empId, typeId, year) => {
    return (XDB.get('leave_applications') || [])
        .filter(a => a.employee_id === empId && a.leave_type_id === typeId && a.status === 'approved' && new Date(a.from_date).getFullYear() === year)
        .reduce((sum, a) => sum + (+a.days || 0), 0);
};

PG.leaveApply = (presetEmpId) => {
    const emps = XDB.get('employees') || [];
    const types = XDB.get('leave_types') || [];
    if (!emps.length) { toast('Add employees first', 'warning'); return; }
    if (!types.length) { toast('Add leave types first', 'warning'); return; }
    App.openModal('Apply for Leave', `<form onsubmit="PG.leaveSave(event)">
        <div class="row g-3">
            <div class="col-md-6"><label class="form-label">Employee *</label>
                <select class="form-select" name="employee_id" required onchange="PG._leaveBalRefresh()">
                    <option value="">Select...</option>
                    ${emps.map(e => `<option value="${e.id}"${presetEmpId===e.id?' selected':''}>${e.Fullname} (${e.EmployeeCode})</option>`).join('')}
                </select>
            </div>
            <div class="col-md-6"><label class="form-label">Leave Type *</label>
                <select class="form-select" name="leave_type_id" required onchange="PG._leaveBalRefresh()">
                    <option value="">Select...</option>
                    ${types.map(t => `<option value="${t.id}">${t.name} (${t.annual_quota} days/yr)</option>`).join('')}
                </select>
            </div>
            <div class="col-md-6"><label class="form-label">From Date *</label><input type="date" class="form-control" name="from_date" required onchange="PG._leaveDaysCalc()"></div>
            <div class="col-md-6"><label class="form-label">To Date *</label><input type="date" class="form-control" name="to_date" required onchange="PG._leaveDaysCalc()"></div>
            <div class="col-md-6"><label class="form-label">Days</label><input type="number" class="form-control" name="days" id="leaveDaysField" readonly></div>
            <div class="col-md-6"><label class="form-label">Contact During Leave</label><input type="text" class="form-control" name="contact"></div>
            <div class="col-12"><label class="form-label">Reason *</label><textarea class="form-control" name="reason" rows="3" required></textarea></div>
        </div>
        <div id="leaveBalBox" style="margin-top:12px"></div>
        <div class="mt-3 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-paper-plane me-1"></i>Submit Application</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>
    </form>`, '720px');
};

PG._leaveDaysCalc = () => {
    const f = document.querySelector('#modalBody form, .modal form');
    if (!f) return;
    const days = PG._calcLeaveDays(f.elements['from_date'].value, f.elements['to_date'].value);
    f.elements['days'].value = days;
    PG._leaveBalRefresh();
};

PG._leaveBalRefresh = () => {
    const f = document.querySelector('#modalBody form, .modal form');
    if (!f) return;
    const empId = +f.elements['employee_id'].value;
    const typeId = +f.elements['leave_type_id'].value;
    const days = +f.elements['days'].value || 0;
    const box = document.getElementById('leaveBalBox');
    if (!empId || !typeId || !box) { if (box) box.innerHTML = ''; return; }
    const t = (XDB.get('leave_types')||[]).find(x => x.id === typeId);
    const used = PG._calcUsedLeave(empId, typeId, new Date().getFullYear());
    const remaining = (t?.annual_quota||0) - used;
    const afterApply = remaining - days;
    const warn = afterApply < 0;
    box.innerHTML = `<div style="padding:12px;border-radius:8px;background:${warn?'#fee2e2':'var(--card)'};border:1px solid ${warn?'#dc2626':'var(--border)'}">
        <div class="row text-center" style="font-size:.82rem">
            <div class="col"><div style="color:var(--muted);font-size:.7rem">QUOTA</div><strong>${t?.annual_quota||0}</strong></div>
            <div class="col"><div style="color:var(--muted);font-size:.7rem">USED</div><strong>${used}</strong></div>
            <div class="col"><div style="color:var(--muted);font-size:.7rem">REMAINING</div><strong style="color:var(--teal,#0891b2)">${remaining}</strong></div>
            <div class="col"><div style="color:var(--muted);font-size:.7rem">REQUESTING</div><strong style="color:var(--accent)">${days}</strong></div>
            <div class="col"><div style="color:var(--muted);font-size:.7rem">AFTER</div><strong style="color:${warn?'#dc2626':'var(--teal,#0891b2)'}">${afterApply}</strong></div>
        </div>
        ${warn?`<div style="margin-top:8px;color:#dc2626;font-size:.78rem;font-weight:600"><i class="fas fa-exclamation-triangle me-1"></i>Exceeds available balance!</div>`:''}
    </div>`;
};

PG.leaveSave = (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const data = {};
    fd.forEach((v, k) => data[k] = v);
    data.employee_id = +data.employee_id;
    data.leave_type_id = +data.leave_type_id;
    data.days = +data.days;
    if (!data.days || data.days < 1) { toast('Invalid date range', 'error'); return; }
    const t = (XDB.get('leave_types')||[]).find(x => x.id === data.leave_type_id);
    const used = PG._calcUsedLeave(data.employee_id, data.leave_type_id, new Date().getFullYear());
    if (used + data.days > (t?.annual_quota||0)) {
        if (!confirm(`This exceeds annual quota (${used+data.days}/${t.annual_quota}). Submit anyway?`)) return;
    }
    const apps = XDB.get('leave_applications') || [];
    apps.push({
        id: XDB.nextId('leave_applications'),
        ...data,
        status: 'pending',
        applied_by: App.user?.id || 0,
        created_at: Date.now()
    });
    XDB.set('leave_applications', apps);
    if (typeof App.addNotif === 'function') App.addNotif(`Leave applied for ${data.days} day(s)`, 'info');
    App.closeModal();
    toast('Leave application submitted', 'success');
    PG.leaves(document.getElementById('content-area'));
};

PG.leaveApprove = (id, status) => {
    const apps = XDB.get('leave_applications') || [];
    const a = apps.find(x => x.id === id); if (!a) return;
    const remarks = prompt(`${status === 'approved' ? 'Approval' : 'Rejection'} remarks:`, '') || '';
    a.status = status;
    a.approved_by = App.user?.id || 0;
    a.approver_name = App.user?.name || '';
    a.approval_remarks = remarks;
    a.approved_at = Date.now();
    XDB.set('leave_applications', apps);
    toast(`Leave ${status}`, status === 'approved' ? 'success' : 'info');
    PG.leaves(document.getElementById('content-area'));
};

PG.leaveDel = (id) => {
    if (!confirm('Delete this leave application?')) return;
    XDB.set('leave_applications', (XDB.get('leave_applications')||[]).filter(x => x.id !== id));
    toast('Deleted', 'info');
    PG.leaves(document.getElementById('content-area'));
};

PG.leaveView = (id) => {
    const a = (XDB.get('leave_applications')||[]).find(x => x.id === id); if (!a) return;
    const emp = (XDB.get('employees')||[]).find(e => e.id === a.employee_id);
    const t = (XDB.get('leave_types')||[]).find(x => x.id === a.leave_type_id);
    App.openModal('Leave Application #' + a.id, `<div style="font-size:.88rem;line-height:1.8">
        <div style="padding:12px;background:var(--card);border-radius:8px;margin-bottom:12px">
            <strong>Employee:</strong> ${emp?.Fullname||'?'} (${emp?.EmployeeCode||''})<br>
            <strong>Department:</strong> ${emp?.Department||'-'} · <strong>Designation:</strong> ${emp?.Designation||'-'}
        </div>
        <p><strong>Leave Type:</strong> <span style="padding:3px 8px;border-radius:4px;background:${t?.color||'#888'}22;color:${t?.color||'#888'};font-weight:600">${t?.name||'?'}</span></p>
        <p><strong>Period:</strong> ${a.from_date} → ${a.to_date} (<strong>${a.days} days</strong>)</p>
        <p><strong>Reason:</strong> ${a.reason||'-'}</p>
        <p><strong>Contact:</strong> ${a.contact||'-'}</p>
        <p><strong>Status:</strong> <span class="${a.status==='approved'?'badge-teal':a.status==='rejected'?'badge-red':'badge-gold'}">${(a.status||'pending').toUpperCase()}</span></p>
        ${a.approver_name?`<p><strong>Approved By:</strong> ${a.approver_name} on ${new Date(a.approved_at).toLocaleString()}</p>`:''}
        ${a.approval_remarks?`<p><strong>Remarks:</strong> ${a.approval_remarks}</p>`:''}
    </div>`, '600px');
};

PG.leaveBalance = () => {
    const emps = XDB.get('employees') || [];
    const types = XDB.get('leave_types') || [];
    const yr = new Date().getFullYear();
    App.openModal(`Leave Balance — ${yr}`, `<div class="table-wrap" style="max-height:60vh;overflow:auto"><table>
        <thead><tr><th>Employee</th>${types.map(t => `<th style="text-align:center;color:${t.color}">${t.name}<br><small style="font-weight:400">(${t.annual_quota})</small></th>`).join('')}</tr></thead>
        <tbody>${emps.map(e => `<tr>
            <td><strong>${e.Fullname}</strong><br><small style="color:var(--muted)">${e.EmployeeCode||''}</small></td>
            ${types.map(t => {
                const used = PG._calcUsedLeave(e.id, t.id, yr);
                const rem = t.annual_quota - used;
                return `<td style="text-align:center"><strong style="color:${rem<=0?'#dc2626':rem<3?'#f59e0b':'#10b981'}">${rem}</strong><br><small style="color:var(--muted);font-size:.7rem">used: ${used}</small></td>`;
            }).join('')}
        </tr>`).join('')}</tbody>
    </table></div>`, '900px');
};

PG.leaveTypes = () => {
    const types = XDB.get('leave_types') || [];
    App.openModal('Leave Types', `<div>
        <div class="d-flex justify-content-end mb-2"><button class="btn-gold-sm" onclick="PG.leaveTypeForm()"><i class="fas fa-plus me-1"></i>Add Type</button></div>
        <div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Code</th><th>Annual Quota</th><th>Paid</th><th>Color</th><th>Actions</th></tr></thead>
            <tbody>${types.map(t => `<tr>
                <td><strong>${t.name}</strong></td><td>${t.code||'-'}</td><td>${t.annual_quota} days</td>
                <td><span class="${t.paid?'badge-teal':'badge-red'}">${t.paid?'Paid':'Unpaid'}</span></td>
                <td><span style="display:inline-block;width:24px;height:18px;border-radius:4px;background:${t.color||'#888'};vertical-align:middle"></span></td>
                <td>
                    <button class="btn-ism me-1" onclick="PG.leaveTypeForm(${t.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-dsm" onclick="if(confirm('Delete?')){XDB.set('leave_types',XDB.get('leave_types').filter(x=>x.id!==${t.id}));PG.leaveTypes();toast('Deleted','info')}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('')}</tbody>
        </table></div>
    </div>`, '740px');
};

PG.leaveTypeForm = (id) => {
    const t = id ? (XDB.get('leave_types')||[]).find(x => x.id === id) : null;
    App.openModal(id?'Edit Leave Type':'Add Leave Type', `<form onsubmit="PG.leaveTypeSave(event,${id||0})">
        <div class="row g-3">
            <div class="col-md-6"><label class="form-label">Name *</label><input type="text" class="form-control" name="name" value="${t?.name||''}" required></div>
            <div class="col-md-6"><label class="form-label">Code</label><input type="text" class="form-control" name="code" value="${t?.code||''}"></div>
            <div class="col-md-4"><label class="form-label">Annual Quota *</label><input type="number" class="form-control" name="annual_quota" value="${t?.annual_quota||0}" required min="0"></div>
            <div class="col-md-4"><label class="form-label">Paid?</label><select class="form-select" name="paid"><option value="1"${t?.paid?' selected':''}>Paid</option><option value="0"${!t?.paid?' selected':''}>Unpaid</option></select></div>
            <div class="col-md-4"><label class="form-label">Color</label><input type="color" class="form-control" name="color" value="${t?.color||'#3b82f6'}"></div>
        </div>
        <div class="mt-3 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="PG.leaveTypes()">Back</button></div>
    </form>`, '620px');
};

PG.leaveTypeSave = (ev, id) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const d = {};
    fd.forEach((v,k) => d[k] = v);
    d.annual_quota = +d.annual_quota;
    d.paid = +d.paid;
    const types = XDB.get('leave_types') || [];
    if (id) {
        const i = types.findIndex(x => x.id === id);
        if (i >= 0) types[i] = { ...types[i], ...d };
    } else {
        types.push({ id: XDB.nextId('leave_types'), ...d, created_at: Date.now() });
    }
    XDB.set('leave_types', types);
    toast('Saved', 'success');
    PG.leaveTypes();
};

