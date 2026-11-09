/* ADMIN SUITE backend: login, RBAC (roles), dynamic CRUD modules on Google Sheets.
   Paste into Extensions > Apps Script. Run intialSetup once, then deploy as a Web app. */
const sheetName = 'Sheet1' // tab with the built-in "Contact Messages" data (NOT 'login', 'roles' or 'modules')
const scriptProp = PropertiesService.getScriptProperties()
const VERSION = '3.0.0' // keep in sync with APP_VERSION in version.js
const DEFAULT_BRAND = { appName: 'Admin Suite', tagline: 'Control Panel', org: 'Government of Nepal', loginTitle: 'Welcome back',
  loginText: 'Sign in to continue to your dashboard.', footer: '', primary: '#4f46e5', sidebar: '#0f172a', mode: '', logo: '' }
const WTYPES = ['stat', 'bar', 'pie', 'line', 'table'], WAGG = ['count', 'sum', 'avg']
const RESERVED = ['ID', 'Date', 'Created By']
const FTYPES = ['text', 'number', 'email', 'date', 'textarea', 'select', 'checkbox', 'lookup']
const CONTACTS = { id: 'contacts', slug: 'contacts', name: 'Contact Messages', icon: '\u2709\uFE0F', builtin: true, color: '#0ea5e9', fields: [
  { key: 'Name', label: 'Name', type: 'text', required: true }, { key: 'Number', label: 'Number', type: 'text' },
  { key: 'Email', label: 'Email', type: 'email', required: true }, { key: 'Message', label: 'Message', type: 'textarea' }] }

function intialSetup () { scriptProp.setProperty('key', SpreadsheetApp.getActiveSpreadsheet().getId()) }
const doc_ = () => SpreadsheetApp.openById(scriptProp.getProperty('key'))
const safe_ = v => /^[=+\-@]/.test(String(v)) ? "'" + v : v
const json_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
function withLock_ (fn) { const l = LockService.getScriptLock(); l.waitLock(15000); try { return fn() } finally { l.releaseLock() } }

/* ---------- passwords ---------- */
function hash_ (pw) {
  let salt = scriptProp.getProperty('salt')
  if (!salt) { salt = Utilities.getUuid(); scriptProp.setProperty('salt', salt) }
  return 'h:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw))
}
const pwOk_ = (stored, pw) => stored !== '' && (stored.indexOf('h:') === 0 ? stored === hash_(pw) : stored === pw)
// Run once from the editor: turns plain-text passwords in the "login" tab into hashes
function hashPasswords () {
  const U = U_()
  U.users.forEach(u => { if (u.stored !== '' && u.stored.indexOf('h:') !== 0) U.sh.getRange(u.row, U.ix('Password') + 1).setValue(hash_(u.stored)) })
}

/* ---------- login tab: Username | Password | Name | Role ---------- */
function U_ () {
  const sh = doc_().getSheetByName('login')
  if (!sh) throw new Error('Sheet tab "login" not found')
  const h = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(x => String(x).trim())
  ;['Username', 'Password', 'Name', 'Role'].forEach(k => {
    if (!h.some(x => x.toLowerCase() === k.toLowerCase())) {
      h.push(k); sh.getRange(1, h.length).setValue(k)
      if (k === 'Role' && sh.getLastRow() > 1) sh.getRange(2, h.length, sh.getLastRow() - 1, 1).setValues(Array(sh.getLastRow() - 1).fill(['admin'])) // existing users become admins
    }
  })
  const ix = k => h.findIndex(x => x.toLowerCase() === k.toLowerCase())
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues() : []
  const users = v.map((r, i) => ({ row: i + 2, username: String(r[ix('Username')]).trim(), name: String(r[ix('Name')] || '').trim(),
    role: String(r[ix('Role')] || '').trim().toLowerCase() || 'viewer', stored: String(r[ix('Password')]) })).filter(u => u.username)
  return { sh: sh, ix: ix, users: users, find: n => users.find(u => u.username.toLowerCase() === String(n).trim().toLowerCase()) }
}

