(() => {
'use strict';
const KEY = 'kura.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const today = () => new Date().toLocaleDateString('sv-SE');
const z2h = (v) => String(v ?? '').normalize('NFKC');
const int = (v) => { const n = parseInt(z2h(v).replace(/[,\s円¥]/g, ''), 10); return isFinite(n) && n >= 0 ? n : 0; };
const dec = (v) => { const n = parseFloat(z2h(v).replace(/[,\s]/g, '')); return isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0; };
/* ひらがな・カタカナ・全角半角・大文字小文字を気にしない比較用 */
const norm = (s) => z2h(s).toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const coll = new Intl.Collator('ja');
const yen = (n) => '¥' + Math.round(n || 0).toLocaleString('ja-JP');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ===== 部屋ごとの言葉 ===== */
const SER_BOOK = { label: 'シリーズもの', hint: '巻ごとの写真・評価・感想、どこまで読んだか、持ってる巻を残せる', on: '連載中', fin: '完結', have: '既刊', nw: '新刊', finQ: '完結してる', finH: 'オフなら「連載中」。あとから新刊を足せる', volsL: '今出てる巻数', curL: '読んだところ（巻）' };
const SER_WORKS = (curL, hint) => ({ label: 'シリーズもの', hint, on: 'シリーズ継続中', fin: 'シリーズ完結', have: 'これまで', nw: '新作', finQ: 'シリーズが完結してる', finH: 'オフなら続きが出る前提。あとから新作を足せる', volsL: '今出てる作品数', curL });
const CATS = {
  manga: { name: '漫画', unit: '冊', creator: '作者', vol: '巻', volN: (n) => `${n}巻`, st: [['none', '未読'], ['doing', '読んでる'], ['done', '読んだ'], ['pause', '中断']], later: 'あとで読む', shelf: 'spine', side: 'right', verb: '読む', did: '読んだ', act: '読んだ', start: '読みはじめた', doneQ: '読み終えた？', whenQ: 'いつ読み終えた？', room: '#23317a', own: true, ser: SER_BOOK, media: ['紙', '電子', '両方'] },
  anime: { name: 'アニメ', unit: '作品', creator: '制作・監督', vol: '話', volN: (n) => `第${n}話`, st: [['none', 'まだ'], ['doing', '観てる'], ['done', '観た'], ['pause', '中断']], later: 'あとで観る', shelf: 'screen', side: '', verb: '観る', did: '観た', act: '観た', start: '観はじめた', doneQ: '観終えた？', whenQ: 'いつ観終えた？', room: '#0f3d4a', own: false, ser: { label: '話数を記録', hint: '何話まで観たか、話ごとの評価・感想を残せる', on: '放送中', fin: '放送終了', have: '放送済み', nw: '新しい話', finQ: '放送が終わってる', finH: 'オフなら「放送中」。あとから新しい話を足せる', volsL: '今出てる話数', curL: '観たところ（話）' }, media: ['配信', 'テレビ', 'ディスク', '映画館'] },
  movie: { name: '映画', unit: '本', creator: '監督', vol: '作', volN: (n) => `${n}作目`, st: [['none', 'まだ'], ['doing', 'シリーズ途中'], ['done', '観た'], ['pause', '中断']], later: 'あとで観る', shelf: 'ticket', side: '', verb: '観る', did: '観た', act: '観た', start: '観はじめた', doneQ: '観た？', whenQ: 'いつ観た？', room: '#3d0c18', own: false, ser: SER_WORKS('観たところ（作目）', '何作目まで観たか、作品ごとの評価・感想・写真を残せる'), media: ['映画館', '配信', 'ディスク', 'テレビ'] },
  book: { name: '本', unit: '冊', creator: '著者', vol: '巻', volN: (n) => `${n}巻`, st: [['none', '未読'], ['doing', '読んでる'], ['done', '読んだ'], ['pause', '中断']], later: 'あとで読む', shelf: 'spine', side: 'right', verb: '読む', did: '読んだ', act: '読んだ', start: '読みはじめた', doneQ: '読み終えた？', whenQ: 'いつ読み終えた？', room: '#143c2f', own: true, ser: SER_BOOK, media: ['紙', '電子', '両方'] },
  game: { name: 'ゲーム', unit: '本', creator: '開発・メーカー', vol: '作', volN: (n) => `${n}作目`, st: [['none', '未プレイ'], ['doing', 'プレイ中'], ['done', 'クリア'], ['pause', '中断']], later: 'あとで遊ぶ', shelf: 'spine', side: 'left', verb: '遊ぶ', did: '遊んだ', act: 'クリア', start: 'プレイを始めた', doneQ: 'クリアした？', whenQ: 'いつクリアした？', room: '#2a1d52', own: true, ser: SER_WORKS('遊んだところ（作目）', 'シリーズの何作目まで遊んだか、作品ごとの評価・感想・写真を残せる'), media: ['パッケージ', 'ダウンロード'] },
  art: { name: '芸術', unit: '点', creator: '作家', vol: '点', volN: (n) => `${n}点目`, st: [['none', 'まだ'], ['done', '見た']], later: '見に行きたい', shelf: 'frame', side: '', verb: '見る', did: '見た', act: '見た', start: '見はじめた', doneQ: '見た？', whenQ: 'いつ見た？', room: '#ecebe7', own: false, ser: null, media: null },
};
const ORDER = ['manga', 'anime', 'movie', 'book', 'game', 'art'];
const PF = [[/switch|スイッチ/i, '#e4002b'], [/ps|プレステ|playstation/i, '#1f5fd1'], [/xbox/i, '#1a8a1a'], [/pc|steam/i, '#5b6170'], [/スマホ|ios|android|iphone/i, '#e8a020']];
const pfColor = (p) => (PF.find(([r]) => r.test(p || '')) || [0, '#8a8fa3'])[1];
const stLabel = (cat, st) => (CATS[cat].st.find((s) => s[0] === st) || CATS[cat].st[0])[1];
const PALETTE = ['#c94f3d', '#e0a43a', '#3f7d5a', '#2f5d9e', '#7a3f8a', '#1f6f78', '#b5546f', '#58606e', '#d8c7a6', '#efe9dc', '#2b2b30', '#8c6a3f'];
const FMTS = ['IMAX', 'Dolby Cinema', 'Dolby Atmos', '4DX', 'MX4D', 'ScreenX', '3D', '字幕', '吹替', '応援上映'];
const LISTS = {
  where: ['自室', '自室の本棚', '実家', '職場', 'トランクルーム', '人に貸してる'],
  app: ['Kindle', '楽天Kobo', 'ジャンプ＋', 'マガポケ', 'LINEマンガ', 'ピッコマ', 'コミックシーモア', 'ebookjapan', 'BookLive!', 'Apple Books', 'honto'],
  svc: ['Netflix', 'Amazon Prime Video', 'U-NEXT', 'Disney+', 'dアニメストア', 'ABEMA', 'Hulu', 'DMM TV', 'Apple TV+', 'Lemino', 'YouTube'],
};
const TIERS = [['S', 4.75, '★5'], ['A', 4, '★4〜4.5'], ['B', 3, '★3〜3.5'], ['C', 2, '★2〜2.5'], ['D', 0.01, '★2未満']];
const tierOf = (r) => (r > 0 ? (TIERS.find(([, m]) => r >= m) || TIERS[4])[0] : '');

/* ===== データ（前の版から引き継ぐ） ===== */
const DEF = () => ({ v: 2, cat: 'manga', view: Object.fromEntries(ORDER.map((k) => [k, 'shelf'])), sort: 'new', items: [], shelves: [], set: { tod: true, money: false, dust: true }, lastBackup: 0 });
let S = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.items)) return normalize(d);
  } catch (e) {}
  return DEF();
}
function normalize(d) {
  const o = { ...DEF(), ...d, view: { ...DEF().view, ...(d.view || {}) }, shelves: Array.isArray(d.shelves) ? d.shelves.filter((h) => h && h.id && CATS[h.cat]) : [], set: { ...DEF().set, ...(d.set || {}) } };
  delete o.imgs; delete o.kura;
  if (!CATS[o.cat]) o.cat = 'manga';
  o.items = o.items.filter((x) => x && x.id && CATS[x.cat] && x.title);
  o.items.forEach(fix);
  o.v = 2;
  return o;
}
function fix(x) {
  x.created = x.created || Date.now(); x.updated = x.updated || x.created;
  if (!Array.isArray(x.log)) x.log = [{ t: x.created, k: 'add' }].concat(x.status === 'done' ? [{ t: whenT(x.date), k: 'st', v: 'done', d: x.date || '?' }] : []);
  x.rounds = x.rounds || []; x.round = x.round || 1; x.sh = x.sh || []; x.tags = Array.isArray(x.tags) ? x.tags : [];
  x.status = x.status || 'none'; x.cur = +x.cur || 0; x.vols = +x.vols || 0;
  if (!x.v || typeof x.v !== 'object' || Array.isArray(x.v)) x.v = {};
  /* 前の版の「持ってる巻数（1〜N巻）」を、1冊ずつの記録に変える */
  if (x.own != null && x.own !== '') { const n = +x.own || 0; for (let i = 1; i <= n; i++) (x.v[i] = x.v[i] || {}).o = 1; x.ownOn = true; }
  delete x.own;
  if (!Array.isArray(x.fmt)) x.fmt = [];
  return x;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('保存できなかった（保存領域がいっぱいかも）'); } }
const ui = { filter: 'all', q: '', tag: '', rtab: 'tier', vmode: 'open', tow: 'stack' };

/* 写真（IndexedDB）。作品の写真は「id」、巻の写真は「id~巻」で保存 */
const idb = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('kura', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const run = (mode, fn) => open().then((db) => new Promise((res, rej) => { const t = db.transaction('img', mode), q = fn(t.objectStore('img')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return { get: (k) => run('readonly', (s) => s.get(k)), set: (k, v) => run('readwrite', (s) => s.put(v, k)), del: (k) => run('readwrite', (s) => s.delete(k)), clear: () => run('readwrite', (s) => s.clear()) };
})();
const urls = new Map();
async function imgURL(k) {
  if (!k) return null;
  if (urls.has(k)) return urls.get(k);
  try { const b = await idb.get(k); if (!b) return null; const u = URL.createObjectURL(b); urls.set(k, u); return u; } catch (e) { return null; }
}
const forget = (k) => { const u = urls.get(k); if (u) URL.revokeObjectURL(u); urls.delete(k); };
async function hydrate(root = document) {
  for (const el of $$('[data-img]', root)) {
    if (el.querySelector(':scope > img')) continue;
    const u = await imgURL(el.dataset.img);
    if (!u || !el.isConnected || el.querySelector(':scope > img')) continue;
    const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = u;
    const g = el.querySelector(':scope > .gen, :scope > .ph-sp');
    if (g) g.replaceWith(im); else el.prepend(im);
  }
}
const imgKeys = (x) => [x.img ? x.id : null, ...Object.entries(x.v || {}).filter(([, d]) => d && d.img).map(([n]) => `${x.id}~${n}`)].filter(Boolean);
const imgKey = (x) => (x.coverVol && x.v[x.coverVol] && x.v[x.coverVol].img ? `${x.id}~${x.coverVol}` : x.img ? x.id : '');
function avgColor(c) {
  const t = document.createElement('canvas'); t.width = t.height = 8; const tx = t.getContext('2d'); tx.drawImage(c, 0, 0, 8, 8);
  const d = tx.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  return '#' + [r, g, b].map((v) => Math.round(v / 64 * 0.85).toString(16).padStart(2, '0')).join('');
}
const toBlob = (c) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej()), 'image/jpeg', 0.84));
function shrink(file) {
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = async () => {
      const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      try { res({ blob: await toBlob(c), color: avgColor(c), ratio: c.width / c.height }); } catch (e) { rej(e); }
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(); };
    im.src = u;
  });
}

