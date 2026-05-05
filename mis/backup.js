/* ============================================================
   PMS Module: backup.js
   Backup & Restore (Excel full DB export/import)
   ============================================================ */

/* ===== 9. BACKUP & RESTORE (in Settings) ===== */
PERMISSIONS.push('backup.export', 'backup.import');

PG._renderBackupTab = () => {
    const sc = document.getElementById('settings-content'); if (!sc) return;
    const stats = TABLES.map(t => ({ name: t, count: (XDB.get(t) || []).length }));
    const totalRecords = stats.reduce((a, b) => a + b.count, 0);
    const lastBackup = localStorage.getItem('pms_last_backup') || 'Never';
    sc.innerHTML = `
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-database me-2" style="color:var(--accent)"></i>Backup &amp; Restore</h5></div>
        <div class="panel-body">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:18px">
                <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px">
                    <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Total Tables</div>
                    <div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${TABLES.length}</div>
                </div>
                <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px">
                    <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Total Records</div>
                    <div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${totalRecords.toLocaleString()}</div>
                </div>
                <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px">
                    <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Last Backup</div>
                    <div style="font-size:.95rem;font-weight:600">${lastBackup}</div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
                <div style="border:1.5px solid var(--border);border-radius:12px;padding:18px;background:linear-gradient(135deg,rgba(34,197,94,.05),transparent)">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        <i class="fas fa-download" style="font-size:1.3rem;color:#22c55e"></i>
                        <h6 style="margin:0">Export Full Database</h6>
                    </div>
                    <p style="font-size:.82rem;color:var(--muted);margin:6px 0 14px">Download a complete backup of all ${TABLES.length} tables as a single Excel file. Use this regularly to safeguard your data.</p>
                    <button class="btn-gold-sm" onclick="PG.backupExport()" style="width:100%"><i class="fas fa-file-export me-1"></i>Export Backup (.xlsx)</button>
                </div>
                <div style="border:1.5px solid var(--border);border-radius:12px;padding:18px;background:linear-gradient(135deg,rgba(239,68,68,.05),transparent)">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        <i class="fas fa-upload" style="font-size:1.3rem;color:#ef4444"></i>
                        <h6 style="margin:0">Restore from Backup</h6>
                    </div>
                    <p style="font-size:.82rem;color:var(--muted);margin:6px 0 14px">Restore the entire database from a previously exported backup file. <strong style="color:#ef4444">This will overwrite all existing data.</strong></p>
                    <input type="file" id="backup-restore-file" accept=".xlsx,.xls" style="display:none" onchange="PG.backupImport(this)">
                    <button class="btn-gold-sm" onclick="document.getElementById('backup-restore-file').click()" style="width:100%;background:#ef4444;border-color:#ef4444"><i class="fas fa-file-import me-1"></i>Restore Backup (.xlsx)</button>
                </div>
            </div>

            <div class="table-wrap">
                <table>
                    <thead><tr><th>#</th><th>Table Name</th><th>Records</th><th>Status</th></tr></thead>
                    <tbody>
                        ${stats.map((s, i) => `<tr>
                            <td>${i + 1}</td>
                            <td><code style="background:var(--card);padding:2px 8px;border-radius:4px">${s.name}</code></td>
                            <td><strong>${s.count.toLocaleString()}</strong></td>
                            <td>${s.count > 0 ? '<span style="color:#22c55e"><i class="fas fa-check-circle"></i> Has Data</span>' : '<span style="color:var(--muted)"><i class="fas fa-circle"></i> Empty</span>'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
};

PG.backupExport = () => {
    if (!hasPerm('backup.export') && !isAdmin()) { toast('Permission denied', 'error'); return; }
    try {
        const wb = XLSX.utils.book_new();
        let totalRows = 0;
        TABLES.forEach(t => {
            const data = XDB.get(t) || [];
            totalRows += data.length;
            const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ _: '(empty)' }]);
            const cols = Object.keys(data.length ? data[0] : { _: '' }).map(k => ({ wch: Math.max(k.length + 2, 12) }));
            ws['!cols'] = cols;
            XLSX.utils.book_append_sheet(wb, ws, t.substring(0, 31));
        });
        // Add metadata sheet
        const meta = [
            { key: 'Backup Date', value: new Date().toLocaleString() },
            { key: 'App Name', value: (XDB.get('app_settings') || []).find(s => s.key === 'app_name')?.value || 'PMS' },
            { key: 'Total Tables', value: TABLES.length },
            { key: 'Total Records', value: totalRows },
            { key: 'Backup Version', value: '1.0' },
            { key: 'Created By', value: App.user?.username || 'system' }
        ];
        const metaWs = XLSX.utils.json_to_sheet(meta);
        metaWs['!cols'] = [{ wch: 20 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, metaWs, '_backup_meta');

        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pms_backup_${ts}.xlsx`;
        a.click();
        const now = new Date().toLocaleString();
        localStorage.setItem('pms_last_backup', now);
        toast(`Backup exported: ${totalRows} records across ${TABLES.length} tables`, 'success');
        setTimeout(() => PG._renderBackupTab(), 500);
    } catch (e) {
        console.error(e);
        toast('Backup export failed: ' + e.message, 'error');
    }
};

PG.backupImport = (input) => {
    if (!hasPerm('backup.import') && !isAdmin()) { toast('Permission denied', 'error'); input.value = ''; return; }
    const file = input.files[0]; if (!file) return;
    if (!confirm('⚠️ WARNING: This will OVERWRITE your entire database with the backup contents.\n\nIt is strongly recommended to export the current data first.\n\nDo you want to continue?')) {
        input.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            let restored = 0, totalRows = 0;
            const skipped = [];
            TABLES.forEach(t => {
                const ws = wb.Sheets[t] || wb.Sheets[t.substring(0, 31)];
                if (ws) {
                    let data = XLSX.utils.sheet_to_json(ws);
                    // Strip placeholder empty markers
                    data = data.filter(r => !(Object.keys(r).length === 1 && r._ === '(empty)'));
                    XDB.cache[t] = data;
                    totalRows += data.length;
                    restored++;
                } else {
                    skipped.push(t);
                }
            });
            await XDB.save();
            toast(`Restored ${restored} tables, ${totalRows} records${skipped.length ? ` (${skipped.length} tables not in backup)` : ''}`, 'success');
            setTimeout(() => location.reload(), 1200);
        } catch (err) {
            console.error(err);
            toast('Restore failed: ' + err.message, 'error');
        }
        input.value = '';
    };
    reader.readAsArrayBuffer(file);
};

// Inject Backup tab into Settings
const _origSettings4 = PG.settings;
PG.settings = (el) => {
    _origSettings4(el);
    const tabsContainer = el.querySelector('div:first-child');
    if (tabsContainer && !tabsContainer.innerHTML.includes('Backup')) {
        tabsContainer.innerHTML += `<div style="padding:7px 14px;border-radius:8px;border:1.5px solid ${PG._settingsTab==='backup'?'var(--accent)':'var(--border)'};background:${PG._settingsTab==='backup'?'var(--accent)':'var(--card)'};color:${PG._settingsTab==='backup'?'#fff':'var(--muted)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s" onclick="PG._setTab('backup')"><i class="fas fa-database me-1"></i>Backup &amp; Restore</div>`;
    }
    if (PG._settingsTab === 'backup') PG._renderBackupTab();
};

const _origRenderTab5 = PG._renderSettingsTab;
PG._renderSettingsTab = (tabId, tabs) => {
    if (tabId === 'backup') { PG._renderBackupTab(); return; }
    if (tabId === 'wards') { PG._renderWardsTab(); return; }
    if (tabId === 'app_settings') { PG._renderAppSettingsTab(); return; }
    if (tabId === 'roles') { PG._renderRolesTab(); return; }
    _origRenderTab5(tabId, tabs);
};

console.log('PMS Features v3.2 loaded: Roles, Calculator, App Settings, About, Import, Wards, Employees, Backup & Restore');

// ============================================================
