/* Loaded in <head> of every page: applies the saved light/dark theme and the app's brand colours before the page paints */
function shade(hex, pct) {
  var n = parseInt(String(hex).slice(1), 16), f = 1 + pct / 100;
  var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (x) { return Math.max(0, Math.min(255, Math.round(x * f))); });
  return '#' + c.map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
}
function applyBrand(b) {
  if (!b) return;
  var s = document.documentElement.style;
  if (b.primary) { s.setProperty('--p', b.primary); s.setProperty('--p2', shade(b.primary, -16)); }
  if (b.sidebar) s.setProperty('--side', b.sidebar);
}
(function () {
  var m = location.hash.match(/th=(dark|light)/);
  if (m) { try { localStorage.setItem('theme', m[1]); } catch (e) {} }
  var b = null, t = null;
  try { b = JSON.parse(localStorage.getItem('brand') || 'null'); } catch (e) {}
  try { t = localStorage.getItem('theme'); } catch (e) {}
  if (!t) t = (b && b.mode) || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  applyBrand(b);
})();
function themeIcon() { var b = document.getElementById('tt'); if (b) b.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'; }
function toggleTheme() {
  var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('theme', t); } catch (e) {}
  themeIcon();
}
document.addEventListener('DOMContentLoaded', themeIcon);