/* ===== トリミング ===== */
let crop = null;
const defaultAr = (cat) => (cat === 'anime' ? 1.6 : cat === 'art' ? 1 : 0.6667);
function cropImage(file, ar) {
  return new Promise((resolve) => {
    const u = URL.createObjectURL(file), im = $('#cropImg');
    crop = { file, u, ar, resolve, z: 1, x: 0, y: 0, pts: new Map() };
    $('#cropZ').value = 1;
    $('#dCrop').showModal();
    im.onload = () => { if (crop) cropLayout(true); };
    im.onerror = () => { const c = crop; crop = null; URL.revokeObjectURL(u); $('#dCrop').close(); toast('この写真は読み込めなかった'); c && c.resolve(null); };
    im.src = u;
  });
}
function cropLayout(reset) {
  const box = $('#cropBox'), im = $('#cropImg'), c = crop;
  box.style.setProperty('--ar', c.ar);
  $$('#cropAr button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.ar - c.ar) < 0.01));
  c.W = box.clientWidth; c.H = box.clientHeight; c.nw = im.naturalWidth; c.nh = im.naturalHeight;
  c.base = Math.max(c.W / c.nw, c.H / c.nh);
  im.style.width = c.nw + 'px'; im.style.height = c.nh + 'px';
  if (reset) { c.z = 1; $('#cropZ').value = 1; const s = c.base; c.x = (c.W - c.nw * s) / 2; c.y = (c.H - c.nh * s) / 2; }
  cropApply();
}
function cropApply() {
  const c = crop, s = c.base * c.z;
  c.x = clamp(c.x, c.W - c.nw * s, 0); c.y = clamp(c.y, c.H - c.nh * s, 0);
  $('#cropImg').style.transform = `translate(${c.x}px,${c.y}px) scale(${s})`;
}
function cropZoom(z, cx, cy) {
  const c = crop, s0 = c.base * c.z; z = clamp(z, 1, 4);
  cx = cx ?? c.W / 2; cy = cy ?? c.H / 2;
  const px = (cx - c.x) / s0, py = (cy - c.y) / s0, s1 = c.base * z;
  c.z = z; c.x = cx - px * s1; c.y = cy - py * s1; $('#cropZ').value = z; cropApply();
}
{
  const box = $('#cropBox');
  box.addEventListener('pointerdown', (e) => { if (!crop) return; box.setPointerCapture(e.pointerId); crop.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); crop.d0 = null; });
  box.addEventListener('pointermove', (e) => {
    const c = crop; if (!c || !c.pts.has(e.pointerId)) return;
    const p = c.pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
    c.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (c.pts.size === 1) { c.x += dx; c.y += dy; cropApply(); }
    else if (c.pts.size === 2) {
      const [a, b] = [...c.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = box.getBoundingClientRect();
      if (c.d0) cropZoom(c.z * d / c.d0, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      c.d0 = d;
    }
  });
  const up = (e) => { if (crop) { crop.pts.delete(e.pointerId); crop.d0 = null; } };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  $('#cropZ').addEventListener('input', (e) => crop && cropZoom(+e.target.value));
  $('#dCrop').addEventListener('close', () => { if (crop) { const c = crop; crop = null; URL.revokeObjectURL(c.u); c.resolve(null); } });
}
async function cropFinish(raw) {
  const c = crop; if (!c) return;
  crop = null;
  let out = null;
  try {
    if (raw) out = await shrink(c.file);
    else {
      const s = c.base * c.z, OW = c.ar >= 1 ? 900 : Math.round(900 * c.ar), OH = Math.round(OW / c.ar);
      const cv = document.createElement('canvas'); cv.width = OW; cv.height = OH;
      cv.getContext('2d').drawImage($('#cropImg'), -c.x / s, -c.y / s, c.W / s, c.H / s, 0, 0, OW, OH);
      out = { blob: await toBlob(cv), color: avgColor(cv), ratio: OW / OH };
    }
  } catch (e) { toast('この写真は使えなかった'); }
  URL.revokeObjectURL(c.u);
  $('#dCrop').close();
  c.resolve(out);
}

/* ===== 小物 ===== */
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; };
const colOf = (x) => x.color || PALETTE[hash(x.title + x.id) % 10];
function fgOf(hex) { const n = parseInt(String(hex).slice(1), 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? '#1d2433' : '#f7f6f2'; }
const fill = (r, i) => clamp((r - (i - 1)) * 100, 0, 100);
function starsHTML(r) {
  let h = `<span class="stars" aria-label="評価 ${r || 0}">`;
  for (let i = 1; i <= 5; i++) h += `<span class="st" style="--f:${fill(r || 0, i)}%"><i></i></span>`;
  return h + '</span>';
}
const owned = (x, i) => !!(x.v[i] && x.v[i].o);
const ownN = (x) => { let n = 0; for (let i = 1; i <= x.vols; i++) if (owned(x, i)) n++; return n; };
const missing = (x) => { const m = []; for (let i = 1; i <= x.vols; i++) if (!owned(x, i)) m.push(i); return m; };
const volRates = (x) => Object.entries(x.v).filter(([k, d]) => d && d.r > 0 && (!x.vols || +k <= x.vols)).map(([, d]) => d.r);
const volAvg = (x) => { const a = volRates(x); return a.length ? Math.round(a.reduce((s, r) => s + r, 0) / a.length * 10) / 10 : 0; };
/* 表に出す評価：シリーズは巻ごとの平均（自分で決めたらそっち） */
function rt(x) { if (x.series && !x.rateFix) { const a = volAvg(x); if (a) return a; } return x.rating || 0; }
function frac(x) {
  if (x.series && x.vols) return Math.min(1, x.cur / x.vols);
  if (x.cat === 'book' && x.pages) return Math.min(1, (x.page || 0) / x.pages);
  if (x.cat === 'game' && x.pct !== '' && x.pct != null && !x.series) return Math.min(1, x.pct / 100);
  return null;
}
const progBar = (x) => { const f = frac(x); return f != null && (f > 0 || x.series) ? `<span class="prog"><i style="width:${(f * 100).toFixed(1)}%"></i></span>` : ''; };
function progText(x) {
  const u = CATS[x.cat].vol;
  if (x.series && x.vols) return `${x.cur}/${x.vols}${u}`;
  if (x.cat === 'book' && x.pages) return `${x.page || 0}/${x.pages}ページ`;
  if (x.cat === 'game' && x.pct !== '' && x.pct != null && !x.series) return `クリア率${x.pct}%`;
  return '';
}
function dustDays(x) { return (Date.now() - (x.touched || x.updated)) / 864e5; }
function dustLv(x) { if (!S.set.dust || x.status !== 'doing' || x.want) return 0; const d = dustDays(x); return d > 240 ? 3 : d > 120 ? 2 : d > 45 ? 1 : 0; }
const dustHTML = (x) => { const l = dustLv(x); return l ? `<i class="dust dust${l}"></i>` : ''; };

/* 写真がないときの表紙（部屋ごとの装丁） */
function genHTML(x, vn) {
  const c = colOf(x), fg = fgOf(c), t = esc(x.title), cr = esc(x.creator || '');
  const n = vn || (x.series ? x.coverVol || 1 : 0), L = [...String(x.title)].length;
  /* タイトルの長さで文字の大きさを決める（長いときは2列・2行に） */
  const fit = (max, room, min) => { let f = room / L; if (f < min * 1.4) f = room * 2 / L; return clamp(f, min, max).toFixed(1) + 'cqw'; };
  switch (x.cat) {
    case 'manga': return `<div class="gen g-manga" style="--col:${c}">${cr ? `<small style="color:${fg}">${cr}</small>` : ''}<b style="font-size:${fit(17, 98, 8)}">${t}</b>${n ? `<i>${n}</i>` : ''}</div>`;
    case 'book': return `<div class="gen g-book" style="--col:${c}"><b style="font-size:${fit(12.5, 70, 7)}">${t}</b>${cr ? `<small>${cr}</small>` : ''}<i></i></div>`;
    case 'movie': return `<div class="gen g-movie" style="--col:${c}">${x.year ? `<em>${esc(x.year)}</em>` : ''}${cr ? `<small>監督 ${cr}</small>` : ''}<b style="font-size:${fit(13, 80, 8)}">${t}</b><i></i></div>`;
    case 'anime': return `<div class="gen g-anime" style="--col:${c}"><em>${esc(vn || x.coverVol ? CATS.anime.volN(vn || x.coverVol) : x.season || 'TV')}</em><b style="font-size:${fit(10.5, 76, 7)}">${t}</b></div>`;
    case 'game': return `<div class="gen g-game" style="--col:${c};--fg:${fg};--pc:${pfColor(x.platform)}"><em>${esc(x.platform || 'GAME')}</em><b style="font-size:${fit(12, 74, 8)}">${t}</b><i></i>${cr ? `<small>${cr}</small>` : ''}</div>`;
    default: {
      const h = hash(x.id + x.title), bg = ['#efe9dc', '#e9e5db', '#f1ece2', '#e4e7e9', '#ece4dc'][h % 5], p = (k) => PALETTE[(h >>> k) % 8];
      const sh = [0, 1, 2].map((k) => { const q = h >>> (k * 5); return `<i style="left:${q % 55}%;top:${(q >> 3) % 60}%;width:${28 + q % 45}%;height:${22 + (q >> 2) % 50}%;background:${k === 0 ? c : p(k * 3)};--rr:${q % 3 === 0 ? '50%' : q % 3 === 1 ? '0' : '50% 0'};opacity:${k === 2 ? .85 : 1}"></i>`; }).join('');
      return `<div class="gen g-art" style="--bg0:${bg}">${sh}<b>${t}</b></div>`;
    }
  }
}
function phHTML(x, o = {}) {
  const k = imgKey(x);
  return `<div class="ph"${k ? ` data-img="${esc(k)}"` : ''}>${genHTML(x)}${o.prog === false ? '' : progBar(x)}${o.dust ? dustHTML(x) : ''}</div>`;
}
const meta = (x) => [x.creator, x.cat === 'game' ? x.platform : '', x.season, x.year].filter(Boolean).join('　');
/* 日付：'2015' / '2015-05' / '2015-05-03' / '' */
function fmtWhen(d) {
  if (!d) return '時期不明';
  const [y, m, dd] = d.split('-');
  return dd ? `${+y}/${+m}/${+dd}` : m ? `${+y}年${+m}月` : `${+y}年`;
}
function whenT(d) { return !d ? 0 : new Date(d.length === 4 ? d + '-01-01T12:00' : d.length === 7 ? d + '-01T12:00' : d + 'T12:00').getTime(); }
/* 範囲の文字（1-5, 7）⇔ 番号の集まり */
function parseRanges(s, max) {
  const out = new Set();
  for (const part of z2h(s).split(/[,、，\s]+/)) {
    const m = part.match(/^(\d+)(?:[-~〜ー－](\d+))?$/); if (!m) continue;
    let a = +m[1], b = m[2] ? +m[2] : a; if (a > b) [a, b] = [b, a];
    for (let i = Math.max(1, a); i <= Math.min(b, max || 2000, 2000); i++) out.add(i);
  }
  return out;
}
function rangeText(nums) {
  const a = [...nums].sort((p, q) => p - q), r = [];
  for (let i = 0; i < a.length; i++) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; r.push(j > i ? `${a[i]}-${a[j]}` : `${a[i]}`); i = j; }
  return r.join(', ');
}
const shortList = (a, u) => (a.length > 5 ? `${a.slice(0, 5).join('・')}${u} ほか${a.length - 5}` : `${a.join('・')}${u}`);

/* 履歴（同じ日の同じ種類はまとめる） */
function logEv(x, k, v) {
  x.log = x.log || [];
  const d = new Date().toDateString(), last = x.log[x.log.length - 1];
  if (last && last.k === k && new Date(last.t).toDateString() === d && k !== 'add' && k !== 'vr' && k !== 'buy') { last.v = v; last.t = Date.now(); }
  else x.log.push({ t: Date.now(), k, v });
  if (x.log.length > 150) x.log = x.log.slice(-150);
}
function logText(x, e) {
  const C = CATS[x.cat], u = C.vol;
  switch (e.k) {
    case 'add': return '追加した';
    case 'st': return e.v === 'doing' ? C.start : `「${stLabel(x.cat, e.v)}」にした`;
    case 'rate': return e.v ? `★${e.v}をつけた` : '評価を消した';
    case 'cur': return `${e.v}${u}まで${C.did}`;
    case 'own': return `${e.v}${u}まで持ってる`;
    case 'buy': return `${C.volN(e.v)}を買った`;
    case 'vr': return `${C.volN(e.v[0])}に★${e.v[1]}`;
    case 'vols': return `${C.volN(e.v)}が出た`;
    case 'page': return `${e.v}ページまで読んだ`;
    case 'pct': return `クリア率${e.v}%`;
    case 'round': return `${e.v}回目を始めた`;
    case 'sh': return `棚「${e.v}」に入れた`;
    case 'dust': return 'ほこりを払った';
    default: return '';
  }
}
const shelvesOf = (cat) => (S.shelves || []).filter((h) => h.cat === cat);
const itemsOf = (cat) => S.items.filter((x) => x.cat === cat);
const findItem = (id) => S.items.find((i) => i.id === id);

/* ===== お金 ===== */
function spends(x) {
  const o = [];
  if (x.price) o.push([x.pt || x.created, x.price]);
  for (const d of Object.values(x.v)) if (d && d.p) o.push([d.pt || x.created, d.p]);
  return o;
}
const spentIn = (list, y) => list.reduce((s, x) => s + spends(x).filter(([t]) => new Date(t).getFullYear() === y).reduce((a, [, p]) => a + p, 0), 0);
const spentAll = (x) => spends(x).reduce((a, [, p]) => a + p, 0);

/* ===== ティア ===== */
function inTier(list, t) {
  const ok = (x) => x.tk === t && typeof x.tord === 'number';
  return list.filter(ok).sort((a, b) => a.tord - b.tord).concat(list.filter((x) => !ok(x)).sort((a, b) => rt(b) - rt(a) || b.updated - a.updated));
}
const tierItems = (list, t) => inTier(list.filter((x) => tierOf(rt(x)) === t), t);
function rankSort(a) {
  const rated = a.filter((x) => rt(x) > 0);
  return TIERS.flatMap(([t]) => tierItems(rated, t)).concat(a.filter((x) => !(rt(x) > 0)).sort((p, q) => q.updated - p.updated));
}

/* ===== 絞り込み ===== */
const titleKey = (x) => norm(x.yomi || x.title);
function visible() {
  const q = norm(ui.q);
  let a = itemsOf(S.cat);
  if (ui.filter === 'want') a = a.filter((x) => x.want);
  else if (ui.filter === 'later') a = a.filter((x) => x.later);
  else if (ui.filter.startsWith('sh:')) a = a.filter((x) => x.sh.includes(ui.filter.slice(3)));
  else if (ui.filter !== 'all') a = a.filter((x) => x.status === ui.filter);
  if (ui.tag) a = a.filter((x) => x.tags.includes(ui.tag));
  if (q) a = a.filter((x) => norm([x.title, x.yomi, x.creator, x.memo, x.place, x.platform, x.app, x.where, x.theater, x.season, ...x.tags].join(' ')).includes(q));
  const by = {
    new: (x, y) => y.created - x.created,
    upd: (x, y) => y.updated - x.updated,
    title: (x, y) => coll.compare(titleKey(x), titleKey(y)),
    creator: (x, y) => (!x.creator - !y.creator) || coll.compare(norm(x.creator), norm(y.creator)) || coll.compare(titleKey(x), titleKey(y)),
  };
  return S.sort === 'rate' ? rankSort(a) : a.sort(by[S.sort] || by.new);
}

/* ===== 時間で変わる明かり ===== */
function applyNight() {
  const h = new Date().getHours(), on = !!S.set.tod && (h >= 19 || h < 6);
  document.body.classList.toggle('night', on);
  $('meta[name="theme-color"]').content = getComputedStyle(document.body).getPropertyValue('--room').trim() || CATS[S.cat].room;
}

/* ===== 描画 ===== */
let lastCat = null;
function render(anim = false) {
  const C = CATS[S.cat], changed = lastCat !== S.cat;
  document.body.dataset.cat = S.cat;
  applyNight();
  if (changed) {
    const g = $('#giant');
    for (const old of $$('span', g)) { if (old.classList.contains('out')) { old.remove(); continue; } old.classList.add('out'); setTimeout(() => old.remove(), 450); }
    const sp = document.createElement('span'); sp.textContent = C.name; g.append(sp); g.style.setProperty('--gl', [...C.name].length);
    $('#roomName').innerHTML = `<span>${C.name}</span>`;
    $('#sort').innerHTML = [['new', '追加順'], ['upd', '更新順'], ['rate', '評価順'], ['title', 'タイトル順'], ['creator', `${C.creator}順`]].map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  }
  $$('#dock .dk').forEach((b, i) => { const on = b.dataset.cat === S.cat; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); if (on) $('#dock .ind').style.transform = `translateX(${i * 100}%)`; });
  const all = itemsOf(S.cat), done = all.filter((x) => x.status === 'done').length, rated = all.filter((x) => rt(x) > 0);
  const avg = rated.length ? rated.reduce((a, x) => a + rt(x), 0) / rated.length : 0;
  $('#stat').innerHTML = `<span><b class="num" data-cnt="${all.length}">${all.length}</b>${C.unit}</span><span>${stLabel(S.cat, 'done')}<b class="num" data-cnt="${done}">${done}</b></span><span>平均<b class="num" data-cnt="${avg.toFixed(1)}" data-dec="1">${rated.length ? avg.toFixed(1) : '—'}</b></span>` +
    (S.set.money ? `<span>今年<b class="num">${yen(spentIn(all, new Date().getFullYear()))}</b></span>` : '');
  if (changed && !reduced) countUp();
  drawBkHint();
  const n = (f) => all.filter(f).length;
  if (ui.filter.startsWith('sh:') && !shelvesOf(S.cat).some((h) => 'sh:' + h.id === ui.filter)) ui.filter = 'all';
  const chips = [['all', 'すべて', all.length], ...C.st.map(([k, l]) => [k, l, n((x) => x.status === k)]), ['want', 'ほしい', n((x) => x.want)], ['later', C.later, n((x) => x.later)]];
  $('#chips').innerHTML = `<button class="chip nx${ui.filter === 'next' ? ' on' : ''}" data-filter="next">つぎ<small>${nextCount()}</small></button>` +
    chips.map(([k, l, c]) => `<button class="chip${ui.filter === k ? ' on' : ''}" data-filter="${k}">${l}<small>${c}</small></button>`).join('') +
    shelvesOf(S.cat).map((h) => `<button class="chip shf${ui.filter === 'sh:' + h.id ? ' on' : ''}" data-filter="sh:${esc(h.id)}">${esc(h.name)}<small>${n((x) => x.sh.includes(h.id))}</small></button>`).join('') +
    `<button class="chip shf" data-act="newshelf">＋ 棚をつくる</button>`;
  /* タグごとの数 */
  const tc = new Map(); for (const x of all) for (const t of x.tags) tc.set(t, (tc.get(t) || 0) + 1);
  if (ui.tag && !tc.has(ui.tag)) ui.tag = '';
  const tags = [...tc].sort((a, b) => b[1] - a[1] || coll.compare(a[0], b[0]));
  $('#tagchips').hidden = !tags.length;
  $('#tagchips').innerHTML = tags.map(([t, c]) => `<button class="chip${ui.tag === t ? ' on' : ''}" data-tagf="${esc(t)}">#${esc(t)}<small>${c}</small></button>`).join('');
  const view = S.view[S.cat];
  $$('#views button').forEach((b, i) => { const on = b.dataset.view === view; b.classList.toggle('on', on); if (on) $('#views .vi').style.transform = `translateX(${i * 36}px)`; });
  $('#sort').value = S.sort;
  lastCat = S.cat;
  drawList(anim || changed);
}
function drawBkHint() {
  const b = $('#bkhint');
  if (!S.items.length) { b.hidden = true; return; }
  b.hidden = false;
  if (!S.lastBackup) { b.textContent = 'バックアップはまだ'; return; }
  const d = Math.floor((Date.now() - S.lastBackup) / 864e5);
  b.textContent = d < 1 ? '今日バックアップした' : `最後のバックアップから${d}日`;
}
function countUp() {
  for (const el of $$('#stat [data-cnt]')) {
    const to = +el.dataset.cnt, dc = +(el.dataset.dec || 0); if (!to) continue;
    const t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(dc); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
}
function spineHTML(x, i) {
  const c = colOf(x), r = rt(x), gm = x.cat === 'game';
  /* 高さ＝評価、厚み＝巻数・ページ数 */
  const h = gm ? 176 + Math.round(r * 3) : Math.round(150 + (r ? r * 8 : 6));
  const nn = [...x.title].length;
  let w = 30;
  if (x.series) w = 28 + Math.min(x.vols || 1, 40) * 0.8;
  else if (x.cat === 'book' && x.pages) w = 22 + Math.min(x.pages, 900) / 36;
  if (!x.series && nn > 9) w = Math.max(w, 36);
  if (gm) w = Math.max(w, 34);
  w = Math.round(w);
  const avail = h - (gm ? 22 : 16) - 26;
  let fs = Math.min(13.5, avail / (nn * 1.1)), two = false;
  if (fs < 10 && w >= 32) { const f2 = Math.min(12, avail * 2 / (nn * 1.16), (w - 8) / 2.4); if (f2 > fs && f2 >= 9) { fs = f2; two = true; } }
  fs = Math.max(9, fs);
  const gold = r >= 4.75 && !x.want;
  const dk = x.want ? '' : gold ? 'foil' : x.cat === 'manga' ? ['', 'obi', 'rule'][hash(x.id) % 3] : x.cat === 'book' ? ['rule', '', 'obi'][hash(x.id) % 3] : '';
  const vb = x.series && x.vols ? `${x.cur}/${x.vols}` : x.cat === 'book' && x.pages && x.page && x.status === 'doing' ? `${Math.round(x.page / x.pages * 100)}%` : gm && !x.series && x.pct && x.status === 'doing' ? `${x.pct}%` : r ? '★' + r : '';
  return `<div class="sw"><button class="spine vt${gm ? ' game' : ''}${x.want ? ' want' : ''}${gold ? ' gold' : ''}" data-id="${esc(x.id)}" style="--w:${w}px;--h:${h}px;--col:${c};--fg:${fgOf(c)};--i:${Math.min(i, 30)};--fs:${fs.toFixed(1)}px${gm ? `;--pc:${pfColor(x.platform)}` : ''}" aria-label="${esc(x.title)}">${gm && !x.want ? '<i class="pf"></i>' : ''}${dk ? `<i class="dc d-${dk}"></i>` : ''}${x.status === 'doing' ? '<i class="rib"></i>' : ''}<span${two ? ' class="two"' : ''}>${esc(x.title)}</span>${vb ? `<em class="vb">${esc(vb)}</em>` : ''}${dustHTML(x)}</button></div>`;
}
function drawList(anim = false) {
  const C = CATS[S.cat], view = S.view[S.cat], el = $('#list');
  el.classList.toggle('anim', !!anim && !reduced);
  if (ui.filter === 'next') return drawNext();
  let a = visible();
  const shb = ui.filter.startsWith('sh:') ? shelvesOf(S.cat).find((h) => 'sh:' + h.id === ui.filter) : null;
  const shHead = shb ? `<div class="shbar"><b>${esc(shb.name)}</b><span>${a.length}${C.unit}</span><button class="pick" data-act="pick">＋ 作品を選んで入れる</button><button class="lnk" data-act="shren">名前を変える</button><button class="lnk" data-act="shdel">この棚を消す</button></div>` : '';
  if (view === 'rank') { drawRank(el, a, shHead); return; }
  if (!a.length) {
    const none = !itemsOf(S.cat).length;
    el.innerHTML = shHead + `<div class="empty"><b>${none ? `${C.name}の部屋はまだ空っぽ` : shb ? 'この棚はまだ空っぽ' : '当てはまるものがない'}</b>${none ? '右下の＋から、気になるものを置いていこう。' : shb ? '上の「作品を選んで入れる」から、登録済みの作品を入れられる。' : '絞り込みや検索を変えてみて。'}</div>`;
    return;
  }
  const I = (i) => Math.min(i, 30);
  if (view === 'shelf' && C.shelf === 'spine') {
    el.innerHTML = `<div class="shelf">${a.map(spineHTML).join('')}</div><p class="shnote">背の高さ＝評価　厚み＝${S.cat === 'book' ? '巻数・ページ数' : S.cat === 'game' ? 'シリーズの作品数' : '巻数'}　金の文字＝★5</p>`;
  } else if (view === 'shelf' && C.shelf === 'ticket') {
    el.innerHTML = `<div class="tickets">${a.map((x, i) => { const r = rt(x); return `<button class="tk${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--col:${colOf(x)};--i:${I(i)}"><div class="l"><div class="t">${esc(x.title)}</div><div class="m">${esc(meta(x)) || '&nbsp;'}</div><div class="m">${esc(stLabel(x.cat, x.status))}${x.series && x.vols ? '　' + progText(x) : ''}${x.later ? '　' + C.later : ''}</div>${x.theater ? `<div class="m">${esc(x.theater)}${x.seat ? '　' + esc(x.seat) : ''}</div>` : ''}${x.fmt.length ? `<div class="fm">${x.fmt.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}</div><div class="r">${r ? `<b class="num">${r}</b>${starsHTML(r)}` : '<small>評価<br>まだ</small>'}${x.date ? `<small class="num">${esc(fmtWhen(x.date))}</small>` : ''}</div></button>`; }).join('')}</div>`;
  } else if (view === 'shelf' && C.shelf === 'screen') {
    el.innerHTML = `<div class="screens">${a.map((x, i) => { const r = rt(x); return `<button class="sc${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--i:${I(i)}"><div class="tv vt">${phHTML(x, { prog: false, dust: true })}${x.series && x.vols ? `<span class="ep">${x.cur}/${x.vols}話<i style="--p:${(frac(x) * 100).toFixed(0)}%"></i></span>` : ''}</div><b>${esc(x.title)}</b><small>${r ? '★' + r + '　' : ''}${esc(stLabel(x.cat, x.status))}${x.app ? '　' + esc(x.app) : ''}</small></button>`; }).join('')}</div>`;
  } else if (view === 'shelf') {
    el.innerHTML = `<div class="gallery">${a.map((x, i) => { const k = imgKey(x), r = rt(x); return `<button class="fr${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--i:${I(i)}"><span class="wire"></span><div class="fm vt"${k ? ` data-img="${esc(k)}"` : ''}>${k ? `<div class="ph-sp" style="aspect-ratio:${x.ratio || 0.8};background:var(--field)"></div>` : `<div style="aspect-ratio:${0.7 + hash(x.id) % 6 / 10}">${genHTML(x)}</div>`}</div><div class="pl"><b>${esc(x.title)}</b><small>${esc(meta(x))}</small>${x.place ? `<small>${esc(x.place)}</small>` : ''}${r ? starsHTML(r) : ''}</div></button>`; }).join('')}</div>`;
  } else if (view === 'cover') {
    const kind = C.side ? '' : S.cat === 'art' ? ' artc' : S.cat === 'anime' ? ' wide' : ' poster';
    el.innerHTML = `<div class="covers${S.cat === 'anime' ? ' wide' : ''}">${a.map((x, i) => { const r = rt(x); return `<button class="cv${kind}${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--i:${I(i)};--col:${colOf(x)}"><div class="bk vt${C.side === 'right' ? '' : ' r'}"><div class="fc">${phHTML(x, { dust: true })}</div><span class="ed"></span></div><b>${esc(x.title)}</b><small>${r ? starsHTML(r) : esc(stLabel(x.cat, x.status))}</small></button>`; }).join('')}</div>`;
  } else {
    el.innerHTML = `<ul class="rows">${a.map((x, i) => { const r = rt(x), p = progText(x); return `<li><button class="row" data-id="${esc(x.id)}" style="--i:${I(i)}"><span class="th vt">${phHTML(x)}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(meta(x)) || '　'}</small><span class="pill${x.status === 'doing' ? ' doing' : ''}">${esc(stLabel(x.cat, x.status))}${p ? '　' + p : ''}</span>${x.round > 1 ? `<span class="pill">${x.round}回目</span>` : ''}${x.hours ? `<span class="pill">${x.hours}時間</span>` : ''}${x.want ? '<span class="pill">ほしい</span>' : ''}${x.later ? `<span class="pill">${C.later}</span>` : ''}</span><span class="rt">${r ? `<b class="num">${r}</b><br>${starsHTML(r)}` : '<small>—</small>'}</span></button></li>`; }).join('')}</ul>`;
  }
  if (shHead) el.insertAdjacentHTML('afterbegin', shHead);
  hydrate(el);
}

/* ===== ティア表・期待との差 ===== */
function drawRank(el, a, shHead) {
  const C = CATS[S.cat];
  const tabs = `<div class="rtabs"><button class="${ui.rtab === 'tier' ? 'on' : ''}" data-rtab="tier">ティア表</button><button class="${ui.rtab === 'exp' ? 'on' : ''}" data-rtab="exp">期待との差</button></div>`;
  if (ui.rtab === 'exp') {
    const b = a.filter((x) => x.exp > 0 && rt(x) > 0).map((x) => ({ x, d: Math.round((rt(x) - x.exp) * 10) / 10 }));
    const waiting = a.filter((x) => x.exp > 0 && !(rt(x) > 0)).length;
    if (!b.length) { el.innerHTML = shHead + tabs + `<div class="empty"><b>まだ比べられる作品がない</b>追加するときに「期待度」を入れておいて、あとで評価をつけると、ここに差が出る。${waiting ? `<br>（期待度だけ入ってる作品：${waiting}）` : ''}</div>`; return; }
    const grp = [['期待以上だった', b.filter((q) => q.d > 0).sort((p, q) => q.d - p.d)], ['期待どおり', b.filter((q) => q.d === 0)], ['期待ほどじゃなかった', b.filter((q) => q.d < 0).sort((p, q) => p.d - q.d)]];
    let i = 0;
    el.innerHTML = shHead + tabs + `<ul class="diff">${grp.filter((g) => g[1].length).map(([t, l]) => `<h3>${t}</h3>${l.map(({ x, d }) => `<li style="--i:${Math.min(i++, 30)}"><button data-id="${esc(x.id)}"><span class="th vt">${phHTML(x, { prog: false })}</span><span class="tx"><b>${esc(x.title)}</b><small>期待 ★${x.exp} → 実際 ★${rt(x)}</small></span><span class="dv num${d > 0 ? ' up' : ''}">${d > 0 ? '+' : ''}${d || '±0'}</span></button></li>`).join('')}`).join('')}</ul>` +
      (waiting ? `<p class="shnote">期待度だけ入ってて、まだ評価してない：${waiting}${C.unit}</p>` : '');
    hydrate(el); return;
  }
  const rated = a.filter((x) => rt(x) > 0), un = a.length - rated.length;
  if (!rated.length) { el.innerHTML = shHead + tabs + `<div class="empty"><b>まだ星をつけたものがない</b>作品を開いて星をつけると、ここにティア表ができる。</div>`; return; }
  el.innerHTML = shHead + tabs + `<div class="tiers">${TIERS.map(([t, , lab], ti) => {
    const l = tierItems(rated, t);
    return `<div class="tier t-${t}${l.length ? '' : ' empty-t'}" style="--i:${ti}"><button class="tlab" data-tier="${t}" aria-label="${t}の並び順"><b>${t}</b><small>${lab}</small>${l.length > 1 ? '<span class="ord">並べる</span>' : ''}</button><div class="ti">${l.length ? l.map((x, j) => `<button data-id="${esc(x.id)}" aria-label="${esc(x.title)}"><span class="th vt">${phHTML(x, { prog: false })}</span>${l.length > 1 ? `<span class="rk">${j + 1}</span>` : ''}</button>`).join('') : '—'}</div></div>`;
  }).join('')}</div><p class="shnote">左ほど上。段の名前を押すと、段の中の順番を決められる。${un ? `<br>星がまだの作品（${un}）は入らない。` : ''}</p>`;
  hydrate(el);
}

/* ===== つぎのリスト ===== */
const dayDiff = (d) => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const canRead = (x) => x.cur < x.vols && (!x.ownOn || owned(x, x.cur + 1));
function nextGroups(cat) {
  const C = CATS[cat], a = itemsOf(cat), used = new Set(), g = [];
  const upd = (x, y) => y.updated - x.updated;
  const take = (title, sub, list, kind) => { const l = list.filter((x) => !used.has(x.id)); l.forEach((x) => used.add(x.id)); if (l.length) g.push({ title, sub, list: l, kind }); };
  if (cat === 'art') {
    const up = (x) => (x.until ? dayDiff(x.until) : 9999);
    take('見に行きたい', '会期が近い順', a.filter((x) => x.later && x.status !== 'done' && (!x.until || up(x) >= 0)).sort((x, y) => up(x) - up(y)), 'art');
    take('ほしい', '画集やグッズなど', a.filter((x) => x.want), 'want');
    return g;
  }
  const ser = a.filter((x) => x.series && x.vols && x.status !== 'pause');
  if (C.own) take('次に買う', '持ってない巻', ser.filter((x) => x.ownOn && missing(x).length).sort(upd), 'buy');
  take(cat === 'manga' || cat === 'book' ? '続きを読む' : cat === 'anime' ? '続きを観る' : 'シリーズの続き', '', ser.filter((x) => canRead(x) && !x.want && !(x.status === 'done' && x.done)).sort(upd), 'cont');
  take(cat === 'game' ? 'プレイ中' : '途中', '', a.filter((x) => x.status === 'doing' && !x.series).sort(upd), 'doing');
  take(C.later, '', a.filter((x) => x.later && x.status !== 'done'), 'later');
  take('ほしい', '', a.filter((x) => x.want), 'want');
  return g;
}
const nextCount = () => nextGroups(S.cat).reduce((s, g) => s + g.list.length, 0);
function drawNext() {
  const C = CATS[S.cat], el = $('#list'), gs = nextGroups(S.cat), u = C.vol;
  if (!gs.length) { el.innerHTML = `<div class="empty"><b>つぎにやることは、今はない</b>${S.cat === 'art' ? '作品に「見に行きたい」を付けて会期を入れると、締め切りが近い順にここに並ぶ。' : `シリーズの${u}数や「ほしい」「${C.later}」を付けると、ここにまとまる。`}</div>`; return; }
  let i = 0;
  el.innerHTML = gs.map((g) => `<section class="ngrp"><h3>${esc(g.title)}${g.sub ? `<small>${esc(g.sub)}</small>` : ''}</h3>${g.list.map((x) => {
    let line = '', act = '', due = '';
    if (g.kind === 'buy') { const m = missing(x); line = `<em>${shortList(m, u)}</em>（${C.ser.have}${x.vols}${u}）`; act = `<button class="go" data-nx="buy" data-nid="${esc(x.id)}">${m[0]}${u}買った</button>`; }
    else if (g.kind === 'cont') { line = `次は <em>${C.volN(x.cur + 1)}</em>（${x.cur}/${x.vols}${u}）`; act = `<button class="go" data-nx="cur" data-nid="${esc(x.id)}">${C.act}</button>`; }
    else if (g.kind === 'art') {
      line = esc([x.creator, x.place].filter(Boolean).join('　')) || '　';
      if (x.until) { const d = dayDiff(x.until); due = `<span class="due${d <= 14 ? ' soon' : ''}">${d === 0 ? '今日' : d}<small>${d === 0 ? 'まで' : '日後まで'}<br>${x.until.slice(5).replace('-', '/')}</small></span>`; }
    } else if (g.kind === 'doing') line = esc(progText(x) || meta(x) || stLabel(x.cat, x.status)) + (dustLv(x) ? '　<em>ほこりをかぶってる</em>' : '');
    else line = esc(meta(x)) || esc(stLabel(x.cat, x.status));
    return `<div class="nrow" style="--i:${Math.min(i++, 30)}"><button class="open" data-oid="${esc(x.id)}"><span class="th">${phHTML(x)}</span><span class="tx"><b>${esc(x.title)}</b><small>${line}</small></span></button>${act}${due}</div>`;
  }).join('')}</section>`).join('');
  hydrate(el);
}

/* ===== 詳細ページ ===== */
let curId = null;
const curItem = () => (curId && !$('#page').hidden ? findItem(curId) : null);
function heroHTML(x) {
  const C = CATS[x.cat], k = imgKey(x);
  if (x.cat === 'art') return `<div class="hero art"><div class="frm" id="pageHero">${k ? `<div class="ph" data-img="${esc(k)}"><div class="ph-sp" style="aspect-ratio:${x.ratio || 0.8}"></div></div>` : `<div style="aspect-ratio:.8">${genHTML(x)}</div>`}</div></div>`;
  if (x.cat === 'anime') return `<div class="hero"><div class="tvh" id="pageHero">${phHTML(x, { prog: false })}</div></div>`;
  return `<div class="hero"><div class="bk${C.side === 'right' ? '' : ' r'}${x.cat === 'movie' ? ' flat' : ''}" id="pageHero" style="--col:${colOf(x)}"><div class="fc">${phHTML(x, { prog: false })}</div><span class="ed"></span></div></div>`;
}
function haveHTML(x) {
  const r = [];
  if (x.cat === 'game' && x.platform) r.push(['機種', esc(x.platform)]);
  if (x.media) r.push(['持ち方', esc(x.media)]);
  if (x.app) r.push([x.media === '配信' ? '配信サービス' : 'アプリ', esc(x.app)]);
  if (x.where) r.push(['置き場所', esc(x.where)]);
  if (x.theater) r.push(['劇場', esc(x.theater) + (x.seat ? `　座席 ${esc(x.seat)}` : '')]);
  else if (x.seat) r.push(['座席', esc(x.seat)]);
  if (x.fmt.length) r.push(['形式', x.fmt.map(esc).join('・')]);
  if (S.set.money && spentAll(x)) r.push(['使ったお金', `<span class="num">${yen(spentAll(x))}</span>`]);
  return r.length ? `<div class="sec"><h4>持ち方・置き場所</h4><dl class="meta">${r.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>` : '';
}
function renderPage(x) {
  const C = CATS[x.cat], art = x.cat === 'art';
  const prog = (x.cat === 'book' && !x.series) || x.cat === 'game';
  const dl = dustLv(x);
  $('#page').innerHTML = `
    <div class="pbar"><button class="ib" data-act="back" aria-label="戻る"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3.5 5.5 9l5.5 5.5"/></svg></button><button class="btn sm" data-act="edit">編集</button></div>
    <div class="pwrap">
      ${heroHTML(x)}
      <h2 class="ptitle">${esc(x.title)}${x.round > 1 ? `<span class="roundb">${x.round}回目</span>` : ''}</h2>${x.yomi ? `<p class="pyomi">${esc(x.yomi)}</p>` : ''}<p class="psub">${esc(meta(x))}</p>
      <div class="flags" id="pFlags"></div>
      ${dl ? `<div class="sec"><div class="box dustnote"><span>ほこりをかぶってる…<small>最後に触ってから${Math.floor(dustDays(x))}日</small></span><button class="btn sm" data-act="dust">ふっと払う</button></div></div>` : ''}
      <div class="sec"><h4>状態</h4><div class="seg" id="pSt"></div><div id="pRounds"></div></div>
      <div class="sec"><h4>評価（同じ星をもう一度押すと半分）</h4><div class="rate" id="pRate"></div><div id="pAvg"></div></div>
      ${x.series && !art ? `<div class="sec"><h4>シリーズ</h4><div class="box" id="pVols"></div></div>` : ''}
      ${prog ? `<div class="sec"><h4>進み具合</h4><div class="box" id="pProg"></div></div>` : ''}
      ${x.review ? `<div class="sec"><h4>感想</h4><div class="box"><p class="txt">${esc(x.review)}</p></div></div>` : ''}
      ${x.memo ? `<div class="sec"><h4>メモ</h4><div class="box"><p class="txt" style="font-family:var(--gothic);font-size:14.5px">${esc(x.memo)}</p></div></div>` : ''}
      ${x.series ? '<div id="pVnotes"></div>' : ''}
      ${x.tags.length ? `<div class="sec"><div class="tags">${x.tags.map((t) => `<button data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div></div>` : ''}
      ${haveHTML(x)}
      <div class="sec"><h4>棚</h4><div class="shchips" id="pSh"></div></div>
      <div class="sec"><dl class="meta">${x.place ? `<dt>見た場所</dt><dd>${esc(x.place)}</dd>` : ''}${x.until ? `<dt>会期</dt><dd class="num">${esc(x.until)}まで</dd>` : ''}${x.status === 'done' || x.date ? `<dt>${art ? '見た時期' : x.cat === 'game' ? 'クリアした時期' : x.cat === 'movie' ? '観た時期' : x.cat === 'anime' ? '観終えた時期' : '読み終えた時期'}</dt><dd class="num">${esc(fmtWhen(x.date))}</dd>` : ''}<dt>登録</dt><dd class="num">${new Date(x.created).toLocaleDateString('ja-JP')}</dd></dl></div>
      ${!x.review ? `<p class="hint" style="margin-top:16px">感想やメモ、写真、置き場所は「編集」から。</p>` : ''}
      <details class="tl" id="pTl"></details>
    </div>`;
  drawFlags(x); drawSt(x); drawRate(x); if (x.series && !art) { drawVols(x); drawVnotes(x); } if (prog) drawProg(x); drawRounds(x); drawShelves(x); drawTl(x);
  hydrate($('#page'));
}
const drawFlags = (x) => { $('#pFlags').innerHTML = `<button class="flag${x.want ? ' on' : ''}" data-flag="want">ほしい</button><button class="flag${x.later ? ' on' : ''}" data-flag="later">${CATS[x.cat].later}</button>`; };
const drawSt = (x) => { $('#pSt').innerHTML = CATS[x.cat].st.map(([k, l]) => `<button data-st="${k}" class="${x.status === k ? 'on' : ''}">${l}</button>`).join(''); };
function drawRounds(x) {
  const C = CATS[x.cat], past = x.rounds.slice().reverse();
  $('#pRounds').innerHTML = (past.length ? `<ul class="rounds">${past.map((r) => `<li><span>${r.n}回目</span><span class="num">${esc(fmtWhen(r.date))}　${r.rating ? '★' + r.rating : '評価なし'}${r.theater ? '　' + esc(r.theater) : ''}</span></li>`).join('')}</ul>` : '') +
    `<button class="again" data-act="again">もう一度${C.verb}（${x.round + 1}回目を始める）</button>`;
}
function drawShelves(x) {
  $('#pSh').innerHTML = shelvesOf(x.cat).map((h) => `<button class="${x.sh.includes(h.id) ? 'on' : ''}" data-shin="${esc(h.id)}">${esc(h.name)}</button>`).join('') + `<button data-act="newshelf">＋ 新しい棚</button>`;
}
function drawTl(x) {
  const ev = x.log.slice().sort((a, b) => b.t - a.t);
  $('#pTl').innerHTML = `<summary>記録の履歴（${ev.length}）</summary><ol>${ev.map((e) => `<li><span>${e.d ? fmtWhen(e.d === '?' ? '' : e.d) : new Date(e.t).toLocaleDateString('ja-JP')}</span>${esc(logText(x, e))}</li>`).join('')}</ol>`;
}
function rateHTML(r, k = 'star', clr = 'rateclear') {
  let h = '<span class="stars">';
  for (let i = 1; i <= 5; i++) h += `<span class="st" data-${k}="${i}" role="button" aria-label="★${i}"><i style="width:${fill(r || 0, i)}%"></i></span>`;
  return h + `</span><output class="num">${r || '—'}</output>${r ? `<button type="button" class="hint" data-act="${clr}" style="text-decoration:underline">消す</button>` : ''}`;
}
function drawRate(x) {
  const C = CATS[x.cat], r = rt(x), va = x.series ? volRates(x) : [];
  $('#pRate').innerHTML = rateHTML(r);
  let h = '';
  if (va.length) h += `<p class="avgline">${x.rateFix ? `自分で決めた評価。${C.vol}ごとの平均は ★${volAvg(x)}（${va.length}${C.vol}分）<button data-act="rateavg">平均に戻す</button>` : `${C.vol}ごとの評価の平均（${va.length}${C.vol}分）。星を押すと、シリーズ全体の評価を自分で決められる。`}</p>`;
  else if (x.series) h += `<p class="avgline">${C.vol}ごとに星をつけると、ここはその平均になる。</p>`;
  if (x.exp > 0) {
    if (r > 0) { const d = Math.round((r - x.exp) * 10) / 10; h += `<div class="expd">期待 ★${x.exp} → 実際 ★${r}　<b class="num">${d > 0 ? '+' : ''}${d || '±0'}</b>　${d > 0 ? '期待以上だった' : d < 0 ? '期待ほどじゃなかった' : '期待どおり'}</div>`; }
    else h += `<div class="expd">期待度 ★${x.exp}。評価をつけると差が出る。</div>`;
  }
  $('#pAvg').innerHTML = h;
}
function drawVols(x, just) {
  const C = CATS[x.cat], u = C.vol, n = x.vols || 0, ser = C.ser;
  const modes = [['open', '詳しく見る'], ['read', '進める'], ...(C.own ? [['own', '持ってる']] : [])];
  if (!modes.some((m) => m[0] === ui.vmode)) ui.vmode = 'open';
  const hint = { open: `タップで、その${u}の写真・評価・感想`, read: `タップした${u}までを「${C.did}」にする`, own: 'タップで「持ってる／持ってない」を切り替え' }[ui.vmode];
  let h = `<div class="vhead"><span><b class="num">${x.cur}</b> <small>/ ${n ? (x.done ? `全${n}${u}（${ser.fin}）` : `${ser.have}${n}${u}（${ser.on}）`) : `?${u}`}</small></span><span class="step"><button data-vstep="-1" aria-label="1つ戻す">−</button><button data-vstep="1" aria-label="1つ進める">＋</button></span></div>`;
  if (n) h += `<div class="seg sm" style="margin-top:12px">${modes.map(([k, l]) => `<button data-vm="${k}" class="${ui.vmode === k ? 'on' : ''}">${l}</button>`).join('')}</div><p class="hint" style="margin-top:6px">${hint}</p>`;
  if (n && n <= 300) {
    h += `<div class="vshelf">${Array.from({ length: n }, (_, k) => { const i = k + 1, d = x.v[i] || {}; const cls = [i <= x.cur ? 'rd' : x.ownOn ? (owned(x, i) ? 'own' : 'no') : '', x.coverVol === i ? 'cvr' : '', d.r || d.c || d.img ? 'has' : '', just === i ? 'just' : ''].filter(Boolean).join(' '); return `<button data-vol="${i}" class="${cls}" aria-label="${C.volN(i)}">${i}</button>`; }).join('')}${!x.done ? `<button class="plus" data-act="volplus" aria-label="${ser.nw}を足す">＋</button>` : ''}</div>` +
      `<div class="legend"><span><i class="a"></i>${C.did}</span>${x.ownOn ? '<span><i class="b"></i>持ってる</span><span><i class="c"></i>持ってない</span>' : ''}<span><i class="d"></i>感想・評価あり</span></div>`;
  } else if (n) h += `<div class="r2" style="margin-top:12px"><label class="f">${u}を開く<input id="vjump" inputmode="numeric" placeholder="1〜${n}"></label><button class="btn sm" data-act="vjump" style="align-self:end">開く</button></div>`;
  if (x.ownOn) { const m = missing(x); h += `<div class="vrow2"><span>持ってる <b class="num">${ownN(x)}</b>/ ${n}${u}</span><span>${m.length ? `持ってない：${shortList(m, u)}` : '全部そろってる'}</span></div>`; }
  else if (C.own && n) h += `<p class="hint" style="margin-top:10px">「持ってる」に切り替えると、飛び飛びで持ってる${u}も記録できる。</p>`;
  if (n && !(n <= 300)) h += `<div class="vbar"><i style="width:${Math.min(100, x.cur / n * 100)}%"></i></div>`;
  if (n && !x.done && n > 300) h += `<button class="btn sm" data-act="volplus" style="margin-top:12px">${ser.nw}が出た（＋1）</button>`;
  if (!n) h += `<p class="hint" style="margin-top:10px">「編集」で${ser.volsL}を入れると、${u}ごとに記録できる。</p>`;
  $('#pVols').innerHTML = h;
}
function drawVnotes(x) {
  const C = CATS[x.cat], l = Object.entries(x.v).filter(([k, d]) => d && (d.c || d.r)).sort((a, b) => a[0] - b[0]);
  $('#pVnotes').innerHTML = l.length ? `<div class="sec"><h4>${C.vol}ごとの感想（${l.length}）</h4><div class="box vnotes"><ul style="margin:0">${l.map(([k, d]) => `<li><button data-vopen="${k}" style="text-align:left;width:100%"><b>${C.volN(k)}</b>${d.r ? `<span class="num">★${d.r}</span>` : ''}${d.c ? `<br><span class="txt" style="font-size:14px">${esc(d.c)}</span>` : ''}</button></li>`).join('')}</ul></div></div>` : '';
}
function drawProg(x) {
  let h = '';
  if (x.cat === 'book') {
    if (x.pages) h = `<div class="vhead"><span><b class="num" id="pPageN">${x.page || 0}</b> <small>/ ${x.pages}ページ</small></span><span class="step"><button data-pstep="-10">−10</button><button data-pstep="10">＋10</button></span></div><div class="pct" style="margin-top:12px"><input type="range" id="pRange" min="0" max="${x.pages}" step="1" value="${x.page || 0}" aria-label="読んだページ"><span class="num" id="pPct">${Math.round((x.page || 0) / x.pages * 100)}%</span></div>`;
    else h = `<div class="r2"><label class="f">全部で何ページ？<input id="pPages" inputmode="numeric" placeholder="例：320"></label><button class="btn sm" data-act="setpages" style="align-self:end">決める</button></div>`;
  } else {
    if (!x.series) h += `<div class="vhead"><span><b class="num" id="pPageN">${x.pct !== '' && x.pct != null ? x.pct : '—'}</b> <small>% クリア率</small></span><span class="step"><button data-pstep="-5">−5</button><button data-pstep="5">＋5</button></span></div><div class="pct" style="margin-top:12px"><input type="range" id="pRange" min="0" max="100" step="1" value="${x.pct || 0}" aria-label="クリア率"></div>`;
    h += `<div class="vrow2"${x.series ? ' style="margin-top:0;padding-top:0;border:0"' : ''}><span>プレイ時間 <b class="num">${x.hours || '—'}</b>時間</span><span class="step"><button data-hstep="-1" aria-label="1時間減らす">−</button><button data-hstep="1" aria-label="1時間増やす">＋</button></span></div><p class="hint" style="margin-top:6px">わからなければ空のままでOK。細かい数字は「編集」から。</p>`;
  }
  $('#pProg').innerHTML = h;
}
function openItem(id, src) {
  const x = findItem(id); if (!x) return;
  curId = id;
  const show = () => { renderPage(x); $('#page').hidden = false; $('#page').scrollTop = 0; document.body.classList.add('paged'); };
  const hero = src && (src.classList.contains('vt') ? src : src.querySelector('.vt'));
  if (document.startViewTransition && hero && !reduced) {
    hero.style.viewTransitionName = 'hero';
    const t = document.startViewTransition(() => { hero.style.viewTransitionName = ''; show(); $('#pageHero').style.viewTransitionName = 'hero'; });
    t.finished.finally(() => { const h = $('#pageHero'); if (h) h.style.viewTransitionName = ''; });
  } else { show(); $('#page').classList.remove('enter'); void $('#page').offsetWidth; $('#page').classList.add('enter'); }
}
function closeItem(after) {
  const id = curId;
  const hide = () => { $('#page').hidden = true; document.body.classList.remove('paged'); curId = null; if (after) after(); else render(); };
  const ph = $('#pageHero');
  if (document.startViewTransition && ph && !reduced && !after) {
    ph.style.viewTransitionName = 'hero';
    const t = document.startViewTransition(() => {
      ph.style.viewTransitionName = ''; hide();
      const src = $(`#list [data-id="${CSS.escape(id)}"]`), v = src && (src.classList.contains('vt') ? src : src.querySelector('.vt'));
      if (v) { const r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) v.style.viewTransitionName = 'hero'; }
    });
    t.finished.finally(() => $$('#list .vt').forEach((v) => (v.style.viewTransitionName = '')));
  } else hide();
}
// 大きな表紙を指で傾ける
document.addEventListener('pointermove', (e) => {
  if ($('#page').hidden || reduced || $('dialog[open]')) return;
  const h = $('#pageHero'); if (!h) return;
  const r = h.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
  const k = h.classList.contains('tvh') || h.classList.contains('frm') ? 0.4 : 1;
  h.style.transform = `rotateY(${(dx * 30 * k).toFixed(1)}deg) rotateX(${(-dy * 22 * k).toFixed(1)}deg)`;
}, { passive: true });
function burst(el) {
  if (reduced) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('i'); p.className = 'burst'; const a = i / 8 * Math.PI * 2, d = 28 + Math.random() * 14;
    p.style.left = cx - 3 + 'px'; p.style.top = cy - 3 + 'px'; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.append(p); setTimeout(() => p.remove(), 650);
  }
}
const touch = (x) => { x.updated = x.touched = Date.now(); save(); };
function setStatus(x, st, date) {
  if (x.status !== st) {
    if (st === 'done') x.log.push({ t: date ? whenT(date) : Date.now(), k: 'st', v: 'done', d: date || '?' });
    else logEv(x, 'st', st);
  }
  x.status = st;
  if (st === 'done') { x.date = date || ''; if (x.series && x.vols && x.done) x.cur = x.vols; }
  x.log.sort((a, b) => a.t - b.t);
}
/* 進めたあとの状態の自動切り替え。最後までいったら「本当に終わった？」を聞く */
function autoStatus(x, redraw) {
  if ((x.cur > 0 || x.page > 0 || +x.pct > 0) && x.status === 'none') setStatus(x, 'doing');
  const end = (x.series && x.done && x.vols && x.cur >= x.vols) || (!x.series && x.cat === 'book' && x.pages && x.page >= x.pages) || (!x.series && x.cat === 'game' && +x.pct >= 100);
  if (end && x.status !== 'done') askDone(x, redraw, `最後まで${CATS[x.cat].did}！「${stLabel(x.cat, 'done')}」にする？`);
}

