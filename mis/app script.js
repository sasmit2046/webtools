/* ADMIN SUITE backend: login, RBAC (roles), dynamic CRUD modules on Google Sheets.
   Paste into Extensions > Apps Script. Run intialSetup once, then deploy as a Web app. */
const sheetName = 'Sheet1' // tab with the built-in "Contact Messages" data (NOT 'login', 'roles' or 'modules')
const scriptProp = PropertiesService.getScriptProperties()
const VERSION = '3.2.0' // keep in sync with APP_VERSION in version.js
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
  ;['Username', 'Password', 'Name', 'Role', 'Email', 'Notify'].forEach(k => {
    if (!h.some(x => x.toLowerCase() === k.toLowerCase())) {
      h.push(k); sh.getRange(1, h.length).setValue(k)
      if (k === 'Role' && sh.getLastRow() > 1) sh.getRange(2, h.length, sh.getLastRow() - 1, 1).setValues(Array(sh.getLastRow() - 1).fill(['admin'])) // existing users become admins
    }
  })
  const ix = k => h.findIndex(x => x.toLowerCase() === k.toLowerCase())
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues() : []
  const users = v.map((r, i) => ({ row: i + 2, username: String(r[ix('Username')]).trim(), name: String(r[ix('Name')] || '').trim(),
    role: String(r[ix('Role')] || '').trim().toLowerCase() || 'viewer', stored: String(r[ix('Password')]),
    email: String(r[ix('Email')] || '').trim(), notify: String(r[ix('Notify')] || '').trim().toLowerCase() === 'yes' })).filter(u => u.username)
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
  return { username: u.username, name: u.name || u.username, email: u.email, role: u.role, perms: permsOf_(u.role) }
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
  return { result: 'success', id: id, _mail: { mod: mod, action: upd ? 'update' : 'add', id: id, clean: clean, by: me.username, byName: me.name, opts: jp_(p.mail, null) } }
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
  const email = String(p.email || '').trim(), notify = String(p.notify) === 'yes'
  if (email && !validEmail_(email)) throw new Error('Enter a valid email address')
  if (notify && !email) throw new Error('Add an email address to turn on email notifications for this user')
  const pw = String(p.password || ''); if ((!cur || pw) && pw.length < 6) throw new Error('Password must be at least 6 characters')
  if (cur && cur.username.toLowerCase() === me.username.toLowerCase() && (role !== cur.role || uname.toLowerCase() !== cur.username.toLowerCase())) throw new Error('You cannot change your own username or role')
  const row = cur ? cur.row : U.sh.getLastRow() + 1
  if (row > U.sh.getMaxRows()) U.sh.insertRowsAfter(U.sh.getMaxRows(), 10)
  const set = (k, v) => U.sh.getRange(row, U.ix(k) + 1).setValue(v)
  set('Username', safe_(uname)); set('Name', safe_(String(p.name || '').trim().slice(0, 60))); set('Role', role); set('Email', email); set('Notify', notify ? 'Yes' : 'No')
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
  const slugs = permKeys_(), src = JSON.parse(p.perms || '{}'), perms = {}
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