/* ---------- roles tab: Role | Permissions  ({"module-slug":"vced"}) ---------- */
function R_ () {
  const doc = doc_(); let sh = doc.getSheetByName('roles')
  if (!sh) {
    sh = doc.insertSheet('roles'); sh.appendRow(['Role', 'Permissions']); sh.setFrozenRows(1)
    const d = [['admin', '*'], ['manager', '{"contacts":"vced"}'], ['staff', '{"contacts":"vce"}'], ['viewer', '{"contacts":"v"}']]
    d.forEach(r => sh.appendRow(r))
  }
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : []
  return { sh: sh, list: v.map((r, i) => { let p = {}; try { p = r[1] === '*' ? '*' : JSON.parse(r[1] || '{}') } catch (e) {} return { row: i + 2, role: String(r[0]).trim().toLowerCase(), perms: p } }).filter(r => r.role) }
}
function permsOf_ (role) { if (role === 'admin') return '*'; const r = R_().list.find(x => x.role === role); return r && r.perms !== '*' ? r.perms : {} }
const can_ = (perms, key, a) => perms === '*' || String((perms || {})[key] || '').indexOf(a) >= 0

/* ---------- modules tab: ID | Name | Slug | Icon | Fields(JSON) ---------- */
function M_ () {
  const doc = doc_(); let sh = doc.getSheetByName('modules')
  if (!sh) { sh = doc.insertSheet('modules'); sh.appendRow(['ID', 'Name', 'Slug', 'Icon', 'Fields', 'Color']); sh.setFrozenRows(1) }
  if (String(sh.getRange(1, 6).getValue()) !== 'Color') sh.getRange(1, 6).setValue('Color')
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues() : []
  return { sh: sh, list: v.map((r, i) => ({ row: i + 2, id: String(r[0]), name: String(r[1]), slug: String(r[2]), icon: String(r[3]), fields: JSON.parse(r[4] || '[]'), color: String(r[5] || '') })).filter(m => m.slug) }
}
/* ---------- settings tab: Key | Value  (brand, widgets:<module>) ---------- */
function getS_ (k) {
  const sh = doc_().getSheetByName('settings'); if (!sh || sh.getLastRow() < 2) return null
  const r = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().find(x => String(x[0]) === k)
  return r ? String(r[1]) : null
}
function setS_ (k, val) {
  const doc = doc_(); let sh = doc.getSheetByName('settings')
  if (!sh) { sh = doc.insertSheet('settings'); sh.appendRow(['Key', 'Value']); sh.setFrozenRows(1) }
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [], i = v.findIndex(x => String(x[0]) === k)
  if (i >= 0) sh.getRange(i + 2, 2).setValue(val); else sh.appendRow([k, val])
}
function brand_ () { let b = {}; try { b = JSON.parse(getS_('brand') || '{}') } catch (e) {} return Object.assign({}, DEFAULT_BRAND, b) }
const allMods_ = () => [CONTACTS].concat(M_().list)
function findMod_ (slug) { const m = allMods_().find(x => x.slug === slug); if (!m) throw new Error('Module not found'); return m }

/* ---------- sessions ---------- */
function me_ (token) {
  const uname = token ? CacheService.getScriptCache().get('t_' + token) : null
  const u = uname && U_().find(uname)
  if (!u) throw new Error('auth')
  return { username: u.username, name: u.name || u.username, role: u.role, perms: permsOf_(u.role) }
}
const admin_ = me => { if (me.role !== 'admin') throw new Error('Admins only') }
const need_ = (me, mod, a) => { if (!can_(me.perms, mod.slug, a)) throw new Error('Permission denied') }

function login_ (p) {
  const c = CacheService.getScriptCache(), key = String(p.username || '').trim().toLowerCase(), fk = 'f_' + key
  if (Number(c.get(fk)) >= 5) throw new Error('Too many attempts. Try again in 10 minutes.')
  const u = U_().find(key)
  if (!u || !pwOk_(u.stored, String(p.password || ''))) { c.put(fk, String(Number(c.get(fk)) + 1), 600); throw new Error('Invalid username or password') }
  c.remove(fk)
  const token = Utilities.getUuid() + Utilities.getUuid()
  c.put('t_' + token, u.username.toLowerCase(), 21600) // session lasts 6 hours
  return { result: 'success', token: token, name: u.name || u.username }
}
function changePw_ (me, p) {
  const c = CacheService.getScriptCache(), fk = 'f_' + me.username.toLowerCase(), cur = String(p.current || ''), nw = String(p.newpw || '')
  if (Number(c.get(fk)) >= 5) throw new Error('Too many attempts. Try again in 10 minutes.')
  if (nw.length < 6) throw new Error('New password must be at least 6 characters')
  if (nw === cur) throw new Error('New password must be different from the current one')
  const U = U_(), u = U.find(me.username)
  if (!pwOk_(u.stored, cur)) { c.put(fk, String(Number(c.get(fk)) + 1), 600); throw new Error('Current password is incorrect') }
  c.remove(fk); U.sh.getRange(u.row, U.ix('Password') + 1).setValue(hash_(nw))
  return { result: 'success' }
}