/* ===== 「本当に終わった？」 ===== */
let doneCtx = null;
function askDone(x, then, title) {
  const C = CATS[x.cat];
  doneCtx = { x, then, wm: 'today', date: x.date || '' };
  $('#doneT').textContent = title || `「${x.title}」、${C.doneQ}`;
  $('#doneOk').textContent = `「${stLabel(x.cat, 'done')}」にする`;
  drawWhenUI($('#doneUI'), doneCtx);
  $('#dDone').showModal();
}
const WM = [['today', '今日'], ['day', '日付'], ['month', '年月'], ['year', '年だけ'], ['none', '覚えてない']];
function drawWhenUI(box, st) {
  const d = st.date || '';
  box.innerHTML = `<div class="seg sm">${WM.map(([k, l]) => `<button type="button" data-wm="${k}" class="${st.wm === k ? 'on' : ''}">${l}</button>`).join('')}</div>` +
    (st.wm === 'day' ? `<label class="f" style="margin-top:8px"><input class="wd" type="date" value="${d.length === 10 ? d : ''}" aria-label="日付"></label>`
      : st.wm === 'month' ? `<label class="f" style="margin-top:8px"><input class="wmo" type="month" value="${d.length >= 7 ? d.slice(0, 7) : ''}" aria-label="年月"></label>`
      : st.wm === 'year' ? `<label class="f" style="margin-top:8px"><input class="wy" inputmode="numeric" maxlength="4" placeholder="例：2015" value="${esc(d.slice(0, 4))}" aria-label="年"></label>`
      : st.wm === 'none' ? '<p class="hint" style="margin-top:8px">日付なしで記録する。履歴には「時期不明」と出る。</p>' : '');
}
function readWhen(box, st) {
  if (st.wm === 'today') return today();
  if (st.wm === 'day') return $('.wd', box)?.value || '';
  if (st.wm === 'month') return $('.wmo', box)?.value || '';
  if (st.wm === 'year') { const y = int($('.wy', box)?.value); return y >= 1900 && y <= 2100 ? String(y) : ''; }
  return '';
}

