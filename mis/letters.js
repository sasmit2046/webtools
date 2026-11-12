/* Letter engine: {{ Field }} placeholders, letterhead, safe HTML, Word / PDF / print. Load after app.js */
const PAPER_FONT = "'Times New Roman','Mangal','Noto Serif Devanagari',serif";
const TOKEN_RE = /\{\{(?:\s|&nbsp;)*([^{}<>]+?)(?:\s|&nbsp;)*\}\}/g;
const SYS_TOKENS = ['date', 'date_long', 'time', 'letter_no', 'user', 'app_name', 'org'];
const brandNow = () => { try { return JSON.parse(localStorage.getItem('brand') || '{}'); } catch (e) { return {}; } };
const fname = n => String(n || 'letter').replace(/[^A-Za-z0-9._-]+/g, '-');

/* ----- keep only safe tags / attributes (letters are stored and shown to other users) ----- */
function sanitizeHTML(html) {
  const ok = 'p br b strong i em u s span div h1 h2 h3 h4 ul ol li table thead tbody tr td th img hr blockquote sub sup a font center mark'.split(' ');
  const drop = 'script style iframe object embed link meta form input button textarea select svg math base'.split(' ');
  const attrs = 'style colspan rowspan align width height src href alt border cellpadding cellspacing data-lh color size face'.split(' ');
  const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
  (function walk(n) {
    Array.from(n.childNodes).forEach(c => {
      if (c.nodeType === 8) { c.remove(); return; }
      if (c.nodeType !== 1) return;
      const t = c.tagName.toLowerCase();
      if (drop.indexOf(t) >= 0) { c.remove(); return; }
      if (ok.indexOf(t) < 0) { walk(c); while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); return; }
      Array.from(c.attributes).forEach(a => {
        const k = a.name.toLowerCase(), v = a.value;
        if (attrs.indexOf(k) < 0) c.removeAttribute(a.name);
        else if ((k === 'href' || k === 'src') && !/^(https?:|mailto:|data:image\/(png|jpeg|gif|webp);base64,)/i.test(v.trim())) c.removeAttribute(a.name);
        else if (k === 'style' && /expression|url\s*\(|javascript:|@import|behavior/i.test(v)) c.removeAttribute(a.name);
      });
      walk(c);
    });
  })(doc.body);
  return doc.body.innerHTML;
}

/* ----- placeholders ----- */
function makeCtx(tpl, recs, mods) {   // recs / mods: { moduleSlug: record / module }
  const now = new Date(), b = brandNow(), sources = {};
  tpl.sources.forEach(s => { if (mods[s] && recs[s]) sources[s.toLowerCase()] = { mod: mods[s], rec: recs[s] }; });
  return { primary: sources[String(tpl.sources[0]).toLowerCase()] || null, sources: sources, sys: {
    date: now.toISOString().slice(0, 10), date_long: now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), user: typeof who === 'string' ? who : '', app_name: b.appName || '', org: b.org || '' } };
}
function resolveToken(name, ctx) {   // returns the value, or null when the placeholder is unknown
  const n = String(name).trim(), dot = n.indexOf('.');
  let src = ctx.primary, f = n;
  if (dot > 0) { const s = ctx.sources[n.slice(0, dot).trim().toLowerCase()]; if (s) { src = s; f = n.slice(dot + 1).trim(); } }
  else if (Object.prototype.hasOwnProperty.call(ctx.sys, n.toLowerCase())) return ctx.sys[n.toLowerCase()];
  if (!src) return null;
  const fl = f.toLowerCase();
  const fd = src.mod.fields.find(x => x.key.toLowerCase() === fl || x.label.toLowerCase() === fl);
  if (fd) return src.rec[fd.key] == null ? '' : String(src.rec[fd.key]);
  if (fl === 'id') return String(src.rec.ID == null ? '' : src.rec.ID);
  if (fl === 'created by') return String(src.rec['Created By'] || '');
  if (dot > 0 && fl === 'date') return String(src.rec.Date || '');
  return null;
}
function fillTemplate(html, ctx, plain) {   // plain = true for subject lines (no HTML escaping)
  const missing = [];
  const dec = x => x.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const out = String(html).replace(TOKEN_RE, (m, raw) => {
    const name = plain ? raw : dec(raw), low = name.trim().toLowerCase();
    if (low === 'letter_no' || low === 'ref_no') return '{{letter_no}}';   // numbered by the server when the letter is saved
    const v = resolveToken(name, ctx);
    if (v === null) { if (missing.indexOf(name.trim()) < 0) missing.push(name.trim()); return plain ? m : '<mark>' + m + '</mark>'; }
    return plain ? v : H(v);
  });
  return { text: out, html: out, missing: missing };
}