/* ---------- letters: templates (tab letter_templates) and generated letters (tab letters) ---------- */
// permission keys: 'letter-templates' (v see, c create, e edit, d delete) and 'letters' (v view/download, c generate, d delete)
const badHtml_ = s => /<\s*(script|iframe|object|embed|link|meta|style|base|form)\b|<[^>]*\son[a-z]+\s*=|javascript:/i.test(String(s))
const permKeys_ = () => allMods_().map(m => m.slug).concat(['letter-templates', 'letters'])
const iso_ = d => d instanceof Date ? d.toISOString() : String(d)
function LT_ () {
  const doc = doc_(); let sh = doc.getSheetByName('letter_templates')
  if (!sh) { sh = doc.insertSheet('letter_templates'); sh.appendRow(['ID', 'Name', 'Title', 'Sources', 'Body', 'Header', 'Footer', 'Signature', 'Letterhead', 'Prefix', 'Created By', 'Updated']); sh.setFrozenRows(1) }
  const n = sh.getLastRow() - 1, v = n > 0 ? sh.getRange(2, 1, n, 12).getValues() : []
  return { sh: sh, list: v.map((r, i) => ({ row: i + 2, id: String(r[0]), name: String(r[1]), title: String(r[2]), sources: jp_(String(r[3]), []), body: String(r[4]), header: String(r[5]), footer: String(r[6]),
    signature: String(r[7]), letterhead: String(r[8]) !== 'No', prefix: String(r[9]) || 'LTR', by: String(r[10]), updated: iso_(r[11]) })).filter(t => t.id) }
}
function L_ () {
  const doc = doc_(); let sh = doc.getSheetByName('letters')
  if (!sh) { sh = doc.insertSheet('letters'); sh.appendRow(['ID', 'Letter No', 'Template ID', 'Template', 'Subject', 'Records', 'Date', 'Created By', 'Content']); sh.setFrozenRows(1) }
  const n = sh.getLastRow() - 1, v = n > 0 ? sh.getRange(2, 1, n, 8).getValues() : []
  return { sh: sh, list: v.map((r, i) => ({ row: i + 2, id: String(r[0]), no: String(r[1]), tid: String(r[2]), template: String(r[3]), subject: String(r[4]), records: String(r[5]), date: iso_(r[6]), by: String(r[7]) })).filter(l => l.id) }
}
function ltSave_ (me, p) {
  const upd = !!p.id
  if (!can_(me.perms, 'letter-templates', upd ? 'e' : 'c')) throw new Error('Permission denied')
  const name = String(p.name || '').trim().slice(0, 80); if (!name) throw new Error('Template name is required')
  const slugs = allMods_().map(m => m.slug), sources = jp_(p.sources, []).filter((k, i, a) => a.indexOf(k) === i && slugs.indexOf(k) >= 0).slice(0, 6)
  if (!sources.length) throw new Error('Choose at least one CRUD module as the data source')
  const body = String(p.body || '').slice(0, 40000)
  if (!body.replace(/<[^>]*>/g, '').trim()) throw new Error('The letter body is empty')
  if (badHtml_(body)) throw new Error('The template contains content that is not allowed')
  const prefix = /^[A-Za-z0-9_-]{1,12}$/.test(p.prefix || '') ? p.prefix : 'LTR', T = LT_(), t = upd ? T.list.find(x => x.id === p.id) : null
  if (upd && !t) throw new Error('Template not found')
  const row = [upd ? t.id : Utilities.getUuid(), safe_(name), safe_(String(p.title || '').trim().slice(0, 200)), JSON.stringify(sources), body, safe_(String(p.header || '').slice(0, 300)),
    safe_(String(p.footer || '').slice(0, 300)), safe_(String(p.signature || '').slice(0, 500)), String(p.letterhead) === 'No' ? 'No' : 'Yes', prefix, upd ? t.by : me.username, new Date()]
  if (upd) T.sh.getRange(t.row, 1, 1, 12).setValues([row]); else T.sh.appendRow(row)
  return { result: 'success', id: row[0] }
}
function ltDelete_ (me, p) {
  if (!can_(me.perms, 'letter-templates', 'd')) throw new Error('Permission denied')
  const T = LT_(), t = T.list.find(x => x.id === p.id); if (!t) throw new Error('Template not found')
  T.sh.deleteRow(t.row); return { result: 'success' }
}
function letterSave_ (me, p) {
  if (!can_(me.perms, 'letters', 'c')) throw new Error('Permission denied')
  const T = LT_().list.find(t => t.id === p.tid); if (!T) throw new Error('Template not found')
  const content = String(p.content || '')
  if (!content.replace(/<[^>]*>/g, '').trim()) throw new Error('The letter is empty')
  if (badHtml_(content)) throw new Error('The letter contains content that is not allowed')
  const year = new Date().getFullYear(), key = 'lseq_' + T.prefix + '_' + year, seq = (Number(scriptProp.getProperty(key)) || 0) + 1
  const no = T.prefix + '/' + year + '/' + ('0000' + seq).slice(-4)
  const finalHtml = content.replace(/\{\{\s*letter_no\s*\}\}/g, no)   // the number is assigned here, when the letter is saved
  if (finalHtml.length > 48000) throw new Error('This letter is too long to store (limit about 48,000 characters)')
  const id = Utilities.getUuid(), subject = String(p.subject || T.title || T.name).trim().slice(0, 200)
  L_().sh.appendRow([id, no, T.id, safe_(T.name), safe_(subject), JSON.stringify(jp_(p.records, {})).slice(0, 500), new Date(), me.username, finalHtml])
  scriptProp.setProperty(key, String(seq))
  return { result: 'success', id: id, no: no }
}
function letterDelete_ (me, p) {
  if (!can_(me.perms, 'letters', 'd')) throw new Error('Permission denied')
  const L = L_(), l = L.list.find(x => x.id === p.id); if (!l) throw new Error('Letter not found')
  L.sh.deleteRow(l.row); return { result: 'success' }
}