/* ---------- generic table access for any module ---------- */
function prep_ (mod) {
  const doc = doc_(); let sh
  if (mod.slug === 'contacts') sh = doc.getSheetByName(sheetName) || doc.getSheets()[0]
  else { sh = doc.getSheetByName('m_' + mod.slug) || doc.insertSheet('m_' + mod.slug); if (sh.getLastRow() === 0) { sh.appendRow(['ID']); sh.setFrozenRows(1) } }
  const headers = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(x => String(x).trim()) : []
  const want = ['ID'].concat(mod.fields.map(f => f.key)); if (mod.slug !== 'contacts') want.push('Date', 'Created By')
  want.forEach(k => {
    if (headers.indexOf(k) < 0) { headers.push(k); if (headers.length > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 5); sh.getRange(1, headers.length).setValue(k).setFontWeight('bold') }
  })
  return { sh: sh, headers: headers, idCol: headers.indexOf('ID') + 1 }
}
// Gives an ID ONLY to rows that have data but no ID. Existing data/IDs are never changed.
function fillIds_ (t) {
  const n = t.sh.getLastRow() - 1; if (n < 1) return
  const v = t.sh.getRange(2, 1, n, t.headers.length).getValues(); let max = 0, need = false
  v.forEach(r => { const x = Number(r[t.idCol - 1]); if (x > max) max = x })
  const out = v.map(r => { if (r[t.idCol - 1] === '' && r.some(c => c !== '')) { need = true; return [++max] } return [r[t.idCol - 1]] })
  if (need) t.sh.getRange(2, t.idCol, n, 1).setValues(out)
}
function rows_ (mod) {
  const t = prep_(mod); fillIds_(t)
  if (t.sh.getLastRow() < 2) return []
  return t.sh.getRange(2, 1, t.sh.getLastRow() - 1, t.headers.length).getValues().filter(r => r.some(c => c !== '')).map(r => {
    const o = {}; t.headers.forEach((h, j) => { o[h] = r[j] instanceof Date ? r[j].toISOString() : r[j] }); return o
  })
}
function save_ (me, p) { // mode add | update
  const mod = findMod_(p.module), upd = p.mode === 'update'
  need_(me, mod, upd ? 'e' : 'c')
  const rec = JSON.parse(p.rec || '{}'), clean = {}
  mod.fields.forEach(f => {
    const v = String(rec[f.key] == null ? '' : rec[f.key]).trim().slice(0, 5000)
    if (f.required && !v) throw new Error(f.msg || f.label + ' is required')
    if (v && f.type === 'number' && isNaN(v)) throw new Error(f.label + ' must be a number')
    if (v && f.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) throw new Error(f.label + ' must be a valid email')
    clean[f.key] = v
  })
  const t = prep_(mod); fillIds_(t)
  const last = t.sh.getLastRow(), ids = last > 1 ? t.sh.getRange(2, t.idCol, last - 1, 1).getValues().map(r => r[0]) : []
  let row, vals, id
  if (upd) {
    id = String(p.ID || '').trim()
    const i = ids.findIndex(x => String(x) === id); if (!id || i < 0) throw new Error('Record not found')
    row = i + 2
    const old = t.sh.getRange(row, 1, 1, t.headers.length).getValues()[0]
    vals = t.headers.map((h, k) => clean.hasOwnProperty(h) ? clean[h] : old[k])
  } else {
    let max = Number(scriptProp.getProperty('last_' + mod.slug)) || 0 // IDs are never reused after a delete
    ids.forEach(x => { const n = Number(x); if (n > max) max = n })
    id = max + 1; row = last + 1
    vals = t.headers.map(h => h === 'ID' ? id : h === 'Date' ? new Date() : h === 'Created By' ? me.username : clean.hasOwnProperty(h) ? clean[h] : '')
    scriptProp.setProperty('last_' + mod.slug, String(id))
  }
  if (row > t.sh.getMaxRows()) t.sh.insertRowsAfter(t.sh.getMaxRows(), 50)
  mod.fields.forEach(f => t.sh.getRange(row, t.headers.indexOf(f.key) + 1).setNumberFormat('@')) // keep text exactly as typed
  t.sh.getRange(row, 1, 1, vals.length).setValues([vals])
  return { result: 'success', id: id }
}
function del_ (me, p) {
  const mod = findMod_(p.module); need_(me, mod, 'd')
  const t = prep_(mod), last = t.sh.getLastRow(), id = String(p.ID || '').trim()
  const ids = last > 1 ? t.sh.getRange(2, t.idCol, last - 1, 1).getValues().map(r => r[0]) : []
  const i = ids.findIndex(x => String(x) === id); if (!id || i < 0) throw new Error('Record not found')
  if (t.sh.getMaxRows() > 2) t.sh.deleteRow(i + 2); else t.sh.getRange(i + 2, 1, 1, t.headers.length).clearContent()
  return { result: 'success' }
}

