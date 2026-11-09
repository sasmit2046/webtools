/* Dashboard widget renderers (no libraries): stat, bar, pie, line, table. Needs app.js (H). */
const PAL = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16', '#f97316'];
const fnum = n => (Math.round(n * 100) / 100).toLocaleString();
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const monthKey = v => { const d = new Date(v); return isNaN(d) ? null : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const fieldLabel = (k, mod) => { const f = mod.fields.find(x => x.key === k); return f ? f.label : k; };
const isDateField = (w, mod) => { if (w.field === 'Date') return true; const f = mod.fields.find(x => x.key === w.field); return !!f && f.type === 'date'; };
function aggregate(w, list) {
  const n = list.length, s = list.reduce((a, r) => a + num(r[w.valueField]), 0);
  return w.agg === 'sum' ? s : w.agg === 'avg' ? (n ? s / n : 0) : n;
}
function groupData(w, rows, mod) {
  const dt = isDateField(w, mod), g = {};
  rows.forEach(r => { let k = r[w.field]; k = dt ? monthKey(k) : (String(k == null ? '' : k).trim() || '(empty)'); if (k == null) return; (g[k] = g[k] || []).push(r); });
  let items = Object.keys(g).map(k => ({ label: k, value: Math.round(aggregate(w, g[k]) * 100) / 100 }));
  if (dt) return items.sort((a, b) => a.label < b.label ? -1 : 1).slice(-12);
  items.sort((a, b) => b.value - a.value);
  if (items.length > 8) {
    items = w.agg === 'avg' ? items.slice(0, 8) : items.slice(0, 7).concat([{ label: 'Other', value: items.slice(7).reduce((a, x) => a + x.value, 0) }]);
  }
  return items;
}
function widgetHTML(w, rows, mod) {
  const col = w.color || 'var(--p)';
  if (w.type === 'stat') {
    const unit = w.agg === 'count' ? 'records' : (w.agg === 'sum' ? 'Sum of ' : 'Average of ') + fieldLabel(w.valueField, mod);
    return '<div class="statn" style="color:' + col + '">' + fnum(aggregate(w, rows)) + '</div><div class="mu">' + H(unit) + '</div>';
  }
  if (w.type === 'table') {
    const fs = mod.fields.slice(0, 3), rec = rows.slice().sort((a, b) => num(b.ID) - num(a.ID)).slice(0, 5);
    return rec.length ? '<div class="tw"><table class="tbl"><tr>' + fs.map(f => '<th>' + H(f.label) + '</th>').join('') + '</tr>' + rec.map(r => '<tr>' + fs.map(f => '<td>' + H(r[f.key]) + '</td>').join('') + '</tr>').join('') + '</table></div>' : '<div class="empty">No records yet</div>';
  }
  if (!w.field) return '<div class="empty">Edit this widget and choose a "Group by" field.</div>';
  const items = groupData(w, rows, mod);
  if (!items.length) return '<div class="empty">No data yet</div>';
  if (w.type === 'bar') {
    const max = Math.max(1, ...items.map(x => x.value));
    return '<div class="chart" style="height:200px">' + items.map(x => '<div class="cb" title="' + H(x.label) + ': ' + fnum(x.value) + '"><div class="bw"><b>' + fnum(x.value) + '</b><i style="height:' + (x.value > 0 ? Math.max(x.value / max * 80, 3) : 0) + '%;' + (w.color ? 'background:' + w.color : '') + '"></i></div><span>' + H(x.label) + '</span></div>').join('') + '</div>';
  }
  if (w.type === 'pie') {
    const total = items.reduce((a, x) => a + Math.max(x.value, 0), 0) || 1, sum = items.reduce((a, x) => a + x.value, 0);
    let cum = 0;
    const arcs = items.map((x, i) => { const p = Math.max(x.value, 0) / total * 100, c = '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="' + PAL[i % PAL.length] + '" stroke-width="7" stroke-dasharray="' + p + ' ' + (100 - p) + '" stroke-dashoffset="' + (25 - cum) + '"><title>' + H(x.label) + ': ' + fnum(x.value) + '</title></circle>'; cum += p; return c; });
    return '<div class="pie"><svg viewBox="0 0 42 42" class="pies"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--bd)" stroke-width="7"/>' + arcs.join('') + '<text x="21" y="22.6" text-anchor="middle" font-size="5" font-weight="700" fill="currentColor">' + fnum(sum) + '</text></svg><ul class="lgd">' + items.map((x, i) => '<li><i style="background:' + PAL[i % PAL.length] + '"></i><span>' + H(x.label) + '</span><b>' + fnum(x.value) + '</b><em>' + Math.round(Math.max(x.value, 0) / total * 100) + '%</em></li>').join('') + '</ul></div>';
  }
  // line
  const W = 300, HH = 120, pad = 14, max = Math.max(1, ...items.map(x => x.value)), step = items.length > 1 ? (W - 2 * pad) / (items.length - 1) : 0;
  const pts = items.map((x, i) => [pad + i * step, HH - pad - (x.value / max) * (HH - 2 * pad)]);
  const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = 'M' + pts[0][0].toFixed(1) + ',' + (HH - pad) + ' L' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (HH - pad) + ' Z';
  const col2 = w.color || 'var(--p)';
  return '<svg viewBox="0 0 300 120" class="lines" preserveAspectRatio="none"><path d="' + area + '" style="fill:' + col2 + ';opacity:.15"/><polyline points="' + line + '" style="fill:none;stroke:' + col2 + ';stroke-width:2.5" vector-effect="non-scaling-stroke"/>' + pts.map((p, i) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" style="fill:' + col2 + '"><title>' + H(items[i].label) + ': ' + fnum(items[i].value) + '</title></circle>').join('') + '</svg><div class="ll"><span>' + H(items[0].label) + '</span><span>' + H(items[items.length - 1].label) + '</span></div>';
}
