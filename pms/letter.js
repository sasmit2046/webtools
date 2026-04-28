/* ============================================================
   PMS Module: letter.js
   Letter Header & Footer Settings + Renderer
   ============================================================ */

// LETTER HEADER & FOOTER SETTINGS (v3.3)
// ============================================================
PERMISSIONS.push('letter_header.edit');

PG._getLetterHF = () => {
    try {
        const raw = localStorage.getItem('pms_letter_hf');
        if (raw) return JSON.parse(raw);
    } catch(e) {}
    const appName = (PG._getAppSettings && PG._getAppSettings().appName) || 'Planning Management System';
    return {
        orgName: appName,
        orgNameNep: 'गाउँपालिका कार्यालय',
        address: 'वडा कार्यालय, नेपाल',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        headerLine1: '',
        headerLine2: '',
        showHeader: true,
        showFooter: true,
        footerText: 'यो पत्र विद्युतीय रुपमा जारी गरिएको हो।',
        footerNote: '',
        headerBgColor: '#ffffff',
        headerTextColor: '#111111',
        accentColor: '#b8860b'
    };
};
PG._saveLetterHF = (cfg) => {
    localStorage.setItem('pms_letter_hf', JSON.stringify(cfg));
};

PG._buildLetterHeaderHTML = () => {
    const c = PG._getLetterHF();
    if (!c.showHeader) return '';
    const logo = c.logoUrl ? `<img src="${c.logoUrl}" style="height:70px;width:70px;object-fit:contain;margin-right:14px" alt="logo">` : '';
    return `<div class="letter-hf-header" style="display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:3px double ${c.accentColor};padding:10px 4px 14px;margin-bottom:18px;background:${c.headerBgColor};color:${c.headerTextColor}">
        ${logo}
        <div style="text-align:center;flex:1">
            ${c.headerLine1 ? `<div style="font-size:.8rem;letter-spacing:1px">${c.headerLine1}</div>` : ''}
            ${c.orgNameNep ? `<div style="font-size:1.4rem;font-weight:700;line-height:1.2">${c.orgNameNep}</div>` : ''}
            ${c.orgName ? `<div style="font-size:.95rem;font-weight:600;color:${c.accentColor}">${c.orgName}</div>` : ''}
            ${c.address ? `<div style="font-size:.78rem;margin-top:3px">${c.address}</div>` : ''}
            <div style="font-size:.72rem;margin-top:2px;color:#555">
                ${c.phone ? `<span><i class="fas fa-phone"></i> ${c.phone}</span>` : ''}
                ${c.email ? `<span style="margin-left:10px"><i class="fas fa-envelope"></i> ${c.email}</span>` : ''}
                ${c.website ? `<span style="margin-left:10px"><i class="fas fa-globe"></i> ${c.website}</span>` : ''}
            </div>
            ${c.headerLine2 ? `<div style="font-size:.75rem;margin-top:2px;font-style:italic">${c.headerLine2}</div>` : ''}
        </div>
    </div>`;
};
PG._buildLetterFooterHTML = () => {
    const c = PG._getLetterHF();
    if (!c.showFooter) return '';
    return `<div class="letter-hf-footer" style="border-top:2px solid ${c.accentColor};margin-top:24px;padding-top:8px;font-size:.72rem;color:#555;text-align:center">
        ${c.footerText ? `<div>${c.footerText}</div>` : ''}
        ${c.footerNote ? `<div style="margin-top:2px">${c.footerNote}</div>` : ''}
        <div style="margin-top:4px;font-size:.68rem;color:#888">Generated: ${new Date().toLocaleString()}</div>
    </div>`;
};

// Override letter view
const _origLetterView = PG.letterView;
PG.letterView = (agrId, id) => {
    const l = XDB.get('agreement_letters').find(x => x.id === id);
    if (!l) return;
    const header = PG._buildLetterHeaderHTML();
    const footer = PG._buildLetterFooterHTML();
    App.openModal(l.title,
        `<div class="letter-preview" style="background:#fff;color:#111;padding:18px;border:1px solid #e0d8c0;border-radius:6px">
            ${header}
            <h3 style="text-align:center;margin:6px 0 14px;font-size:1.1rem;text-decoration:underline">${l.title}</h3>
            <div style="line-height:1.9;font-size:14px">${l.content.replace(/\n/g,'<br>')}</div>
            ${footer}
         </div>
         <div class="mt-3 d-flex gap-2 no-print">
            <button class="btn-gold-sm" onclick="PG.letterPrint(${agrId},${id})"><i class="fas fa-print me-1"></i>Print</button>
            <button class="btn-outline-gold" onclick="App.closeModal()">Close</button>
         </div>`, '760px');
};