/* ---------- administration ---------- */
function modSave_ (me, p) {
  admin_(me)
  const name = String(p.name || '').trim().slice(0, 60); if (!name) throw new Error('Module name is required')
  const used = {}; RESERVED.forEach(k => used[k.toLowerCase()] = 1)
  const fields = []
  JSON.parse(p.fields || '[]').forEach(f => {
    const label = String(f.label || '').trim().slice(0, 60); if (!label) return
    const base = String(f.key || '').trim() || label; let key = base, n = 2
    while (used[key.toLowerCase()]) key = base + ' ' + n++
    used[key.toLowerCase()] = 1
    const type = FTYPES.indexOf(f.type) >= 0 ? f.type : 'text'
    const fd = { key: key, label: label, type: type, options: type === 'select' ? String(f.options || '').slice(0, 1000) : '', required: !!f.required && type !== 'checkbox', msg: f.required && type !== 'checkbox' ? String(f.msg || '').trim().slice(0, 150) : '' }
    if (type === 'lookup') { // dropdown filled from another module's records
      const ref = allMods_().find(x => x.slug === f.ref); if (!ref) throw new Error('Choose a module for the lookup field "' + label + '"')
      fd.ref = ref.slug; fd.show = ref.fields.some(x => x.key === f.show) ? f.show : ref.fields[0].key
    }
    fields.push(fd)
  })
  if (!fields.length) throw new Error('Add at least one field')
  const icon = String(p.icon || '\uD83D\uDCC4').slice(0, 4), M = M_(), color = /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : ''
  let slug
  if (p.id) {
    const m = M.list.find(x => x.id === p.id); if (!m) throw new Error('Module not found')
    slug = m.slug; M.sh.getRange(m.row, 2, 1, 5).setValues([[safe_(name), slug, icon, JSON.stringify(fields), color]])
  } else {
    const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'module'
    slug = base; let n = 2
    while (slug === 'contacts' || M.list.some(x => x.slug === slug)) slug = base + '-' + n++
    M.sh.appendRow([Utilities.getUuid(), safe_(name), slug, icon, JSON.stringify(fields), color])
  }
  prep_({ slug: slug, fields: fields }) // creates / extends the module's data tab
  return { result: 'success', slug: slug }
}
function modDelete_ (me, p) {
  admin_(me)
  const M = M_(), m = M.list.find(x => x.id === p.id); if (!m) throw new Error('Module not found')
  M.sh.deleteRow(m.row)
  const d = doc_().getSheetByName('m_' + m.slug); if (d) doc_().deleteSheet(d)
  return { result: 'success' }
}
function userSave_ (me, p) {
  admin_(me)
  const U = U_(), roles = R_().list.map(r => r.role), uname = String(p.username || '').trim(), role = String(p.role || '').trim().toLowerCase()
  if (!/^[\w.@-]{3,40}$/.test(uname)) throw new Error('Username must be 3-40 characters (letters, numbers, . _ - @)')
  if (roles.indexOf(role) < 0) throw new Error('Unknown role')
  const cur = p.orig ? U.find(p.orig) : null
  if (p.orig && !cur) throw new Error('User not found')
  const dup = U.find(uname); if (dup && (!cur || dup.row !== cur.row)) throw new Error('Username already exists')
  const pw = String(p.password || ''); if ((!cur || pw) && pw.length < 6) throw new Error('Password must be at least 6 characters')
  if (cur && cur.username.toLowerCase() === me.username.toLowerCase() && (role !== cur.role || uname.toLowerCase() !== cur.username.toLowerCase())) throw new Error('You cannot change your own username or role')
  const row = cur ? cur.row : U.sh.getLastRow() + 1
  if (row > U.sh.getMaxRows()) U.sh.insertRowsAfter(U.sh.getMaxRows(), 10)
  const set = (k, v) => U.sh.getRange(row, U.ix(k) + 1).setValue(v)
  set('Username', safe_(uname)); set('Name', safe_(String(p.name || '').trim().slice(0, 60))); set('Role', role)
  if (pw) set('Password', hash_(pw))
  return { result: 'success' }
}
function userDelete_ (me, p) {
  admin_(me)
  const U = U_(), u = U.find(p.username); if (!u) throw new Error('User not found')
  if (u.username.toLowerCase() === me.username.toLowerCase()) throw new Error('You cannot delete your own account')
  U.sh.deleteRow(u.row); return { result: 'success' }
}
function roleSave_ (me, p) {
  admin_(me)
  const role = String(p.role || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
  if (!role) throw new Error('Enter a role name'); if (role === 'admin') throw new Error('The admin role cannot be changed')
  const slugs = allMods_().map(m => m.slug), src = JSON.parse(p.perms || '{}'), perms = {}
  Object.keys(src).forEach(k => { const a = String(src[k]).replace(/[^vced]/g, ''); if (slugs.indexOf(k) >= 0 && a) perms[k] = a })
  const R = R_(), r = R.list.find(x => x.role === role)
  if (r) R.sh.getRange(r.row, 2).setValue(JSON.stringify(perms)); else R.sh.appendRow([role, JSON.stringify(perms)])
  return { result: 'success', role: role }
}
function roleDelete_ (me, p) {
  admin_(me)
  const role = String(p.role || '').trim().toLowerCase(); if (role === 'admin') throw new Error('The admin role cannot be deleted')
  if (U_().users.some(u => u.role === role)) throw new Error('This role is assigned to users. Change their role first.')
  const R = R_(), r = R.list.find(x => x.role === role); if (!r) throw new Error('Role not found')
  R.sh.deleteRow(r.row); return { result: 'success' }
}

function options_ (me, p) { // values of a module's field, for lookup dropdowns
  const ref = findMod_(p.module)
  const ok = can_(me.perms, ref.slug, 'v') || allMods_().some(m => (can_(me.perms, m.slug, 'c') || can_(me.perms, m.slug, 'e')) && m.fields.some(f => f.type === 'lookup' && f.ref === ref.slug))
  if (!ok) throw new Error('Permission denied')
  const key = ref.fields.some(f => f.key === p.field) ? p.field : ref.fields[0].key, seen = {}, out = []
  rows_(ref).forEach(r => { const v = String(r[key] == null ? '' : r[key]).trim(); if (v && !seen[v]) { seen[v] = 1; out.push(v) } })
  return { result: 'success', options: out.sort() }
}
function widgetsSave_ (me, p) {
  admin_(me)
  const m = findMod_(p.module), keys = m.fields.map(f => f.key).concat(['Date'])
  const out = JSON.parse(p.widgets || '[]').slice(0, 24).map(w => ({ id: String(w.id || Utilities.getUuid()).slice(0, 40),
    type: WTYPES.indexOf(w.type) >= 0 ? w.type : 'stat', title: String(w.title || '').trim().slice(0, 60) || 'Widget',
    field: keys.indexOf(w.field) >= 0 ? w.field : '', agg: WAGG.indexOf(w.agg) >= 0 ? w.agg : 'count', valueField: keys.indexOf(w.valueField) >= 0 ? w.valueField : '',
    span: [1, 2, 3].indexOf(Number(w.span)) >= 0 ? Number(w.span) : 1, color: /^#[0-9a-fA-F]{6}$/.test(w.color) ? w.color : '' }))
  setS_('widgets:' + m.slug, JSON.stringify(out))
  return { result: 'success', widgets: out }
}
function settingsSave_ (me, p) {
  admin_(me)
  const s = JSON.parse(p.brand || '{}'), c = {}
  const txt = (k, n) => String(s[k] == null ? DEFAULT_BRAND[k] : s[k]).trim().slice(0, n)
  c.appName = txt('appName', 40) || DEFAULT_BRAND.appName; c.tagline = txt('tagline', 40); c.org = txt('org', 80)
  c.loginTitle = txt('loginTitle', 60); c.loginText = txt('loginText', 200); c.footer = txt('footer', 120)
  c.primary = /^#[0-9a-fA-F]{6}$/.test(s.primary) ? s.primary : DEFAULT_BRAND.primary
  c.sidebar = /^#[0-9a-fA-F]{6}$/.test(s.sidebar) ? s.sidebar : DEFAULT_BRAND.sidebar
  c.mode = ['light', 'dark'].indexOf(s.mode) >= 0 ? s.mode : ''
  const logo = String(s.logo || '')
  if (logo && !/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+\/=]+$/.test(logo) && !/^https?:\/\/\S+$/.test(logo)) throw new Error('Invalid logo image')
  if (logo.length > 35000) throw new Error('The logo is too large. Use a smaller image.')
  c.logo = logo
  setS_('brand', JSON.stringify(c))
  return { result: 'success', brand: Object.assign({}, DEFAULT_BRAND, c) }
}

/* ---------- web app entry points ---------- */
function doGet (e) {
  try {
    const p = e.parameter || {}, act = p.action || 'list'
    if (act === 'public') return json_({ result: 'success', brand: brand_(), version: VERSION }) // branding for the login page (no secrets)
    const me = me_(p.token)
    if (act === 'boot') {
      const modules = allMods_().map(m => ({ id: m.id, slug: m.slug, name: m.name, icon: m.icon, builtin: !!m.builtin, color: m.color || '', fields: m.fields,
        can: ['v', 'c', 'e', 'd'].filter(a => can_(me.perms, m.slug, a)).join('') })).filter(m => m.can.indexOf('v') >= 0)
      return json_({ result: 'success', boot: { user: { username: me.username, name: me.name, role: me.role }, modules: modules, brand: brand_(), version: VERSION } })
    }
    if (act === 'users') { admin_(me); return json_({ result: 'success', users: U_().users.map(u => ({ username: u.username, name: u.name, role: u.role })), roles: R_().list.map(r => r.role) }) }
    if (act === 'roles') { admin_(me); return json_({ result: 'success', roles: R_().list.map(r => ({ role: r.role, perms: r.perms })), modules: allMods_().map(m => ({ slug: m.slug, name: m.name, icon: m.icon })) }) }
    if (act === 'options') return json_(withLock_(() => options_(me, p)))
    if (act === 'widgets') {
      const wm = findMod_(p.module); need_(me, wm, 'v'); let w = []
      try { w = JSON.parse(getS_('widgets:' + wm.slug) || '[]') } catch (x) {}
      return json_({ result: 'success', widgets: w })
    }
    const mod = findMod_(p.module || 'contacts'); need_(me, mod, 'v')
    return json_({ result: 'success', data: withLock_(() => rows_(mod)) })
  } catch (err) { return json_({ result: 'error', error: String(err.message || err) }) }
}
function doPost (e) {
  try {
    const p = e.parameter || {}
    if (p.mode === 'login') return json_(login_(p))
    if (p.mode === 'logout') { CacheService.getScriptCache().remove('t_' + p.token); return json_({ result: 'success' }) }
    const me = me_(p.token)
    const fn = { add: save_, update: save_, delete: del_, changepw: changePw_, modSave: modSave_, modDelete: modDelete_, userSave: userSave_, userDelete: userDelete_, roleSave: roleSave_, roleDelete: roleDelete_, widgetsSave: widgetsSave_, settingsSave: settingsSave_ }[p.mode]
    if (!fn) throw new Error('Unknown action')
    return withLock_(() => json_(fn(me, p)))
  } catch (err) { return json_({ result: 'error', error: String(err.message || err) }) }
}