/* ===== 巻ごと ===== */
let vol = null;
const vget = (x, n) => x.v[n] || (x.v[n] = {});
function openVol(x, n) {
  vol = { id: x.id, n: clamp(n, 1, Math.max(1, x.vols)) };
  drawVolSheet();
  if (!$('#dVol').open) $('#dVol').showModal();
}
async function drawVolSheet() {
  const x = findItem(vol.id); if (!x) return;
  const C = CATS[x.cat], n = vol.n, d = x.v[n] || {};
  $('#volT').textContent = C.volN(n);
  $('[data-act="vprev"]').disabled = n <= 1; $('[data-act="vnext"]').disabled = n >= x.vols;
  setSw('#volCvSw', x.coverVol === n);
  $('#volRate').innerHTML = rateHTML(d.r || 0, 'vstar', 'vrateclear');
  $('#volC').value = d.c || '';
  $('#volC').placeholder = `${C.volN(n)}の感想・メモ（ここだけの話）`;
  $('#volOwnRow').hidden = !C.own; setSw('#volOwnSw', owned(x, n));
  $('#volPriceF').hidden = !S.set.money; $('#volPrice').value = d.p || '';
  $('#volReadB').textContent = n <= x.cur ? 'ここから「まだ」に戻す' : `ここまで${C.did}`;
  $('#volRm').hidden = !d.img;
  const pv = $('#volPv'), wide = x.cat === 'anime';
  pv.style.width = wide ? '150px' : ''; pv.style.height = wide ? '94px' : '';
  pv.innerHTML = genHTML(x, n);
  if (d.img) { const u = await imgURL(`${x.id}~${n}`); if (u && vol && vol.n === n) pv.innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`; }
}
let vct;
$('#volC').addEventListener('input', (e) => {
  const x = vol && findItem(vol.id); if (!x) return;
  const v = e.target.value.slice(0, 3000); if (v) vget(x, vol.n).c = v; else if (x.v[vol.n]) delete x.v[vol.n].c;
  clearTimeout(vct); vct = setTimeout(() => touch(x), 400);
});
$('#volPrice').addEventListener('change', (e) => {
  const x = vol && findItem(vol.id); if (!x) return;
  const p = int(e.target.value), d = vget(x, vol.n);
  if (p) { if (!d.p) d.pt = Date.now(); d.p = p; } else { delete d.p; delete d.pt; }
  touch(x);
});
$('#volIn').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !vol) return;
  const x = findItem(vol.id), n = vol.n; if (!x) return;
  const r = await cropImage(f, defaultAr(x.cat)); if (!r) return;
  const k = `${x.id}~${n}`;
  try {
    await idb.set(k, r.blob); forget(k);
    const d = vget(x, n); d.img = true; d.ratio = +r.ratio.toFixed(3);
    if (!x.coverVol && !x.img) { x.coverVol = n; toast(`${CATS[x.cat].volN(n)}を表紙にした`); }
    touch(x); drawVolSheet();
  } catch (err) { toast('写真を保存できなかった'); }
});
$('#dVol').addEventListener('close', () => { const x = vol && findItem(vol.id); clearTimeout(vct); if (x) { for (const k of Object.keys(x.v)) if (!Object.keys(x.v[k]).length) delete x.v[k]; save(); if (curItem() === x) renderPage(x); } vol = null; });

/* ===== 追加・編集 ===== */
let draft = null;
const setSw = (s, on) => $(s).setAttribute('aria-checked', String(!!on));
function uniq(key, base) { return [...new Set([...base, ...S.items.map((x) => x[key]).filter(Boolean)])]; }
function openEdit(id) {
  const x = id ? findItem(id) : null;
  const cat = x ? x.cat : S.cat, C = CATS[cat];
  draft = x ? { ...x, tags: [...x.tags], fmt: [...x.fmt] } : { id: null, cat, title: '', creator: '', year: '', status: C.st.some((s) => s[0] === ui.filter) ? ui.filter : 'none', rating: 0, exp: 0, want: ui.filter === 'want', later: ui.filter === 'later', series: cat === 'anime', vols: 0, cur: 0, done: false, tags: ui.tag ? [ui.tag] : [], review: '', memo: '', place: '', date: '', until: '', platform: '', hours: '', color: '', img: false, v: {}, fmt: [], media: '' };
  draft.newImg = null; draft.rmImg = false;
  const f = $('#fEdit');
  $('#editT').textContent = x ? '編集' : `${C.name}を追加`;
  f.title.value = draft.title; f.yomi.value = draft.yomi || ''; f.creator.value = draft.creator || ''; f.year.value = draft.year || ''; f.season.value = draft.season || '';
  f.place.value = draft.place || ''; f.until.value = draft.until || '';
  const dl = (draft.date || '').length;
  draft.wm = dl === 10 ? 'day' : dl === 7 ? 'month' : dl === 4 ? 'year' : x && x.status === 'done' ? 'none' : 'today';
  $('#whenL').textContent = C.whenQ;
  f.vols.value = draft.vols || ''; f.cur.value = draft.cur || '';
  f.own.value = x && x.ownOn ? rangeText(Object.keys(x.v).filter((k) => x.v[k].o).map(Number)) : '';
  f.page.value = draft.page || ''; f.pages.value = draft.pages || ''; f.pct.value = draft.pct !== '' && draft.pct != null ? draft.pct : ''; f.hours.value = draft.hours || '';
  f.platform.value = draft.platform || ''; f.app.value = draft.app || ''; f.where.value = draft.where || ''; f.theater.value = draft.theater || ''; f.seat.value = draft.seat || '';
  f.price.value = draft.price || ''; f.priceArt.value = draft.price || '';
  f.review.value = draft.review || ''; f.memo.value = draft.memo || ''; f.tags.value = draft.tags.join(' ');
  $('#creatorL').textContent = C.creator;
  $('#artF').hidden = cat !== 'art'; $('#seasonF').hidden = cat !== 'anime'; $('#serG').hidden = cat === 'art'; $('#haveG').hidden = cat === 'art';
  $('#priceArtF').hidden = cat !== 'art' || !S.set.money;
  if (C.ser) {
    $('#serLabel').firstChild.textContent = C.ser.label; $('#serHint').textContent = C.ser.hint;
    $('#volsL').textContent = C.ser.volsL; $('#curL').textContent = C.ser.curL;
    $('#finL').firstChild.textContent = C.ser.finQ; $('#finH').textContent = C.ser.finH;
  }
  $('#ownF').hidden = !C.own;
  $('#stSeg').innerHTML = C.st.map(([k, l]) => `<button type="button" data-est="${k}" class="${draft.status === k ? 'on' : ''}">${l}</button>`).join('');
  setSw('#serSw', draft.series); setSw('#doneSw', draft.done); $('#serF').hidden = !draft.series;
  $('#delBtn').hidden = !x;
  const fill2 = (id, a) => { $(id).innerHTML = a.map((v) => `<option value="${esc(v)}">`).join(''); };
  fill2('#whereList', uniq('where', LISTS.where)); fill2('#appList', uniq('app', LISTS.app).filter((v) => !LISTS.svc.includes(v))); fill2('#svcList', uniq('app', LISTS.svc).filter((v) => !LISTS.app.includes(v))); fill2('#thList', uniq('theater', []));
  drawEditRate(); drawPhoto(); drawSwatches(); drawWhen(); drawProgF(); drawHave();
  $('#dEdit').showModal();
  $('#dEdit').scrollTop = 0;
  if (!x) setTimeout(() => { const ae = document.activeElement; if (!ae || !/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) f.title.focus(); }, 400);
}
function drawWhen() { $('#whenF').hidden = draft.status !== 'done'; drawWhenUI($('#whenUI'), draft); }
function drawProgF() {
  const book = draft.cat === 'book' && !draft.series, game = draft.cat === 'game';
  $('#progG').hidden = !(book || game); $('#pagesF').hidden = !book; $('#gameF').hidden = !game; $('#pctF').hidden = draft.series;
  $('#photoHint').hidden = !draft.series || draft.cat === 'art';
}
function drawHave() {
  const C = CATS[draft.cat], m = draft.media || '';
  if (!C.media) return;
  $('#mediaSeg').innerHTML = C.media.map((k) => `<button type="button" data-media="${k}" class="${m === k ? 'on' : ''}">${k}</button>`).join('');
  $('#pfF').hidden = draft.cat !== 'game';
  const appOn = ['電子', '両方', '配信'].includes(m), whereOn = ['紙', '両方', 'ディスク', 'パッケージ'].includes(m);
  $('#appF').hidden = !appOn; $('#appL').textContent = m === '配信' ? '配信サービス' : '電子書籍のアプリ';
  $('#fEdit').app.setAttribute('list', m === '配信' ? 'svcList' : 'appList');
  $('#fEdit').app.placeholder = m === '配信' ? '例：Netflix' : '例：Kindle';
  $('#whereF').hidden = !whereOn; $('#whereL').textContent = m === '両方' ? '紙の置き場所' : '置き場所';
  $('#theaterF').hidden = m !== '映画館';
  $('#fmtSeg').innerHTML = FMTS.map((k) => `<button type="button" data-fmt="${k}" class="${draft.fmt.includes(k) ? 'on' : ''}">${k}</button>`).join('');
  $('#priceF').hidden = !S.set.money;
  $('#haveL').textContent = draft.cat === 'manga' || draft.cat === 'book' ? '持ち方・置き場所（紙？電子？どこにある？）' : draft.cat === 'game' ? '持ち方（機種・パッケージ？ダウンロード？）' : '観た・持ってる場所';
}
const drawEditRate = () => { $('#editRate').innerHTML = rateHTML(draft.rating, 'estar', 'erateclear'); $('#editExp').innerHTML = rateHTML(draft.exp || 0, 'xstar', 'xrateclear'); $('#rateL').textContent = draft.series ? `評価（シリーズ全体。${CATS[draft.cat].vol}ごとの星は作品のページで）` : '評価'; };
const drawSwatches = () => { $('#sws').innerHTML = PALETTE.map((c) => `<button type="button" data-sw="${c}" style="--s:${c}" class="${(draft.color || '') === c ? 'on' : ''}" aria-label="色"></button>`).join(''); };
async function drawPhoto() {
  const pv = $('#photoPv'), title = $('#fEdit').title.value || 'タイトル';
  $('#photoRm').hidden = !(draft.newImg || (draft.img && !draft.rmImg));
  pv.innerHTML = genHTML({ ...draft, title, creator: $('#fEdit').creator.value, id: draft.id || 'new', v: draft.v || {} });
  const u = draft.newImg ? URL.createObjectURL(draft.newImg.blob) : draft.img && !draft.rmImg ? await imgURL(draft.id) : null;
  if (u) pv.innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`;
}
$('#photoIn').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = await cropImage(f, defaultAr(draft.cat));
  if (r) { draft.newImg = r; draft.rmImg = false; drawPhoto(); }
});
$('#fEdit').addEventListener('input', (e) => { if ((e.target.name === 'title' || e.target.name === 'creator') && !draft.newImg && !(draft.img && !draft.rmImg)) drawPhoto(); });
$('#fEdit').addEventListener('submit', async (e) => {
  const f = e.target, title = f.title.value.trim(), C = CATS[draft.cat];
  if (!title) { e.preventDefault(); return toast('タイトルを入れてね'); }
  const ser = draft.series && !!C.ser && !(draft.cat === 'anime' && !int(f.vols.value) && !int(f.cur.value)), vols = ser ? int(f.vols.value) : 0, m = C.media ? draft.media || '' : '';
  const appOn = ['電子', '両方', '配信'].includes(m), whereOn = ['紙', '両方', 'ディスク', 'パッケージ'].includes(m), th = m === '映画館';
  const book = draft.cat === 'book' && !ser, game = draft.cat === 'game';
  const pages = book ? int(f.pages.value) : 0;
  const now = Date.now();
  let x = draft.id ? findItem(draft.id) : null;
  const isNew = !x;
  const price = S.set.money ? int(draft.cat === 'art' ? f.priceArt.value : f.price.value) : (x && x.price) || 0;
  const v = {
    title, yomi: f.yomi.value.trim(), creator: f.creator.value.trim(), year: f.year.value.trim(), season: draft.cat === 'anime' ? f.season.value.trim() : '',
    place: draft.cat === 'art' ? f.place.value.trim() : '', until: draft.cat === 'art' ? f.until.value : '',
    date: draft.status === 'done' ? readWhen($('#whenUI'), draft) : (draft.date || ''),
    vols, cur: ser ? (vols ? Math.min(int(f.cur.value), vols) : int(f.cur.value)) : 0,
    pages, page: book ? (pages ? Math.min(int(f.page.value), pages) : int(f.page.value)) : 0,
    pct: game && !ser && f.pct.value.trim() !== '' ? Math.min(100, int(f.pct.value)) : '',
    hours: game ? dec(f.hours.value) || '' : '',
    platform: game ? f.platform.value.trim() : '', media: m, app: appOn ? f.app.value.trim() : '', where: whereOn ? f.where.value.trim() : '',
    theater: th ? f.theater.value.trim() : '', seat: th ? f.seat.value.trim() : '', fmt: th ? draft.fmt.slice() : [],
    price, pt: price ? (x && x.price ? x.pt || x.created : now) : 0,
    review: f.review.value.trim(), memo: f.memo.value.trim(), tags: [...new Set(f.tags.value.split(/[\s、,，]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 12),
  };
  if (ser && v.cur > 0 && draft.status === 'none') draft.status = 'doing';
  if (!x) { x = fix({ id: uid(), cat: draft.cat, created: now, img: false, log: [{ t: now, k: 'add' }], rounds: [], round: 1, sh: [], v: {} }); S.items.push(x); }
  if (!isNew && x.status !== draft.status && draft.status !== 'done') logEv(x, 'st', draft.status);
  if (draft.status === 'done' && x.status !== 'done') x.log.push({ t: v.date ? whenT(v.date) : now, k: 'st', v: 'done', d: v.date || '?' });
  else if (!isNew && draft.status === 'done' && v.date !== (x.date || '')) { const ev = [...x.log].reverse().find((q) => q.k === 'st' && q.v === 'done'); if (ev) { ev.t = v.date ? whenT(v.date) : ev.t; ev.d = v.date || '?'; } }
  if (isNew && draft.status === 'doing') x.log.push({ t: now, k: 'st', v: 'doing' });
  if ((x.rating || 0) !== draft.rating && (draft.rating || !isNew)) logEv(x, 'rate', draft.rating);
  if (!isNew && v.cur !== x.cur && ser) logEv(x, 'cur', v.cur);
  /* 持ってる巻 */
  if (C.own && ser) {
    const txt = f.own.value.trim();
    if (txt) { const set = parseRanges(txt, vols || 2000); for (const k of Object.keys(x.v)) if (x.v[k].o && !set.has(+k)) delete x.v[k].o; for (const i of set) vget(x, i).o = 1; x.ownOn = true; }
    else if (x.ownOn) { for (const k of Object.keys(x.v)) delete x.v[k].o; x.ownOn = false; }
  }
  const rateFix = ser && draft.rating !== (x.rating || 0) ? !!draft.rating && volRates(x).length > 0 : !!x.rateFix;
  Object.assign(x, { status: draft.status, rating: draft.rating, rateFix, exp: draft.exp || 0, want: draft.want, later: draft.later, series: ser, done: draft.done, color: draft.color }, v, { updated: now, touched: now });
  if (x.coverVol && (!ser || x.coverVol > (vols || 0))) x.coverVol = 0;
  x.log.sort((a, b) => a.t - b.t);
  if (isNew && ui.filter.startsWith('sh:') && S.cat === x.cat) x.sh = [ui.filter.slice(3)];
  try {
    if (draft.newImg) { await idb.set(x.id, draft.newImg.blob); forget(x.id); x.img = true; x.ratio = +draft.newImg.ratio.toFixed(3); if (!draft.color) x.color = draft.newImg.color; if (ser) x.coverVol = 0; }
    else if (draft.rmImg && x.img) { await idb.del(x.id); forget(x.id); x.img = false; }
  } catch (err) { toast('写真を保存できなかった'); }
  save(); render();
  if (curItem() === x) renderPage(x);
  toast(isNew ? `「${title}」を置いた` : '保存した');
});

/* ===== 棚に選んで入れる ===== */
let pick = null;
function openPick() {
  const h = shelvesOf(S.cat).find((q) => 'sh:' + q.id === ui.filter); if (!h) return;
  pick = { h, sel: new Set(itemsOf(S.cat).filter((x) => x.sh.includes(h.id)).map((x) => x.id)) };
  $('#pickT').textContent = `「${h.name}」に入れる作品`; $('#pickQ').value = '';
  if (!itemsOf(S.cat).length) { toast('まだ作品がない。＋から追加してね'); return; }
  drawPicks(); $('#dPick').showModal();
}
function drawPicks() {
  const q = norm($('#pickQ').value);
  const a = itemsOf(S.cat).filter((x) => !q || norm([x.title, x.yomi, x.creator, ...x.tags].join(' ')).includes(q)).sort((x, y) => (pick.sel.has(y.id) - pick.sel.has(x.id)) || coll.compare(titleKey(x), titleKey(y)));
  $('#picks').innerHTML = a.length ? a.map((x) => `<li><label><span class="th">${phHTML(x, { prog: false })}</span><b>${esc(x.title)}</b><input type="checkbox" data-pk="${esc(x.id)}"${pick.sel.has(x.id) ? ' checked' : ''}></label></li>`).join('') : '<li class="hint" style="padding:16px 4px">見つからない</li>';
  $('#pickOk').textContent = `入れる（${pick.sel.size}）`;
  hydrate($('#picks'));
}
$('#pickQ').addEventListener('input', drawPicks);
$('#picks').addEventListener('change', (e) => { const c = e.target.closest('[data-pk]'); if (!c || !pick) return; if (c.checked) pick.sel.add(c.dataset.pk); else pick.sel.delete(c.dataset.pk); $('#pickOk').textContent = `入れる（${pick.sel.size}）`; });
function pickSave() {
  const { h, sel } = pick; let add = 0;
  for (const x of itemsOf(S.cat)) {
    const has = x.sh.includes(h.id), want = sel.has(x.id);
    if (want && !has) { x.sh.push(h.id); logEv(x, 'sh', h.name); add++; }
    else if (!want && has) x.sh = x.sh.filter((s) => s !== h.id);
  }
  save(); $('#dPick').close(); render(); toast(`「${h.name}」は${sel.size}${CATS[S.cat].unit}になった`);
}

/* ===== ティアの並び：どっちが好き？・自分で並べ替え ===== */
let ord = null;
function openOrdC(t) {
  const l = tierItems(itemsOf(S.cat).filter((x) => rt(x) > 0), t);
  if (l.length < 2) { toast('2つ以上あると並べられる'); return; }
  const done = l.filter((x) => x.tk === t && typeof x.tord === 'number'), fresh = l.length - done.length;
  ord = { t, list: l };
  $('#ordcT').textContent = `${t}（${TIERS.find((q) => q[0] === t)[2]}）の中の順番`;
  $('#ordcH').textContent = done.length >= 2 && fresh ? `まだ順番が決まってないのが${fresh}${CATS[S.cat].unit}。「どっちが好き？」だと、それだけを今の順番に差し込める。` : '左ほど上（好き）。2つずつ出るのを選んでいくか、自分で並べ替える。結果は保存されて、次からその順で並ぶ。';
  $('#ordCmpB').textContent = done.length >= 2 && fresh ? `どっちが好き？で決める（新しい${fresh}${CATS[S.cat].unit}だけ）` : 'どっちが好き？で決める（直感で選ぶ）';
  $('#ordAllB').hidden = !(done.length >= 2 && fresh);
  $('#dOrdC').showModal();
}
let cmp = null;
function cmpAsk(a, b, p) {
  return new Promise((res) => {
    cmp = { res, a, b };
    $('#cmpBar').style.width = Math.round(p * 100) + '%';
    const [l, r] = Math.random() < 0.5 ? [a, b] : [b, a];
    const card = (x) => `<button data-cmp="${esc(x.id)}"><span class="th">${phHTML(x, { prog: false })}</span><b>${esc(x.title)}</b><small class="hint">★${rt(x)}</small></button>`;
    $('#cmp').innerHTML = card(l) + card(r);
    const c = $('#cmp'); c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
    hydrate(c);
  });
}
async function runCmp(all) {
  const t = ord.t, list = ord.list;
  let base = [], add = list;
  if (!all) { base = list.filter((x) => x.tk === t && typeof x.tord === 'number'); add = list.filter((x) => !base.includes(x)); if (base.length < 2) { base = []; add = list; } }
  const sorted = base.slice(), work = add.slice();
  if (!sorted.length) sorted.push(work.shift());
  let est = 0; { let n = sorted.length; for (let i = 0; i < work.length; i++) { est += Math.ceil(Math.log2(n + 1)); n++; } }
  let asked = 0;
  $('#dCmp').showModal();
  for (const it of work) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const pk = await cmpAsk(it, sorted[mid], asked / Math.max(1, est));
      if (pk === null) { cmp = null; return; }
      asked++;
      if (pk === it) hi = mid; else lo = mid + 1;
    }
    sorted.splice(lo, 0, it);
  }
  cmp = null;
  $('#cmpBar').style.width = '100%';
  sorted.forEach((x, i) => { x.tord = i; x.tk = t; });
  save(); $('#dCmp').close(); drawList(); toast(`${t}の順番が決まった（${asked}回比べた）`);
}
$('#dCmp').addEventListener('close', () => { if (cmp) { const c = cmp; cmp = null; c.res(null); } });
function openOrd() {
  ord.tmp = ord.list.slice();
  $('#ordT').textContent = `${ord.t}の順番を並べ替え`;
  drawOrd(); $('#dOrd').showModal();
}
function drawOrd(moved) {
  $('#ord').innerHTML = ord.tmp.map((x, i) => `<li class="${moved === x.id ? 'moved' : ''}"><span class="n num">${i + 1}</span><span class="th">${phHTML(x, { prog: false })}</span><b>${esc(x.title)}</b><span class="mv"><button data-mv="-1" data-mi="${i}" aria-label="上へ"${i === 0 ? ' disabled' : ''}>↑</button><button data-mv="1" data-mi="${i}" aria-label="下へ"${i === ord.tmp.length - 1 ? ' disabled' : ''}>↓</button></span></li>`).join('');
  hydrate($('#ord'));
}