/* ----- the letter itself (stored in the "letters" sheet) ----- */
function buildLetter(tpl, bodyHTML, subject, ctx) {
  const b = brandNow(), hd = fillTemplate(tpl.header || '', ctx, true).text.trim();
  const lines = (hd || [b.org, b.appName].filter(Boolean).join('\n')).split('\n').map(x => x.trim()).filter(Boolean);
  let h = '';
  if (tpl.letterhead) h = '<div data-lh="1" style="text-align:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:18px">' + lines.map((l, i) => '<div style="' + (i === 0 ? 'font-size:22px;font-weight:700;' : 'font-size:14px;') + '">' + H(l) + '</div>').join('') + '</div>';
  const sign = fillTemplate(tpl.signature || '', ctx, true).text, foot = fillTemplate(tpl.footer || '', ctx, true).text;
  return h + '<table style="width:100%;margin-bottom:14px;font-size:14px"><tr><td>Ref. No.: {{letter_no}}</td><td style="text-align:right">Date: ' + H(ctx.sys.date) + '</td></tr></table>' +
    (subject ? '<div style="text-align:center;font-weight:700;text-decoration:underline;margin:8px 0 16px">' + H(subject) + '</div>' : '') +
    '<div>' + bodyHTML + '</div>' +
    (sign ? '<div style="margin-top:40px;white-space:pre-line">' + H(sign) + '</div>' : '') +
    (foot ? '<div style="margin-top:30px;border-top:1px solid #999;padding-top:6px;font-size:12px;text-align:center">' + H(foot) + '</div>' : '');
}
const logoOK = s => /^(https?:|data:image\/(png|jpeg|gif|webp|svg\+xml);base64,)/i.test(String(s || ''));
function wrapLetter(content) {   // adds the current logo to the letterhead for display / download
  const b = brandNow(), d = document.createElement('div'); d.innerHTML = content;
  const lh = d.querySelector('[data-lh]');
  if (lh && b.logo && logoOK(b.logo) && !lh.querySelector('img')) { const i = document.createElement('img'); i.src = b.logo; i.alt = ''; i.style.cssText = 'height:72px;display:block;margin:0 auto 8px'; lh.insertBefore(i, lh.firstChild); }
  return d.innerHTML;
}
function stripLogo(html) { const d = document.createElement('div'); d.innerHTML = html; d.querySelectorAll('[data-lh] img').forEach(i => i.remove()); return d.innerHTML; }

/* ----- downloads ----- */
function saveBlob(blob, filename) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2500);
}
function downloadWord(name, content) {   // opens in Microsoft Word / LibreOffice
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + H(name) + '</title>' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
    '<style>@page{size:21cm 29.7cm;margin:2cm}body{font-family:' + PAPER_FONT + ';font-size:12pt;line-height:1.5}table{border-collapse:collapse}td,th{padding:4px 8px}</style></head><body>' + wrapLetter(content) + '</body></html>';
  saveBlob(new Blob(['\ufeff', html], { type: 'application/msword' }), fname(name) + '.doc');
}
async function downloadPdf(name, content) {
  if (typeof html2pdf === 'undefined') { toast('The PDF tool could not load. Check your internet connection and reload the page.', true); return; }
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:720px;background:#fff;color:#000';
  host.innerHTML = '<div style="width:720px;padding:8px 4px;box-sizing:border-box;font-family:' + PAPER_FONT + ';font-size:15px;line-height:1.55;color:#000;background:#fff">' + wrapLetter(content) + '</div>';
  document.body.appendChild(host);
  try {
    await html2pdf().set({ margin: [14, 14, 14, 14], filename: fname(name) + '.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] } }).from(host.firstChild).save();
  } finally { host.remove(); }
}
function printLetter(content) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  f.contentDocument.open();
  f.contentDocument.write('<html><head><meta charset="utf-8"><title>Letter</title><style>@page{size:A4;margin:18mm}body{font-family:' + PAPER_FONT + ';font-size:12pt;line-height:1.55;color:#000}table{border-collapse:collapse}td,th{padding:4px 8px}</style></head><body>' + wrapLetter(content) + '</body></html>');
  f.contentDocument.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 400);
}
const withBusy = async (btn, fn) => { const t = btn.textContent; btn.disabled = true; btn.textContent = 'Please wait...'; try { await fn(); } catch (e) { fail(e); } btn.disabled = false; btn.textContent = t; };