// Override letter print
const _origLetterPrint = PG.letterPrint;
PG.letterPrint = (agrId, id) => {
    const l = XDB.get('agreement_letters').find(x => x.id === id);
    if (!l) return;
    const header = PG._buildLetterHeaderHTML();
    const footer = PG._buildLetterFooterHTML();
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${l.title}</title>
        <style>
            @page { margin: 15mm; }
            body{font-family:'Noto Sans Devanagari',Arial,sans-serif;padding:20px;font-size:14px;line-height:1.9;color:#111;max-width:780px;margin:0 auto}
            h3{text-align:center;margin:6px 0 14px;font-size:1.2rem;text-decoration:underline}
            pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.9}
            .fas{font-family:Arial}
            @media print{body{padding:0}}
        </style></head><body>
        ${header}
        <h3>${l.title}</h3>
        <pre>${l.content}</pre>
        ${footer}
        <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
    </body></html>`);
    pw.document.close();
};

// ============= Letter HF Settings Tab =============
PG._renderLetterHFTab = () => {
    const cfg = PG._getLetterHF();
    const content = document.getElementById('settings-content');
    if (!content) return;
    content.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div>
                <h4 style="font-size:1rem;font-weight:700;margin-bottom:12px;color:var(--accent)"><i class="fas fa-heading me-2"></i>Letter Header & Footer Settings</h4>
                <div style="display:flex;flex-direction:column;gap:10px;font-size:.82rem">
                    <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="lhf_showHeader" ${cfg.showHeader?'checked':''}> Show Header on Letters</label>
                    <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="lhf_showFooter" ${cfg.showFooter?'checked':''}> Show Footer on Letters</label>
                    <div><label>Organization Name (English)</label><input id="lhf_orgName" class="form-control" value="${(cfg.orgName||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>संस्थाको नाम (Nepali)</label><input id="lhf_orgNameNep" class="form-control" value="${(cfg.orgNameNep||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>Address / ठेगाना</label><input id="lhf_address" class="form-control" value="${(cfg.address||'').replace(/"/g,'&quot;')}"></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                        <div><label>Phone</label><input id="lhf_phone" class="form-control" value="${(cfg.phone||'').replace(/"/g,'&quot;')}"></div>
                        <div><label>Email</label><input id="lhf_email" class="form-control" value="${(cfg.email||'').replace(/"/g,'&quot;')}"></div>
                    </div>
                    <div><label>Website</label><input id="lhf_website" class="form-control" value="${(cfg.website||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>Logo URL (or data URI)</label><input id="lhf_logoUrl" class="form-control" placeholder="https://... or upload below" value="${(cfg.logoUrl||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>Upload Logo</label><input type="file" id="lhf_logoFile" accept="image/*" class="form-control" onchange="PG._lhfLogoUpload(event)"></div>
                    <div><label>Header Top Line (small text)</label><input id="lhf_headerLine1" class="form-control" value="${(cfg.headerLine1||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>Header Tagline (italic)</label><input id="lhf_headerLine2" class="form-control" value="${(cfg.headerLine2||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>Footer Text</label><input id="lhf_footerText" class="form-control" value="${(cfg.footerText||'').replace(/"/g,'&quot;')}"></div>
                    <div><label>Footer Note (optional)</label><input id="lhf_footerNote" class="form-control" value="${(cfg.footerNote||'').replace(/"/g,'&quot;')}"></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
                        <div><label>Header BG</label><input type="color" id="lhf_headerBgColor" class="form-control" value="${cfg.headerBgColor}"></div>
                        <div><label>Header Text</label><input type="color" id="lhf_headerTextColor" class="form-control" value="${cfg.headerTextColor}"></div>
                        <div><label>Accent Color</label><input type="color" id="lhf_accentColor" class="form-control" value="${cfg.accentColor}"></div>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:8px">
                        <button class="btn-gold-sm" onclick="PG._saveLetterHFForm()"><i class="fas fa-save me-1"></i>Save Settings</button>
                        <button class="btn-outline-gold" onclick="PG._resetLetterHF()"><i class="fas fa-undo me-1"></i>Reset</button>
                        <button class="btn-teal-sm" onclick="PG._renderLetterHFTab()"><i class="fas fa-sync me-1"></i>Refresh Preview</button>
                    </div>
                </div>
            </div>
            <div>
                <h4 style="font-size:1rem;font-weight:700;margin-bottom:12px;color:var(--accent)"><i class="fas fa-eye me-2"></i>Live Preview</h4>
                <div style="background:#fff;color:#111;padding:18px;border:1px solid #e0d8c0;border-radius:6px;max-height:600px;overflow:auto">
                    ${PG._buildLetterHeaderHTML()}
                    <h3 style="text-align:center;margin:6px 0 14px;font-size:1.1rem;text-decoration:underline">नमुना पत्र / Sample Letter</h3>
                    <div style="line-height:1.9;font-size:14px">
                        मिति: ${new Date().toLocaleDateString()}<br><br>
                        विषय: नमुना पत्र<br><br>
                        यो एक नमुना पत्र हो जसले हेडर र फुटर सेटिङ्ग कस्तो देखिन्छ देखाउँछ।<br><br>
                        भवदीय,<br>
                        सचिव
                    </div>
                    ${PG._buildLetterFooterHTML()}
                </div>
            </div>
        </div>`;
};

