/* ADMIN SUITE backend: login, RBAC (roles), dynamic CRUD modules on Google Sheets.
   Paste into Extensions > Apps Script. Run intialSetup once, then deploy as a Web app. */
const sheetName = 'Sheet1' // tab with the built-in "Contact Messages" data (NOT 'login', 'roles' or 'modules')
const scriptProp = PropertiesService.getScriptProperties()
const RESERVED = ['ID', 'Date', 'Created By']
const FTYPES = ['text', 'number', 'email', 'date', 'textarea', 'select', 'checkbox']
const CONTACTS = { id: 'contacts', slug: 'contacts', name: 'Contact Messages', icon: '\u2709\uFE0F', builtin: true, fields: [
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
  if (!sh) { sh = doc.insertSheet('modules'); sh.appendRow(['ID', 'Name', 'Slug', 'Icon', 'Fields']); sh.setFrozenRows(1) }
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : []
  return { sh: sh, list: v.map((r, i) => ({ row: i + 2, id: String(r[0]), name: String(r[1]), slug: String(r[2]), icon: String(r[3]), fields: JSON.parse(r[4] || '[]') })).filter(m => m.slug) }
}
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
    if (f.required && !v) throw new Error(f.label + ' is required')
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
    fields.push({ key: key, label: label, type: FTYPES.indexOf(f.type) >= 0 ? f.type : 'text', options: String(f.options || '').slice(0, 1000), required: !!f.required && f.type !== 'checkbox' })
  })
  if (!fields.length) throw new Error('Add at least one field')
  const icon = String(p.icon || '\uD83D\uDCC4').slice(0, 4), M = M_()
  let slug
  if (p.id) {
    const m = M.list.find(x => x.id === p.id); if (!m) throw new Error('Module not found')
    slug = m.slug; M.sh.getRange(m.row, 2, 1, 4).setValues([[safe_(name), slug, icon, JSON.stringify(fields)]])
  } else {
    const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'module'
    slug = base; let n = 2
    while (slug === 'contacts' || M.list.some(x => x.slug === slug)) slug = base + '-' + n++
    M.sh.appendRow([Utilities.getUuid(), safe_(name), slug, icon, JSON.stringify(fields)])
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

/* ---------- web app entry points ---------- */
function doGet (e) {
  try {
    const p = e.parameter || {}, me = me_(p.token), act = p.action || 'list'
    if (act === 'boot') {
      const modules = allMods_().map(m => ({ id: m.id, slug: m.slug, name: m.name, icon: m.icon, builtin: !!m.builtin, fields: m.fields,
        can: ['v', 'c', 'e', 'd'].filter(a => can_(me.perms, m.slug, a)).join('') })).filter(m => m.can.indexOf('v') >= 0)
      return json_({ result: 'success', boot: { user: { username: me.username, name: me.name, role: me.role }, modules: modules } })
    }
    if (act === 'users') { admin_(me); return json_({ result: 'success', users: U_().users.map(u => ({ username: u.username, name: u.name, role: u.role })), roles: R_().list.map(r => r.role) }) }
    if (act === 'roles') { admin_(me); return json_({ result: 'success', roles: R_().list.map(r => ({ role: r.role, perms: r.perms })), modules: allMods_().map(m => ({ slug: m.slug, name: m.name, icon: m.icon })) }) }
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
    const fn = { add: save_, update: save_, delete: del_, changepw: changePw_, modSave: modSave_, modDelete: modDelete_, userSave: userSave_, userDelete: userDelete_, roleSave: roleSave_, roleDelete: roleDelete_ }[p.mode]
    if (!fn) throw new Error('Unknown action')
    return withLock_(() => json_(fn(me, p)))
  } catch (err) { return json_({ result: 'error', error: String(err.message || err) }) }
}