/* ---------- email notifications ---------- */
const validEmail_ = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''))
const esc_ = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';')
const jp_ = (s, d) => { try { return s ? JSON.parse(s) : d } catch (e) { return d } }
const DEF_EMAIL = { enabled: false, senderName: '', replyTo: '', footer: '' }
const DEF_MMAIL = { enabled: false, subject: 'New {module} record #{id}', fields: [], roles: [], onAdd: true, onUpdate: false, skipSelf: false }
function allS_ () {
  const sh = doc_().getSheetByName('settings'), o = {}
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(r => { o[String(r[0])] = String(r[1]) })
  return o
}
const emailCfg_ = S => Object.assign({}, DEF_EMAIL, jp_((S || allS_()).email, {}))
const modMail_ = (slug, S) => Object.assign({}, DEF_MMAIL, jp_((S || allS_())['emailmod:' + slug], {}))
// Run this once from the editor (and approve the permission) before using email
function authorizeEmail () { return MailApp.getRemainingDailyQuota() }

function mailLog_ (mod, id, to, status) {
  const doc = doc_(); let sh = doc.getSheetByName('emaillog')
  if (!sh) { sh = doc.insertSheet('emaillog'); sh.appendRow(['Time', 'Module', 'Record', 'To', 'Status']); sh.setFrozenRows(1) }
  sh.appendRow([new Date(), mod, id, to, status])
  if (sh.getLastRow() > 1000) sh.deleteRows(2, 200)
}
function mailHTML_ (brand, title, rows, meta, footer) {
  const td = 'padding:9px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;'
  return '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:580px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' +
    '<div style="background:' + esc_(brand.primary) + ';color:#fff;padding:18px 22px;font-size:18px;font-weight:700">' + esc_(brand.appName) + '</div>' +
    '<div style="padding:22px"><h2 style="margin:0 0 14px;font-size:18px;color:#0f172a">' + esc_(title) + '</h2><table style="width:100%;border-collapse:collapse">' +
    rows.map(r => '<tr><td style="' + td + 'color:#64748b;width:36%">' + esc_(r[0]) + '</td><td style="' + td + 'color:#0f172a;white-space:pre-wrap">' + esc_(r[1] === '' ? '\u2014' : r[1]) + '</td></tr>').join('') + '</table>' +
    (meta ? '<p style="color:#64748b;font-size:12px;margin:14px 0 0">' + esc_(meta) + '</p>' : '') + '</div>' +
    (footer ? '<div style="background:#f8fafc;padding:12px 22px;color:#64748b;font-size:12px">' + esc_(footer) + '</div>' : '') + '</div>'
}
function sendMail_ (job) { // called AFTER the record was saved; a failure here never loses the record
  const S = allS_(), g = emailCfg_(S), mm = modMail_(job.mod.slug, S)
  if (!g.enabled || !mm.enabled) return { n: 0 }
  if (job.action === 'add' ? !mm.onAdd : !mm.onUpdate) return { n: 0 }
  if (job.opts && job.opts.send === false) return { n: 0 }
  const keys = job.mod.fields.map(f => f.key)
  const pick = job.opts && Array.isArray(job.opts.fields) ? job.opts.fields.filter(k => keys.indexOf(k) >= 0) : (mm.fields.length ? mm.fields : keys)
  if (!pick.length) return { n: 0, note: 'No fields were selected for the email' }
  const brand = Object.assign({}, DEFAULT_BRAND, jp_(S.brand, {})), R = R_().list
  const permsOf = role => role === 'admin' ? '*' : ((R.find(x => x.role === role) || {}).perms || {})
  const seen = {}, rec = U_().users.filter(u => {
    if (!u.notify || !validEmail_(u.email) || seen[u.email.toLowerCase()]) return false
    if (mm.roles.length && mm.roles.indexOf(u.role) < 0) return false
    if (mm.skipSelf && u.username.toLowerCase() === job.by.toLowerCase()) return false
    if (!can_(permsOf(u.role), job.mod.slug, 'v')) return false   // never email data to people who cannot open the module
    seen[u.email.toLowerCase()] = 1; return true
  }).slice(0, 25)
  if (!rec.length) return { n: 0, note: 'No users with email notifications turned on' }
  const fields = job.mod.fields.filter(f => pick.indexOf(f.key) >= 0)
  const rows = fields.map(f => [f.label, job.clean[f.key] || ''])
  const subject = String(mm.subject || DEF_MMAIL.subject).replace(/\{([^}]+)\}/g, (m, k) => {
    if (k === 'module') return job.mod.name; if (k === 'id') return job.id; if (k === 'user') return job.byName; if (k === 'app') return brand.appName
    const f = job.mod.fields.find(x => x.key === k || x.label === k); return f ? (job.clean[f.key] || '') : m
  }).replace(/[\r\n]+/g, ' ').slice(0, 150)
  const title = (job.action === 'add' ? 'New record' : 'Record updated') + ' in ' + job.mod.name + ' (#' + job.id + ')'
  const meta = (job.action === 'add' ? 'Added' : 'Updated') + ' by ' + job.byName + ' on ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
  const text = title + '\n\n' + rows.map(r => r[0] + ': ' + (r[1] === '' ? '-' : r[1])).join('\n') + '\n\n' + meta + (g.footer ? '\n' + g.footer : '')
  const html = mailHTML_(brand, title, rows, meta, g.footer)
  let sent = 0, err = ''
  rec.forEach(u => {
    try {
      const o = { to: u.email, subject: subject, body: text, htmlBody: html, name: g.senderName || brand.appName }
      if (validEmail_(g.replyTo)) o.replyTo = g.replyTo
      MailApp.sendEmail(o); sent++; mailLog_(job.mod.name, job.id, u.email, 'Sent')
    } catch (e) { err = String(e.message || e); mailLog_(job.mod.name, job.id, u.email, 'FAILED: ' + err) }
  })
  return { n: sent, err: err }
}
function emailCfgGet_ () {
  const S = allS_(); let quota = null; try { quota = MailApp.getRemainingDailyQuota() } catch (e) {}
  const sh = doc_().getSheetByName('emaillog'); let log = []
  if (sh && sh.getLastRow() > 1) {
    const n = Math.min(30, sh.getLastRow() - 1)
    log = sh.getRange(sh.getLastRow() - n + 1, 1, n, 5).getValues().reverse().map(r => ({ time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), module: String(r[1]), record: String(r[2]), to: String(r[3]), status: String(r[4]) }))
  }
  return { result: 'success', email: emailCfg_(S), quota: quota, roles: R_().list.map(r => r.role), recipients: U_().users.filter(u => u.notify && validEmail_(u.email)).length,
    modules: allMods_().map(m => ({ slug: m.slug, name: m.name, icon: m.icon, fields: m.fields.map(f => ({ key: f.key, label: f.label })), cfg: modMail_(m.slug, S) })), log: log }
}
function emailSave_ (me, p) {
  admin_(me)
  const s = jp_(p.cfg, {}), c = { enabled: !!s.enabled, senderName: String(s.senderName || '').trim().slice(0, 60), replyTo: String(s.replyTo || '').trim(), footer: String(s.footer || '').trim().slice(0, 200) }
  if (c.replyTo && !validEmail_(c.replyTo)) throw new Error('Reply-to is not a valid email address')
  setS_('email', JSON.stringify(c)); return { result: 'success', email: c }
}
function emailModSave_ (me, p) {
  admin_(me)
  const m = findMod_(p.module), s = jp_(p.cfg, {}), keys = m.fields.map(f => f.key), roles = R_().list.map(r => r.role)
  const c = { enabled: !!s.enabled, subject: String(s.subject || DEF_MMAIL.subject).trim().slice(0, 150) || DEF_MMAIL.subject,
    fields: (s.fields || []).filter(k => keys.indexOf(k) >= 0), roles: (s.roles || []).filter(r => roles.indexOf(r) >= 0),
    onAdd: !!s.onAdd, onUpdate: !!s.onUpdate, skipSelf: !!s.skipSelf }
  setS_('emailmod:' + m.slug, JSON.stringify(c)); return { result: 'success', cfg: c }
}
function emailTest_ (me, p) {
  admin_(me)
  const to = String(p.to || '').trim() || me.email
  if (!validEmail_(to)) throw new Error('Enter a valid email address (or add an email address to your own user first)')
  const g = emailCfg_(), b = brand_(), o = { to: to, subject: 'Test email from ' + b.appName, body: 'Email is working. This is a test message from ' + b.appName + '.', htmlBody: mailHTML_(b, 'Test email', [['Status', 'Email is working']], '', g.footer), name: g.senderName || b.appName }
  if (validEmail_(g.replyTo)) o.replyTo = g.replyTo
  try { MailApp.sendEmail(o) } catch (e) { mailLog_('(test)', '', to, 'FAILED: ' + e.message); throw new Error('Could not send: ' + e.message + ' (run authorizeEmail once in the Apps Script editor, then redeploy)') }
  mailLog_('(test)', '', to, 'Sent'); return { result: 'success', to: to }
}
function userNotify_ (me, p) {
  admin_(me)
  const U = U_(), u = U.find(p.username); if (!u) throw new Error('User not found')
  const on = String(p.notify) === 'yes'
  if (on && !validEmail_(u.email)) throw new Error('Add an email address to this user first (Edit user)')
  U.sh.getRange(u.row, U.ix('Notify') + 1).setValue(on ? 'Yes' : 'No'); return { result: 'success' }
}