PG._lhfLogoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { document.getElementById('lhf_logoUrl').value = ev.target.result; };
    r.readAsDataURL(file);
};
PG._saveLetterHFForm = () => {
    const g = id => document.getElementById(id);
    const cfg = {
        showHeader: g('lhf_showHeader').checked,
        showFooter: g('lhf_showFooter').checked,
        orgName: g('lhf_orgName').value,
        orgNameNep: g('lhf_orgNameNep').value,
        address: g('lhf_address').value,
        phone: g('lhf_phone').value,
        email: g('lhf_email').value,
        website: g('lhf_website').value,
        logoUrl: g('lhf_logoUrl').value,
        headerLine1: g('lhf_headerLine1').value,
        headerLine2: g('lhf_headerLine2').value,
        footerText: g('lhf_footerText').value,
        footerNote: g('lhf_footerNote').value,
        headerBgColor: g('lhf_headerBgColor').value,
        headerTextColor: g('lhf_headerTextColor').value,
        accentColor: g('lhf_accentColor').value
    };
    PG._saveLetterHF(cfg);
    toast('Letter header & footer saved', 'success');
    PG._renderLetterHFTab();
};
PG._resetLetterHF = () => {
    localStorage.removeItem('pms_letter_hf');
    toast('Reset to defaults', 'info');
    PG._renderLetterHFTab();
};

// Inject Letter HF tab into Settings
const _origSettings5 = PG.settings;
PG.settings = (el) => {
    _origSettings5(el);
    const tabsContainer = el.querySelector('div:first-child');
    if (tabsContainer && !tabsContainer.innerHTML.includes('Letter Header')) {
        tabsContainer.innerHTML += `<div style="padding:7px 14px;border-radius:8px;border:1.5px solid ${PG._settingsTab==='letter_hf'?'var(--accent)':'var(--border)'};background:${PG._settingsTab==='letter_hf'?'var(--accent)':'var(--card)'};color:${PG._settingsTab==='letter_hf'?'#fff':'var(--muted)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s" onclick="PG._setTab('letter_hf')"><i class="fas fa-file-signature me-1"></i>Letter Header &amp; Footer</div>`;
    }
    if (PG._settingsTab === 'letter_hf') PG._renderLetterHFTab();
};

const _origRenderTab6 = PG._renderSettingsTab;
PG._renderSettingsTab = (tabId, tabs) => {
    if (tabId === 'letter_hf') { PG._renderLetterHFTab(); return; }
    _origRenderTab6(tabId, tabs);
};

console.log('PMS Features v3.3 loaded: + Letter Header & Footer');

