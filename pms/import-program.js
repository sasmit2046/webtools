/* ============================================================
   PMS Module: import-program.js
   Program Import Tool (Excel)
   ============================================================ */

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

