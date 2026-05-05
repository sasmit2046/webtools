/* ============================================================
   PMS Module: wards.js
   Wards Management (Settings tab)
   ============================================================ */

/* ===== 8. WARDS MANAGEMENT (in Settings) ===== */
if (!TABLES.includes('wards')) TABLES.push('wards');

const _origSeedData3 = seedData;
seedData = function(c) {
    _origSeedData3(c);
    c.wards = c.wards || [
        { id: 1, ward_no: 1, name: 'Ward 1', name_np: 'वडा १', is_active: 1 },
        { id: 2, ward_no: 2, name: 'Ward 2', name_np: 'वडा २', is_active: 1 },
        { id: 3, ward_no: 3, name: 'Ward 3', name_np: 'वडा ३', is_active: 1 }
    ];
};

PERMISSIONS.push('wards.view', 'wards.add', 'wards.edit', 'wards.delete');
PERMISSIONS.push('employees.view', 'employees.add', 'employees.edit', 'employees.delete', 'employees.approve');

PG._renderWardsTab = () => {
    const wards = XDB.get('wards') || [];
    const sc = document.getElementById('settings-content'); if (!sc) return;
    sc.innerHTML = `
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-map-marked-alt me-2" style="color:var(--accent)"></i>Ward Management</h5>
        ${hasPerm('wards.add') || isAdmin() ? '<button class="btn-gold-sm" onclick="PG.wardForm()"><i class="fas fa-plus me-1"></i>Add Ward</button>' : ''}</div>
        <div class="panel-body">
        ${wards.length ? `<div class="table-wrap"><table><thead><tr><th>Ward No</th><th>Name (EN)</th><th>Name (NP)</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        ${wards.sort((a,b)=>a.ward_no-b.ward_no).map(w => `<tr>
            <td><strong>${w.ward_no}</strong></td>
            <td>${w.name || '-'}</td>
            <td>${w.name_np || '-'}</td>
            <td>${w.is_active ? '<span class="badge-green">Active</span>' : '<span class="badge-red">Inactive</span>'}</td>
            <td>
                ${hasPerm('wards.edit') || isAdmin() ? `<button class="btn-ism me-1" onclick="PG.wardForm(${w.id})"><i class="fas fa-edit"></i></button>` : ''}
                ${hasPerm('wards.delete') || isAdmin() ? `<button class="btn-dsm" onclick="PG.wardDel(${w.id})"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        </tr>`).join('')}
        </tbody></table></div>` : '<div style="text-align:center;padding:28px;color:var(--muted)">No wards yet</div>'}
        </div>
    </div>`;
};

PG.wardForm = (id) => {
    const wards = XDB.get('wards') || [], w = id ? wards.find(x => x.id === id) : null;
    App.openModal(id ? 'Edit Ward' : 'Add Ward', `<form onsubmit="PG.wardSave(event,${id || 0})"><div class="row g-3">
    <div class="col-md-4"><label class="form-label">Ward Number *</label><input type="number" class="form-control" name="ward_no" value="${w?.ward_no || ''}" required min="1"></div>
    <div class="col-md-8"><label class="form-label">Name (English)</label><input type="text" class="form-control" name="name" value="${w?.name || ''}"></div>
    <div class="col-md-8"><label class="form-label">Name (Nepali)</label><input type="text" class="form-control" name="name_np" value="${w?.name_np || ''}"></div>
    <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" name="is_active"><option value="1"${w?.is_active!=0?' selected':''}>Active</option><option value="0"${w?.is_active==0?' selected':''}>Inactive</option></select></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`, '520px');
};

PG.wardSave = (e, id) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const wards = XDB.get('wards') || [];
    const data = { ward_no: +fd.get('ward_no'), name: fd.get('name'), name_np: fd.get('name_np'), is_active: +fd.get('is_active') };
    if (id) { const i = wards.findIndex(x => x.id === id); if (i >= 0) wards[i] = { ...wards[i], ...data }; }
    else { if (wards.find(x => x.ward_no === data.ward_no)) { toast('Ward number already exists', 'error'); return; } wards.push({ id: XDB.nextId('wards'), ...data }); }
    XDB.set('wards', wards); App.closeModal(); toast(id ? 'Updated' : 'Added'); PG.settings(document.getElementById('content-area'));
};

PG.wardDel = (id) => {
    App.openModal('Delete Ward', `<p>Delete this ward?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('wards',XDB.get('wards').filter(x=>x.id!==${id}));App.closeModal();toast('Deleted');PG.settings(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`, '380px');
};