/* ===== タワー ===== */
function drawTower() {
  const C = CATS[S.cat], a = itemsOf(S.cat).slice().sort((p, q) => p.created - q.created), u = C.vol, y = new Date().getFullYear();
  const tabs = [['stack', '積んでる'], ['doing', '途中'], ['year', `今年${C.did}`]];
  $('#towSeg').innerHTML = tabs.map(([k, l]) => `<button type="button" data-tow="${k}" class="${ui.tow === k ? 'on' : ''}">${l}</button>`).join('');
  const bl = [];
  for (const x of a) {
    if (ui.tow === 'stack') {
      if (x.want) continue;
      if (x.series && x.vols && x.ownOn) { for (let i = x.cur + 1; i <= x.vols; i++) if (owned(x, i)) bl.push([x, `${x.title}　${C.volN(i)}`]); }
      else if (x.status === 'none') bl.push([x, x.title]);
    } else if (ui.tow === 'doing') { if (x.status === 'doing') bl.push([x, x.title + (progText(x) ? `　${progText(x)}` : '')]); }
    else if (x.status === 'done' && (x.date || '').startsWith(String(y))) bl.push([x, x.title]);
  }
  $('#towT').textContent = `${C.name}のタワー`;
  $('#towN').innerHTML = `${bl.length}<small>${ui.tow === 'stack' && (S.cat === 'manga' || S.cat === 'book') ? '冊' : C.unit}</small>`;
  const max = 160, show = bl.slice(-max);
  $('#tower').innerHTML = bl.length ? show.map(([x, t], i) => { const h = hash(x.id + t), c = colOf(x); return `<button data-tid="${esc(x.id)}" style="--col:${c};--fg:${fgOf(c)};--i:${Math.min(i, 30)};--x:${h % 15 - 7}px;--r:${(h % 5 - 2) * 0.7}deg;width:${52 + h % 40}%">${esc(t)}</button>`; }).join('') : `<p class="hint" style="margin:30px 0">${ui.tow === 'stack' ? '積んでるものはない！' : ui.tow === 'doing' ? '途中のものはない' : `今年${C.did}ものはまだない`}</p>`;
  $('#towH').textContent = (bl.length > max ? `多すぎるので上の${max}個だけ表示。` : '') + (ui.tow === 'stack' ? `「${stLabel(S.cat, 'none')}」の作品と、持ってるのにまだの${u}。押すと開く。` : ui.tow === 'doing' ? '今まさに途中のもの。押すと開く。' : `今年${C.did}もの（時期を入れたもの）。`);
}