/* ---------- web app entry points ---------- */
function doGet (e) {
  try {
    const p = e.parameter || {}, act = p.action || 'list'
    if (act === 'public') return json_({ result: 'success', brand: brand_(), version: VERSION }) // branding for the login page (no secrets)
    const me = me_(p.token)
    if (act === 'boot') {
      const S = allS_(), g = emailCfg_(S)
      const modules = allMods_().map(m => ({ id: m.id, slug: m.slug, name: m.name, icon: m.icon, builtin: !!m.builtin, color: m.color || '', fields: m.fields,
        can: ['v', 'c', 'e', 'd'].filter(a => can_(me.perms, m.slug, a)).join(''),
        mail: (mm => ({ on: g.enabled && mm.enabled && (mm.onAdd || mm.onUpdate), onAdd: mm.onAdd, onUpdate: mm.onUpdate, fields: mm.fields.length ? mm.fields : m.fields.map(f => f.key) }))(modMail_(m.slug, S)) })).filter(m => m.can.indexOf('v') >= 0)
      return json_({ result: 'success', boot: { user: { username: me.username, name: me.name, role: me.role }, modules: modules, brand: brand_(), version: VERSION,
      letters: { t: ['v', 'c', 'e', 'd'].filter(a => can_(me.perms, 'letter-templates', a)).join(''), l: ['v', 'c', 'e', 'd'].filter(a => can_(me.perms, 'letters', a)).join('') } } })
    }
    if (act === 'users') { admin_(me); return json_({ result: 'success', users: U_().users.map(u => ({ username: u.username, name: u.name, role: u.role, email: u.email, notify: u.notify })), roles: R_().list.map(r => r.role) }) }
    if (act === 'roles') { admin_(me); return json_({ result: 'success', roles: R_().list.map(r => ({ role: r.role, perms: r.perms })), modules: allMods_().map(m => ({ slug: m.slug, name: m.name, icon: m.icon })).concat([{ slug: 'letter-templates', name: 'Letter Templates', icon: '\uD83D\uDCDD' }, { slug: 'letters', name: 'Letters (generate & download)', icon: '\uD83D\uDCC4' }]) }) }
    if (act === 'ltemplates') {
      if (!(can_(me.perms, 'letter-templates', 'v') || can_(me.perms, 'letters', 'c'))) throw new Error('Permission denied')
      return json_({ result: 'success', templates: LT_().list.map(t => { delete t.row; return t }) })
    }
    if (act === 'letters') {
      if (!can_(me.perms, 'letters', 'v')) throw new Error('Permission denied')
      return json_({ result: 'success', letters: L_().list.reverse().slice(0, 500).map(l => ({ id: l.id, no: l.no, template: l.template, subject: l.subject, date: l.date, by: l.by })) })
    }
    if (act === 'letter') {
      if (!can_(me.perms, 'letters', 'v')) throw new Error('Permission denied')
      const L = L_(), l = L.list.find(x => x.id === p.id); if (!l) throw new Error('Letter not found')
      return json_({ result: 'success', no: l.no, subject: l.subject, content: String(L.sh.getRange(l.row, 9).getValue()) })
    }
    if (act === 'emailcfg') { admin_(me); return json_(emailCfgGet_()) }
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
    const fn = { add: save_, update: save_, delete: del_, changepw: changePw_, modSave: modSave_, modDelete: modDelete_, userSave: userSave_, userDelete: userDelete_, roleSave: roleSave_, roleDelete: roleDelete_, widgetsSave: widgetsSave_, settingsSave: settingsSave_, emailSave: emailSave_, emailModSave: emailModSave_, emailTest: emailTest_, userNotify: userNotify_, ltSave: ltSave_, ltDelete: ltDelete_, letterSave: letterSave_, letterDelete: letterDelete_ }[p.mode]
    if (!fn) throw new Error('Unknown action')
    const res = withLock_(() => fn(me, p))
    if (res._mail) { // email is sent after the record is saved and the lock is released
      const job = res._mail; delete res._mail
      try { const r = sendMail_(job); res.mailed = r.n; if (r.err) res.mailError = r.err; if (r.note) res.mailNote = r.note } catch (x) { res.mailError = String(x.message || x) }
    }
    return json_(res)
  } catch (err) { return json_({ result: 'error', error: String(err.message || err) }) }
}
