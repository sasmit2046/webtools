/* Shared by every page: login guard, API helpers, sidebar, modals. Needs config.js (scriptURL) and theme.js */

// Require login: take the token handed over by the previous page, otherwise go to login.html
(function () {
  const m = location.hash.match(/t=([^&]+)&n=([^&]*)/);
  if (m) {
    sessionStorage.setItem('tk', decodeURIComponent(m[1]));
    sessionStorage.setItem('who', decodeURIComponent(m[2]));
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (!sessionStorage.getItem('tk')) location.replace('login.html');
})();
const token = sessionStorage.getItem('tk') || '', who = sessionStorage.getItem('who') || '';
const $id = id => document.getElementById(id);
const H = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const fdate = v => { const d = new Date(v); return v && !isNaN(d) ? d.toLocaleString() : (v || ''); };

function toast(m, err) {
  let t = $id('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = m; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(t._t); t._t = setTimeout(() => t.className = '', 3200);
}
function logout(expired) { sessionStorage.clear(); location.replace('login.html' + (expired ? '#expired' : '')); }
function nav(p) { location.href = encodeURI(p) + '#t=' + encodeURIComponent(token) + '&n=' + encodeURIComponent(who) + '&th=' + document.documentElement.getAttribute('data-theme'); }
function bindGo(root) { (root || document).querySelectorAll('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); nav(a.dataset.go); }); }

function chk(j) {
  if (j.result === 'error') { if (j.error === 'auth') { logout(true); throw new Error('auth'); } throw new Error(j.error); }
  return j;
}
async function get(p) { return chk(await (await fetch(scriptURL + '?' + new URLSearchParams(Object.assign({ token: token }, p)))).json()); }
async function post(o) {
  const fd = new FormData(); fd.append('token', token);
  Object.keys(o).forEach(k => fd.append(k, o[k]));
  return chk(await (await fetch(scriptURL, { method: 'POST', body: fd })).json());
}
const errMsg = e => e.message === 'auth' ? '' : (e instanceof TypeError || e instanceof SyntaxError) ? 'Could not reach the server. Please try again.' : e.message;
const fail = e => { const m = errMsg(e); if (m) toast(m, true); };

/* ---------- modal helpers ---------- */
function modal(html, wide) {
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = '<div class="modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(o);
  o.addEventListener('mousedown', e => { if (e.target === o) o.remove(); });
  o.querySelectorAll('[data-close]').forEach(b => b.onclick = () => o.remove());
  return o;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const o = document.querySelector('.overlay'); if (o) o.remove(); } });
function confirmBox(title, msg, label, onOk) {
  const o = modal('<div class="mh"><h3>' + H(title) + '</h3><button class="x" data-close>&times;</button></div><p style="margin:0 0 20px">' + H(msg) + '</p><div class="acts"><button class="btn g" data-close>Cancel</button><button class="btn dng" id="cfok">' + H(label || 'Delete') + '</button></div>');
  o.querySelector('#cfok').onclick = async function () { this.disabled = true; o.remove(); await onOk(); };
}

/* ---------- dynamic form fields ---------- */
function fld(f, i, v, opts) {
  v = v == null ? '' : v;
  const a = 'data-i="' + i + '"' + (f.required ? ' required' : ''), l = '<label>' + H(f.label) + (f.required ? ' *' : '') + '</label>';
  if (f.type === 'textarea') return l + '<textarea ' + a + ' rows="3">' + H(v) + '</textarea>';
  if (f.type === 'select') return l + '<select ' + a + '><option value="">&mdash;</option>' + String(f.options || '').split(',').map(x => x.trim()).filter(Boolean).map(x => '<option' + (x === v ? ' selected' : '') + '>' + H(x) + '</option>').join('') + '</select>';
  if (f.type === 'lookup') {
    const list = (opts || []).slice(); if (v && list.indexOf(v) < 0) list.push(v);
    return l + '<select ' + a + '><option value="">&mdash; Select &mdash;</option>' + list.map(x => '<option' + (x === v ? ' selected' : '') + '>' + H(x) + '</option>').join('') + '</select>';
  }
  if (f.type === 'checkbox') return '<label class="chk"><input type="checkbox" data-i="' + i + '"' + (v === 'Yes' ? ' checked' : '') + '> ' + H(f.label) + '</label>';
  return l + '<input type="' + (['number', 'date', 'email'].indexOf(f.type) >= 0 ? f.type : 'text') + '" step="any" ' + a + ' value="' + H(v) + '">';
}
/* load the dropdown values of every lookup field: { fieldKey: [values] } */
async function lookupOpts(fields) {
  const o = {};
  await Promise.all(fields.filter(f => f.type === 'lookup').map(async f => {
    try { o[f.key] = (await get({ action: 'options', module: f.ref, field: f.show })).options; } catch (e) { o[f.key] = []; }
  }));
  return o;
}
function readForm(form, fields) {
  const r = {};
  fields.forEach((f, i) => { const el = form.querySelector('[data-i="' + i + '"]'); r[f.key] = f.type === 'checkbox' ? (el.checked ? 'Yes' : 'No') : el.value; });
  return r;
}

/* show a module's custom "required" message instead of the browser default */
function bindMsgs(form, fields) {
  fields.forEach((f, i) => {
    const el = form.querySelector('[data-i="' + i + '"]'); if (!el || !f.required || !f.msg) return;
    el.addEventListener('invalid', () => el.setCustomValidity(String(el.value).trim() === '' ? f.msg : ''));
    el.addEventListener('input', () => el.setCustomValidity(''));
  });
}

/* ---------- shell: sidebar + top bar ---------- */
const COL = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444'];
const hexA = (h, a) => { const n = parseInt(String(h).slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
const mcolor = (m, i) => m.color || COL[(i + 1) % COL.length];
function brandName() { try { return (JSON.parse(localStorage.getItem('brand') || '{}').appName) || 'Admin Suite'; } catch (e) { return 'Admin Suite'; } }
function sideHTML(b, act) {
  const br = b.brand || {};
  const L = (pg, ic, t, c, k) => '<a href="#" data-go="' + H(pg) + '" class="' + (k === act ? 'on' : '') + '" title="' + H(t) + '" style="--c:' + c + ';--cb:' + hexA(c, .28) + '"><i>' + ic + '</i><span>' + H(t) + '</span></a>';
  let s = '<div class="brand">' + (br.logo ? '<img class="lgi" src="' + H(br.logo) + '" alt="">' : '<div class="lg">&#9889;</div>') + '<div>' + H(br.appName || 'Admin Suite') + '<small>' + H(String(br.tagline || '').toUpperCase()) + '</small></div></div>';
  s += '<div class="nl">Main</div>' + L('dashboard.html', '&#128202;', 'Dashboard', br.primary || '#6366f1', 'dashboard');
  if (b.modules.length) s += '<div class="nl">Modules</div>' + b.modules.map((m, i) => L('crud.html?m=' + encodeURIComponent(m.slug), H(m.icon || '\uD83D\uDCC4'), m.name, mcolor(m, i), 'm:' + m.slug)).join('');
  if (b.user.role === 'admin') s += '<div class="nl">Administration</div>' + L('modules.html', '&#129513;', 'Module Builder', '#f59e0b', 'modules') + L('users.html', '&#128101;', 'Users', '#0ea5e9', 'users') + L('roles.html', '&#128737;', 'Roles & Access', '#10b981', 'roles') + L('settings.html', '&#9881;&#65039;', 'Settings', '#8b5cf6', 'settings');
  s += '<div class="nl">Account</div>' + L('change-password.html', '&#128273;', 'Change Password', '#ec4899', 'password') + L('about.html', '&#8505;&#65039;', 'About', '#64748b', 'about');
  s += '<div class="sp"></div><div class="ucard"><span class="av">' + H((b.user.name || '?').charAt(0)) + '</span><div class="nm"><b>' + H(b.user.name) + '</b><span class="role">' + H(b.user.role) + '</span></div><button class="lo" id="lo" title="Logout" type="button">&#9211;</button></div>';
  return s;
}
function renderSide(b, act) {
  const s = $id('side'); s.innerHTML = sideHTML(b, act); bindGo(s);
  $id('lo').onclick = () => { const fd = new FormData(); fd.append('mode', 'logout'); fd.append('token', token); fetch(scriptURL, { method: 'POST', body: fd }).catch(() => {}).finally(() => logout()); };
}
function setTitle(t, sub) { $id('pt').textContent = t; if (sub !== undefined) $id('pd').textContent = sub; document.title = t + ' \u00b7 ' + brandName(); }
function useBrand(b) { if (b && b.brand) { try { localStorage.setItem('brand', JSON.stringify(b.brand)); } catch (e) {} applyBrand(b.brand); } }
async function freshBoot() { const j = await get({ action: 'boot' }); sessionStorage.setItem('boot_' + token, JSON.stringify(j.boot)); useBrand(j.boot); return j.boot; }

async function initShell(act) {
  const sh = document.createElement('div'); sh.className = 'shell';
  sh.innerHTML = '<aside class="side" id="side"></aside><div class="sbk" id="sbk"></div><div class="content"><header class="top"><button class="menu" id="menu" type="button" aria-label="Menu">&#9776;</button><div><h1 id="pt"></h1><p id="pd"></p></div><div class="tr"><button class="menu" id="tt" type="button" title="Switch light / dark theme"></button><div class="chip"><span class="av" id="av2"></span><span id="who"></span></div></div></header></div>';
  document.body.prepend(sh); sh.querySelector('.content').appendChild($id('main'));
  $id('who').textContent = who; $id('av2').textContent = (who || '?').charAt(0);
  if (innerWidth > 860 && localStorage.getItem('collapsed') === '1') document.body.classList.add('collapsed');
  const side = $id('side'), sbk = $id('sbk');
  $id('menu').onclick = () => {
    if (innerWidth > 860) { document.body.classList.toggle('collapsed'); localStorage.setItem('collapsed', document.body.classList.contains('collapsed') ? '1' : '0'); }
    else { side.classList.toggle('open'); sbk.classList.toggle('open'); }
  };
  sbk.onclick = () => { side.classList.remove('open'); sbk.classList.remove('open'); };
  $id('tt').onclick = toggleTheme; themeIcon();
  document.body.classList.add('ready');
  let b = null; try { b = JSON.parse(sessionStorage.getItem('boot_' + token)); } catch (e) {}
  if (b) { useBrand(b); renderSide(b, act); freshBoot().then(nb => renderSide(nb, act)).catch(() => {}); return b; }
  try { b = await freshBoot(); } catch (e) { fail(e); throw e; }
  renderSide(b, act); return b;
}