/* ===== 設定 ===== */
function drawSettings() {
  setSw('#todSw', S.set.tod); setSw('#moneySw', S.set.money); setSw('#dustSw', S.set.dust);
  $('#moneyG').hidden = !S.set.money;
  if (S.set.money) {
    const yrs = new Map();
    for (const x of S.items) for (const [t, p] of spends(x)) { const yy = new Date(t).getFullYear(), m = yrs.get(yy) || {}; m[x.cat] = (m[x.cat] || 0) + p; yrs.set(yy, m); }
    $('#ytable').innerHTML = yrs.size ? [...yrs].sort((a, b) => b[0] - a[0]).map(([yy, m]) => `<tr><td>${yy}年<br><small class="hint">${ORDER.filter((k) => m[k]).map((k) => `${CATS[k].name} ${yen(m[k])}`).join('・')}</small></td><td>${yen(Object.values(m).reduce((s, p) => s + p, 0))}</td></tr>`).join('') : '<tr><td class="hint">まだ値段が入ってない。作品の「編集」や、巻のシートから入れられる。</td><td></td></tr>';
  }
  const imgs = S.items.reduce((s, x) => s + imgKeys(x).length, 0);
  const d = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  $('#bkInfo').textContent = `記録と写真はこの端末の中だけにある（作品${S.items.length}・写真${imgs}枚）。${S.lastBackup ? `最後のバックアップは${d < 1 ? '今日' : `${d}日前`}（${new Date(S.lastBackup).toLocaleDateString('ja-JP')}）。` : 'まだバックアップしてない。'}`;
}

/* ===== バックアップ ===== */
const blobToData = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
let bkFile = null;
async function prepExport() {
  toast('まとめてる…');
  const imgs = {};
  for (const x of S.items) for (const k of imgKeys(x)) { try { const b = await idb.get(k); if (b) imgs[k] = await blobToData(b); } catch (e) {} }
  const name = `kura-${today()}.json`;
  bkFile = new File([JSON.stringify({ ...S, kura: 4, saved: Date.now(), imgs })], name, { type: 'application/json' });
  $('#bkReady').textContent = `${name}（作品${S.items.length}・写真${Object.keys(imgs).length}枚・${(bkFile.size / 1048576).toFixed(1)}MB）`;
  $('#dBk').showModal();
}
async function shareExport() {
  const file = bkFile; if (!file) return;
  let ok = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); ok = true; } catch (e) { if (e && e.name === 'AbortError') { toast('保存をやめた'); return; } }
  }
  if (!ok) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  S.lastBackup = Date.now(); save(); bkFile = null; $('#dBk').close(); drawSettings(); drawBkHint(); toast('バックアップを保存した');
}
let impData = null;
async function readImport(file) {
  try {
    const d = JSON.parse(await file.text());
    if (!d || !Array.isArray(d.items)) throw 0;
    impData = d;
    const n = d.items.length, im = Object.keys(d.imgs || {}).length, have = new Set(S.items.map((x) => x.id)), fresh = d.items.filter((x) => x && !have.has(x.id)).length;
    $('#impInfo').textContent = `${d.saved ? new Date(d.saved).toLocaleDateString('ja-JP') + 'の' : ''}バックアップ：作品${n}・写真${im}枚。そのうち今ない作品は${fresh}。`;
    $('#dImp').showModal();
  } catch (e) { toast('読み込めなかった（蔵のバックアップじゃないかも）'); }
}
async function putImgs(d, items) {
  for (const x of items) {
    if (x.img && !(d.imgs && d.imgs[x.id])) x.img = false;
    for (const [k, vd] of Object.entries(x.v)) if (vd && vd.img && !(d.imgs && d.imgs[`${x.id}~${k}`])) vd.img = false;
    for (const k of imgKeys(x)) { try { await idb.set(k, await (await fetch(d.imgs[k])).blob()); forget(k); } catch (e) {} }
  }
}
async function doImport(all) {
  const d = impData; if (!d) return;
  $('#dImp').close(); toast('戻してる…');
  try {
    if (all) {
      if (!confirm('今の記録と写真を消して、バックアップの中身に置き換える？')) return;
      const keep = S.lastBackup;
      try { await idb.clear(); } catch (e) {}
      urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
      S = normalize(JSON.parse(JSON.stringify({ ...d, imgs: undefined })));
      S.lastBackup = Math.max(keep || 0, S.lastBackup || 0);
      await putImgs(d, S.items);
      save(); lastCat = null; $('#dSet').close(); render(true); toast(`置き換えた（作品${S.items.length}）`);
    } else {
      const have = new Set(S.items.map((x) => x.id)), add = [];
      for (const raw of d.items) { if (!raw || !raw.id || have.has(raw.id) || !CATS[raw.cat] || !raw.title) continue; const x = fix(JSON.parse(JSON.stringify(raw))); S.items.push(x); add.push(x); }
      await putImgs(d, add);
      if (Array.isArray(d.shelves)) { const hs = new Set(S.shelves.map((h) => h.id)); for (const h of d.shelves) if (h && h.id && !hs.has(h.id) && CATS[h.cat]) S.shelves.push(h); }
      save(); $('#dSet').close(); render(); toast(`${add.length}件を戻した`);
    }
  } catch (e) { toast('戻すのに失敗した'); }
  impData = null;
}

/* ===== 操作 ===== */
document.addEventListener('click', (e) => {
  const t = e.target;
  const dk = t.closest('.dk'); if (dk) { if (dk.dataset.cat !== S.cat) { S.cat = dk.dataset.cat; ui.filter = 'all'; ui.q = ''; ui.tag = ''; $('#q').value = ''; save(); scrollTo({ top: 0 }); render(); } return; }
  const fl = t.closest('[data-filter]'); if (fl) { ui.filter = fl.dataset.filter; render(); return; }
  const tf = t.closest('[data-tagf]'); if (tf) { ui.tag = ui.tag === tf.dataset.tagf ? '' : tf.dataset.tagf; render(); return; }
  const vw = t.closest('[data-view]'); if (vw) { if (S.view[S.cat] !== vw.dataset.view) { S.view[S.cat] = vw.dataset.view; save(); render(true); } return; }
  const rtb = t.closest('[data-rtab]'); if (rtb) { ui.rtab = rtb.dataset.rtab; drawList(true); return; }
  const tr = t.closest('[data-tier]'); if (tr) { openOrdC(tr.dataset.tier); return; }
  const nx = t.closest('[data-nx]');
  if (nx) {
    const it = findItem(nx.dataset.nid); if (!it) return;
    const C = CATS[it.cat];
    if (nx.dataset.nx === 'buy') { const m = missing(it); if (m.length) { vget(it, m[0]).o = 1; logEv(it, 'buy', m[0]); toast(`${C.volN(m[0])}を買った`); } }
    else { it.cur = Math.min(it.vols, it.cur + 1); logEv(it, 'cur', it.cur); toast(`${C.volN(it.cur)}まで${C.did}`); autoStatus(it, () => { touch(it); render(); }); }
    touch(it); render(); return;
  }
  const op = t.closest('[data-oid]'); if (op) { openItem(op.dataset.oid, op); return; }
  const tw = t.closest('[data-tid]'); if (tw) { $('#dTower').close(); openItem(tw.dataset.tid, null); return; }
  const tws = t.closest('[data-tow]'); if (tws) { ui.tow = tws.dataset.tow; drawTower(); return; }
  const card = t.closest('#list [data-id]');
  if (card) {
    if (card.classList.contains('spine') && !reduced) { card.classList.add('out'); setTimeout(() => { card.classList.remove('out'); openItem(card.dataset.id, card); }, 260); }
    else if (card.classList.contains('tk') && !reduced) { card.classList.add('tear'); setTimeout(() => { card.classList.remove('tear'); openItem(card.dataset.id, null); }, 300); }
    else openItem(card.dataset.id, card);
    return;
  }
  /* どっちが好き？ */
  const cm = t.closest('[data-cmp]'); if (cm && cmp) { const c = cmp; cmp = null; c.res(c.a.id === cm.dataset.cmp ? c.a : c.b); return; }
  /* 自分で並べ替え */
  const mv = t.closest('[data-mv]'); if (mv && ord && ord.tmp) { const i = +mv.dataset.mi, j = i + +mv.dataset.mv; if (j < 0 || j >= ord.tmp.length) return; const a = ord.tmp; [a[i], a[j]] = [a[j], a[i]]; drawOrd(a[j].id); return; }
  /* 巻のシート */
  const vs2 = t.closest('#volRate [data-vstar]');
  if (vs2 && vol) { const x = findItem(vol.id), d = vget(x, vol.n), i = +vs2.dataset.vstar; d.r = d.r === i ? i - 0.5 : i; logEv(x, 'vr', [vol.n, d.r]); touch(x); $('#volRate').innerHTML = rateHTML(d.r, 'vstar', 'vrateclear'); const s = $(`#volRate [data-vstar="${i}"]`); s.classList.add('pop'); burst(s); return; }
  const x = curItem();
  if (x) {
    const C = CATS[x.cat];
    const redraw = () => { if (curItem() === x) renderPage(x); };
    const st = t.closest('#pSt [data-st]'); if (st) {
      const v = st.dataset.st; if (v === x.status) return;
      if (v === 'done') { askDone(x, redraw); return; }
      setStatus(x, v); touch(x); drawSt(x); if (x.series) drawVols(x); drawTl(x); return;
    }
    const fg = t.closest('[data-flag]'); if (fg) { x[fg.dataset.flag] = !x[fg.dataset.flag]; touch(x); drawFlags(x); return; }
    const sr = t.closest('#pRate [data-star]'); if (sr) {
      const i = +sr.dataset.star, cur = rt(x); x.rating = cur === i ? i - 0.5 : i; if (x.series && volRates(x).length) x.rateFix = true;
      logEv(x, 'rate', x.rating); touch(x); drawRate(x); drawTl(x); const s = $(`#pRate [data-star="${i}"]`); s.classList.add('pop'); burst(s); return;
    }
    const vo = t.closest('[data-vol]'); if (vo) {
      const v = +vo.dataset.vol;
      if (ui.vmode === 'open') { openVol(x, v); return; }
      if (ui.vmode === 'own') { const d = vget(x, v); if (!x.ownOn) { x.ownOn = true; for (let i = 1; i <= x.cur; i++) vget(x, i).o = 1; } if (d.o) delete d.o; else { d.o = 1; logEv(x, 'buy', v); } touch(x); drawVols(x, v); drawTl(x); return; }
      x.cur = x.cur === v ? v - 1 : v; logEv(x, 'cur', x.cur); autoStatus(x, redraw); touch(x); drawVols(x, v); drawSt(x); drawTl(x); return;
    }
    const vm = t.closest('[data-vm]'); if (vm) { ui.vmode = vm.dataset.vm; if (ui.vmode === 'own' && !x.ownOn) toast('タップした巻が「持ってる」になる'); drawVols(x); return; }
    const vno = t.closest('[data-vopen]'); if (vno) { openVol(x, +vno.dataset.vopen); return; }
    const vs = t.closest('[data-vstep]'); if (vs) {
      x.cur = Math.max(0, x.cur + +vs.dataset.vstep); if (x.vols && x.cur > x.vols) { if (x.done) x.cur = x.vols; else { x.vols = x.cur; logEv(x, 'vols', x.vols); } }
      logEv(x, 'cur', x.cur); autoStatus(x, redraw); touch(x); drawVols(x, x.cur); drawSt(x); drawTl(x); return;
    }
    const ps = t.closest('[data-pstep]'); if (ps) {
      const k = +ps.dataset.pstep;
      if (x.cat === 'book') { x.page = clamp((x.page || 0) + k, 0, x.pages); logEv(x, 'page', x.page); }
      else { x.pct = clamp((+x.pct || 0) + k, 0, 100); logEv(x, 'pct', x.pct); }
      autoStatus(x, redraw);
      touch(x); drawProg(x); drawSt(x); drawTl(x); return;
    }
    const hs = t.closest('[data-hstep]'); if (hs) { x.hours = Math.max(0, Math.round(((+x.hours || 0) + +hs.dataset.hstep) * 10) / 10) || ''; touch(x); drawProg(x); return; }
    const tg = t.closest('[data-tag]'); if (tg) { const v = tg.dataset.tag; closeItem(() => { ui.tag = v; ui.filter = 'all'; render(); scrollTo({ top: 0 }); }); return; }
    const si = t.closest('[data-shin]'); if (si) {
      const id = si.dataset.shin;
      if (x.sh.includes(id)) x.sh = x.sh.filter((s) => s !== id); else { x.sh.push(id); logEv(x, 'sh', (shelvesOf(x.cat).find((h) => h.id === id) || {}).name); }
      touch(x); drawShelves(x); drawTl(x); return;
    }
    void C;
  }
  const est = t.closest('[data-est]'); if (est) { draft.status = est.dataset.est; $$('#stSeg button').forEach((b) => b.classList.toggle('on', b === est)); drawWhen(); return; }
  const wmb = t.closest('[data-wm]'); if (wmb) { const box = wmb.closest('.whenui'), st = box.id === 'whenUI' ? draft : doneCtx; if (!st) return; st.date = readWhen(box, st) || st.date; st.wm = wmb.dataset.wm; drawWhenUI(box, st); return; }
  const es = t.closest('#editRate [data-estar]'); if (es) { const i = +es.dataset.estar; draft.rating = draft.rating === i ? i - 0.5 : i; drawEditRate(); $(`#editRate [data-estar="${i}"]`).classList.add('pop'); return; }
  const xs = t.closest('#editExp [data-xstar]'); if (xs) { const i = +xs.dataset.xstar; draft.exp = draft.exp === i ? i - 0.5 : i; drawEditRate(); $(`#editExp [data-xstar="${i}"]`).classList.add('pop'); return; }
  const sw = t.closest('[data-sw]'); if (sw) { draft.color = draft.color === sw.dataset.sw ? '' : sw.dataset.sw; drawSwatches(); drawPhoto(); return; }
  const md = t.closest('[data-media]'); if (md) { draft.media = draft.media === md.dataset.media ? '' : md.dataset.media; drawHave(); return; }
  const fm = t.closest('[data-fmt]'); if (fm) { const k = fm.dataset.fmt; draft.fmt = draft.fmt.includes(k) ? draft.fmt.filter((q) => q !== k) : [...draft.fmt, k]; drawHave(); return; }
  const ar = t.closest('[data-ar]'); if (ar && crop) { crop.ar = +ar.dataset.ar; cropLayout(true); return; }
  const a = t.closest('[data-act]'); if (!a) return;
  const vx = vol && findItem(vol.id);
  switch (a.dataset.act) {
    case 'new': openEdit(null); break;
    case 'edit': openEdit(curId); break;
    case 'back': closeItem(); break;
    case 'close': a.closest('dialog').close(); break;
    case 'settings': drawSettings(); $('#dSet').showModal(); break;
    case 'tower': drawTower(); $('#dTower').showModal(); break;
    case 'rateclear': if (x) { x.rating = 0; x.rateFix = false; logEv(x, 'rate', 0); touch(x); drawRate(x); drawTl(x); } break;
    case 'rateavg': if (x) { x.rateFix = false; touch(x); drawRate(x); toast('巻ごとの平均にした'); } break;
    case 'erateclear': draft.rating = 0; drawEditRate(); break;
    case 'xrateclear': draft.exp = 0; drawEditRate(); break;
    case 'dust': if (x) { x.touched = Date.now(); logEv(x, 'dust', 1); save(); renderPage(x); toast('ふっ…きれいになった'); } break;
    case 'volplus': if (x) { x.vols = (x.vols || 0) + 1; logEv(x, 'vols', x.vols); touch(x); drawVols(x, x.vols); drawTl(x); toast(`${CATS[x.cat].volN(x.vols)}を足した`); } break;
    case 'vjump': if (x) { const n = int($('#vjump').value); if (n >= 1 && n <= x.vols) openVol(x, n); } break;
    case 'setpages': if (x) { const n = int($('#pPages').value); if (n) { x.pages = n; touch(x); drawProg(x); } } break;
    case 'vprev': if (vol) { vol.n = Math.max(1, vol.n - 1); drawVolSheet(); } break;
    case 'vnext': if (vol && vx) { vol.n = Math.min(vx.vols, vol.n + 1); drawVolSheet(); } break;
    case 'vrateclear': if (vx) { delete vget(vx, vol.n).r; touch(vx); $('#volRate').innerHTML = rateHTML(0, 'vstar', 'vrateclear'); } break;
    case 'volphotorm': if (vx) { const k = `${vx.id}~${vol.n}`; idb.del(k).catch(() => {}); forget(k); delete vget(vx, vol.n).img; touch(vx); drawVolSheet(); } break;
    case 'volread': if (vx) {
      const n = vol.n; vx.cur = n <= vx.cur ? n - 1 : n; logEv(vx, 'cur', vx.cur); touch(vx);
      $('#dVol').close();
      autoStatus(vx, () => { if (curItem() === vx) renderPage(vx); });
      toast(`${CATS[vx.cat].volN(vx.cur || 0)}まで${CATS[vx.cat].did}`);
    } break;
    case 'doneok': if (doneCtx) {
      const st = doneCtx, d = readWhen($('#doneUI'), st);
      if (st.wm !== 'today' && st.wm !== 'none' && !d) { toast('時期を入れてね（わからなければ「覚えてない」）'); break; }
      setStatus(st.x, 'done', d); touch(st.x); doneCtx = null; $('#dDone').close(); toast(`「${stLabel(st.x.cat, 'done')}」にした`);
      if (st.then) st.then(); else render();
      if (curItem() === st.x) renderPage(st.x);
    } break;
    case 'again':
      if (x && confirm(`もう一度${CATS[x.cat].verb}？\n今回の評価と日付は「${x.round}回目」として残るよ。`)) {
        x.rounds.push({ n: x.round, date: x.date || '', rating: rt(x), theater: x.theater || '', fmt: x.fmt.slice() });
        x.round += 1; x.rating = 0; x.rateFix = false; x.date = ''; if (x.series) x.cur = 0; if (x.cat === 'book') x.page = 0; if (x.cat === 'game' && !x.series) x.pct = '';
        logEv(x, 'round', x.round); x.status = 'doing'; touch(x); renderPage(x); toast(`${x.round}回目を始めた`);
      }
      break;
    case 'newshelf': {
      const cat = x ? x.cat : S.cat;
      const name = (prompt(`${CATS[cat].name}の新しい棚の名前（例：殿堂入り）`) || '').trim().slice(0, 20);
      if (!name) break;
      if (shelvesOf(cat).some((h) => h.name === name)) { toast('同じ名前の棚がもうある'); break; }
      const h = { id: uid(), name, cat }; S.shelves.push(h);
      if (x) { x.sh.push(h.id); logEv(x, 'sh', name); touch(x); drawShelves(x); drawTl(x); save(); toast(`棚「${name}」をつくって入れた`); }
      else { ui.filter = 'sh:' + h.id; save(); render(); toast(`棚「${name}」をつくった`); if (itemsOf(cat).length) openPick(); }
      break;
    }
    case 'pick': openPick(); break;
    case 'pickok': if (pick) pickSave(); break;
    case 'shren': {
      const h = shelvesOf(S.cat).find((q) => 'sh:' + q.id === ui.filter); if (!h) break;
      const name = (prompt('新しい名前', h.name) || '').trim().slice(0, 20); if (!name) break;
      h.name = name; save(); render(); break;
    }
    case 'shdel': {
      const h = shelvesOf(S.cat).find((q) => 'sh:' + q.id === ui.filter); if (!h) break;
      if (confirm(`棚「${h.name}」を消す？\n中の作品は消えないよ。`)) { S.shelves = S.shelves.filter((q) => q !== h); for (const it of S.items) it.sh = it.sh.filter((s) => s !== h.id); ui.filter = 'all'; save(); render(); toast('棚を消した'); }
      break;
    }
    case 'ordcmp': $('#dOrdC').close(); runCmp(false); break;
    case 'ordcmpall': $('#dOrdC').close(); runCmp(true); break;
    case 'ordman': $('#dOrdC').close(); openOrd(); break;
    case 'ordok': if (ord && ord.tmp) { ord.tmp.forEach((q, i) => { q.tord = i; q.tk = ord.t; }); save(); $('#dOrd').close(); drawList(); toast(`${ord.t}の順番を保存した`); } break;
    case 'cmpeq': if (cmp) { const c = cmp; cmp = null; c.res(c.b); } break;
    case 'cropok': cropFinish(false); break;
    case 'cropraw': cropFinish(true); break;
    case 'photorm': draft.newImg = null; draft.rmImg = true; drawPhoto(); break;
    case 'delete': {
      const it = findItem(draft.id);
      if (it && confirm(`「${it.title}」を消す？`)) {
        S.items = S.items.filter((i) => i !== it); for (const k of imgKeys(it)) { idb.del(k).catch(() => {}); forget(k); }
        save(); $('#dEdit').close(); if (curId === it.id) { $('#page').hidden = true; document.body.classList.remove('paged'); curId = null; } render(); toast('消した');
      }
      break;
    }
    case 'export': prepExport(); break;
    case 'bkshare': shareExport(); break;
    case 'import': $('#imp').click(); break;
    case 'impadd': doImport(false); break;
    case 'impall': doImport(true); break;
    case 'wipe':
      if (confirm('すべての記録と写真を消す？（元に戻せない）') && confirm('本当に消していい？')) {
        idb.clear().catch(() => {}); urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
        const set = S.set; S = DEF(); S.set = set; save(); $('#dSet').close(); lastCat = null; render(); toast('全部消した');
      }
      break;
  }
});
/* 進み具合のつまみ */
document.addEventListener('input', (e) => {
  if (e.target.id !== 'pRange') return; const x = curItem(); if (!x) return;
  const v = +e.target.value; $('#pPageN').textContent = v; if (x.cat === 'book' && $('#pPct')) $('#pPct').textContent = Math.round(v / x.pages * 100) + '%';
});
document.addEventListener('change', (e) => {
  if (e.target.id !== 'pRange') return; const x = curItem(); if (!x) return;
  const v = +e.target.value;
  if (x.cat === 'book') { x.page = v; logEv(x, 'page', v); } else { x.pct = v; logEv(x, 'pct', v); }
  autoStatus(x, () => { if (curItem() === x) renderPage(x); });
  touch(x); drawSt(x); drawTl(x);
});
$('#serSw').addEventListener('click', () => { draft.series = !draft.series; setSw('#serSw', draft.series); $('#serF').hidden = !draft.series; drawProgF(); drawEditRate(); });
$('#doneSw').addEventListener('click', () => { draft.done = !draft.done; setSw('#doneSw', draft.done); });
$('#volCvSw').addEventListener('click', () => { const x = vol && findItem(vol.id); if (!x) return; x.coverVol = x.coverVol === vol.n ? 0 : vol.n; touch(x); setSw('#volCvSw', x.coverVol === vol.n); toast(x.coverVol ? `${CATS[x.cat].volN(vol.n)}を表紙にした` : '表紙を元に戻した'); });
$('#volOwnSw').addEventListener('click', () => { const x = vol && findItem(vol.id); if (!x) return; const d = vget(x, vol.n); if (!x.ownOn) { x.ownOn = true; for (let i = 1; i <= x.cur; i++) vget(x, i).o = 1; } if (d.o) delete d.o; else { d.o = 1; logEv(x, 'buy', vol.n); } touch(x); setSw('#volOwnSw', owned(x, vol.n)); });
const togg = (k) => () => { S.set[k] = !S.set[k]; save(); drawSettings(); render(); };
$('#todSw').addEventListener('click', togg('tod')); $('#moneySw').addEventListener('click', togg('money')); $('#dustSw').addEventListener('click', togg('dust'));
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'dCrop' && d.id !== 'dCmp') d.close(); }));
$('#q').addEventListener('input', (e) => { ui.q = e.target.value.trim(); drawList(); });
$('#sort').addEventListener('change', (e) => { S.sort = e.target.value; save(); drawList(); });
$('#imp').addEventListener('change', (e) => { if (e.target.files[0]) readImport(e.target.files[0]); e.target.value = ''; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#page').hidden && !$('dialog[open]')) closeItem(); });
// 背景の大きな文字をスクロールに合わせてゆっくり動かす
let ticking = false;
addEventListener('scroll', () => { if (!ticking && !reduced) { ticking = true; requestAnimationFrame(() => { $('#giant').style.transform = `translateY(${(-scrollY * 0.18).toFixed(1)}px)`; ticking = false; }); } }, { passive: true });
setInterval(applyNight, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { applyNight(); drawBkHint(); } });

let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }

render(true);
if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
window.__k = { S: () => S, render, gen: genHTML };
})();
