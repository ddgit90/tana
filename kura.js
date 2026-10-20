(() => {
'use strict';
const KEY = 'kura.v1';
const VER = 'v24';
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
  anime: { name: 'アニメ・ドラマ', short: 'アニメ', unit: '作品', creator: '制作・監督', vol: '話', volN: (n) => `第${n}話`, st: [['none', 'まだ'], ['doing', '観てる'], ['done', '観た'], ['pause', '中断']], later: 'あとで観る', shelf: 'screen', side: '', verb: '観る', did: '観た', act: '観た', start: '観はじめた', doneQ: '観終えた？', whenQ: 'いつ観終えた？', room: '#0f3d4a', own: false, ser: { label: '話数を記録', hint: '何話まで観たか、話ごとの評価・感想を残せる', on: '放送中', fin: '放送終了', have: '放送済み', nw: '新しい話', finQ: '放送が終わってる', finH: 'オフなら「放送中」。あとから新しい話を足せる', volsL: '今出てる話数', curL: '観たところ（話）' }, media: ['配信', 'テレビ', 'ディスク', '映画館'] },
  movie: { name: '映画', unit: '本', creator: '監督', vol: '作', volN: (n) => `${n}作目`, st: [['none', 'まだ'], ['doing', 'シリーズ途中'], ['done', '観た'], ['pause', '中断']], later: 'あとで観る', shelf: 'ticket', side: '', verb: '観る', did: '観た', act: '観た', start: '観はじめた', doneQ: '観た？', whenQ: 'いつ観た？', room: '#3d0c18', own: false, ser: SER_WORKS('観たところ（作目）', '何作目まで観たか、作品ごとの評価・感想・写真を残せる'), media: ['映画館', '配信', 'ディスク', 'テレビ'] },
  book: { name: '本', unit: '冊', creator: '著者', vol: '巻', volN: (n) => `${n}巻`, st: [['none', '未読'], ['doing', '読んでる'], ['done', '読んだ'], ['pause', '中断']], later: 'あとで読む', shelf: 'spine', side: 'right', verb: '読む', did: '読んだ', act: '読んだ', start: '読みはじめた', doneQ: '読み終えた？', whenQ: 'いつ読み終えた？', room: '#143c2f', own: true, ser: SER_BOOK, media: ['紙', '電子', '両方'] },
  game: { name: 'ゲーム', unit: '本', creator: '開発・メーカー', vol: '作', volN: (n) => `${n}作目`, st: [['none', '未プレイ'], ['doing', 'プレイ中'], ['done', 'クリア'], ['pause', '中断']], later: 'あとで遊ぶ', shelf: 'spine', side: 'left', verb: '遊ぶ', did: '遊んだ', act: 'クリア', start: 'プレイを始めた', doneQ: 'クリアした？', whenQ: 'いつクリアした？', room: '#2a1d52', own: true, ser: SER_WORKS('遊んだところ（作目）', 'シリーズの何作目まで遊んだか、作品ごとの評価・感想・写真を残せる'), media: ['パッケージ', 'ダウンロード'] },
  art: { name: '芸術', unit: '点', creator: '作家', vol: '点', volN: (n) => `${n}点目`, st: [['none', 'まだ'], ['done', '見た']], later: '見に行きたい', shelf: 'frame', side: '', verb: '見る', did: '見た', act: '見た', start: '見はじめた', doneQ: '見た？', whenQ: 'いつ見た？', room: '#ecebe7', own: false, ser: null, media: null },
};
CATS.music = { name: '音楽', unit: '作品', creator: 'アーティスト', vol: '曲', volN: (n) => `${n}曲目`, st: [['none', 'まだ'], ['doing', '聴いてる'], ['done', '聴いた']], shelf: 'disc', side: '', verb: '聴く', did: '聴いた', act: '聴いた', start: '聴きはじめた', doneQ: '聴いた？', whenQ: 'いつ聴いた？', room: '#18181d', own: false, ser: null, media: ['CD', 'レコード', '配信', 'ダウンロード'] };
const ORDER = ['manga', 'anime', 'movie', 'music', 'book', 'game', 'art'];
/* 部屋の中の種類（アニメ／ドラマ、曲／アルバム／ライブ） */
const KINDS = { manga: [['yoko', '漫画'], ['tate', '縦読み']], anime: [['anime', 'アニメ'], ['drama', 'ドラマ']], music: [['song', 'シングル'], ['album', 'アルバム'], ['live', 'ライブ']] };
const kindOf = (x) => x.kind || (KINDS[x.cat] ? KINDS[x.cat][0][0] : '');
const TST = [['apply', '申し込んだ'], ['lot', '抽選中'], ['win', '当選'], ['lose', '落選'], ['went', '行った']];
const tstLabel = (k) => (TST.find((q) => q[0] === k) || ['', ''])[1];
/* 「〇〇別」で絞り込める項目 */
const FKEYS = (cat) => [['genre', 'ジャンル', cat === 'music'], ['creator', cat === 'music' && S.items.some(isCl) ? 'アーティスト・作曲家' : CATS[cat].creator, true], ['perf', '演奏者', cat === 'music'], ['platform', '機種', cat === 'game'], ['media', '持ち方', !!CATS[cat].media], ['app', cat === 'manga' || cat === 'book' ? '電子書籍のアプリ' : '配信サービス', !!CATS[cat].media], ['where', '置き場所', !!CATS[cat].media], ['theater', '劇場', cat === 'movie'], ['venue', '会場', cat === 'music'], ['place', '見た場所', cat === 'art']].filter((q) => q[2]);
const MEDIA_M = [['CD', 'CD'], ['レコード', 'レコード'], ['配信', '配信'], ['ダウンロード', 'DL']];
const GENRES = ['邦楽', '洋楽', 'クラシック', 'アニソン', 'ボカロ', 'サントラ', 'BGM', 'ジャズ', 'K-POP'];
const BOOM_MAX = 5;
/* 作品ごとの数え方（漫画・本は「話」で数えることもできる） */
/* 単位の言い方（「作」だけだと不自然なので「作品」に） */
const volW = (C) => (C.vol === '作' ? '作品' : C.vol);
/* 続き・続編の「出る日」の言い方：部屋ごとに（発売・放送・公開・更新） */
function relWord(x) {
  const C = Cx(x), ser = !!(x.series && C.ser), ep = x.unit === 'ep';
  const w = x.cat === 'anime' ? (ser ? ['放送・配信日', '放送'] : ['放送・公開日', '公開']) : x.cat === 'movie' ? ['公開日', '公開'] : ep ? ['更新日', '更新'] : ['発売日', '発売'];
  const what = ser ? C.volN((x.vols || 0) + 1) : x.cat === 'music' ? '新譜・新曲' : x.cat === 'anime' ? '続編・新シーズン' : x.cat === 'movie' ? '続編' : '続編・新作';
  const next = ser ? (x.cat === 'manga' || x.cat === 'book' ? (ep ? '次の話' : '次の新刊') : `次の${volW(C)}`) : what;
  return { what, day: w[0], v: w[1], label: `${next}の${w[0]}（わかれば）` };
}
/* ===== 巻（話で読む漫画・本）／シーズン（アニメ）：話をまとめる箱 ===== */
const isTate = (x) => x.cat === 'manga' && x.kind === 'tate';
const partMode = (x) => (x.cat === 'anime' && x.series ? 'season' : (x.cat === 'manga' || x.cat === 'book') && x.series && x.unit === 'ep' && !isTate(x) ? 'vol' : '');
const partNm = (x, i) => (partMode(x) === 'season' ? `${i}期` : `${i}巻`);
function partsOf(x) { if (!Array.isArray(x.parts)) return []; let from = 1; return x.parts.map((p, i) => { const n = p.n || 0, r = { ...p, i: i + 1, name: p.name || partNm(x, i + 1), from, to: from + n - 1 }; from += n; return r; }); }
const partOf = (x, k) => partsOf(x).find((p) => p.n && k >= p.from && k <= p.to);
const partKey = (x, p) => `${x.id}~p${p.id}`;
const seasoned = (x) => partMode(x) === 'season' && Array.isArray(x.parts) && x.parts.length > 0;
function Cx(x) {
  const C = CATS[x.cat];
  if (seasoned(x)) return { ...C, volN: (k) => { const p = partOf(x, k); return p ? `${p.name} 第${k - p.from + 1}話` : `第${k}話`; } };
  if (x.unit === 'ep' && (x.cat === 'manga' || x.cat === 'book')) return { ...C, vol: '話', volN: (n) => `第${n}話`, own: false, ser: { ...C.ser, have: '今', nw: '新しい話', volsL: '今出てる話数（わからなければ空でOK）', curL: '読んだところ（話）' } };
  return C;
}
/* 話数が多いものは、箱を並べずに「＋1話」中心の軽い表示にする */
const light = (x) => !!x.series && (x.unit === 'ep' || (x.cat === 'anime' && x.vols > 60 && !(Array.isArray(x.parts) && x.parts.length)));
const visRooms = () => { const h = S.set.hidden || []; const v = ORDER.filter((k) => !h.includes(k)); return v.length ? v : ['manga']; };
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
const TIERS = [['S', '★5'], ['A', '★4.5'], ['B', '★4'], ['C', '★3〜3.5'], ['D', '★2〜2.5'], ['E', '★2未満']];
/* シリーズの平均（4.3など）は0.5刻みに丸めて段を決める */
const tierOf = (r) => { if (!(r > 0)) return ''; const h = Math.round(r * 2) / 2; return h >= 5 ? 'S' : h >= 4.5 ? 'A' : h >= 4 ? 'B' : h >= 3 ? 'C' : h >= 2 ? 'D' : 'E'; };

/* ===== データ（前の版から引き継ぐ） ===== */
const DEF = () => ({ v: 3, cat: 'manga', view: Object.fromEntries(ORDER.map((k) => [k, 'shelf'])), sort: 'new', items: [], shelves: [], set: { tod: true, money: false, dust: true, hidden: [], simple: false }, tagGroups: [], best: {}, boom: {}, lastBackup: 0 });
let S = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.items)) return normalize(d);
  } catch (e) { console.warn('kura load', e); }
  return DEF();
}
function normalize(d) {
  const o = { ...DEF(), ...d, view: { ...DEF().view, ...(d.view || {}) }, shelves: Array.isArray(d.shelves) ? d.shelves.filter((h) => h && h.id && CATS[h.cat]) : [], set: { ...DEF().set, ...(d.set || {}) } };
  delete o.imgs; delete o.kura;
  if (!CATS[o.cat]) o.cat = 'manga';
  o.items = o.items.filter((x) => x && x.id && CATS[x.cat] && x.title);
  o.items.forEach(fix);
  if (!o.best || typeof o.best !== 'object') o.best = {};
  if (!o.boom || typeof o.boom !== 'object') o.boom = {};
  if (!Array.isArray(o.set.hidden)) o.set.hidden = [];
  if (!Array.isArray(o.tagGroups)) o.tagGroups = [];
  /* ティアの段の分け方が変わったので、S以外の並び順はリセット */
  if ((d.v || 1) < 3) for (const x of o.items) if (x.tk && x.tk !== 'S') { delete x.tk; delete x.tord; }
  o.v = 3;
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
  if (!Array.isArray(x.links)) x.links = [];
  if (typeof x.perf !== 'string') x.perf = '';
  if (x.parts != null && !Array.isArray(x.parts)) delete x.parts;
  if (x.unit === 'ep' && x.series && !x.parts && Array.isArray(x.ownB) && x.ownB.length) { const mx = Math.min(Math.max(...x.ownB), 500); x.parts = Array.from({ length: mx }, (_, i) => ({ id: uid(), n: 0, own: x.ownB.includes(i + 1) })); }
  return x;
}
function save() { try { syncSingles(); } catch (e) { console.error(e); } try { syncParts(); } catch (e) { console.error(e); } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('保存できなかった（保存領域がいっぱいかも）'); } }
const ui = { filter: 'all', media: '', F: {}, Ft: null, open: new Set((() => { try { return JSON.parse(localStorage['kura.open'] || '[]'); } catch (e) { return []; } })()), adv: false, fk: '', fv: '', tagEdit: false, q: '', tag: '', tagOpen: false, kind: '', genre: '', genreOpen: false, byear: new Date().getFullYear(), rtab: 'tier', vmode: 'open', tow: 'stack' };

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
    if (el.closest('.tv, .tvh')) {
      const bg = new Image(); bg.alt = ''; bg.className = 'blur'; bg.src = u; im.className = 'fit';
      if (g) g.replaceWith(bg); else el.prepend(bg);
      bg.after(im); continue;
    }
    if (g) g.replaceWith(im); else el.prepend(im);
  }
}
const imgKeys = (x) => [x.img ? x.id : null, ...Object.entries(x.v || {}).filter(([, d]) => d && d.img).map(([n]) => `${x.id}~${n}`), ...(x.parts || []).filter((p) => p.img).map((p) => `${x.id}~p${p.id}`)].filter(Boolean);
const imgKey = (x) => x._alb ? ((x._alb.v[x._n] || {}).img ? x.id : imgKey(x._alb)) : (x.coverPart && (x.parts || []).some((p) => p.id === x.coverPart && p.img) ? `${x.id}~p${x.coverPart}` : x.coverVol && x.v[x.coverVol] && x.v[x.coverVol].img ? `${x.id}~${x.coverVol}` : x.img ? x.id : '');
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
const defaultAr = (cat) => (cat === 'art' || cat === 'music' ? 1 : 0.6667);
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
const partAvg = (x) => { if (!partMode(x)) return 0; const a = (x.parts || []).map((p) => p.r).filter((r) => r > 0); return a.length ? Math.round(a.reduce((q, r) => q + r, 0) / a.length * 10) / 10 : 0; };
function rt(x) { if (x.series && !x.rateFix) { const pa = partAvg(x); if (pa) return pa; const a = volAvg(x); if (a) return a; } return x.rating || 0; }
function frac(x) {
  if (x.cat === 'music') return null;
  if (x.series && x.vols) return Math.min(1, x.cur / x.vols);
  if (x.cat === 'book' && x.pages) return Math.min(1, (x.page || 0) / x.pages);
  if (x.cat === 'game' && x.pct !== '' && x.pct != null && !x.series) return Math.min(1, x.pct / 100);
  return null;
}
const progBar = (x) => { const f = frac(x); return f != null && (f > 0 || x.series) ? `<span class="prog"><i style="width:${(f * 100).toFixed(1)}%"></i></span>` : ''; };
function progText(x) {
  const u = Cx(x).vol;
  if (x.cat === 'music') return '';
  if (x.series && x.unit === 'ep') return x.vols ? `${x.cur}/${x.vols}${u}` : x.cur ? `${x.cur}${u}まで` : '';
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
  const n = vn || (x.series && x.unit !== 'ep' ? x.coverVol || 1 : x.coverVol || 0), L = [...String(x.title)].length;
  /* タイトルの長さで文字の大きさを決める（長いときは2列・2行に） */
  const fit = (max, room, min) => { let f = room / (L * 1.08); if (f < min * 1.4) f = room / (Math.ceil(L / 2) * 1.08); return clamp(f, min, max).toFixed(1) + 'cqw'; };
  switch (x.cat) {
    case 'manga': return `<div class="gen g-manga" style="--col:${c}">${cr ? `<small style="color:${fg}">${cr}</small>` : ''}<b style="font-size:${fit(17, 98, 8)}">${t}</b>${n ? `<i>${n}</i>` : ''}</div>`;
    case 'book': return `<div class="gen g-book" style="--col:${c}"><b style="font-size:${fit(12.5, 70, 7)}">${t}</b>${cr ? `<small>${cr}</small>` : ''}<i></i></div>`;
    case 'movie': return `<div class="gen g-movie" style="--col:${c}">${x.year ? `<em>${esc(x.year)}</em>` : ''}${cr ? `<small>監督 ${cr}</small>` : ''}<b style="font-size:${fit(13, 80, 8)}">${t}</b><i></i></div>`;
    case 'anime': return `<div class="gen g-anime" style="--col:${c}"><em>${esc(vn || x.coverVol ? CATS.anime.volN(vn || x.coverVol) : x.season || (x.kind === 'drama' ? 'ドラマ' : 'TV'))}</em><b style="font-size:${fit(10.5, 76, 7)}">${t}</b></div>`;
    case 'game': return `<div class="gen g-game" style="--col:${c};--fg:${fg};--pc:${pfColor(x.platform)}"><em>${esc(x.platform || 'GAME')}</em><b style="font-size:${fit(12, 74, 8)}">${t}</b><i></i>${cr ? `<small>${cr}</small>` : ''}</div>`;
    case 'music': {
      const k = kindOf(x), em = x._em || (k === 'live' ? `LIVE${x.ldate ? ' ' + x.ldate.slice(0, 4) : ''}` : x.media === 'CD' ? (k === 'album' ? 'CD ALBUM' : 'CD SINGLE') : x.media === 'レコード' ? (k === 'album' ? 'LP' : '7" SINGLE') : k === 'album' ? 'ALBUM' : 'SINGLE');
      return `<div class="gen g-music${x.media === 'CD' ? ' cd' : ''}" style="--col:${c};--fg:${fg}"><i></i><em>${em}</em><b style="font-size:${fit(13, 62, 7)}">${t}</b>${cr ? `<small>${cr}</small>` : ''}</div>`;
    }
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
/* 文章の中のURLを押せるリンクにする（http(s)://〜） */
const linkify = (t) => esc(t).replace(/https?:\/\/[^\s<>"'（）「」『』、。！？]+/g, (u) => { const clean = u.replace(/[.,!?;:)\]]+$/, ''), rest = u.slice(clean.length); let label = clean.replace(/^https?:\/\/(www\.)?/, ''); if (label.length > 42) label = label.slice(0, 40) + '…'; return `<a class="ulink" href="${clean}" target="_blank" rel="noopener noreferrer">${label}</a>${rest}`; });
const isCl = (x) => x.cat === 'music' && kindOf(x) !== 'live' && (x.genre || '').trim() === 'クラシック';
const meta = (x) => x.cat === 'music' ? (kindOf(x) === 'live' ? [x.creator, x.venue, x.ldate ? fmtWhen(x.ldate) : ''] : [kindOf(x) === 'album' ? 'アルバム' : '', x.creator, isCl(x) ? x.perf : '', x.genre, x.year]).filter(Boolean).join('　') : [x.kind === 'drama' ? 'ドラマ' : x.kind === 'tate' ? '縦読み' : '', x.creator, x.cat === 'game' ? x.platform : '', x.season, x.year].filter(Boolean).join('　');
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
  const C = Cx(x), u = C.vol;
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
    case 'rerate': return `★${e.v[0]} → ★${e.v[1]} に再評価`;
    case 'tst': return `チケット：${tstLabel(e.v)}`;
    case 'wbuy': return `手元に買った${e.v ? `（${e.v}）` : ''}`;
    default: return '';
  }
}
const shelvesOf = (cat) => (S.shelves || []).filter((h) => h.cat === cat);
const itemsOf = (cat) => S.items.filter((x) => x.cat === cat);
const findItem = (id) => S.items.find((i) => i.id === id);

/* ===== お金 ===== */
/* [いつ, いくら, 状態]。シリーズの巻は「そこまで読んだか」で分ける */
function spends(x) {
  const o = [];
  if (x.want) return o; /* ほしい物は、まだ買ってないので入れない */
  const tt = (v) => (v === 0 ? 0 : v || x.created);
  if (x.price) o.push([tt(x.pt), x.price, x.status]);
  if (x.gp) o.push([tt(x.pt), x.gp, x.status]);
  if (x.tp) o.push([tt(x.pt), x.tp, x.status]);
  for (const [k, d] of Object.entries(x.v)) if (d && d.p && !(x.ownOn && !d.o)) o.push([tt(d.pt), d.p, x.series ? (+k <= x.cur ? 'done' : x.status === 'pause' ? 'pause' : 'none') : x.status]);
  /* 巻（話で読むとき）は「持ってる」にした巻だけ。シーズンは払った分 */
  const pm = partMode(x); if (pm) for (const q of partsOf(x)) if (q.p && (pm === 'season' || q.own)) o.push([tt(q.pt), q.p, q.n && x.cur >= q.to ? 'done' : x.status === 'pause' ? 'pause' : 'none']);
  return o;
}
const spentList = (list) => list.reduce((s, x) => s + spentAll(x), 0);
const spentAll = (x) => spends(x).reduce((a, [, p]) => a + p, 0);
/* ほしい物・持ってない巻の値段（買う前） */
const partWish = (x) => (partMode(x) === 'vol' ? (x.parts || []).reduce((a, q) => a + (q.want && q.p ? q.p : 0), 0) : 0);
const wishOf = (x) => partWish(x) + (x.wish && !x.want ? x.wishP || 0 : 0) + (x.want ? (x.price || 0) + Object.values(x.v).reduce((a, d) => a + ((d && d.p) || 0), 0) : Object.values(x.v).reduce((a, d) => a + (x.ownOn && d && d.p && !d.o ? d.p : 0), 0));

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
/* 同じ項目の中は「どれか」、項目どうしは「全部」 */
function matchF(x, F, skip) {
  for (const [k, vals] of Object.entries(F)) {
    if (k === skip || !vals || !vals.length) continue;
    if (k === 'tag') { if (!x.tags.some((t) => vals.includes(t))) return false; }
    else if (k === 'sh') { if (!x.sh.some((q) => vals.includes(q))) return false; }
    else if (!vals.includes(x[k] || '')) return false;
  }
  return true;
}
const fOn = (F = ui.F) => Object.values(F).some((v) => v && v.length);
const curShelf = () => (ui.F.sh && ui.F.sh.length === 1 ? shelvesOf(S.cat).find((h) => h.id === ui.F.sh[0]) || null : null);
const titleKey = (x) => norm(x.yomi || x.title);
function visible() {
  const q = norm(ui.q);
  let a = itemsOf(S.cat);
  if (ui.filter === 'want') a = a.filter((x) => x.want || x.wish);
  else if (ui.filter !== 'all') a = a.filter((x) => x.status === ui.filter);
  if (fOn()) a = a.filter((x) => matchF(x, ui.F));
  if (KINDS[S.cat] && ui.kind) a = a.filter((x) => kindOf(x) === ui.kind);
  if (S.cat === 'music' && ui.media) a = a.filter((x) => x.media === ui.media);
  if (q) a = a.filter((x) => norm([x.title, x.yomi, x.creator, x.perf, x.memo, x.place, x.platform, x.app, x.where, x.theater, x.season, x.genre, x.venue, ...x.tags].join(' ')).includes(q));
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
  const vis = visRooms();
  if (!vis.includes(S.cat)) S.cat = vis[0];
  const C = CATS[S.cat], changed = lastCat !== S.cat;
  document.body.dataset.cat = S.cat;
  applyNight();
  if (changed) {
    const g = $('#giant');
    for (const old of $$('span', g)) { if (old.classList.contains('out')) { old.remove(); continue; } old.classList.add('out'); setTimeout(() => old.remove(), 450); }
    const sp = document.createElement('span'); sp.textContent = C.name; g.append(sp); g.style.setProperty('--gl', [...C.name].length);
    $('#roomName').innerHTML = `<span>${C.name}</span>`; $('#roomName').classList.toggle('long', [...C.name].length > 4);
    $('#sort').innerHTML = [['new', '追加順'], ['upd', '更新順'], ['rate', '評価順'], ['title', 'タイトル順'], ['creator', `${C.creator}順`]].map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  }
  $('#dock').style.gridTemplateColumns = `repeat(${vis.length},1fr)`; $('#dock .ind').style.width = `calc((100% - 12px) / ${vis.length})`;
  $$('#dock .dk').forEach((b) => { const i = vis.indexOf(b.dataset.cat), on = b.dataset.cat === S.cat; b.hidden = i < 0; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); if (on) $('#dock .ind').style.transform = `translateX(${i * 100}%)`; });
  const all = itemsOf(S.cat), done = all.filter((x) => x.status === 'done').length, rated = all.filter((x) => rt(x) > 0);
  const avg = rated.length ? rated.reduce((a, x) => a + rt(x), 0) / rated.length : 0;
  $('#stat').innerHTML = `<span><b class="num" data-cnt="${all.length}">${all.length}</b>${C.unit}</span><span>${stLabel(S.cat, 'done')}<b class="num" data-cnt="${done}">${done}</b></span><span>平均<b class="num" data-cnt="${avg.toFixed(1)}" data-dec="1">${rated.length ? avg.toFixed(1) : '—'}</b></span>` +
    (S.set.money ? `<button class="mny" data-act="money">使った<b class="num">${yen(spentList(all))}</b></button>` : '');
  if (changed && !reduced) countUp();
  drawBkHint();
  const n = (f) => all.filter(f).length;
  if (ui.F.sh) ui.F.sh = ui.F.sh.filter((id) => shelvesOf(S.cat).some((h) => h.id === id));
  if (ui.filter.startsWith('sh:')) ui.filter = 'all';
  const chips = [['all', 'すべて', all.length], ...C.st.map(([k, l]) => [k, l, n((x) => x.status === k)]), ['want', 'ほしい', n((x) => x.want || x.wish)]];
  /* タグごとの数 */
  const tc = new Map(); for (const x of all) for (const t of x.tags) tc.set(t, (tc.get(t) || 0) + 1);
  if (ui.F.tag) ui.F.tag = ui.F.tag.filter((t) => tc.has(t));
  const tags = [...tc].sort((a, b) => b[1] - a[1] || coll.compare(a[0], b[0]));
  const K = KINDS[S.cat], kc = K ? K.map(([k]) => n((x) => kindOf(x) === k)) : [];
  const showK = K && (S.cat === 'music' ? all.length > 0 : kc[1] > 0);
  if (!showK) ui.kind = '';
  const gc = new Map(); if (S.cat === 'music') for (const x of all) if (x.genre) gc.set(x.genre, (gc.get(x.genre) || 0) + 1);

  const extra = (showK ? K.map(([k, l], i) => kc[i] || ui.kind === k ? `<button class="chip kd${ui.kind === k ? ' on' : ''}" data-kindf="${k}">${l}<small>${kc[i]}</small></button>` : '').join('') : '') +
    (S.cat === 'music' ? MEDIA_M.map(([k, l]) => { const c2 = n((x) => x.media === k); return c2 || ui.media === k ? `<button class="chip md${ui.media === k ? ' on' : ''}" data-mediaf="${k}">${l}<small>${c2}</small></button>` : ''; }).join('') : '');
  if (S.cat !== 'music') ui.media = '';
  /* タグ・ジャンルは「追加順」の横のボタンから */
  const fl = fLabel();
  $('#fbtn').innerHTML = `<span>絞り込み</span>`; $('#fbtn').classList.toggle('on', fOn());
  $('#fbar').hidden = !fl; $('#fbar').innerHTML = fl ? `<span>${esc(fl)}</span><span class="fbn">（${visible().length}${C.unit}）</span><button data-act="fltclear" aria-label="絞り込みをやめる">×</button>` : '';
  $('#fbtn').classList.toggle('on', !!fl);
  void tags; void gc;
  $('#chips').innerHTML = `<button class="chip nx${ui.filter === 'next' ? ' on' : ''}" data-filter="next">つぎ<small>${nextCount()}</small></button>` +
    chips.slice(0, 1).map(([k, l, c]) => `<button class="chip${ui.filter === k ? ' on' : ''}" data-filter="${k}">${l}<small>${c}</small></button>`).join('') + extra +
    chips.slice(1).filter(([k, , c]) => c || ui.filter === k).map(([k, l, c]) => `<button class="chip${ui.filter === k ? ' on' : ''}" data-filter="${k}">${l}<small>${c}</small></button>`).join('') +
    '';
  $('#tagchips').hidden = true;
  $('#genrechips').hidden = true;
  $('#genrechips').innerHTML = [...gc].sort((a, b) => b[1] - a[1]).map(([t, c]) => `<button class="chip${ui.genre === t ? ' on' : ''}" data-genref="${esc(t)}">${esc(t)}<small>${c}</small></button>`).join('');
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
  const vb = x.series && x.unit === 'ep' ? (x.cur ? `${x.cur}話` : '') : x.series && x.vols ? `${x.cur}/${x.vols}` : x.cat === 'book' && x.pages && x.page && x.status === 'doing' ? `${Math.round(x.page / x.pages * 100)}%` : gm && !x.series && x.pct && x.status === 'doing' ? `${x.pct}%` : r ? '★' + r : '';
  return `<div class="sw"><button class="spine vt${gm ? ' game' : ''}${x.want ? ' want' : ''}${gold ? ' gold' : ''}" data-id="${esc(x.id)}" style="--w:${w}px;--h:${h}px;--col:${c};--fg:${fgOf(c)};--i:${Math.min(i, 30)};--fs:${fs.toFixed(1)}px${gm ? `;--pc:${pfColor(x.platform)}` : ''}" aria-label="${esc(x.title)}">${gm && !x.want ? '<i class="pf"></i>' : ''}${dk ? `<i class="dc d-${dk}"></i>` : ''}${x.status === 'doing' ? '<i class="rib"></i>' : ''}<span${two ? ' class="two"' : ''}>${esc(x.title)}</span>${vb ? `<em class="vb">${esc(vb)}</em>` : ''}${dustHTML(x)}</button></div>`;
}
function drawList(anim = false) {
  const C = CATS[S.cat], view = S.view[S.cat], el = $('#list');
  el.classList.toggle('anim', !!anim && !reduced);
  if (ui.filter === 'next') return drawNext();
  let a = visible();
  const shb = curShelf();
  const shHead = shb ? `<div class="shbar"><b>${esc(shb.name)}</b><span>${a.length}${C.unit}</span><button class="pick" data-act="pick">＋ 作品を選んで入れる</button><button class="lnk" data-act="shren">名前を変える</button><button class="lnk" data-act="shdel">この棚を消す</button></div>` : '';
  if (view === 'rank') { drawRank(el, a, shHead); return; }
  if (!a.length && !(S.cat === 'music' && ui.kind === 'song' && albumTracksHTML())) {
    const none = !itemsOf(S.cat).length;
    el.innerHTML = shHead + `<div class="empty"><b>${none ? `${C.name}の部屋はまだ空っぽ` : shb ? 'この棚はまだ空っぽ' : '当てはまるものがない'}</b>${none ? '右下の＋から、気になるものを置いていこう。' : shb ? '上の「作品を選んで入れる」から、登録済みの作品を入れられる。' : '絞り込みや検索を変えてみて。'}</div>`;
    return;
  }
  const I = (i) => Math.min(i, 30);
  if (view === 'shelf' && C.shelf === 'spine') {
    el.innerHTML = `<div class="shelf">${a.map(spineHTML).join('')}</div><p class="shnote">背の高さ＝評価　厚み＝${S.cat === 'book' ? '巻数・ページ数' : S.cat === 'game' ? 'シリーズの作品数' : '巻数'}　金の文字＝★5</p>`;
  } else if (view === 'shelf' && C.shelf === 'ticket') {
    el.innerHTML = `<div class="tickets">${a.map((x, i) => { const r = rt(x); return `<button class="tk${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--col:${colOf(x)};--i:${I(i)}"><div class="l"><div class="t">${esc(x.title)}</div><div class="m">${esc(meta(x)) || '&nbsp;'}</div><div class="m">${esc(stLabel(x.cat, x.status))}${x.series && x.vols ? '　' + progText(x) : ''}</div>${x.theater ? `<div class="m">${esc(x.theater)}${x.seat ? '　' + esc(x.seat) : ''}</div>` : ''}${x.fmt.length ? `<div class="fm">${x.fmt.map((f) => `<span>${esc(f)}</span>`).join('')}</div>` : ''}</div><div class="r">${r ? `<b class="num">${r}</b>${starsHTML(r)}` : '<small>評価<br>まだ</small>'}${x.date ? `<small class="num">${esc(fmtWhen(x.date))}</small>` : ''}</div></button>`; }).join('')}</div>`;
  } else if (view === 'shelf' && C.shelf === 'disc') {
    const lv = a.filter((x) => kindOf(x) === 'live'), ot = a.filter((x) => kindOf(x) !== 'live');
    el.innerHTML = (ot.length ? `<div class="discs">${ot.map(jacketHTML).join('')}</div>` : '') + (lv.length ? `${ot.length ? '<h3 class="sech">ライブ</h3>' : ''}<div class="tickets">${lv.map(liveTicketHTML).join('')}</div>` : '');
  } else if (view === 'shelf' && C.shelf === 'screen') {
    el.innerHTML = `<div class="screens">${a.map((x, i) => { const r = rt(x); return `<button class="sc${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--i:${I(i)}"><div class="tv vt">${phHTML(x, { prog: false, dust: true })}${x.series && x.vols ? `<span class="ep">${x.cur}/${x.vols}話<i style="--p:${(frac(x) * 100).toFixed(0)}%"></i></span>` : ''}</div><b>${esc(x.title)}</b><small>${r ? '★' + r + '　' : ''}${esc(stLabel(x.cat, x.status))}${x.app ? '　' + esc(x.app) : ''}</small></button>`; }).join('')}</div>`;
  } else if (view === 'shelf') {
    el.innerHTML = `<div class="gallery">${a.map((x, i) => { const k = imgKey(x), r = rt(x); return `<button class="fr${x.want ? ' want' : ''}" data-id="${esc(x.id)}" style="--i:${I(i)}"><span class="wire"></span><div class="fm vt"${k ? ` data-img="${esc(k)}"` : ''}>${k ? `<div class="ph-sp" style="aspect-ratio:${x.ratio || 0.8};background:var(--field)"></div>` : `<div style="aspect-ratio:${0.7 + hash(x.id) % 6 / 10}">${genHTML(x)}</div>`}</div><div class="pl"><b>${esc(x.title)}</b><small>${esc(meta(x))}</small>${x.place ? `<small>${esc(x.place)}</small>` : ''}${r ? starsHTML(r) : ''}</div></button>`; }).join('')}</div>`;
  } else if (view === 'cover') {
    const kind = C.side ? '' : S.cat === 'art' ? ' artc' : S.cat === 'music' ? ' sq' : ' poster';
    el.innerHTML = `<div class="covers">${a.map((x, i) => { const r = rt(x); return `<button class="cv${kind}${x.want ? ' want' : ''}" data-id="${esc(x.id)}"${albumTap(x) ? ' data-kids="1"' : ''} style="--i:${I(i)};--col:${colOf(x)}"><div class="bk vt${C.side === 'right' ? '' : ' r'}"><div class="fc">${phHTML(x, { dust: true })}</div><span class="ed"></span></div><b>${esc(x.title)}</b><small>${r ? starsHTML(r) : esc(stLabel(x.cat, x.status))}</small>${xbtn(x)}${albumTap(x) ? `<span class="xbtn${ui.open.has(x.id) ? ' on' : ''}">${ui.open.has(x.id) ? '▴' : '▾'} ${x.vols ? x.vols + '曲' : '曲'}</span>` : ''}</button>` + (ui.open.has(x.id) && canKids(x) ? `<div class="kidsrow">${kidsHTML(x)}</div>` : ''); }).join('')}</div>`;
  } else {
    el.innerHTML = `<ul class="rows">${a.map((x, i) => { const r = rt(x), p = progText(x); return `<li><button class="row" data-id="${esc(x.id)}"${albumTap(x) && canKids(x) ? ' data-kids="1"' : ''} style="--i:${I(i)}"><span class="th vt${x.cat === 'music' ? ' sq' : ''}">${phHTML(x)}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(meta(x)) || '　'}</small><span class="pill${x.status === 'doing' ? ' doing' : ''}">${esc(stLabel(x.cat, x.status))}${p ? '　' + p : ''}</span>${x.round > 1 ? `<span class="pill">${x.round}回目</span>` : ''}${x.hours ? `<span class="pill">${x.hours}時間</span>` : ''}${x.want ? `<span class="pill">${esc(wantForm(x) || 'ほしい')}</span>` : x.wish ? `<span class="pill">${esc(wishTxt(x))}</span>` : ''}${xbtn(x)}${albumTap(x) ? `<span class="xbtn${ui.open.has(x.id) ? ' on' : ''}">${ui.open.has(x.id) ? '▴' : '▾'} ${x.vols ? x.vols + '曲' : '曲'}</span>` : ''}</span><span class="rt">${r ? `<b class="num">${r}</b><br>${starsHTML(r)}` : '<small>—</small>'}</span></button></li>` + (ui.open.has(x.id) && canKids(x) ? `<li class="kidsli">${kidsHTML(x)}</li>` : ''); }).join('')}</ul>`;
  }
  if (S.cat === 'music' && ui.kind === 'song') el.insertAdjacentHTML('beforeend', albumTracksHTML());
  if (shHead) el.insertAdjacentHTML('afterbegin', shHead);
  hydrate(el);
}

const albumTap = (x) => x.cat === 'music' && kindOf(x) === 'album';
const canKids = (x) => albumTap(x) || (!!x.series && x.vols > 0 && x.vols <= 300 && x.unit !== 'ep' && !light(x));
function togOpen(id) { if (ui.open.has(id)) ui.open.delete(id); else ui.open.add(id); try { localStorage['kura.open'] = JSON.stringify([...ui.open].slice(-60)); } catch (e) {} drawList(); }
const discCls = (x) => (x.media === 'CD' ? ' cd' : '');
/* アルバムの中の曲：シングルと同じ見た目で出す（写真はその曲のがあればそれ、なければアルバムの） */
function trkPh(x, i) { const d = x.v[i] || {}, k = d.img ? `${x.id}~${i}` : imgKey(x); return `<div class="ph"${k ? ` data-img="${esc(k)}"` : ''}>${genHTML({ ...x, title: d.t || `${i}曲目`, _em: `TRACK ${i}` })}</div>`; }
function trackCards(P, withAlbum) {
  const view = S.view.music, T = (x, i) => esc((x.v[i] || {}).t || `${i}曲目`), sg = (x, i) => ((x.v[i] || {}).sid ? '<em class="sgl">SINGLE</em>' : ''), sub = (x, i) => sg(x, i) + (withAlbum ? `${esc(x.title)}・` : '') + `${i}曲目`, at = (x, i) => `${(x.v[i] || {}).sid ? `data-goid="${esc(x.v[i].sid)}"` : `data-kid="${esc(x.id)}" data-kn="${i}"`} style="--col:${colOf(x)}"`;
  if (view === 'shelf') return `<div class="discs">${P.map(([x, i]) => { const d = x.v[i] || {}; return `<button class="jk single trk${discCls(x)}" ${at(x, i)}><span class="art"><i class="rec"></i><span class="sl vt">${trkPh(x, i)}</span></span><b>${T(x, i)}</b><small>${sub(x, i)}${d.r ? `　★${d.r}` : ''}</small></button>`; }).join('')}</div>`;
  if (view === 'cover') return `<div class="covers">${P.map(([x, i]) => { const d = x.v[i] || {}; return `<button class="cv sq trk" ${at(x, i)}><div class="bk vt r"><div class="fc">${trkPh(x, i)}</div><span class="ed"></span></div><b>${T(x, i)}</b><small>${d.r ? starsHTML(d.r) : sub(x, i)}</small></button>`; }).join('')}</div>`;
  return `<ul class="rows">${P.map(([x, i]) => { const d = x.v[i] || {}; return `<li><button class="row trk" ${at(x, i)}><span class="th vt sq">${trkPh(x, i)}</span><span class="tx"><b>${T(x, i)}</b><small>${sg(x, i)}${withAlbum ? `${esc(x.title)}　` : ''}${i}曲目${x.creator ? '　' + esc(x.creator) : ''}</small>${d.c ? '<span class="pill">感想あり</span>' : ''}</span><span class="rt">${d.r ? `<b class="num">${d.r}</b><br>${starsHTML(d.r)}` : '<small>—</small>'}</span></button></li>`; }).join('')}</ul>`;
}
function xbtn(x) { if (!canKids(x) || albumTap(x)) return ''; const C = Cx(x); return `<span class="xbtn${ui.open.has(x.id) ? ' on' : ''}" data-xopen="${esc(x.id)}">${ui.open.has(x.id) ? '▴' : '▾'} ${x.vols}${C.vol}</span>`; }
function kidsHTML(x) {
  const C = Cx(x), n = Math.min(x.vols || 0, 300);
  if (x.cat === 'music') return `<div class="kids trk">${n ? trackCards(Array.from({ length: n }, (_, k) => [x, k + 1])) : '<p class="hint" style="margin:0 0 8px">まだ曲が入ってない。「＋ 曲を足す」か、アルバムの「編集」で曲名を1行に1曲ずつ貼ると入る。</p>'}<div class="kfoot"><button class="lnk" data-act="kidadd" data-kadd="${esc(x.id)}">＋ 曲を足す</button><button class="lnk" data-oid="${esc(x.id)}">${kindOf(x) === 'live' ? 'ライブ' : 'アルバム'}のページ ›</button><button class="lnk" data-xopen="${esc(x.id)}">閉じる ▴</button></div></div>`;
  return `<div class="kids"><div class="kgrid">${Array.from({ length: n }, (_, k) => { const i = k + 1, d = x.v[i] || {}, key = d.img ? `${x.id}~${i}` : ''; return `<button class="kid${i <= x.cur ? ' rd' : ''}" data-kid="${esc(x.id)}" data-kn="${i}"><span class="kth"><span class="ph"${key ? ` data-img="${esc(key)}"` : ''}>${genHTML(x, i)}</span></span><small>${C.volN(i)}${d.r ? ` ★${d.r}` : ''}${d.c ? '・感想' : ''}</small></button>`; }).join('')}</div><div class="kfoot"><button class="lnk" data-oid="${esc(x.id)}">作品のページを開く ›</button><button class="lnk" data-xopen="${esc(x.id)}">閉じる ▴</button></div></div>`;
}
/* 音楽の「曲」：アルバムの中の曲もまとめて出す */
function albumTracksHTML() {
  const q = norm(ui.q), rows = [];
  for (const x of itemsOf('music')) {
    if (kindOf(x) !== 'album' || !x.vols || !matchF(x, ui.F)) continue;
    for (let i = 1; i <= Math.min(x.vols, 300); i++) { const d = x.v[i] || {}; if (!d.t || d.sid) continue; if (q && !norm(d.t + ' ' + x.title + ' ' + (x.creator || '')).includes(q)) continue; rows.push([x, i, d]); }
  }
  if (!rows.length) return '';
  return `<h3 class="sech">アルバムの中の曲（${rows.length}）</h3>${trackCards(rows, true)}`;
}
function jacketHTML(x, i) {
  const r = rt(x);
  return `<button class="jk${x.want ? ' want' : ''}${kindOf(x) === 'song' ? ' single' : ''}${discCls(x)}${ui.open.has(x.id) ? ' open' : ''}" data-id="${esc(x.id)}"${albumTap(x) && canKids(x) ? ' data-kids="1"' : ''} style="--i:${Math.min(i, 30)};--col:${colOf(x)}"><span class="art"><i class="rec"></i><span class="sl vt">${phHTML(x, { prog: false, dust: true })}</span></span><b>${esc(x.title)}</b><small>${albumTap(x) ? `${ui.open.has(x.id) ? '▴' : '▾'} ${x.vols ? x.vols + '曲' : '曲'}　` : ''}${esc(x.creator || '')}${r ? `　★${r}` : ''}</small></button>` + (ui.open.has(x.id) && canKids(x) ? `<div class="kidsrow">${kidsHTML(x)}</div>` : '');
}
function liveTicketHTML(x, i) {
  const r = rt(x), d = x.ldate ? dayDiff(x.ldate) : null, fut = d != null && d >= 0 && x.tst !== 'went';
  return `<button class="tk live${x.tst === 'lose' ? ' want' : ''}" data-id="${esc(x.id)}" style="--col:${colOf(x)};--i:${Math.min(i, 30)}"><div class="l"><div class="t">${esc(x.title)}</div><div class="m">${esc(x.creator || '') || '&nbsp;'}</div>${x.venue || x.lseat ? `<div class="m">${esc(x.venue || '')}${x.lseat ? '　' + esc(x.lseat) : ''}</div>` : ''}${x.tst ? `<div class="fm"><span>${tstLabel(x.tst)}</span></div>` : ''}</div><div class="r">${x.ldate ? `<b class="num" style="font-size:20px">${+x.ldate.slice(5, 7)}/${+x.ldate.slice(8)}</b><small class="num">${fut ? (d === 0 ? '今日！' : `あと${d}日`) : x.ldate.slice(0, 4)}</small>` : '<small>日付<br>まだ</small>'}${r ? starsHTML(r) : ''}</div></button>`;
}

/* ===== ティア表・期待との差・ベスト10・マイブーム ===== */
function drawRank(el, a, shHead) {
  const C = CATS[S.cat];
  const T = S.cat === 'music' ? [['best', '年間ベスト10'], ['boom', 'マイブーム']] : [['tier', 'ティア表'], ['exp', '期待との差'], ['best', '年間ベスト10']];
  if (!T.some((q) => q[0] === ui.rtab)) ui.rtab = T[0][0];
  const tabs = `<div class="rtabs">${T.map(([k, l]) => `<button class="${ui.rtab === k ? 'on' : ''}" data-rtab="${k}">${l}</button>`).join('')}</div>`;
  if (ui.rtab === 'best') return drawBest(el, shHead + tabs);
  if (ui.rtab === 'boom') return drawBoom(el, shHead + tabs);
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
  el.innerHTML = shHead + tabs + `<div class="tiers">${TIERS.map(([t, lab], ti) => {
    const l = tierItems(rated, t);
    return `<div class="tier t-${t}${l.length ? '' : ' empty-t'}" style="--i:${ti}"><button class="tlab" data-tier="${t}" aria-label="${t}の並び順"><b>${t}</b><small>${lab}</small>${l.length > 1 ? '<span class="ord">並べる</span>' : ''}</button><div class="ti">${l.length ? l.map((x, j) => `<button data-id="${esc(x.id)}" aria-label="${esc(x.title)}"><span class="th vt">${phHTML(x, { prog: false })}</span></button>`).join('') : '—'}</div></div>`;
  }).join('')}</div><p class="shnote">左ほど上。段の名前を押すと、段の中の順番を決められる。${un ? `<br>星がまだの作品（${un}）は入らない。` : ''}</p>`;
  hydrate(el);
}

const bestOf = (cat, y) => (((S.best[cat] || {})[y]) || []).filter((id) => findItem(id) || trkRef(id));
const trkItem = (x, i) => { const d = x.v[i] || {}; return { id: `${x.id}~${i}`, cat: 'music', title: d.t || `${i}曲目`, creator: x.creator || '', perf: x.perf || '', genre: x.genre || '', yomi: '', tags: [], kind: 'song', media: x.media, color: x.color, rating: d.r || 0, v: {}, img: false, _em: `TRACK ${i}`, _alb: x, _n: i, date: x.date || '', created: x.created }; };
function trkRef(id) { const [a, n] = String(id).split('~'); if (!n) return null; const x = findItem(a); return x && +n <= x.vols && (x.v[n] || {}).t ? trkItem(x, +n) : null; }
const boomItem = (id) => findItem(id) || trkRef(id);
const boomOf = (m) => (S.boom[m] || []).filter(boomItem);
const ym = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const ymText = (m) => `${+m.slice(0, 4)}年${+m.slice(5)}月`;
function drawBest(el, head) {
  const y = ui.byear, now = new Date().getFullYear(), l = bestOf(S.cat, y).map(boomItem);
  el.innerHTML = head + `<div class="ynav"><button data-by="-1" aria-label="前の年">‹</button><b>${y}年のベスト10</b><button data-by="1" aria-label="次の年"${y >= now ? ' disabled' : ''}>›</button></div>` +
    (l.length ? `<ol class="best">${l.map((x, i) => `<li style="--i:${i}"><button ${x._alb ? `data-kid="${esc(x._alb.id)}" data-kn="${x._n}"` : `data-id="${esc(x.id)}"`}><span class="bn num">${i + 1}</span><span class="th vt${x.cat === 'music' ? ' sq' : ''}">${phHTML(x, { prog: false })}</span><span class="tx"><b>${esc(x.title)}</b><small>${esc(x._alb ? `${x._alb.title}・${x._n}曲目　${x.creator}` : meta(x))}</small></span>${rt(x) ? `<span class="num br">★${rt(x)}</span>` : ''}</button></li>`).join('')}</ol>` : `<div class="empty"><b>${y}年のベスト10はまだ</b>下の「選ぶ」から10個まで選んで、順番を決められる。</div>`) +
    `<div class="acts" style="margin-top:14px"><button class="btn sm pri" data-act="bestpick">選ぶ（${l.length}/10）</button>${l.length > 1 ? '<button class="btn sm" data-act="bestord">順番を変える</button>' : ''}</div>`;
  hydrate(el);
}
function drawBoom(el, head) {
  const now = ym(), months = [...new Set([now, ...Object.keys(S.boom).filter((m) => boomOf(m).length)])].sort().reverse();
  el.innerHTML = head + `<p class="shnote" style="text-align:left;margin:0 2px 12px">その月にハマってたものを${BOOM_MAX}つまで。年間ベスト10を選ぶときに上に出る。</p>` + months.map((m, i) => { const l = boomOf(m).map(boomItem); return `<section class="bmon" style="--i:${i}"><div class="bmh"><b>${ymText(m)}</b><button class="pick" data-boompick="${m}">選ぶ（${l.length}/${BOOM_MAX}）</button></div>${l.length ? `<div class="bmi">${l.map((x) => `<button ${x._alb ? `data-kid="${esc(x._alb.id)}" data-kn="${x._n}"` : `data-id="${esc(x.id)}"`}><span class="th sq vt">${x._alb ? trkPh(x._alb, x._n) : phHTML(x, { prog: false })}</span><small>${esc(x.title)}</small></button>`).join('')}</div>` : '<p class="hint">まだ選んでない</p>'}</section>`; }).join('') +
    `<p class="hint" style="margin:16px 2px 6px">前の月を足す</p><div class="addrow"><label class="f"><input type="month" id="boomMonth" max="${now}" aria-label="月"></label><button class="btn sm" data-act="boomadd">選ぶ</button></div>`;
  hydrate(el);
}

/* ===== つぎのリスト ===== */
const dayDiff = (d) => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const canRead = (x) => (x.unit === 'ep' ? (!x.vols || x.cur < x.vols) && x.status !== 'done' : x.cur < x.vols && (!x.ownOn || owned(x, x.cur + 1)));
function nextGroups(cat) {
  const C = CATS[cat], a = itemsOf(cat), used = new Set(), g = [];
  const upd = (x, y) => y.updated - x.updated;
  const take = (title, sub, list, kind) => { const l = list.filter((x) => !used.has(x.id)); l.forEach((x) => used.add(x.id)); if (l.length) g.push({ title, sub, list: l, kind }); };
  if (cat === 'art') {
    const up = (x) => (x.until ? dayDiff(x.until) : 9999);
    take('見に行きたい', '会期が近い順', a.filter((x) => x.status !== 'done' && !x.want && (!x.until || up(x) >= 0)).sort((x, y) => up(x) - up(y)), 'art');
    take('ほしい', '画集やグッズなど', a.filter((x) => x.want), 'want');
    return g;
  }
  const rel = a.filter((x) => x.rel).sort((x, y) => x.rel.localeCompare(y.rel));
  if (rel.length) g.push({ title: { anime: '放送・公開日', movie: '公開日' }[cat] || '発売日', sub: '近い順', list: rel, kind: 'rel' });
  if (cat === 'music') {
    take('ライブ', '近い順', a.filter((x) => kindOf(x) === 'live' && x.tst !== 'went' && x.tst !== 'lose' && (!x.ldate || dayDiff(x.ldate) >= 0)).sort((x, y) => (x.ldate || '9').localeCompare(y.ldate || '9')), 'live');
    take('聴いてる', '', a.filter((x) => x.status === 'doing' && kindOf(x) !== 'live').sort(upd), 'doing');
    take('まだ聴いてない', '', a.filter((x) => x.status === 'none' && !x.want && kindOf(x) !== 'live').sort((x, y) => y.created - x.created), 'none');
    take('ほしい', '', a.filter((x) => x.want || x.wish), 'want');
    return g;
  }
  const ser = a.filter((x) => x.series && (x.vols || x.unit === 'ep') && x.status !== 'pause');
  if (cat === 'manga' || cat === 'book') take('ほしい巻', '話で読んでる作品', a.filter((x) => partMode(x) === 'vol' && (x.parts || []).some((q) => q.want)).sort((x, y) => y.updated - x.updated), 'pwant');
  if (C.own) take('次に買う', `持ってない${volW(C)}`, ser.filter((x) => x.ownOn && missing(x).length).sort(upd), 'buy');
  take(cat === 'manga' || cat === 'book' ? '続きを読む' : cat === 'anime' ? '続きを観る' : 'シリーズの続き', '', ser.filter((x) => canRead(x) && !x.want && !(x.status === 'done' && x.done)).sort(upd), 'cont');
  take(cat === 'game' ? 'プレイ中' : '途中', '', a.filter((x) => x.status === 'doing' && !x.series).sort(upd), 'doing');
  take({ manga: '未読（積んでる）', book: '未読（積んでる）', anime: 'まだ観てない', movie: 'まだ観てない', game: '未プレイ' }[cat], '', a.filter((x) => x.status === 'none' && !x.want).sort((x, y) => y.created - x.created), 'none');
  take('ほしい', '', a.filter((x) => x.want || x.wish), 'want');
  return g;
}
const nextCount = () => nextGroups(S.cat).reduce((s, g) => s + g.list.length, 0);
function drawNext() {
  const C = CATS[S.cat], el = $('#list'), gs = nextGroups(S.cat), u = C.vol;
  if (!gs.length) { el.innerHTML = `<div class="empty"><b>つぎにやることは、今はない</b>${S.cat === 'art' ? '「まだ」の作品に会期を入れると、締め切りが近い順にここに並ぶ。' : `シリーズの${u}数や「ほしい」、まだ手をつけてない作品がここにまとまる。`}</div>`; return; }
  let i = 0;
  el.innerHTML = gs.map((g) => `<section class="ngrp"><h3>${esc(g.title)}${g.sub ? `<small>${esc(g.sub)}</small>` : ''}</h3>${g.list.map((x) => {
    let line = '', act = '', due = '';
    if (g.kind === 'buy') { const m = missing(x); line = `<em>${shortList(m, u)}</em>（${C.ser.have}${x.vols}${u}）`; act = `<button class="go" data-nx="buy" data-nid="${esc(x.id)}">${m[0]}${u}買った</button>`; }
    else if (g.kind === 'cont') { const Q = Cx(x); line = `次は <em>${Q.volN(x.cur + 1)}</em>${x.vols ? `（${x.cur}/${x.vols}${Q.vol}）` : ''}`; act = `<button class="go" data-nx="cur" data-nid="${esc(x.id)}">${x.unit === 'ep' ? `＋1${Q.vol}` : C.act}</button>`; }
    else if (g.kind === 'live') {
      line = `${esc(x.venue || x.creator || '')}　<em>${x.tst ? tstLabel(x.tst) : 'チケットまだ'}</em>`;
      if (x.ldate) { const d = dayDiff(x.ldate); due = `<span class="due${d <= 14 ? ' soon' : ''}">${d === 0 ? '今日' : d}<small>${d === 0 ? '' : '日後'}<br>${+x.ldate.slice(5, 7)}/${+x.ldate.slice(8)}</small></span>`; }
    }
    else if (g.kind === 'rel') {
      const d = dayDiff(x.rel), W = relWord(x), what = W.what;
      line = `<em>${esc(what)}</em>　${x.rel.slice(5).replace('-', '/')}${W.v}`;
      if (d > 0) due = `<span class="due${d <= 14 ? ' soon' : ''}">${d}<small>日後<br>${+x.rel.slice(5, 7)}/${+x.rel.slice(8)}</small></span>`;
      else act = `<button class="go" data-nx="rel" data-nid="${esc(x.id)}">${d === 0 ? `今日${W.v}` : '出た'}</button>`;
    } else if (g.kind === 'art') {
      line = esc([x.creator, x.place].filter(Boolean).join('　')) || '　';
      if (x.until) { const d = dayDiff(x.until); due = `<span class="due${d <= 14 ? ' soon' : ''}">${d === 0 ? '今日' : d}<small>${d === 0 ? 'まで' : '日後まで'}<br>${x.until.slice(5).replace('-', '/')}</small></span>`; }
    } else if (g.kind === 'doing') line = esc(progText(x) || meta(x) || stLabel(x.cat, x.status)) + (dustLv(x) ? '　<em>ほこりをかぶってる</em>' : '');
    else if (g.kind === 'pwant') { const w = partsOf(x).filter((q) => q.want), sum = w.reduce((t, q) => t + (q.p || 0), 0); line = `<em>${esc(rangeText(w.map((q) => q.i)))}巻</em>${S.set.money && sum ? `　${yen(sum)}` : ''}　${esc(meta(x))}`; }
    else if (g.kind === 'want' && x.wish && !x.want) line = `<em>${esc(wishTxt(x))}</em>　${esc(stLabel(x.cat, x.status))}${S.set.money && x.wishP ? `　${yen(x.wishP)}` : ''}`;
    else if (g.kind === 'want' && x.media) line = `<em>${esc(wantForm(x))}</em>　${esc(meta(x))}`;
    else line = esc(meta(x)) || esc(stLabel(x.cat, x.status));
    return `<div class="nrow" style="--i:${Math.min(i++, 30)}"><button class="open" data-oid="${esc(x.id)}"><span class="th">${phHTML(x)}</span><span class="tx"><b>${esc(x.title)}</b><small>${line}</small></span></button>${act}${due}</div>`;
  }).join('')}</section>`).join('');
  hydrate(el);
}

/* ===== 詳細ページ ===== */
let curId = null;
const curItem = () => (curId && !$('#page').hidden ? findItem(curId) : null);
function heroHTML(x) {
  const C = Cx(x), k = imgKey(x);
  if (x.cat === 'art') return `<div class="hero art"><div class="frm" id="pageHero">${k ? `<div class="ph" data-img="${esc(k)}"><div class="ph-sp" style="aspect-ratio:${x.ratio || 0.8}"></div></div>` : `<div style="aspect-ratio:.8">${genHTML(x)}</div>`}</div></div>`;
  if (x.cat === 'anime') return `<div class="hero"><div class="tvh" id="pageHero">${phHTML(x, { prog: false })}</div></div>`;
  if (x.cat === 'music') return `<div class="hero"><div class="bk sq" id="pageHero" style="--col:${colOf(x)}"><div class="fc">${phHTML(x, { prog: false })}</div></div></div>`;
  return `<div class="hero"><div class="bk${C.side === 'right' ? '' : ' r'}${x.cat === 'movie' ? ' flat' : ''}" id="pageHero" style="--col:${colOf(x)}"><div class="fc">${phHTML(x, { prog: false })}</div><span class="ed"></span></div></div>`;
}
function relHTML(x) {
  const d = dayDiff(x.rel), W = relWord(x), what = W.what;
  return `<div class="sec"><div class="box relbox"><span><small>${esc(what)}の${W.day}</small><b class="num">${+x.rel.slice(0, 4)}/${+x.rel.slice(5, 7)}/${+x.rel.slice(8)}</b></span>${d > 0 ? `<span class="num rd">あと<b>${d}</b>日</span>` : `<button class="btn sm pri" data-nx="rel" data-nid="${esc(x.id)}">${d === 0 ? `今日${W.v}！出た` : '出た'}</button>`}</div></div>`;
}
const wishTxt = (x) => (x.wish ? `${x.wishM ? x.wishM + 'で' : '手元に'}ほしい` : '');
const wantForm = (x) => (x.want && x.media ? `${x.media}${x.cat === 'anime' || x.cat === 'movie' ? 'で観たい' : 'でほしい'}` : '');
function haveHTML(x) {
  const r = [];
  if (x.cat === 'game' && x.platform) r.push(['機種', esc(x.platform)]);
  if (x.want && x.media) r.push(['ほしい形', esc(wantForm(x))]); else if (x.media) r.push(['持ち方', esc(x.media)]);
  if (x.app && !x.want) r.push([x.media === '配信' ? '配信サービス' : 'アプリ', esc(x.app)]);
  if (x.where && !x.want) r.push(['置き場所', esc(x.where)]);
  if (x.wish && !x.want) r.push(['手元に', `${esc(wishTxt(x))}${S.set.money && x.wishP ? `　<span class="num">${yen(x.wishP)}</span>（合計には入らない）` : ''}　<button class="lnk" data-act="wishbuy">買った ›</button>`]);
  if (x.theater) r.push(['劇場', esc(x.theater) + (x.seat ? `　座席 ${esc(x.seat)}` : '')]);
  else if (x.seat) r.push(['座席', esc(x.seat)]);
  if (x.fmt.length) r.push(['形式', x.fmt.map(esc).join('・')]);
  if (S.set.money && spentAll(x)) r.push(['使ったお金', `<span class="num">${yen(spentAll(x))}</span>`]);
  if (S.set.money && wishOf(x)) r.push(['買う前の値段', `<span class="num">${yen(wishOf(x))}</span>（合計には入らない）`]);
  return r.length ? `<div class="sec"><h4>${x.want ? 'ほしい形' : '持ち方・置き場所'}</h4><dl class="meta">${r.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>` : '';
}
/* 曲名でライブ・曲をつなぐ */
const sameArtist = (a, b) => !a || !b || norm(a) === norm(b);
const livesWith = (artist, title) => (title ? S.items.filter((l) => l.cat === 'music' && kindOf(l) === 'live' && l.tst === 'went' && sameArtist(l.creator, artist) && Object.values(l.v).some((d) => d && d.t && norm(d.t) === norm(title))) : []);
const songOf = (artist, title) => (title ? S.items.find((o) => o.cat === 'music' && kindOf(o) === 'song' && norm(o.title) === norm(title) && sameArtist(o.creator, artist)) : null);
function linkCard(o) {
  const sub = o.cat === 'music' && kindOf(o) === 'live' && o.ldate ? `ライブ・${fmtWhen(o.ldate)}` : CATS[o.cat].short || CATS[o.cat].name;
  return `<button class="lk" data-goid="${esc(o.id)}"><span class="th${o.cat === 'music' ? ' sq' : ''}">${phHTML(o, { prog: false })}</span><span class="tx"><b>${esc(o.title)}</b><small>${esc(sub)}</small></span></button>`;
}
function trackRows(x) {
  const C = Cx(x), live = kindOf(x) === 'live'; let h = '';
  for (let i = 1; i <= x.vols; i++) {
    const d = x.v[i] || {}, heard = !live && livesWith(x.creator, d.t).length, song = live && songOf(x.creator, d.t);
    h += `<li><button data-vopen="${i}"><span class="n num">${i}</span><span class="tt"><b>${esc(d.t || C.volN(i))}</b>${d.c ? `<small>${esc(d.c)}</small>` : ''}</span>${heard ? '<em class="lv">生で聴いた</em>' : ''}${song ? `<em class="lv go2" data-goid="${esc(song.id)}">曲へ ›</em>` : ''}${!live && d.sid && findItem(d.sid) ? `<em class="lv go2" data-goid="${esc(d.sid)}">SINGLE ›</em>` : ''}${d.r ? `<span class="num r">★${d.r}</span>` : ''}</button></li>`;
  }
  return h;
}
function musicHTML(x) {
  const k = kindOf(x); let h = '';
  if (k === 'live') {
    const d = x.ldate ? dayDiff(x.ldate) : null;
    h += `<div class="sec"><h4>ライブ</h4><div class="box livebox"><div class="relbox"><span><small>${x.ldate ? 'ライブの日' : '日付はまだ'}</small><b class="num">${x.ldate ? `${+x.ldate.slice(0, 4)}/${+x.ldate.slice(5, 7)}/${+x.ldate.slice(8)}` : '—'}${x.ltime ? `　${esc(x.ltime)}` : ''}</b></span>${d != null && d >= 0 && x.tst !== 'went' && x.tst !== 'lose' ? `<span class="num rd">${d === 0 ? '<b>今日！</b>' : `あと<b>${d}</b>日`}</span>` : ''}</div>${x.venue || x.lseat ? `<p class="lvv">${esc(x.venue || '')}${x.lseat ? `　${esc(x.lseat)}` : ''}</p>` : ''}<span class="hint">チケット</span><div class="seg sm" id="pTst" style="margin-top:6px">${TST.map(([v, l]) => `<button data-tst="${v}" class="${x.tst === v ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>`;
    h += `<div class="sec"><h4>セットリスト${x.vols ? `（${x.vols}曲）` : ''}</h4>${x.vols ? `<ol class="tracks">${trackRows(x)}</ol>` : '<p class="hint">「編集」で、1行に1曲ずつ入れられる。</p>'}<button class="lnk" data-act="trackadd" style="margin-top:8px">＋ 曲を足す</button></div>`;
  } else if (k === 'album') {
    h += `<div class="sec"><h4>曲${x.vols ? `（${x.vols}曲）` : ''}</h4>${x.vols ? `<ol class="tracks">${trackRows(x)}</ol>` : '<p class="hint">「編集」で曲名を1行に1曲ずつ入れると、曲ごとに評価できる。</p>'}<button class="lnk" data-act="trackadd" style="margin-top:8px">＋ 曲を足す</button></div>`;
  } else {
    const inA = linkedAlbums(x);
    if (inA.length) h += `<div class="sec"><h4>収録アルバム</h4><p class="hint" style="margin:0 2px 8px">${inA.map(([a, i]) => `『${esc(a.title)}』${i}曲目`).join('・')}。評価と感想はアルバムの曲と共通。</p><div class="links">${inA.map(([a]) => linkCard(a)).join('')}</div></div>`;
    const lv = livesWith(x.creator, x.title);
    if (lv.length) h += `<div class="sec"><h4>生で聴いた（${lv.length}回）</h4><div class="links">${lv.map(linkCard).join('')}</div></div>`;
  }
  return h;
}
function honorsHTML(x) {
  const out = [];
  for (const [y, ids] of Object.entries(S.best[x.cat] || {})) { const i = ids.indexOf(x.id); if (i >= 0) out.push(`${y}年のベスト10　${i + 1}位`); }
  if (x.cat === 'music') { const ms = Object.keys(S.boom).filter((m) => (S.boom[m] || []).some((q) => q === x.id || q.startsWith(x.id + '~'))).sort().reverse(); if (ms.length) out.push(`マイブーム：${ms.map(ymText).join('・')}`); }
  return out.length ? `<div class="honors">${out.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : '';
}
function renderPage(x) {
  document.body.dataset.cat = x.cat; applyNight();
  const C = Cx(x), art = x.cat === 'art', mus = x.cat === 'music';
  const prog = (x.cat === 'book' && !x.series) || x.cat === 'game';
  const dl = dustLv(x);
  $('#page').innerHTML = `
    <div class="pbar"><button class="ib" data-act="back" aria-label="戻る"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3.5 5.5 9l5.5 5.5"/></svg></button><button class="btn sm" data-act="edit">編集</button></div>
    <div class="pwrap">
      ${heroHTML(x)}
      <h2 class="ptitle">${esc(x.title)}${x.round > 1 ? `<span class="roundb">${x.round}回目</span>` : ''}</h2>${x.yomi ? `<p class="pyomi">${esc(x.yomi)}</p>` : ''}<p class="psub">${esc(meta(x))}</p>${mus && x.creator ? `<p class="psub"><button class="artist" data-artist="${esc(x.creator)}">${isCl(x) ? '作曲家：' : ''}${esc(x.creator)}のまとめ ›</button></p>` : ''}${mus && isCl(x) && x.perf ? `<p class="psub"><button class="artist" data-artist="${esc(x.perf)}">演奏者：${esc(x.perf)}のまとめ ›</button></p>` : ''}${honorsHTML(x)}
      ${dl ? `<div class="sec"><div class="box dustnote"><span>ほこりをかぶってる…<small>最後に触ってから${Math.floor(dustDays(x))}日</small></span><button class="btn sm" data-act="dust">ふっと払う</button></div></div>` : ''}
      <div class="sec"><h4>状態</h4><div class="seg" id="pSt"></div><div id="pRounds"></div></div>
      <div class="sec"><h4>評価（同じ星をもう一度押すと半分）</h4><div class="rate" id="pRate"></div><div id="pAvg"></div>${rt(x) > 0 ? '<button class="lnk rerate" data-act="rerate">再評価する</button>' : ''}</div>
      ${x.rel ? relHTML(x) : ''}
      ${mus ? musicHTML(x) : ''}
      ${x.series && !art && !mus ? `<div class="sec"><h4>シリーズ</h4><div class="box" id="pVols"></div><div id="pParts"></div></div>` : ''}
      ${prog ? `<div class="sec"><h4>進み具合</h4><div class="box" id="pProg"></div></div>` : ''}
      ${x.review ? `<div class="sec"><h4>感想</h4><div class="box"><p class="txt">${linkify(x.review)}</p></div></div>` : ''}
      ${x.memo ? `<div class="sec"><h4>メモ</h4><div class="box"><p class="txt" style="font-family:var(--gothic);font-size:14.5px">${linkify(x.memo)}</p></div></div>` : ''}
      ${x.series && !mus ? '<div id="pVnotes"></div>' : ''}
      ${x.links.some(findItem) ? `<div class="sec"><h4>関連</h4><div class="links">${x.links.map(findItem).filter(Boolean).map(linkCard).join('')}</div></div>` : ''}
      ${x.tags.length ? `<div class="sec"><div class="tags">${x.tags.map((t) => `<button data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div></div>` : ''}
      ${haveHTML(x)}
      <div class="sec"><h4>棚</h4><div class="shchips" id="pSh"></div></div>
      <div class="sec"><dl class="meta">${x.place ? `<dt>見た場所</dt><dd>${esc(x.place)}</dd>` : ''}${x.until ? `<dt>会期</dt><dd class="num">${esc(x.until)}まで</dd>` : ''}${x.status === 'done' || x.date ? `<dt>${art ? '見た時期' : x.cat === 'game' ? 'クリアした時期' : x.cat === 'movie' ? '観た時期' : x.cat === 'anime' ? '観終えた時期' : x.cat === 'music' ? (kindOf(x) === 'live' ? '行った日' : '聴いた時期') : '読み終えた時期'}</dt><dd class="num">${esc(fmtWhen(x.date))}</dd>` : ''}<dt>登録</dt><dd class="num">${new Date(x.created).toLocaleDateString('ja-JP')}</dd></dl></div>
      ${!x.review ? `<p class="hint" style="margin-top:16px">感想やメモ、写真、置き場所は「編集」から。</p>` : ''}
      <details class="tl" id="pTl"></details>
    </div>`;
  drawSt(x); drawRate(x); if (x.series && !art && !mus) { drawVols(x); drawVnotes(x); } if (prog) drawProg(x); drawRounds(x); drawShelves(x); drawTl(x);
  hydrate($('#page'));
}
const drawSt = (x) => { $('#pSt').innerHTML = Cx(x).st.map(([k, l]) => `<button data-st="${k}" class="${!x.want && x.status === k ? 'on' : ''}">${l}</button>`).join('') + (x.cat === 'music' && kindOf(x) === 'live' ? '' : `<button data-st="want" class="${x.want ? 'on' : ''}">ほしい</button>`); };
function drawRounds(x) {
  const C = Cx(x), past = x.rounds.slice().reverse();
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
  const C = Cx(x), r = rt(x), va = x.series ? volRates(x) : [];
  $('#pRate').innerHTML = rateHTML(r);
  let h = '';
  if (x.cat === 'music' && kindOf(x) === 'live') va.length = 0;
  if (va.length) h += `<p class="avgline">${x.rateFix ? `自分で決めた評価。${C.vol}ごとの平均は ★${volAvg(x)}（${va.length}${C.vol}分）<button data-act="rateavg">平均に戻す</button>` : `${C.vol}ごとの評価の平均（${va.length}${C.vol}分）。星を押すと、${x.cat === 'music' ? 'アルバム' : 'シリーズ'}全体の評価を自分で決められる。`}</p>`;
  else if (x.series && !(x.cat === 'music' && kindOf(x) === 'live')) h += `<p class="avgline">${C.vol}ごとに星をつけると、ここはその平均になる。</p>`;
  if (x.exp > 0) {
    if (r > 0) { const d = Math.round((r - x.exp) * 10) / 10; h += `<div class="expd">期待 ★${x.exp} → 実際 ★${r}　<b class="num">${d > 0 ? '+' : ''}${d || '±0'}</b>　${d > 0 ? '期待以上だった' : d < 0 ? '期待ほどじゃなかった' : '期待どおり'}</div>`; }
    else h += `<div class="expd">期待度 ★${x.exp}。評価をつけると差が出る。</div>`;
  }
  $('#pAvg').innerHTML = h;
}
function drawVols(x, just) { drawVols0(x, just); drawParts(x); }
function drawVols0(x, just) {
  const C = Cx(x), u = C.vol, n = x.vols || 0, ser = C.ser;
  if (light(x)) {
    let h = `<div class="vhead"><span><b class="num">${x.cur}</b> <small>${n ? `/ ${n}${u}` : `${u}まで${C.did}`}${x.done ? `（${ser.fin}）` : ''}</small></span><span class="step"><button data-vstep="-1" aria-label="1つ戻す">−1</button></span></div>`;
    if (n) h += `<div class="vbar"><i style="width:${Math.min(100, x.cur / n * 100)}%"></i></div>`;
    h += `<button class="btn pri epplus" data-vstep="1">＋1${u}<small>${C.volN(x.cur + 1)}を${C.did}</small></button>`;
    h += `<div class="eprow"><label class="f">まとめて入れる<input id="epSet" inputmode="numeric" placeholder="${x.cur}"></label><button class="btn sm" data-act="epset">決める</button>${x.cur ? `<button class="btn sm" data-act="epmemo">${C.volN(x.cur)}にメモ</button>` : ''}</div>`;
    if (x.ownB && x.ownB.length && !partMode(x)) h += `<div class="vrow2"><span>持ってる単行本</span><span>${esc(rangeText(x.ownB))}巻</span></div>`;
    $('#pVols').innerHTML = h; return;
  }
  const modes = [['open', '詳しく見る'], ['read', '進める'], ...(C.own ? [['own', '持ってる']] : [])];
  if (!modes.some((m) => m[0] === ui.vmode)) ui.vmode = 'open';
  const hint = { open: `タップで、その${u}の写真・評価・感想`, read: `タップした${u}までを「${C.did}」にする`, own: 'タップで「持ってる／持ってない」を切り替え' }[ui.vmode];
  let h = `<div class="vhead"><span><b class="num">${x.cur}</b> <small>/ ${n ? (x.done ? `全${n}${u}（${ser.fin}）` : `${ser.have}${n}${u}（${ser.on}）`) : `?${u}`}</small></span><span class="step"><button data-vstep="-1" aria-label="1つ戻す">−</button><button data-vstep="1" aria-label="1つ進める">＋</button></span></div>`;
  if (n) h += `<div class="seg sm" style="margin-top:12px">${modes.map(([k, l]) => `<button data-vm="${k}" class="${ui.vmode === k ? 'on' : ''}">${l}</button>`).join('')}</div><p class="hint" style="margin-top:6px">${hint}</p>`;
  if (n && n <= 300) {
    const SP = seasoned(x) ? partsOf(x) : null;
    h += `<div class="vshelf">${Array.from({ length: n }, (_, k) => { const i = k + 1, d = x.v[i] || {}, sp = SP && SP.find((q) => q.n && q.from === i), lab = SP ? (partOf(x, i) ? i - partOf(x, i).from + 1 : i) : i; const cls = [i <= x.cur ? 'rd' : x.ownOn ? (owned(x, i) ? 'own' : 'no') : '', x.coverVol === i ? 'cvr' : '', d.r || d.c || d.img ? 'has' : '', just === i ? 'just' : ''].filter(Boolean).join(' '); return `${sp ? `<span class="vsep">${esc(sp.name)}</span>` : ''}<button data-vol="${i}" class="${cls}" aria-label="${C.volN(i)}">${lab}</button>`; }).join('')}${!x.done ? `<button class="plus" data-act="volplus" aria-label="${ser.nw}を足す">＋</button>` : ''}</div>` +
      `<div class="legend"><span><i class="a"></i>${C.did}</span>${x.ownOn ? '<span><i class="b"></i>持ってる</span><span><i class="c"></i>持ってない</span>' : ''}<span><i class="d"></i>感想・評価あり</span></div>`;
  } else if (n) h += `<div class="r2" style="margin-top:12px"><label class="f">${u}を開く<input id="vjump" inputmode="numeric" placeholder="1〜${n}"></label><button class="btn sm" data-act="vjump" style="align-self:end">開く</button></div>`;
  if (x.ownOn) { const m = missing(x); h += `<div class="vrow2"><span>持ってる <b class="num">${ownN(x)}</b>/ ${n}${u}</span><span>${m.length ? `持ってない：${shortList(m, u)}` : '全部そろってる'}</span></div>`; }
  else if (C.own && n) h += `<p class="hint" style="margin-top:10px">「持ってる」に切り替えると、飛び飛びで持ってる${u}も記録できる。</p>`;
  if (n && !(n <= 300)) h += `<div class="vbar"><i style="width:${Math.min(100, x.cur / n * 100)}%"></i></div>`;
  if (n && !x.done && n > 300) h += `<button class="btn sm" data-act="volplus" style="margin-top:12px">${ser.nw}が出た（＋1）</button>`;
  if (!n) h += `<p class="hint" style="margin-top:10px">「編集」で${ser.volsL}を入れると、${u}ごとに記録できる。</p>`;
  $('#pVols').innerHTML = h;
}
/* ===== 巻・シーズンの一覧（作品のページ） ===== */
function syncParts() {
  for (const x of S.items) {
    if (!Array.isArray(x.parts) || !x.parts.length) continue;
    const m = partMode(x);
    if (m === 'season') {
      const tot = x.parts.reduce((q, p) => q + (p.n || 0), 0), last = x.parts[x.parts.length - 1];
      if ((x.vols || 0) > tot) last.n = (last.n || 0) + x.vols - tot; else x.vols = tot;
      for (const p of partsOf(x)) if (p.n && x.cur >= p.to && !x.parts[p.i - 1].date) x.parts[p.i - 1].date = today();
    } else if (m === 'vol') x.ownB = partsOf(x).filter((p) => p.own).map((p) => p.i);
  }
}
function drawParts(x) {
  const el = $('#pParts'); if (!el) return;
  const m = partMode(x); if (!m) { el.innerHTML = ''; return; }
  const P = partsOf(x), sea = m === 'season';
  let h = `<div class="parts-h"><b>${sea ? 'シーズン' : '巻（単行本）'}</b><button class="lnk" data-act="partadd">＋ ${sea ? 'シーズン' : '巻'}を足す</button></div>`;
  if (!P.length) h += `<p class="hint">${sea ? '1つの作品の中に「1期・2期…」を作れる。シーズンごとに表紙・評価・感想・話数を持てて、話はシーズンごとに第1話から数える。劇場版は映画の部屋に入れて「関連」でつなぐ。' : '話で読みつつ、単行本の巻ごとに表紙・評価・感想、持ってる／ほしいを残せる。「1巻あたりの話数」を入れると、何話がどの巻に入ってるか自動で分ける。'}</p>`;
  if (!sea) h += `<div class="pvset"><label class="f">1巻あたりの話数<input id="perVol" inputmode="numeric" value="${x.perVol || ''}" placeholder="例：9"></label><label class="f">今出てる巻数<input id="volUpto" inputmode="numeric" value="${P.length || ''}" placeholder="例：12"></label><button class="btn sm" data-act="partauto">決める</button></div>`;
  if (P.length) h += `<div class="pstrip">${P.map((p) => partCard(x, p, sea)).join('')}</div>`;
  if (sea) h += `<button class="lnk" data-act="partmerge" style="margin-top:10px">別に登録したシーズンを取り込む</button>`;
  else { const w = P.filter((p) => p.want), o = P.filter((p) => p.own), ys = (l) => (S.set.money && l.some((p) => p.p) ? `（${yen(l.reduce((t, p) => t + (p.p || 0), 0))}）` : ''); if (P.length) h += `<p class="hint" style="margin-top:8px">${o.length ? `持ってる：${esc(rangeText(o.map((p) => p.i)))}巻${ys(o)}` : '持ってる巻はまだなし'}${w.length ? `　ほしい：${esc(rangeText(w.map((p) => p.i)))}巻${ys(w)}` : ''}</p>`; }
  el.innerHTML = `<div class="box parts">${h}</div>`; hydrate(el);
}
function partPh(x, p) {
  const k = p.img ? partKey(x, p) : '';
  const g = x.cat === 'anime' ? genHTML({ ...x, season: p.name, coverVol: 0 }) : genHTML(x, p.i);
  return `<div class="ph"${k ? ` data-img="${esc(k)}"` : ''}>${g}</div>`;
}
function partCard(x, p, sea) {
  const done = p.n > 0 && x.cur >= p.to, prog = p.n ? clamp(x.cur - p.from + 1, 0, p.n) : 0;
  const tag = sea ? (p.n ? (done ? '観た' : prog ? `${prog}/${p.n}話` : `${p.n}話`) : '') : [done ? '読んだ' : '', p.own ? '持ってる' : p.want ? 'ほしい' : ''].filter(Boolean).join('・');
  return `<button class="pcard${p.want ? ' want' : ''}${done ? ' done' : ''}${x.coverPart === p.id ? ' cvr' : ''}" data-part="${p.i}"><span class="pth vt">${partPh(x, p)}</span><b>${esc(p.name)}</b><small>${p.r ? `<em>★${p.r}</em>` : ''}${esc(tag) || '&nbsp;'}</small></button>`;
}
/* 巻・シーズンのシート */
let part = null;
function openPart(x, i) { part = { id: x.id, i }; drawPartSheet(); if (!$('#dPart').open) $('#dPart').showModal(); }
const curPart = () => { const x = part && findItem(part.id); if (!x || !x.parts || !x.parts[part.i - 1]) return null; return { x, p: x.parts[part.i - 1], P: partsOf(x)[part.i - 1] }; };
async function drawPartSheet() {
  const c = curPart(); if (!c) return; const { x, p, P } = c, sea = partMode(x) === 'season';
  $('#ptT').textContent = P.name; $('#ptName').value = p.name || ''; $('#ptName').placeholder = partNm(x, P.i);
  $('#ptRate').innerHTML = rateHTML(p.r || 0, 'ptstar', 'ptrateclear');
  $('#ptC').value = p.c || ''; $('#ptC').placeholder = `${P.name}の感想・メモ`;
  $('#ptN').value = p.n || ''; $('#ptNL').textContent = sea ? 'このシーズンの話数' : 'この巻に入ってる話数';
  $('#ptRange').textContent = p.n ? `第${P.from}〜${P.to}話${sea ? `（このシーズンでは第1〜${p.n}話）` : ''}` : (sea ? '話数を入れると、話ごとに記録できる。観て進めると自動で増える。' : '話数を入れると、どの話がこの巻に入ってるか分かる。');
  $('#ptOwnRow').hidden = sea; $('#ptOwnSeg').innerHTML = [['no', '持ってない'], ['own', '持ってる'], ['want', 'ほしい']].map(([k, l]) => `<button type="button" data-pown="${k}" class="${(p.own ? 'own' : p.want ? 'want' : 'no') === k ? 'on' : ''}">${l}</button>`).join('');
  $('#ptDateF').hidden = !sea; $('#ptDate').value = p.date || '';
  $('#ptPriceF').hidden = !S.set.money; $('#ptPrice').value = p.p || ''; $('#ptPriceL').textContent = sea ? '払ったお金（円・円盤やレンタルなど。なければ空）' : `この巻の値段（円）${p.own ? '' : p.want ? '　※ほしいの間は合計に入らない' : '　※「持ってる」にすると合計に入る'}`;
  $('#ptDel').textContent = sea ? 'このシーズンを消す' : 'この巻を消す';
  setSw('#ptCvSw', x.coverPart === p.id); $('#ptRm').hidden = !p.img;
  const eps = []; if (p.n) for (let k = P.from; k <= P.to; k++) { const d = x.v[k]; if (d && (d.r || d.c)) eps.push([k, d]); }
  $('#ptEps').innerHTML = eps.length ? `<h4 class="fh">この${sea ? 'シーズン' : '巻'}の話の感想（${eps.length}）</h4><ul class="pteps">${eps.map(([k, d]) => `<li><button data-vopen="${k}"><b>${esc(sea ? `第${k - P.from + 1}話` : `第${k}話`)}</b>${d.r ? `<span class="num">★${d.r}</span>` : ''}${d.c ? `<small>${esc(d.c)}</small>` : ''}</button></li>`).join('')}</ul>` : '';
  const pv = $('#ptPv'); pv.innerHTML = partPh(x, P); hydrate(pv);
}
/* アニメのシーズンの話数を変えたとき、後ろのシーズンの話の記録をずらす（写真も） */
async function shiftEps(x, after, delta, dropFrom) {
  const keys = Object.keys(x.v).map(Number).filter((k) => k > after || (dropFrom != null && k >= dropFrom && k <= after));
  const nv = {}; for (const [k, d] of Object.entries(x.v)) if (!keys.includes(+k)) nv[k] = d;
  const moves = [];
  for (const k of keys) { const d = x.v[k]; if (dropFrom != null && k >= dropFrom && k <= after) { if (d && d.img) { idb.del(`${x.id}~${k}`).catch(() => {}); forget(`${x.id}~${k}`); } continue; } nv[k + delta] = d; if (d && d.img) moves.push([k, k + delta]); }
  x.v = nv;
  moves.sort((a, b) => (delta > 0 ? b[0] - a[0] : a[0] - b[0]));
  for (const [a, b] of moves) { try { const bl = await idb.get(`${x.id}~${a}`); if (bl) { await idb.set(`${x.id}~${b}`, bl); await idb.del(`${x.id}~${a}`); } forget(`${x.id}~${a}`); forget(`${x.id}~${b}`); } catch (e) {} }
  if (x.coverVol) { if (x.coverVol > after) x.coverVol += delta; else if (dropFrom != null && x.coverVol >= dropFrom) x.coverVol = 0; }
  if (x.cur > after) x.cur = Math.max(0, x.cur + delta); else if (dropFrom != null && x.cur >= dropFrom) x.cur = dropFrom - 1;
}
async function setPartN(x, i, n) {
  const p = x.parts[i - 1], P = partsOf(x)[i - 1], old = p.n || 0; if (n === old) return;
  if (partMode(x) === 'season' && i < x.parts.length) {
    const delta = n - old;
    if (delta < 0) { const lost = []; for (let k = P.from + n; k <= P.to; k++) { const d = x.v[k]; if (d && (d.r || d.c || d.img)) lost.push(k); } if (lost.length && !confirm(`減らした分の${lost.length}話の評価・感想が消える。いい？`)) { drawPartSheet(); return; } await shiftEps(x, P.to, delta, P.from + n); }
    else await shiftEps(x, P.to, delta);
  } else if (partMode(x) === 'season' && n < old) { for (let k = P.from + n; k <= P.to; k++) { const d = x.v[k]; if (d && d.img) { idb.del(`${x.id}~${k}`).catch(() => {}); forget(`${x.id}~${k}`); } delete x.v[k]; } if (x.cur > P.from + n - 1) x.cur = P.from + n - 1; }
  p.n = n;
  if (partMode(x) === 'season') { x.vols = x.parts.reduce((q, r) => q + (r.n || 0), 0); if (n > old) x.done = false; }
}
async function delPart(x, i) {
  const p = x.parts[i - 1], P = partsOf(x)[i - 1];
  if (partMode(x) === 'season' && p.n) await shiftEps(x, P.to, -p.n, P.from);
  if (p.img) { idb.del(partKey(x, p)).catch(() => {}); forget(partKey(x, p)); }
  if (x.coverPart === p.id) x.coverPart = '';
  x.parts.splice(i - 1, 1);
  if (partMode(x) === 'season') x.vols = x.parts.reduce((q, r) => q + (r.n || 0), 0);
}
function addPart(x) {
  x.parts = x.parts || [];
  if (partMode(x) === 'season') {
    if (!x.parts.length && x.vols > 0) { x.parts.push({ id: uid(), n: x.vols, r: x.rating || 0, date: x.status === 'done' ? x.date || '' : '' }); toast('今までの話は「1期」にまとめた'); }
    x.parts.push({ id: uid(), n: 0 }); x.done = false;
  } else x.parts.push({ id: uid(), n: x.perVol || 0 });
  return x.parts.length;
}
/* 別に登録したシーズンを、この作品のシーズンとして取り込む */
async function mergeSeasons(x, list) {
  if (!x.parts || !x.parts.length) { x.parts = [{ id: uid(), n: x.vols || 0, r: rt(x) || 0, date: x.status === 'done' ? x.date || '' : '' }]; }
  const strip = (t) => { const a = norm(x.title); let r = String(t); if (norm(r).startsWith(a)) r = r.slice(x.title.length); return r.replace(/^[\s　:：\-－~〜・]+/, '').trim(); };
  for (const o of list.sort((a, b) => (+a.year || 9999) - (+b.year || 9999) || a.created - b.created)) {
    const base = x.parts.reduce((q, r) => q + (r.n || 0), 0), on = o.series ? Math.min(o.vols || 0, 2000) : 0, pid = uid();
    for (let k = 1; k <= on; k++) { const d = o.v[k]; if (!d) continue; x.v[base + k] = JSON.parse(JSON.stringify(d)); if (d.img) { try { const b = await idb.get(`${o.id}~${k}`); if (b) await idb.set(`${x.id}~${base + k}`, b); } catch (e) {} } }
    let img = false; if (o.img) { try { const b = await idb.get(o.id); if (b) { await idb.set(`${x.id}~p${pid}`, b); img = true; } } catch (e) {} }
    x.parts.push({ id: pid, n: on, name: strip(o.title) || '', r: rt(o) || 0, c: o.review || '', date: o.status === 'done' ? o.date || '' : '', img });
    if (x.cur >= base) x.cur = base + (o.status === 'done' ? on : Math.min(o.cur || 0, on));
    for (const y of S.items) if (y !== o && y.links && y.links.includes(o.id)) { y.links = [...new Set(y.links.map((q) => (q === o.id ? x.id : q)))].filter((q) => q !== y.id); }
    x.links = [...new Set([...x.links, ...(o.links || [])])].filter((q) => q !== x.id && q !== o.id);
    for (const c of Object.values(S.best)) for (const y of Object.keys(c)) c[y] = [...new Set(c[y].map((q) => (q === o.id ? x.id : q)))];
    x.sh = [...new Set([...(x.sh || []), ...(o.sh || [])])];
    S.items = S.items.filter((q) => q !== o); for (const k of imgKeys(o)) { idb.del(k).catch(() => {}); forget(k); }
  }
  x.vols = x.parts.reduce((q, r) => q + (r.n || 0), 0); x.series = true;
  if (x.status === 'done' && x.cur < x.vols) { x.status = 'doing'; x.done = false; }
  touch(x);
}
function drawVnotes(x) {
  const C = Cx(x), all = Object.entries(x.v).filter(([k, d]) => d && (d.c || d.r) && (!x.vols || +k <= x.vols)).map(([k, d]) => [+k, d]);
  if (!all.length) { $('#pVnotes').innerHTML = ''; return; }
  const old = ui.vnOrd === 'old', l = all.sort((a, b) => (old ? a[0] - b[0] : b[0] - a[0])), open = ui.vnAll === x.id, lim = open ? l.length : 5;
  const rs = all.map(([, d]) => d.r).filter((r) => r > 0), avg = rs.length ? (rs.reduce((a, r) => a + r, 0) / rs.length).toFixed(1) : '';
  const sea = seasoned(x), pm = partMode(x), grp = pm && (x.parts || []).length;
  const lab = (k) => { if (sea) { const p = partOf(x, k); return p ? `第${k - p.from + 1}話` : `第${k}話`; } return C.volN(k); };
  let last = null, h = '';
  for (const [k, d] of l.slice(0, lim)) {
    if (grp) { const p = partOf(x, k), nm = p ? p.name : sea ? '' : 'まだ巻に入ってない話'; if (nm !== last) { h += `<li class="vng">${esc(nm)}</li>`; last = nm; } }
    h += `<li><button class="vn" data-vopen="${k}"><span class="vnh"><b>${esc(lab(k))}</b>${d.r ? starsHTML(d.r) : ''}</span>${d.c ? `<span class="vnc">${esc(d.c)}</span>` : ''}</button></li>`;
  }
  const strip = rs.length >= 5 ? `<div class="vnbar" aria-hidden="true">${all.slice().sort((a, b) => a[0] - b[0]).filter(([, d]) => d.r > 0).slice(-60).map(([k, d]) => `<i style="height:${Math.round(d.r / 5 * 100)}%" title="${esc(lab(k))} ★${d.r}"></i>`).join('')}</div>` : '';
  $('#pVnotes').innerHTML = `<div class="sec"><div class="vnhead"><h4>${C.vol}ごとの感想（${all.length}）</h4><div class="seg sm vnord"><button data-act="vnord" data-o="new" class="${old ? '' : 'on'}">新しい順</button><button data-act="vnord" data-o="old" class="${old ? 'on' : ''}">古い順</button></div></div>
    <div class="box vnotes">${avg ? `<p class="vnavg">${C.vol}の平均 <b class="num">★${avg}</b><small>（評価${rs.length}件）</small></p>` : ''}${strip}<ul class="vnl">${h}</ul>${l.length > 5 ? `<button class="lnk vnmore" data-act="vnall">${open ? 'たたむ ▴' : `残り${l.length - 5}件も見る ▾`}</button>` : ''}</div></div>`;
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
// 大きな表紙は正面向き。指でドラッグすると好きな角度に傾けられて、2回タップで正面に戻る
let hd = null, lastTap = 0;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('#pageHero'); if (!h) return;
  try { h.setPointerCapture(e.pointerId); } catch (err) {}
  const [ry, rx] = (h.dataset.rot || '0,0').split(',').map(Number);
  hd = { h, x: e.clientX, y: e.clientY, ry, rx, moved: false };
  h.style.transition = 'none';
});
document.addEventListener('pointermove', (e) => {
  if (!hd) return;
  const dx = e.clientX - hd.x, dy = e.clientY - hd.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) hd.moved = true;
  const ry = clamp(hd.ry + dx * 0.55, -80, 80), rx = clamp(hd.rx - dy * 0.45, -50, 50);
  hd.cur = [Math.round(ry), Math.round(rx)];
  hd.h.style.transform = `rotateY(${hd.cur[0]}deg) rotateX(${hd.cur[1]}deg)`;
});
const heroUp = () => {
  if (!hd) return;
  const h = hd.h; h.style.transition = '';
  if (hd.moved && hd.cur) h.dataset.rot = hd.cur.join(',');
  else { const now = Date.now(); if (now - lastTap < 320) { h.dataset.rot = '0,0'; h.style.transform = ''; } lastTap = now; }
  hd = null;
};
document.addEventListener('pointerup', heroUp); document.addEventListener('pointercancel', heroUp);
function burst(el) {
  if (reduced) return;
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('i'); p.className = 'burst'; const a = i / 8 * Math.PI * 2, d = 28 + Math.random() * 14;
    p.style.left = cx - 3 + 'px'; p.style.top = cy - 3 + 'px'; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.append(p); setTimeout(() => p.remove(), 650);
  }
}
/* ===== シングルとアルバムの中の同じ曲をつなぐ（評価・感想を共通にする） ===== */
const songKey = (title, cr) => (title && cr ? norm(cr) + '|' + norm(title) : '');
const linkQ = []; ui.asked = new Set();
function eachTrack(f) { for (const a of S.items) { if (a.cat !== 'music' || kindOf(a) !== 'album') continue; for (let i = 1; i <= Math.min(a.vols || 0, 300); i++) { const d = a.v[i]; if (d && d.t) f(a, i, d); } } }
const mergeTxt = (p, q) => (!p ? q || '' : !q || p === q ? p : `${p}\n—\n${q}`);
function linkTrack(a, i, s, keep) {
  const d = vget(a, i);
  if (keep === 'track') { if (d.r) s.rating = d.r; s.review = mergeTxt(d.c, s.review); }
  else { if (!s.rating && d.r) s.rating = d.r; s.review = mergeTxt(s.review, d.c); }
  d.sid = s.id; delete d.nos; d.u = s.updated = Date.now();
}
function syncSingles() {
  const songs = S.items.filter((x) => x.cat === 'music' && kindOf(x) === 'song'), byId = new Map(songs.map((x) => [x.id, x])), byKey = new Map();
  for (const x of songs) { const k = songKey(x.title, x.creator); if (k && !byKey.has(k)) byKey.set(k, x); }
  const links = new Map();
  eachTrack((a, i, d) => {
    if (d.sid) { if (!byId.has(d.sid)) { delete d.sid; return; } (links.get(d.sid) || links.set(d.sid, []).get(d.sid)).push(d); return; }
    if (d.nos) return;
    const s = byKey.get(songKey(d.t, a.creator)); if (!s) return;
    const clash = (d.r && s.rating && d.r !== s.rating) || (d.c && s.review && d.c !== s.review);
    if (!clash) { linkTrack(a, i, s); (links.get(s.id) || links.set(s.id, []).get(s.id)).push(d); return; }
    const key = `${a.id}~${i}`; if (!ui.asked.has(key)) { ui.asked.add(key); linkQ.push([a.id, i, s.id]); }
  });
  for (const [sid, ds] of links) {
    const s = byId.get(sid), top = ds.reduce((m, d) => ((d.u || 0) > (m ? m.u || 0 : 0) ? d : m), null);
    if (top && (top.u || 0) > (s.updated || 0)) { if (top.r) s.rating = top.r; if (top.c) s.review = top.c; s.updated = top.u; }
    for (const d of ds) { if (s.rating) d.r = s.rating; if (s.review) d.c = s.review; d.u = s.updated; }
  }
  if (linkQ.length && !$('#dLink').open) setTimeout(askLink, 300);
}
function askLink() {
  while (linkQ.length) {
    const [aid, i, sid] = linkQ[0], a = findItem(aid), s = findItem(sid), d = a && a.v[i];
    if (!a || !s || !d || d.sid || d.nos) { linkQ.shift(); continue; }
    const side = (r, c) => `${r ? `<b class="num">★${r}</b>` : '<span class="hint">評価なし</span>'}${c ? `<small>${esc(c.length > 60 ? c.slice(0, 58) + '…' : c)}</small>` : ''}`;
    $('#lkBody').innerHTML = `<p class="hint">「${esc(d.t)}」（${esc(a.creator)}）がシングルとアルバム『${esc(a.title)}』の${i}曲目の両方にある。つなぐと1曲として扱って、評価と感想が共通になる。評価が違うから、どっちを残すか選んでね（感想は両方あればつなげて残す）。</p>
      <div class="lkcmp"><div><span>シングル</span>${side(s.rating, s.review)}</div><div><span>アルバムの${i}曲目</span>${side(d.r, d.c)}</div></div>`;
    $('#lkS').textContent = `シングルの${s.rating ? '★' + s.rating : '評価'}を残す`; $('#lkT').textContent = `アルバムの${d.r ? '★' + d.r : '評価'}を残す`;
    if (!$('#dLink').open) $('#dLink').showModal();
    return;
  }
  if ($('#dLink').open) $('#dLink').close();
}
function answerLink(how) {
  const q = linkQ.shift(); if (!q) return;
  const [aid, i, sid] = q, a = findItem(aid), s = findItem(sid);
  if (a && s) { if (how === 'no') vget(a, i).nos = 1; else { linkTrack(a, i, s, how); toast('つないだ。評価と感想が共通になった'); } }
  save(); render(); const cp = curItem(); if (cp) renderPage(cp);
  if (linkQ.length) askLink(); else $('#dLink').close();
}
const linkedAlbums = (s) => { const out = []; eachTrack((a, i, d) => { if (d.sid === s.id) out.push([a, i]); }); return out; };
/* 追加・編集の画面：入れかけの内容があるときは、閉じる前に確認する */
let editSnap = '';
const editSig = () => { try { const f = $('#fEdit'); return JSON.stringify([[...new FormData(f)].filter(([, v]) => typeof v === 'string'), draft && [draft.status, draft.want, draft.rating, draft.media, draft.kind, draft.series, draft.unit, draft.tags, draft.fmt, draft.links, !!draft.newImg]]); } catch (e) { return ''; } };
function canClose(d) { if (!d || d.id !== 'dEdit' || !editSnap || editSig() === editSnap) return true; return confirm('入れた内容はまだ保存されてない。閉じる？'); }
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
  if (end && x.status !== 'done') askDone(x, redraw, `最後まで${Cx(x).did}！「${stLabel(x.cat, 'done')}」にする？`);
}

/* ===== 「本当に終わった？」 ===== */
let doneCtx = null;
function askDone(x, then, title) {
  const C = Cx(x);
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
  vol = { id: x.id, n: clamp(n, 1, Math.max(1, x.vols, x.cur, n)) };
  drawVolSheet();
  if (!$('#dVol').open) $('#dVol').showModal();
}
async function drawVolSheet() {
  const x = findItem(vol.id); if (!x) return;
  const C = Cx(x), n = vol.n, d = x.v[n] || {};
  const isM = x.cat === 'music';
  $('#volT').textContent = isM && d.t ? `${n}. ${d.t}` : C.volN(n);
  $('[data-act="vprev"]').disabled = n <= 1; $('[data-act="vnext"]').disabled = n >= Math.max(x.vols, x.cur);
  $('#volTitleF').hidden = !isM; $('#volTitle').value = d.t || ''; $('#volPh').hidden = isM; $('#volReadB').hidden = isM;
  setSw('#volCvSw', x.coverVol === n);
  $('#volRate').innerHTML = rateHTML(d.r || 0, 'vstar', 'vrateclear');
  $('#volC').value = d.c || '';
  $('#volC').placeholder = `${C.volN(n)}の感想・メモ（ここだけの話）`;
  $('#volOwnRow').hidden = !C.own; setSw('#volOwnSw', owned(x, n));
  $('#volPriceF').hidden = !S.set.money; $('#volPrice').value = d.p || '';
  $('#volReadB').textContent = n <= x.cur ? 'ここから「まだ」に戻す' : `ここまで${C.did}`;
  $('#volRm').hidden = !d.img;
  const albumTrk = isM && kindOf(x) === 'album', sg = albumTrk && d.sid && findItem(d.sid);
  $('#volLink').hidden = !albumTrk;
  if (albumTrk) $('#volLink').innerHTML = sg ? `<p class="hint" style="margin:0">シングル「${esc(sg.title)}」とつながってる。評価と感想は共通。</p><div class="kfoot"><button class="lnk" data-goid="${esc(sg.id)}">シングルのページ ›</button><button class="lnk" data-act="unlinksg">つながりを外す</button></div>` : `<button class="lnk" data-act="linksg">シングルとつなぐ（評価・感想を共通にする）</button>`;
  const pv = $('#volPv');
  pv.innerHTML = genHTML(x, n);
  if (d.img) { const u = await imgURL(`${x.id}~${n}`); if (u && vol && vol.n === n) pv.innerHTML = `<img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover">`; }
}
let vct;
$('#volC').addEventListener('input', (e) => {
  const x = vol && findItem(vol.id); if (!x) return;
  const v = e.target.value.slice(0, 3000); if (v) vget(x, vol.n).c = v; else if (x.v[vol.n]) delete x.v[vol.n].c; if (x.v[vol.n]) x.v[vol.n].u = Date.now();
  clearTimeout(vct); vct = setTimeout(() => touch(x), 400);
});
let pct;
$('#ptName').addEventListener('input', (e) => { const c = curPart(); if (!c) return; c.p.name = e.target.value.trim().slice(0, 40); $('#ptT').textContent = c.p.name || partNm(c.x, part.i); clearTimeout(pct); pct = setTimeout(() => touch(c.x), 400); });
$('#ptC').addEventListener('input', (e) => { const c = curPart(); if (!c) return; c.p.c = e.target.value.slice(0, 3000); clearTimeout(pct); pct = setTimeout(() => touch(c.x), 400); });
$('#ptN').addEventListener('change', async (e) => { const c = curPart(); if (!c) return; await setPartN(c.x, part.i, Math.min(int(e.target.value), 2000)); touch(c.x); drawPartSheet(); });
$('#ptPrice').addEventListener('change', (e) => { const c = curPart(); if (!c) return; const v = int(e.target.value); if (v) { if (!c.p.p || c.p.pt == null) c.p.pt = c.x.old ? 0 : Date.now(); c.p.p = v; } else { delete c.p.p; delete c.p.pt; } touch(c.x); drawPartSheet(); });
$('#ptDate').addEventListener('change', (e) => { const c = curPart(); if (!c) return; c.p.date = e.target.value; touch(c.x); });
$('#ptCvSw').addEventListener('click', () => { const c = curPart(); if (!c) return; if (!c.p.img && c.x.coverPart !== c.p.id) { toast('先に写真を入れてね'); return; } c.x.coverPart = c.x.coverPart === c.p.id ? '' : c.p.id; touch(c.x); setSw('#ptCvSw', c.x.coverPart === c.p.id); toast(c.x.coverPart ? `${c.P.name}を表紙にした` : '表紙を元に戻した'); });
$('#ptIn').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; const c = curPart(); if (!f || !c) return;
  const r = await cropImage(f, defaultAr(c.x.cat)); if (!r) return;
  const k = partKey(c.x, c.p);
  try { await idb.set(k, r.blob); forget(k); c.p.img = true; touch(c.x); drawPartSheet(); } catch (err) { toast('写真を保存できなかった'); }
});
$('#dPart').addEventListener('close', () => { clearTimeout(pct); const c = part && findItem(part.id); if (c) { save(); if (curItem() === c) renderPage(c); render(); } part = null; });
$('#volTitle').addEventListener('input', (e) => {
  const x = vol && findItem(vol.id); if (!x) return;
  const v = e.target.value.trim().slice(0, 120); if (v) vget(x, vol.n).t = v; else if (x.v[vol.n]) delete x.v[vol.n].t;
  $('#volT').textContent = v ? `${vol.n}. ${v}` : Cx(x).volN(vol.n);
  clearTimeout(vct); vct = setTimeout(() => touch(x), 400);
});
$('#volPrice').addEventListener('change', (e) => {
  const x = vol && findItem(vol.id); if (!x) return;
  const p = int(e.target.value), d = vget(x, vol.n);
  if (p) { if (!d.p) d.pt = x.old ? 0 : Date.now(); d.p = p; } else { delete d.p; delete d.pt; }
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
    if (!x.coverVol && !x.img) { x.coverVol = n; toast(`${Cx(x).volN(n)}を表紙にした`); }
    touch(x); drawVolSheet();
  } catch (err) { toast('写真を保存できなかった'); }
});
$('#dVol').addEventListener('close', () => { const x = vol && findItem(vol.id); clearTimeout(vct); if (x) { for (const k of Object.keys(x.v)) if (!Object.keys(x.v[k]).length) delete x.v[k]; save(); if (curItem() === x) renderPage(x); else if ($('#page').hidden) drawList(); } vol = null; });

/* ===== 追加・編集 ===== */
let draft = null;
const setSw = (s, on) => $(s).setAttribute('aria-checked', String(!!on));
function uniq(key, base) { return [...new Set([...base, ...S.items.map((x) => x[key]).filter(Boolean)])]; }
function openEdit(id) {
  const x = id ? findItem(id) : null;
  const cat = x ? x.cat : S.cat, C = CATS[cat];
  draft = x ? { ...x, tags: [...x.tags], fmt: [...x.fmt], links: [...x.links] } : { id: null, cat, title: '', creator: ui.F.creator && ui.F.creator.length === 1 ? ui.F.creator[0] : '', year: '', status: C.st.some((s) => s[0] === ui.filter) ? ui.filter : 'none', rating: 0, exp: 0, want: ui.filter === 'want', later: false, series: cat === 'anime', vols: 0, cur: 0, done: false, kind: KINDS[cat] && ui.kind ? ui.kind : '', unit: '', links: [], tst: '', tags: ui.F.tag ? [...ui.F.tag] : [], review: '', memo: '', place: '', date: '', until: '', platform: '', hours: '', color: '', img: false, v: {}, fmt: [], media: '' };
  draft.newImg = null; draft.rmImg = false;
  const f = $('#fEdit');
  $('#editT').textContent = x ? '編集' : `${C.name}を追加`;
  f.title.value = draft.title; f.yomi.value = draft.yomi || ''; f.creator.value = draft.creator || ''; f.year.value = draft.year || ''; f.season.value = draft.season || '';
  f.place.value = draft.place || ''; f.until.value = draft.until || '';
  const dl = (draft.date || '').length;
  draft.wm = dl === 10 ? 'day' : dl === 7 ? 'month' : dl === 4 ? 'year' : x && x.status === 'done' ? 'none' : 'today';
  $('#whenL').textContent = C.whenQ;
  f.vols.value = draft.vols || ''; f.cur.value = draft.cur || '';
  f.own.value = x && x.unit === 'ep' ? rangeText(x.ownB || []) : x && x.ownOn ? rangeText(Object.keys(x.v).filter((k) => x.v[k].o).map(Number)) : '';
  f.genre.value = draft.genre || ''; f.perf.value = draft.perf || ''; f.ldate.value = draft.ldate || ''; f.ltime.value = draft.ltime || ''; f.venue.value = draft.venue || ''; f.lseat.value = draft.lseat || ''; f.gp.value = draft.gp || ''; f.tp.value = draft.tp || '';
  f.tracks.value = x && cat === 'music' ? Array.from({ length: x.vols || 0 }, (_, i) => (x.v[i + 1] && x.v[i + 1].t) || '').join('\n') : '';
  f.page.value = draft.page || ''; f.pages.value = draft.pages || ''; f.pct.value = draft.pct !== '' && draft.pct != null ? draft.pct : ''; f.hours.value = draft.hours || '';
  f.platform.value = draft.platform || ''; f.app.value = draft.app || ''; f.where.value = draft.where || ''; f.theater.value = draft.theater || ''; f.seat.value = draft.seat || '';
  f.price.value = draft.price || ''; f.wishP.value = draft.wishP || ''; f.priceArt.value = draft.price || ''; f.reldate.value = draft.rel || '';
  $('#stSeg').closest('.grp').hidden = false; $('#mediaSeg').hidden = false; $('#liveMoney').hidden = true; $('#oldRow').hidden = false;
  $('#kindF').hidden = !KINDS[cat]; drawKind(); $('#musicF').hidden = cat !== 'music'; $('#unitF').hidden = !(cat === 'manga' || cat === 'book');
  $('#relF').hidden = cat === 'art';
  f.review.value = draft.review || ''; f.memo.value = draft.memo || ''; f.tags.value = draft.tags.join(' '); drawTagSel();
  $('#creatorL').textContent = C.creator;
  $('#artF').hidden = cat !== 'art'; $('#seasonF').hidden = cat !== 'anime'; $('#serG').hidden = cat === 'art' || cat === 'music'; $('#haveG').hidden = cat === 'art';
  $('#priceArtF').hidden = cat !== 'art' || !S.set.money;
  if (C.ser) {
    $('#serLabel').firstChild.textContent = C.ser.label; $('#serHint').textContent = C.ser.hint;
    $('#volsL').textContent = C.ser.volsL; $('#curL').textContent = C.ser.curL;
    $('#finL').firstChild.textContent = C.ser.finQ; $('#finH').textContent = C.ser.finH;
  }
  $('#ownF').hidden = !C.own;
  if (!x) { draft.old = !!ui.oldDef; if (draft.old) draft.wm = 'none'; }
  { const py = draft.pt ? new Date(draft.pt).getFullYear() : 0;
    draft.buy = x && x.price ? (draft.pt === 0 ? 'unk' : py && py !== new Date().getFullYear() ? 'year' : 'now') : draft.old ? 'unk' : 'now';
    f.buyY.value = draft.buy === 'year' ? py : ''; }
  $('#oldL').firstChild.textContent = C.own || C.media ? `前から持ってる・前に${C.did}もの` : `前に${C.did}もの`;
  setSw('#oldSw', draft.old); drawBuy();
  drawUnit(); drawStSeg();
  setSw('#serSw', draft.series); setSw('#doneSw', draft.done); $('#serF').hidden = !draft.series;
  $('#delBtn').hidden = !x;
  const fill2 = (id, a) => { $(id).innerHTML = a.map((v) => `<option value="${esc(v)}">`).join(''); };
  fill2('#crList', [...new Set(S.items.filter((q) => q.cat === cat).map((q) => q.creator).filter(Boolean))]);
  fill2('#genreList', uniq('genre', GENRES)); fill2('#perfList', uniq('perf', [])); fill2('#venueList', uniq('venue', []));
  fill2('#whereList', uniq('where', LISTS.where)); fill2('#appList', uniq('app', LISTS.app).filter((v) => !LISTS.svc.includes(v))); fill2('#svcList', uniq('app', LISTS.svc).filter((v) => !LISTS.app.includes(v))); fill2('#thList', uniq('theater', []));
  drawEditRate(); drawPhoto(); drawSwatches(); drawWhen(); drawProgF(); drawHave(); drawRelL(); drawMusicF(); drawLinkChips(); drawQP();
  /* かんたん追加：よく使う欄だけ見せて、残りは「もっと詳しく」 */
  const filled = x && !!(x.yomi || x.year || x.exp || x.media || x.price || x.rel || x.review || x.memo || x.links.length || x.season || x.pages || x.hours || x.pct !== '' && x.pct != null);
  ui.adv = !S.set.simple || filled;
  $('#fEdit').classList.toggle('simple', !!S.set.simple); $('#fEdit').classList.toggle('advOpen', ui.adv); $('#advB').hidden = !S.set.simple || ui.adv;
  $('#dEdit').showModal(); setTimeout(() => { editSnap = editSig(); }, 60);
  $('#dEdit').scrollTop = 0;
  if (!x) setTimeout(() => { const ae = document.activeElement; if (!ae || !/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) f.title.focus(); }, 400);
}
const drawKind = () => { $('#kindSeg').innerHTML = (KINDS[draft.cat] || []).map(([k, l]) => `<button type="button" data-kind="${k}" class="${kindOf(draft) === k ? 'on' : ''}">${l}</button>`).join(''); };
/* 前に入れた値を、押すだけで入れられるように（多すぎないよう上位だけ） */
function drawQP() {
  const f = $('#fEdit'), m = draft.media || '';
  const top = (key, pred) => { const c = new Map(); for (const x of S.items) if (x[key] && (!pred || pred(x))) c.set(x[key], (c.get(x[key]) || 0) + 1); return [...c].sort((a, b) => b[1] - a[1]).slice(0, key === 'creator' ? 4 : 6).map((q) => q[0]); };
  const sets = { app: top('app', (x) => (m === '配信' ? x.media === '配信' : x.media === '電子' || x.media === '両方')), where: top('where'), platform: top('platform'), theater: top('theater'), venue: top('venue'), perf: top('perf'), creator: top('creator', (x) => x.cat === draft.cat) };
  for (const el of $$('.qpick')) {
    const k = el.dataset.q, cur = (f[k] && f[k].value || '').trim(), l = (sets[k] || []).filter((v) => v !== cur);
    const fld = el.previousElementSibling; if (fld && fld.hidden) { el.hidden = true; continue; }
    el.innerHTML = l.map((v) => `<button type="button" class="chip" data-qk="${k}" data-qv="${esc(v)}">${esc(v)}</button>`).join(''); el.hidden = !l.length;
  }
}
function drawBuy() {
  $$('#buySeg button').forEach((b) => b.classList.toggle('on', b.dataset.buy === draft.buy));
  $('#buyYF').hidden = draft.buy !== 'year';
  $('#buyF').hidden = !S.set.money || draft.want || draft.cat === 'art';
}
function drawUnit() {
  const Cd = Cx(draft), ep = draft.unit === 'ep';
  $$('#unitSeg button').forEach((b) => b.classList.toggle('on', (ep ? 'ep' : 'vol') === b.dataset.unit));
  if (Cd.ser) { $('#volsL').textContent = Cd.ser.volsL; $('#curL').textContent = Cd.ser.curL; }
  const tate = isTate(draft); $('#unitF').hidden = !(draft.cat === 'manga' || draft.cat === 'book') || tate; $('#ownF').hidden = !CATS[draft.cat].own || tate;
  if (tate) $('#ownL').textContent = '';
  const sea = seasoned(draft); $('#fEdit').vols.readOnly = sea; if (sea) { $('#volsL').textContent = '全部の話数（シーズンの合計。変えるのは作品のページのシーズンから）'; $('#curL').textContent = '観たところ（1期からの通しの話数）'; }
  drawRelL(); drawProgF();
  $('#ownL').textContent = ep ? '持ってる単行本（巻・飛び飛びでもOK。空でもOK）' : draft.cat === 'game' ? '持ってる作品（何作目か。飛び飛びでもOK。空なら記録しない）' : '持ってる巻（飛び飛びでもOK。空なら記録しない）';
}
function drawMusicF() {
  if (draft.cat !== 'music') return;
  const k = kindOf(draft), live = k === 'live';
  $('#liveF').hidden = !live; $('#tracksF').hidden = k === 'song';
  $('#tracksL').textContent = live ? 'セットリスト（1行に1曲・順番どおり）' : '曲名（1行に1曲・順番どおり）';
  $('#tstSeg').innerHTML = TST.map(([v, l]) => `<button type="button" data-etst="${v}" class="${draft.tst === v ? 'on' : ''}">${l}</button>`).join('');
  const g = $('#fEdit').genre.value.trim(), cl = !live && g === 'クラシック';
  $('#clF').hidden = !cl; $('#creatorL').textContent = cl ? '作曲家' : CATS.music.creator;
  if (cl) $('#tracksL').textContent = '曲名・楽章（1行に1つ・順番どおり）';
  $('#genreQuick').innerHTML = uniq('genre', GENRES).map((t) => `<button type="button" class="chip${g === t ? ' on' : ''}" data-genre="${esc(t)}">${esc(t)}</button>`).join('');
  $('#stSeg').closest('.grp').hidden = live;
  $('#mediaSeg').hidden = live; if (live) { $('#appF').hidden = true; $('#whereF').hidden = true; }
  $('#liveMoney').hidden = !live || !S.set.money;
  $('#oldRow').hidden = live;
  $('#priceL').textContent = live ? 'チケット代（円）' : draft.want ? '値段（円・ほしい物は買うまで合計に入らない）' : '値段（円）';
  $('#relF').hidden = live; $('#relL').textContent = relWord(draft).label;
  $('#rateL').textContent = live ? 'ライブの評価' : k === 'album' ? '評価（アルバム全体。曲ごとの星は作品のページで）' : '評価';
}
function drawLinkChips() {
  const l = (draft.links || []).map(findItem).filter(Boolean);
  $('#linkChips').innerHTML = l.length ? l.map((o) => `<button type="button" class="chip on" data-unlink="${esc(o.id)}">${esc(o.title)}<small>${esc(CATS[o.cat].short || CATS[o.cat].name)}</small>　×</button>`).join('') : '<p class="hint" style="margin:0">なし（押さなければ何も出ない）</p>';
}
const drawRelL = () => { $('#relL').textContent = relWord(draft).label; };
const curTags = () => $('#fEdit').tags.value.split(/[\s、,，]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
const setTags = (a) => { $('#fEdit').tags.value = [...new Set(a)].slice(0, 12).join(' '); drawTagSel(); if ($('#dTagP').open) drawTagPick(); };
function drawTagSel() {
  const a = curTags();
  $('#tagSel').innerHTML = a.length ? a.map((t) => `<button type="button" class="chip on" data-tagx="${esc(t)}">#${esc(t)}　×</button>`).join('') : '<p class="hint" style="margin:0">なし</p>';
}
function drawTagPick() {
  const have = new Set(curTags()), cnt = new Map();
  for (const x of S.items) for (const t of x.tags) { const c = cnt.get(t) || [0, 0]; c[x.cat === draft.cat ? 0 : 1]++; cnt.set(t, c); }
  for (const t of have) if (!cnt.has(t)) cnt.set(t, [0, 0]);
  const c1 = new Map([...cnt].map(([t, [a, b]]) => [t, a * 1000 + b]));
  $('#tpList').innerHTML = c1.size ? groupTags(c1).map(([g, l]) => `${g ? `<h5 class="fgh">${esc(g)}</h5>` : ''}<div class="fchips">${l.map((t) => { const a = cnt.get(t)[0]; return `<button type="button" class="chip${have.has(t) ? ' on' : ''}" data-tp="${esc(t)}">#${esc(t)}${a ? `<small>${a}</small>` : ''}</button>`; }).join('')}</div>`).join('') : '<p class="hint">まだタグがない。下でつくると、次からここに出る。</p>';
}
function drawStSeg() {
  const C = CATS[draft.cat];
  $('#stSeg').innerHTML = C.st.map(([k, l]) => `<button type="button" data-est="${k}" class="${!draft.want && draft.status === k ? 'on' : ''}">${l}</button>`).join('') + `<button type="button" data-est="want" class="${draft.want ? 'on' : ''}">ほしい</button>`;
  $('#priceL').textContent = draft.want ? '値段（円・ほしい物は買うまで合計に入らない）' : '値段（円）';
}
function drawWhen() { $('#whenF').hidden = draft.status !== 'done'; drawWhenUI($('#whenUI'), draft); }
function drawProgF() {
  const book = draft.cat === 'book' && !draft.series, game = draft.cat === 'game';
  $('#progG').hidden = !(book || game); $('#pagesF').hidden = !book; $('#gameF').hidden = !game; $('#pctF').hidden = draft.series;
  $('#photoHint').hidden = !draft.series || draft.cat === 'art';
  { const C = Cx(draft), w = volW(C); $('#photoHint').textContent = `${w}ごとの写真は、作品のページで「${C.volN(1)}」などをタップすると入れられる。`; }
}
function drawHave() {
  const C = CATS[draft.cat], m = draft.media || '';
  if (!C.media) return;
  $('#wishRow').hidden = !!draft.want; setSw('#wishSw', !!draft.wish); $('#wishF').hidden = !!draft.want || !draft.wish;
  $('#wishSeg').innerHTML = C.media.filter((k) => !['配信', '映画館', 'テレビ', '両方'].includes(k)).map((k) => `<button type="button" data-wishm="${k}" class="${draft.wishM === k ? 'on' : ''}">${k}</button>`).join('');
  $('#wishPF').hidden = !S.set.money;
  $('#wishL').firstChild.textContent = draft.cat === 'anime' || draft.cat === 'movie' ? '手元にもほしい（ディスクなど）' : draft.cat === 'music' ? '手元にもほしい（CD・レコードなど）' : '手元にもほしい';
  $('#mediaSeg').innerHTML = C.media.map((k) => `<button type="button" data-media="${k}" class="${m === k ? 'on' : ''}">${k}</button>`).join('');
  $('#pfF').hidden = draft.cat !== 'game';
  const w = !!draft.want, appOn = !w && ['電子', '両方', '配信'].includes(m), whereOn = !w && ['紙', '両方', 'ディスク', 'パッケージ'].includes(m);
  $('#appF').hidden = !appOn; $('#appL').textContent = m === '配信' ? '配信サービス' : '電子書籍のアプリ';
  $('#fEdit').app.setAttribute('list', m === '配信' ? 'svcList' : 'appList');
  $('#fEdit').app.placeholder = m === '配信' ? '例：Netflix' : '例：Kindle';
  $('#whereF').hidden = !whereOn; $('#whereL').textContent = m === '両方' ? '紙の置き場所' : '置き場所';
  $('#theaterF').hidden = w || m !== '映画館';
  $('#fmtSeg').innerHTML = FMTS.map((k) => `<button type="button" data-fmt="${k}" class="${draft.fmt.includes(k) ? 'on' : ''}">${k}</button>`).join('');
  $('#priceF').hidden = !S.set.money;
  $('#mediaSeg').hidden = false;
  if (draft.cat === 'music') drawMusicF();
  drawQP();
  $('#haveL').textContent = draft.cat === 'music' ? '持ち方（CD・レコード・配信）' : draft.cat === 'manga' || draft.cat === 'book' ? '持ち方・置き場所（紙？電子？どこにある？）' : draft.cat === 'game' ? '持ち方（機種・パッケージ？ダウンロード？）' : '観た・持ってる場所';
  if (w) $('#haveL').textContent = draft.cat === 'game' ? 'どの形でほしい？（機種・パッケージ？ダウンロード？）' : draft.cat === 'anime' || draft.cat === 'movie' ? 'どこで観たい？' : 'どの形でほしい？';
}
const drawEditRate = () => { $('#editRate').innerHTML = rateHTML(draft.rating, 'estar', 'erateclear'); $('#editExp').innerHTML = rateHTML(draft.exp || 0, 'xstar', 'xrateclear'); $('#rateL').textContent = draft.series && draft.cat !== 'music' ? `評価（シリーズ全体。${Cx(draft).vol}ごとの星は作品のページで）` : '評価'; if (draft.cat === 'music') drawMusicF(); };
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
  const isM = draft.cat === 'music', mk = isM ? kindOf(draft) : '', lines = isM && mk !== 'song' ? f.tracks.value.split('\n').map((q) => q.trim()).filter(Boolean).slice(0, 300) : [];
  const ser = isM ? mk !== 'song' : draft.series && !!C.ser && !(draft.cat === 'anime' && !int(f.vols.value) && !int(f.cur.value)), vols = isM ? lines.length : ser ? int(f.vols.value) : 0, m = C.media && mk !== 'live' ? draft.media || '' : '';
  const ep = ser && draft.unit === 'ep' && (draft.cat === 'manga' || draft.cat === 'book');
  if (mk === 'live') draft.status = draft.tst === 'went' ? 'done' : 'none';
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
    date: mk === 'live' ? (draft.tst === 'went' ? f.ldate.value : '') : draft.status === 'done' ? readWhen($('#whenUI'), draft) : (draft.date || ''),
    vols, cur: ser && !isM ? (vols ? Math.min(int(f.cur.value), vols) : int(f.cur.value)) : 0, unit: ep ? 'ep' : '',
    genre: isM ? f.genre.value.trim() : '', perf: isM && mk !== 'live' && f.genre.value.trim() === 'クラシック' ? f.perf.value.trim() : '', ldate: mk === 'live' ? f.ldate.value : '', ltime: mk === 'live' ? f.ltime.value : '', venue: mk === 'live' ? f.venue.value.trim() : '', lseat: mk === 'live' ? f.lseat.value.trim() : '', tst: mk === 'live' ? draft.tst || '' : '',
    gp: mk === 'live' && S.set.money ? int(f.gp.value) : (x && x.gp) || 0, tp: mk === 'live' && S.set.money ? int(f.tp.value) : (x && x.tp) || 0,
    pages, page: book ? (pages ? Math.min(int(f.page.value), pages) : int(f.page.value)) : 0,
    pct: game && !ser && f.pct.value.trim() !== '' ? Math.min(100, int(f.pct.value)) : '',
    hours: game ? dec(f.hours.value) || '' : '',
    platform: game ? f.platform.value.trim() : '', media: m, wish: !draft.want && !!draft.wish && !!C.media, wishM: !draft.want && draft.wish ? draft.wishM || '' : '', wishP: !draft.want && draft.wish ? int(f.wishP.value) || 0 : 0, kind: draft.cat === 'anime' ? (draft.kind === 'drama' ? 'drama' : '') : draft.cat === 'manga' ? (draft.kind === 'tate' ? 'tate' : '') : isM ? mk : '', rel: draft.cat === 'art' || mk === 'live' ? '' : f.reldate.value, app: appOn ? f.app.value.trim() : '', where: whereOn ? f.where.value.trim() : '',
    theater: th ? f.theater.value.trim() : '', seat: th ? f.seat.value.trim() : '', fmt: th ? draft.fmt.slice() : [],
    price, pt: !price ? 0 : draft.want ? now : draft.buy === 'unk' ? 0 : draft.buy === 'year' ? (() => { const yy = int(f.buyY.value); return yy >= 1950 && yy <= 2100 ? new Date(yy, 6, 1, 12).getTime() : 0; })() : (x && x.price && x.pt && !(x.want && !draft.want) ? x.pt : now), old: !!draft.old,
    review: f.review.value.trim(), memo: f.memo.value.trim(), tags: [...new Set(f.tags.value.split(/[\s、,，]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean))].slice(0, 12),
  };
  if (ser && v.cur > 0 && draft.status === 'none') draft.status = 'doing';
  if (!x) { x = fix({ id: uid(), cat: draft.cat, created: now, img: false, log: [{ t: now, k: 'add' }], rounds: [], round: 1, sh: [], v: {} }); S.items.push(x); }
  if (!isNew && x.status !== draft.status && draft.status !== 'done') logEv(x, 'st', draft.status);
  if (draft.status === 'done' && x.status !== 'done') x.log.push({ t: v.date ? whenT(v.date) : now, k: 'st', v: 'done', d: v.date || '?' });
  else if (!isNew && draft.status === 'done' && v.date !== (x.date || '')) { const ev = [...x.log].reverse().find((q) => q.k === 'st' && q.v === 'done'); if (ev) { ev.t = v.date ? whenT(v.date) : ev.t; ev.d = v.date || '?'; } }
  if (isNew && draft.status === 'doing') x.log.push({ t: now, k: 'st', v: 'doing' });
  if ((x.rating || 0) !== draft.rating && (draft.rating || !isNew)) logEv(x, 'rate', draft.rating);
  if (!isNew && v.cur !== x.cur && ser && !isM) logEv(x, 'cur', v.cur);
  if (mk === 'live' && (x.tst || '') !== (draft.tst || '')) logEv(x, 'tst', draft.tst);
  /* 曲名・セットリスト */
  if (isM && ser) { lines.forEach((q, i) => { vget(x, i + 1).t = q; }); for (const k of Object.keys(x.v)) if (+k > lines.length && x.v[k]) { delete x.v[k].t; if (!Object.keys(x.v[k]).length) delete x.v[k]; } }
  /* 持ってる巻 */
  if (ep) { const txt = f.own.value.trim(); x.ownB = txt ? [...parseRanges(txt, 2000)].sort((a, b) => a - b) : []; if (x.ownB.length || (x.parts && x.parts.length)) { x.parts = x.parts || []; const mx = Math.min(Math.max(0, ...x.ownB), 500); while (x.parts.length < mx) x.parts.push({ id: uid(), n: x.perVol || 0 }); x.parts.forEach((q, i) => { q.own = x.ownB.includes(i + 1); if (q.own) q.want = false; }); } }
  else if (C.own && ser) {
    const txt = f.own.value.trim();
    if (txt) { const set = parseRanges(txt, vols || 2000); for (const k of Object.keys(x.v)) if (x.v[k].o && !set.has(+k)) delete x.v[k].o; for (const i of set) vget(x, i).o = 1; x.ownOn = true; }
    else if (x.ownOn) { for (const k of Object.keys(x.v)) delete x.v[k].o; x.ownOn = false; }
  }
  const rateFix = ser && draft.rating !== (x.rating || 0) ? !!draft.rating && volRates(x).length > 0 : !!x.rateFix;
  Object.assign(x, { status: draft.status, rating: draft.rating, rateFix, exp: draft.exp || 0, want: draft.want, later: draft.later, series: ser, done: draft.done, color: draft.color }, v, { updated: now, touched: now });
  if (x.coverVol && (!ser || isM || (x.coverVol > (vols || 0) && !ep))) x.coverVol = 0;
  if (mk === 'live' && x.rating) x.rateFix = true;
  /* 関連作品（両方向につなぐ） */
  { const old = new Set(x.links), nw = new Set((draft.links || []).filter((id) => id !== x.id && findItem(id)));
    for (const id of old) if (!nw.has(id)) { const o = findItem(id); if (o) o.links = o.links.filter((q) => q !== x.id); }
    for (const id of nw) if (!old.has(id)) { const o = findItem(id); if (o && !o.links.includes(x.id)) o.links.push(x.id); }
    x.links = [...nw]; }
  x.log.sort((a, b) => a.t - b.t);
  if (isNew && curShelf() && S.cat === x.cat) x.sh = [curShelf().id];
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
function showPick(P) {
  pick = P; P.tab = P.tabs ? P.tabs[0][0] : ''; $('#pickT').textContent = P.title; $('#pickH').textContent = P.hint; $('#pickQ').value = '';
  if (!P.cands().length) { toast('選べる作品がまだない'); pick = null; return; }
  drawPicks(); $('#dPick').showModal();
}
const okText = () => `${pick.okL}（${pick.sel.size}${pick.max ? '/' + pick.max : ''}）`;
function openPick() {
  const h = curShelf(); if (!h) return;
  showPick({ h, title: `「${h.name}」に入れる作品`, hint: '登録してある作品から選ぶだけ。チェックを外すと棚から出る（作品は消えない）。', okL: '入れる', sel: new Set(itemsOf(S.cat).filter((x) => x.sh.includes(h.id)).map((x) => x.id)), cands: () => itemsOf(S.cat), save: pickSave });
}
function orderedSel(oldIds, sel) { return oldIds.filter((id) => sel.has(id)).concat([...sel].filter((id) => !oldIds.includes(id))); }
/* 選ぶ画面のタブ：音楽は種類＋ジャンル、アニメは種類、ほかの部屋はタグ（グループ順） */
const kdOf = (x) => (x._alb ? 'trk' : kindOf(x));
function pickTabsFor(cat, cands) {
  const T = [['all', 'すべて', () => true]];
  if (cat === 'music') {
    T.push(['song', 'シングル', (x) => kdOf(x) === 'song'], ['album', 'アルバム', (x) => kdOf(x) === 'album'], ['trk', 'アルバムの曲', (x) => kdOf(x) === 'trk']);
    const g = new Map(); for (const x of cands) { const v = (x.genre || '').trim(); if (v) g.set(v, (g.get(v) || 0) + 1); }
    [...g].sort((a, b) => ((GENRES.indexOf(a[0]) + 1 || 99) - (GENRES.indexOf(b[0]) + 1 || 99)) || b[1] - a[1]).forEach(([v]) => T.push(['g:' + v, v, (x) => (x.genre || '').trim() === v]));
  } else {
    if (KINDS[cat]) KINDS[cat].forEach(([k, l]) => T.push(['k:' + k, l, (x) => kindOf(x) === k]));
    const c = new Map(); for (const x of cands) for (const t of x.tags) c.set(t, (c.get(t) || 0) + 1);
    groupTags(c).flatMap(([, l]) => l).slice(0, 14).forEach((t) => T.push(['t:' + t, '#' + t, (x) => x.tags.includes(t)]));
  }
  return T;
}
const albumTrackItems = () => itemsOf('music').filter((x) => kindOf(x) === 'album').flatMap((x) => Array.from({ length: Math.min(x.vols || 0, 300) }, (_, k) => k + 1).filter((i) => (x.v[i] || {}).t && !(x.v[i] || {}).sid).map((i) => trkItem(x, i)));
function openBestPick() {
  const cat = S.cat, y = ui.byear, ys = String(y), old = bestOf(cat, y), C = CATS[cat], mus = cat === 'music';
  const boomIds = Object.keys(S.boom).filter((m) => m.startsWith(ys)).flatMap((m) => S.boom[m].map(String));
  const boomed = new Set([...boomIds, ...boomIds.map((q) => q.split('~')[0])]);
  const did = (x) => { const z = x._alb || x; return (z.date || '').startsWith(ys) || (z.ldate || '').startsWith(ys); };
  const pri = (x) => (boomed.has(x.id) ? 0 : did(x) ? 1 : 2);
  const cands = () => (mus ? [...itemsOf(cat).filter((x) => kindOf(x) !== 'live'), ...albumTrackItems()] : itemsOf(cat));
  showPick({ title: `${y}年のベスト10を選ぶ`, hint: mus ? `${y}年のマイブームに入れたもの、${y}年に聴いたものが上に出る。上のタブで種類やジャンルに分けて探せる。` : `${y}年に${C.did}ものが上に出る。上のタブで種類やタグに分けて探せる。評価が高い順に並ぶ。`,
    okL: '決める', max: 10, sel: new Set(old), grid: true, cands, tabs: pickTabsFor(cat, cands()), pri,
    group: (x) => (pri(x) === 0 ? `${y}年のマイブーム` : pri(x) === 1 ? `${y}年に${C.did}もの` : mus ? x.creator || 'アーティスト未入力' : 'ほかの作品'),
    order: (p, q) => rt(q) - rt(p),
    sub: (x) => (x._alb ? x._alb.title : mus ? (kindOf(x) === 'album' ? 'アルバム' : '') : rt(x) ? `★${rt(x)}` : ''),
    save: (sel) => { (S.best[cat] = S.best[cat] || {})[y] = orderedSel(old, sel); if (!S.best[cat][y].length) delete S.best[cat][y]; } });
}
function openBoomPick(m) {
  const old = boomOf(m), mus = () => itemsOf('music');
  const ymOf = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const inMon = (x) => { const y = x._alb || x; return [(y.date || '').slice(0, 7), ymOf(y.created)].includes(m); };
  const kd = (x) => (x._alb ? 'trk' : kindOf(x));
  showPick({ title: `${ymText(m)}のマイブーム`, hint: `その月にハマってた曲・アルバムを${BOOM_MAX}つまで。アルバムの中の1曲も選べる。アーティストごとに並ぶ。`, okL: '決める', max: BOOM_MAX, sel: new Set(old), grid: true,
    cands: () => [...mus().filter((x) => kindOf(x) !== 'live'), ...albumTrackItems()],
    tabs: pickTabsFor('music', [...mus(), ...albumTrackItems()]),
    pri: (x) => (inMon(x) ? 0 : 1), group: (x) => (inMon(x) ? `${ymText(m)}に聴いた・足したもの` : x.creator || 'アーティスト未入力'),
    sub: (x) => (x._alb ? x._alb.title : kindOf(x) === 'album' ? 'アルバム' : ''),
    save: (sel) => { S.boom[m] = orderedSel(old, sel); if (!S.boom[m].length) delete S.boom[m]; } });
}
function openLinkPick() {
  showPick({ title: '関連作品を選ぶ', hint: 'ほかの部屋の作品も選べる（原作・アニメ化・主題歌など）。上で部屋を切り替えられる。つなぐと、両方のページに出る。', okL: '決める', sel: new Set(draft.links || []), cands: () => S.items.filter((x) => x.id !== draft.id),
    tabs: [['all', 'すべて', () => true], ...ORDER.map((c) => [c, CATS[c].name, (x) => x.cat === c])],
    sub: (x) => CATS[x.cat].short || CATS[x.cat].name, keep: true, save: (sel) => { draft.links = [...sel]; drawLinkChips(); } });
}
function drawPickTabs(all = pick.cands()) {
  const P = pick; $('#pickTabs').hidden = !P.tabs; if (!P.tabs) return;
  $('#pickTabs').innerHTML = P.tabs.map(([k, l, f]) => { const li = all.filter(f), on = li.filter((x) => P.sel.has(x.id)).length; return li.length || k === P.tab ? `<button type="button" class="chip${P.tab === k ? ' on' : ''}" data-ptab="${k}">${esc(l)}<small>${li.length}</small>${on ? `<i class="pdot">${on}</i>` : ''}</button>` : ''; }).join('');
}
function drawPicks() {
  const q = norm($('#pickQ').value), P = pick, all = P.cands();
  const tf = P.tabs ? (P.tabs.find((t) => t[0] === P.tab) || P.tabs[0])[2] : null;
  drawPickTabs(all);
  const gk = (x) => (P.sel.has(x.id) ? '' : P.group ? P.group(x) : '');
  const a = all.filter((x) => (!tf || tf(x)) && (!q || norm([x.title, x.yomi, x.creator, ...x.tags, x._alb ? x._alb.title : ''].join(' ')).includes(q)))
    .sort((x, y) => (P.sel.has(y.id) - P.sel.has(x.id)) || (P.pri ? P.pri(x) - P.pri(y) : 0) || (P.group ? coll.compare(gk(x), gk(y)) : 0) || (P.order ? P.order(x, y) : 0) || coll.compare(titleKey(x), titleKey(y)));
  let last = null; const out = [];
  for (const x of a.slice(0, 400)) {
    if (P.group) { const h = P.sel.has(x.id) ? '選んでるもの' : P.group(x); if (h !== last) { out.push(`<li class="pgh">${esc(h)}</li>`); last = h; } }
    const sb = P.sub ? P.sub(x) : '', ph = x._alb ? trkPh(x._alb, x._n) : phHTML(x, { prog: false });
    out.push(`<li><label><span class="th${x.cat === 'music' ? ' sq' : ''}">${ph}</span><b>${esc(x.title)}${sb ? `<small>${esc(sb)}</small>` : ''}</b><input type="checkbox" data-pk="${esc(x.id)}"${P.sel.has(x.id) ? ' checked' : ''}></label></li>`);
  }
  $('#picks').className = 'picks' + (P.grid ? ' grid' : '');
  $('#picks').innerHTML = out.length ? out.join('') : '<li class="hint" style="padding:16px 4px">見つからない</li>';
  $('#pickOk').textContent = okText();
  hydrate($('#picks'));
}
$('#pickTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-ptab]'); if (!b || !pick) return; pick.tab = b.dataset.ptab; drawPicks(); $('#picks').scrollTop = 0; });
$('#pickQ').addEventListener('input', drawPicks);
$('#picks').addEventListener('change', (e) => {
  const c = e.target.closest('[data-pk]'); if (!c || !pick) return;
  if (c.checked) { if (pick.max && pick.sel.size >= pick.max) { c.checked = false; toast(`${pick.max}個まで。どれかを外してね`); return; } pick.sel.add(c.dataset.pk); } else pick.sel.delete(c.dataset.pk);
  $('#pickOk').textContent = okText(); drawPickTabs();
});
function pickDone() {
  const P = pick; if (!P) return;
  if (P.h) { P.save(); return; }
  P.save(P.sel); $('#dPick').close(); pick = null;
  if (!P.keep) { save(); drawList(); toast('保存した'); }
}
function pickSave() {
  const { h, sel } = pick; let add = 0;
  for (const x of itemsOf(S.cat)) {
    const has = x.sh.includes(h.id), want = sel.has(x.id);
    if (want && !has) { x.sh.push(h.id); logEv(x, 'sh', h.name); add++; }
    else if (!want && has) x.sh = x.sh.filter((s) => s !== h.id);
  }
  save(); $('#dPick').close(); pick = null; render(); toast(`「${h.name}」は${sel.size}${CATS[S.cat].unit}になった`);
}

/* ===== ティアの並び：どっちが好き？・自分で並べ替え ===== */
let ord = null;
function openOrdC(t) {
  const l = tierItems(itemsOf(S.cat).filter((x) => rt(x) > 0), t);
  if (l.length < 2) { toast('2つ以上あると並べられる'); return; }
  const done = l.filter((x) => x.tk === t && typeof x.tord === 'number'), fresh = l.length - done.length;
  ord = { t, list: l };
  $('#ordcT').textContent = `${t}（${TIERS.find((q) => q[0] === t)[1]}）の中の順番`;
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
  $('#ordT').textContent = ord.title || `${ord.t}の順番を並べ替え`;
  $('#dOrd .hint').textContent = ord.save ? '上が1位。' : '上ほど好き。ティア表では左に並ぶ。';
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
      if (x.want || kindOf(x) === 'live') continue;
      if (x.series && x.vols && x.ownOn) { for (let i = x.cur + 1; i <= x.vols; i++) if (owned(x, i)) bl.push([x, `${x.title}　${Cx(x).volN(i)}`]); }
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

/* ===== 使ったお金 ===== */
function drawMoney() {
  const C = CATS[S.cat], all = itemsOf(S.cat), tot = spentList(all), by = {}, yrs = new Map();
  for (const x of all) for (const [t, p, st] of spends(x)) { by[st] = (by[st] || 0) + p; const y = t ? new Date(t).getFullYear() : 0; yrs.set(y, (yrs.get(y) || 0) + p); }
  $('#mnyT').textContent = `${C.name}に使ったお金`;
  $('#mnyN').textContent = yen(tot);
  $('#mnyS').textContent = `これまでの合計（${all.filter((x) => spentAll(x)).length}${C.unit}分）`;
  $('#mnySt').innerHTML = tot ? C.st.filter(([k]) => by[k]).map(([k, l]) => `<div class="mrow"><span>${l}${k === 'none' ? '<small>まだ手をつけてない分</small>' : ''}</span><b class="num">${yen(by[k])}</b><i style="--w:${(by[k] / tot * 100).toFixed(1)}%"></i></div>`).join('') : '<p class="hint">まだ値段が入ってない。作品の「編集」や、巻のシートから入れられる。</p>';
  $('#mnyY').innerHTML = [...yrs].sort((a, b) => (b[0] || -1) - (a[0] || -1)).map(([y, p]) => `<tr><td>${y ? `${y}年` : '時期不明<br><small class="hint">前から持ってる・覚えてない分</small>'}</td><td>${yen(p)}</td></tr>`).join('') || '<tr><td class="hint">—</td><td></td></tr>';
  const wl = all.filter((x) => wishOf(x)).sort((a, b) => wishOf(b) - wishOf(a));
  $('#mnyWishN').textContent = wl.length ? yen(wl.reduce((a, x) => a + wishOf(x), 0)) : '';
  $('#mnyTop').innerHTML = wl.map((x) => { const m = x.want ? '' : `持ってない${C.vol}の分`; return `<li><button data-mid="${esc(x.id)}"><b>${esc(x.title)}${m ? `<small>${m}</small>` : ''}</b><span class="num">${yen(wishOf(x))}</span></button></li>`; }).join('') || '<li class="hint">「ほしい」にした作品や、持ってない巻に値段を入れるとここにまとまる。</li>';
  const every = spentList(S.items), wish = all.reduce((a, x) => a + wishOf(x), 0);
  void wish; $('#mnyAll').textContent = (every !== tot ? `全部の部屋の合計は ${yen(every)}。年ごと・部屋ごとは設定から見られる。` : '');
}

/* ===== タグのグループ ===== */
const TG = () => S.tagGroups;
const groupOf = (t) => TG().findIndex((g) => g.tags.includes(t));
/* [グループ名, [タグ…]] の並び。グループに入ってないタグは「その他」（数が多い順） */
function groupTags(cnt) {
  const out = [], used = new Set();
  for (const g of TG()) { const l = g.tags.filter((t) => cnt.has(t)); l.forEach((t) => used.add(t)); if (l.length) out.push([g.name, l]); }
  const rest = [...cnt.keys()].filter((t) => !used.has(t)).sort((a, b) => cnt.get(b) - cnt.get(a) || coll.compare(a, b));
  if (rest.length) out.push([out.length ? 'その他' : '', rest]);
  return out;
}
function allTagCounts() { const m = new Map(); for (const x of S.items) for (const t of x.tags) m.set(t, (m.get(t) || 0) + 1); return m; }
function drawTagG() {
  const cnt = allTagCounts(), gs = TG();
  const opts = (sel) => `<option value="-1"${sel < 0 ? ' selected' : ''}>その他</option>` + gs.map((g, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(g.name)}</option>`).join('');
  const row = (t, gi, ti, len) => `<div class="tgrow"><div class="tgr1"><b>#${esc(t)}<small>${cnt.get(t) || 0}</small></b><button class="lnk" data-tren="${esc(t)}">名前</button><button class="lnk dan" data-tdel="${esc(t)}">消す</button></div><div class="tgr2"><label class="tgsel">グループ<select data-tsel="${esc(t)}">${opts(gi)}</select></label>${gi >= 0 ? `<span class="mv"><button data-tmv="-1" data-gi="${gi}" data-ti="${ti}"${ti === 0 ? ' disabled' : ''} aria-label="上へ">↑</button><button data-tmv="1" data-gi="${gi}" data-ti="${ti}"${ti === len - 1 ? ' disabled' : ''} aria-label="下へ">↓</button></span>` : ''}</div></div>`;
  const used = new Set(gs.flatMap((g) => g.tags));
  const rest = [...cnt.keys()].filter((t) => !used.has(t)).sort((a, b) => cnt.get(b) - cnt.get(a) || coll.compare(a, b));
  $('#tgBody').innerHTML = gs.map((g, gi) => { const l = g.tags.filter((t) => cnt.has(t)); return `<section class="tgg"><div class="tggh"><b>${esc(g.name)}</b><span class="mv"><button data-gmv="-1" data-gi="${gi}"${gi === 0 ? ' disabled' : ''} aria-label="グループを上へ">↑</button><button data-gmv="1" data-gi="${gi}"${gi === gs.length - 1 ? ' disabled' : ''} aria-label="グループを下へ">↓</button></span><button class="lnk" data-gren="${gi}">名前</button><button class="lnk dan" data-gdel="${gi}">消す</button></div>${l.length ? l.map((t, ti) => row(t, gi, ti, l.length)).join('') : '<p class="hint">まだ空っぽ。下の「その他」のタグを、グループの欄で選ぶとここに移る。</p>'}</section>`; }).join('') +
    `<section class="tgg"><div class="tggh"><b>${gs.length ? 'その他（グループなし）' : 'タグ'}</b></div>${rest.length ? rest.map((t) => row(t, -1, 0, 0)).join('') : `<p class="hint">${cnt.size ? '全部どこかのグループに入ってる。' : 'まだタグがない。'}</p>`}</section>`;
}
const tagChanged = () => { save(); render(); if ($('#dTagG').open) drawTagG(); if ($('#dFilt').open) openFilt(); };

/* ===== タグ・ジャンルで絞り込む ===== */
function fLabel(F = ui.F) {
  const names = { tag: 'タグ', sh: '棚' }; for (const [k, l] of FKEYS(S.cat)) names[k] = l;
  return Object.entries(F).filter(([, v]) => v && v.length).map(([k, v]) => `${names[k] || k}：${(k === 'sh' ? v.map((id) => (shelvesOf(S.cat).find((h) => h.id === id) || {}).name || '') : k === 'tag' ? v.map((t) => '#' + t) : v).join('・')}`).join('　');
}
function openFilt() {
  if (!$('#dFilt').open) ui.Ft = JSON.parse(JSON.stringify(ui.F));
  const Ft = ui.Ft, all = itemsOf(S.cat), base = (k) => all.filter((x) => matchF(x, Ft, k));
  const tc = new Map(); for (const x of base('tag')) for (const t of x.tags) tc.set(t, (tc.get(t) || 0) + 1);
  for (const t of Ft.tag || []) if (!tc.has(t)) tc.set(t, 0);
  const sorted = (m) => [...m].sort((a, b) => b[1] - a[1] || coll.compare(a[0], b[0]));
  const isOn = (k, v) => !!(Ft[k] && Ft[k].includes(v));
  $('#fltT').textContent = '絞り込み・棚';
  const shs = shelvesOf(S.cat), sb = base('sh');
  const shSec = `<div class="fhrow"><h4 class="fh">棚</h4><button class="lnk" data-act="newshelf">＋ 新しい棚</button></div>` + (shs.length ? `<div class="fchips">${shs.map((h) => `<button class="chip shf${isOn('sh', h.id) ? ' on' : ''}" data-ff="sh" data-fv="${esc(h.id)}">${esc(h.name)}<small>${sb.filter((x) => x.sh.includes(h.id)).length}</small></button>`).join('')}</div>` : '<p class="hint">まだ棚がない。「殿堂入り」みたいに、自分で好きな棚をつくれる。</p>');
  void sorted;
  const tcv = new Map([...tc].filter(([t, c]) => c || isOn('tag', t)));
  const tagSec = `<div class="fhrow"><h4 class="fh">タグ</h4>${allTagCounts().size ? '<button class="lnk" data-act="tagorg">グループ分け・名前・並び順</button>' : ''}</div>` +
    (!tcv.size ? '<p class="hint">まだタグがない。作品の「編集」→「タグを選ぶ・つくる」で付けると、ここに出る。</p>'
      : groupTags(tcv).map(([g, l]) => `${g ? `<h5 class="fgh">${esc(g)}</h5>` : ''}<div class="fchips">${l.map((t) => `<button class="chip${isOn('tag', t) ? ' on' : ''}" data-ff="tag" data-fv="${esc(t)}">#${esc(t)}<small>${tcv.get(t)}</small></button>`).join('')}</div>`).join(''));
  const secs = FKEYS(S.cat).map(([k, l]) => { const m = new Map(); for (const x of base(k)) if (x[k]) m.set(x[k], (m.get(x[k]) || 0) + 1); for (const v of Ft[k] || []) if (!m.has(v)) m.set(v, 0); return m.size ? `<h4 class="fh">${esc(l)}別</h4><div class="fchips">${sorted(m).map(([v, c]) => `<button class="chip${isOn(k, v) ? ' on' : ''}" data-ff="${k}" data-fv="${esc(v)}">${esc(v)}<small>${c}</small></button>`).join('')}</div>` : ''; }).join('');
  $('#fltB').innerHTML = (fOn(Ft) ? `<p class="fsel"><span>${esc(fLabel(Ft))}</span><button class="lnk" data-act="fltreset">全部外す</button></p>` : '') + shSec + tagSec + secs;
  $('#fltGo').textContent = `絞り込む（${all.filter((x) => matchF(x, Ft)).length}${CATS[S.cat].unit}）`;
  if (!$('#dFilt').open) $('#dFilt').showModal();
}

/* ===== アーティストのまとめ ===== */
function openArtist(name) {
  const k = norm(name), a = S.items.filter((x) => x.cat === 'music' && (norm(x.creator) === k || (x.perf && norm(x.perf) === k)));
  const al = a.filter((x) => kindOf(x) === 'album'), so = a.filter((x) => kindOf(x) === 'song'), lv = a.filter((x) => kindOf(x) === 'live').sort((p, q) => (q.ldate || '').localeCompare(p.ldate || ''));
  const went = lv.filter((x) => x.tst === 'went').sort((p, q) => (p.ldate || '9').localeCompare(q.ldate || '9'));
  const rated = a.filter((x) => kindOf(x) !== 'live' && rt(x) > 0), avg = rated.length ? (rated.reduce((s2, x) => s2 + rt(x), 0) / rated.length).toFixed(1) : '';
  $('#arT').textContent = name;
  $('#arS').innerHTML = `<div class="stat"><span>アルバム<b class="num">${al.length}</b></span><span>シングル<b class="num">${so.length}</b></span><span>ライブ<b class="num">${went.length}</b>回</span>${avg ? `<span>平均<b class="num">${avg}</b></span>` : ''}</div>` + (went.length ? `<p class="hint" style="margin-top:6px">初参戦：${esc(fmtWhen(went[0].ldate))}${went[0].venue ? `　${esc(went[0].venue)}` : ''}${went.length > 1 ? `　／　最近：${esc(fmtWhen(went[went.length - 1].ldate))}` : ''}</p>` : '');
  $('#arL').innerHTML = [['アルバム', al], ['シングル', so], ['ライブ', lv]].filter(([, l]) => l.length).map(([t, l]) => `<h4 class="arh">${t}</h4><div class="links">${l.map(linkCard).join('')}</div>`).join('');
  hydrate($('#arL')); $('#dArtist').showModal();
}
/* ===== 再評価 ===== */
let re = null;
function openRerate(x) {
  re = { x, old: rt(x), r: rt(x) };
  $('#reH').textContent = `今の評価は ★${re.old}。付け直すと、前の評価はタイムライン（記録の履歴）に残る。`;
  $('#reRate').innerHTML = rateHTML(re.r, 'rstar', 'none');
  $('#dRe').showModal();
}

/* ===== 設定 ===== */
function drawSettings() {
  $('#ver').textContent = `　${VER}`;
  setSw('#simpleSw', S.set.simple);
  setSw('#todSw', S.set.tod); setSw('#moneySw', S.set.money); setSw('#dustSw', S.set.dust);
  $('#roomTg').innerHTML = ORDER.map((k) => `<button type="button" class="chip${S.set.hidden.includes(k) ? '' : ' on'}" data-room="${k}">${CATS[k].short || CATS[k].name}</button>`).join('');
  $('#moneyG').hidden = !S.set.money;
  if (S.set.money) {
    const yrs = new Map();
    for (const x of S.items) for (const [t, p] of spends(x)) { const yy = t ? new Date(t).getFullYear() : 0, m = yrs.get(yy) || {}; m[x.cat] = (m[x.cat] || 0) + p; yrs.set(yy, m); }
    $('#ytable').innerHTML = yrs.size ? [...yrs].sort((a, b) => (b[0] || -1) - (a[0] || -1)).map(([yy, m]) => `<tr><td>${yy ? `${yy}年` : '時期不明'}<br><small class="hint">${ORDER.filter((k) => m[k]).map((k) => `${CATS[k].name} ${yen(m[k])}`).join('・')}</small></td><td>${yen(Object.values(m).reduce((s, p) => s + p, 0))}</td></tr>`).join('') : '<tr><td class="hint">まだ値段が入ってない。作品の「編集」や、巻のシートから入れられる。</td><td></td></tr>';
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
  const dk = t.closest('.dk'); if (dk) { if (dk.dataset.cat !== S.cat) { S.cat = dk.dataset.cat; ui.filter = 'all'; ui.media = ''; ui.F = {}; ui.q = ''; ui.tag = ''; ui.tagOpen = false; ui.kind = ''; ui.genre = ''; ui.genreOpen = false; $('#q').value = ''; save(); scrollTo({ top: 0 }); render(); } return; }
  const fl = t.closest('[data-filter]'); if (fl) { ui.filter = fl.dataset.filter; render(); return; }
  const gf = t.closest('[data-genref]'); if (gf) { ui.genre = ui.genre === gf.dataset.genref ? '' : gf.dataset.genref; render(); return; }
  const go = t.closest('[data-goid]'); if (go) { $$('dialog[open]').forEach((d) => d.close()); openItem(go.dataset.goid, null); return; }
  const ari = t.closest('[data-artist]'); if (ari) { openArtist(ari.dataset.artist); return; }
  const by = t.closest('[data-by]'); if (by) { ui.byear = Math.min(new Date().getFullYear(), ui.byear + +by.dataset.by); drawList(); return; }
  const bp = t.closest('[data-boompick]'); if (bp) { openBoomPick(bp.dataset.boompick); return; }
  const rs = t.closest('#reRate [data-rstar]'); if (rs && re) { const i = +rs.dataset.rstar; re.r = re.r === i ? i - 0.5 : i; $('#reRate').innerHTML = rateHTML(re.r, 'rstar', 'none'); $(`#reRate [data-rstar="${i}"]`).classList.add('pop'); return; }
  const rm = t.closest('[data-room]'); if (rm) { const k = rm.dataset.room, h = S.set.hidden; if (h.includes(k)) S.set.hidden = h.filter((q) => q !== k); else { if (ORDER.length - h.length <= 1) { toast('1つは残してね'); return; } h.push(k); } save(); drawSettings(); render(); return; }
  const kf = t.closest('[data-kindf]'); if (kf) { ui.kind = ui.kind === kf.dataset.kindf ? '' : kf.dataset.kindf; render(); return; }
  const tp = t.closest('[data-tp]'); if (tp) { const v = tp.dataset.tp, cur = curTags(); setTags(cur.includes(v) ? cur.filter((q) => q !== v) : [...cur, v]); return; }
  const tx = t.closest('[data-tagx]'); if (tx) { setTags(curTags().filter((q) => q !== tx.dataset.tagx)); return; }
  const ff = t.closest('[data-ff]'); if (ff && ui.Ft) { const k = ff.dataset.ff, v = ff.dataset.fv, a2 = ui.Ft[k] || []; ui.Ft[k] = a2.includes(v) ? a2.filter((q) => q !== v) : [...a2, v]; openFilt(); return; }
  const tren = t.closest('[data-tren]'); if (tren) {
    const old = tren.dataset.tren, nw = (prompt(`タグ「${old}」の新しい名前\n（全部の部屋の作品で変わる。同じ名前のタグがあれば1つにまとまる）`, old) || '').replace(/^#/, '').trim().slice(0, 20);
    if (!nw || nw === old) return;
    let n = 0; for (const x of S.items) if (x.tags.includes(old)) { x.tags = [...new Set(x.tags.map((q) => (q === old ? nw : q)))]; n++; }
    const gNew = groupOf(nw); for (const g of TG()) g.tags = gNew >= 0 ? g.tags.filter((q) => q !== old) : [...new Set(g.tags.map((q) => (q === old ? nw : q)))];
    for (const F of [ui.F, ui.Ft]) if (F && F.tag) F.tag = [...new Set(F.tag.map((q) => (q === old ? nw : q)))]; tagChanged(); toast(`${n}作品のタグを「${nw}」にした`); return;
  }
  const gmv = t.closest('[data-gmv]'); if (gmv) { const i = +gmv.dataset.gi, j = i + +gmv.dataset.gmv, g = TG(); if (j < 0 || j >= g.length) return; [g[i], g[j]] = [g[j], g[i]]; tagChanged(); return; }
  const tmv = t.closest('[data-tmv]'); if (tmv) {
    const g = TG()[+tmv.dataset.gi]; if (!g) return; const cnt = allTagCounts(), vis = g.tags.filter((q) => cnt.has(q)), i = +tmv.dataset.ti, j = i + +tmv.dataset.tmv; if (j < 0 || j >= vis.length) return;
    [vis[i], vis[j]] = [vis[j], vis[i]]; g.tags = vis.concat(g.tags.filter((q) => !cnt.has(q))); tagChanged(); return;
  }
  const gren = t.closest('[data-gren]'); if (gren) { const g = TG()[+gren.dataset.gi]; const nm = (prompt('グループの新しい名前', g.name) || '').trim().slice(0, 16); if (nm) { g.name = nm; tagChanged(); } return; }
  const gdel = t.closest('[data-gdel]'); if (gdel) { const g = TG()[+gdel.dataset.gi]; if (confirm(`グループ「${g.name}」を消す？\n中のタグは「その他」に戻る（タグは消えない）。`)) { S.tagGroups = TG().filter((q) => q !== g); tagChanged(); } return; }
  const tdel = t.closest('[data-tdel]'); if (tdel) {
    const old = tdel.dataset.tdel; if (!confirm(`タグ「${old}」を全部の作品から外す？\n作品は消えないよ。`)) return;
    let n = 0; for (const x of S.items) if (x.tags.includes(old)) { x.tags = x.tags.filter((q) => q !== old); n++; }
    for (const g of TG()) g.tags = g.tags.filter((q) => q !== old);
    for (const F of [ui.F, ui.Ft]) if (F && F.tag) F.tag = F.tag.filter((q) => q !== old); tagChanged(); toast(`${n}作品から「${old}」を外した`); return;
  }
  const mf = t.closest('[data-mediaf]'); if (mf) { ui.media = ui.media === mf.dataset.mediaf ? '' : mf.dataset.mediaf; render(); return; }
  const tf = t.closest('[data-tagf]'); if (tf) { ui.tag = ui.tag === tf.dataset.tagf ? '' : tf.dataset.tagf; render(); return; }
  const vw = t.closest('[data-view]'); if (vw) { if (S.view[S.cat] !== vw.dataset.view) { S.view[S.cat] = vw.dataset.view; save(); render(true); } return; }
  const rtb = t.closest('[data-rtab]'); if (rtb) { ui.rtab = rtb.dataset.rtab; drawList(true); return; }
  const tr = t.closest('[data-tier]'); if (tr) { openOrdC(tr.dataset.tier); return; }
  const nx = t.closest('[data-nx]');
  if (nx) {
    const it = findItem(nx.dataset.nid); if (!it) return;
    const C = Cx(it);
    if (nx.dataset.nx === 'rel') {
      if (it.series && C.ser) { it.vols = (it.vols || 0) + 1; logEv(it, 'vols', it.vols); toast(`${C.volN(it.vols)}が出た！`); } else toast('続編が出た！');
      it.rel = ''; touch(it); render(); if (curItem() === it) renderPage(it); return;
    }
    if (nx.dataset.nx === 'buy') { const m = missing(it); if (m.length) { vget(it, m[0]).o = 1; logEv(it, 'buy', m[0]); toast(`${C.volN(m[0])}を買った`); } }
    else { it.cur = it.vols && it.unit !== 'ep' ? Math.min(it.vols, it.cur + 1) : it.cur + 1; if (it.vols && it.cur > it.vols) { it.vols = it.cur; } logEv(it, 'cur', it.cur); toast(`${C.volN(it.cur)}まで${C.did}`); autoStatus(it, () => { touch(it); render(); }); }
    touch(it); render(); return;
  }
  const op = t.closest('[data-oid]'); if (op) { openItem(op.dataset.oid, op); return; }
  const mi = t.closest('[data-mid]'); if (mi) { $('#dMoney').close(); openItem(mi.dataset.mid, null); return; }
  const tw = t.closest('[data-tid]'); if (tw) { $('#dTower').close(); openItem(tw.dataset.tid, null); return; }
  const tws = t.closest('[data-tow]'); if (tws) { ui.tow = tws.dataset.tow; drawTower(); return; }
  const xo = t.closest('[data-xopen]'); if (xo) { togOpen(xo.dataset.xopen); return; }
  const kid = t.closest('[data-kid]'); if (kid) { const it = findItem(kid.dataset.kid); if (it) openVol(it, +kid.dataset.kn); return; }
  const card = t.closest('#list [data-id]');
  if (card && card.dataset.kids) { togOpen(card.dataset.id); return; }
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
  if (vs2 && vol) { const x = findItem(vol.id), d = vget(x, vol.n), i = +vs2.dataset.vstar; d.r = d.r === i ? i - 0.5 : i; d.u = Date.now(); logEv(x, 'vr', [vol.n, d.r]); touch(x); $('#volRate').innerHTML = rateHTML(d.r, 'vstar', 'vrateclear'); const s = $(`#volRate [data-vstar="${i}"]`); s.classList.add('pop'); burst(s); return; }
  /* 巻・シーズンのシート */
  const pst = t.closest('#ptRate [data-ptstar]'); if (pst) { const c = curPart(); if (c) { const i = +pst.dataset.ptstar; c.p.r = c.p.r === i ? i - 0.5 : i; touch(c.x); $('#ptRate').innerHTML = rateHTML(c.p.r, 'ptstar', 'ptrateclear'); const sx = $(`#ptRate [data-ptstar="${i}"]`); if (sx) sx.classList.add('pop'); } return; }
  const pow = t.closest('#ptOwnSeg [data-pown]'); if (pow) { const c = curPart(); if (c) { const k = pow.dataset.pown, was = !!c.p.own; c.p.own = k === 'own'; c.p.want = k === 'want'; if (c.p.own && !was && c.p.p) c.p.pt = c.x.old ? 0 : Date.now(); touch(c.x); drawPartSheet(); } return; }
  const x = curItem();
  if (x) {
    const C = Cx(x);
    const pcd = t.closest('#pParts [data-part]'); if (pcd) { openPart(x, +pcd.dataset.part); return; }
    const redraw = () => { if (curItem() === x) renderPage(x); };
    const st = t.closest('#pSt [data-st]'); if (st) {
      const v = st.dataset.st;
      if (v === 'want') { if (x.want) return; x.want = true; if (x.status !== 'none') setStatus(x, 'none'); touch(x); renderPage(x); toast('「ほしい」にした'); return; }
      const wasWant = x.want;
      if (wasWant) { x.want = false; if (x.price) x.pt = x.old ? 0 : Date.now(); }
      if (v === x.status) { touch(x); renderPage(x); return; }
      if (v === 'done') { if (wasWant) touch(x); askDone(x, redraw); if (wasWant) drawSt(x); return; }
      setStatus(x, v); touch(x); if (wasWant) { renderPage(x); return; } drawSt(x); if (x.series && x.cat !== 'music') drawVols(x); drawTl(x); return;
    }
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
    const vm = t.closest('[data-vm]'); if (vm) { ui.vmode = vm.dataset.vm; if (ui.vmode === 'own' && !x.ownOn) toast(`タップした${volW(Cx(x))}が「持ってる」になる`); drawVols(x); return; }
    const vno = t.closest('[data-vopen]'); if (vno) { openVol(x, +vno.dataset.vopen); return; }
    const ts = t.closest('#pTst [data-tst]'); if (ts) {
      const v = ts.dataset.tst; x.tst = x.tst === v ? '' : v; logEv(x, 'tst', x.tst);
      if (x.tst === 'went') setStatus(x, 'done', x.ldate || ''); else if (x.status === 'done') setStatus(x, 'none');
      touch(x); renderPage(x); return;
    }
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
    const tg = t.closest('[data-tag]'); if (tg) { const v = tg.dataset.tag; closeItem(() => { ui.F = { tag: [v] }; ui.filter = 'all'; render(); scrollTo({ top: 0 }); }); return; }
    const si = t.closest('[data-shin]'); if (si) {
      const id = si.dataset.shin;
      if (x.sh.includes(id)) x.sh = x.sh.filter((s) => s !== id); else { x.sh.push(id); logEv(x, 'sh', (shelvesOf(x.cat).find((h) => h.id === id) || {}).name); }
      touch(x); drawShelves(x); drawTl(x); return;
    }
    void C;
  }
  const est = t.closest('[data-est]'); if (est) { if (est.dataset.est === 'want') { draft.want = true; draft.status = 'none'; } else { draft.want = false; draft.status = est.dataset.est; } if (draft.old && draft.status === 'done') draft.wm = 'none'; drawStSeg(); drawWhen(); drawBuy(); drawHave(); return; }
  const bu = t.closest('#buySeg [data-buy]'); if (bu) { draft.buy = bu.dataset.buy; drawBuy(); if (draft.buy === 'year') setTimeout(() => $('#fEdit').buyY.focus(), 50); return; }
  const wmb = t.closest('[data-wm]'); if (wmb) { const box = wmb.closest('.whenui'), st = box.id === 'whenUI' ? draft : doneCtx; if (!st) return; st.date = readWhen(box, st) || st.date; st.wm = wmb.dataset.wm; drawWhenUI(box, st); return; }
  const es = t.closest('#editRate [data-estar]'); if (es) { const i = +es.dataset.estar; draft.rating = draft.rating === i ? i - 0.5 : i; drawEditRate(); $(`#editRate [data-estar="${i}"]`).classList.add('pop'); return; }
  const xs = t.closest('#editExp [data-xstar]'); if (xs) { const i = +xs.dataset.xstar; draft.exp = draft.exp === i ? i - 0.5 : i; drawEditRate(); $(`#editExp [data-xstar="${i}"]`).classList.add('pop'); return; }
  const sw = t.closest('[data-sw]'); if (sw) { draft.color = draft.color === sw.dataset.sw ? '' : sw.dataset.sw; drawSwatches(); drawPhoto(); return; }
  const wm = t.closest('#wishSeg [data-wishm]'); if (wm) { draft.wishM = draft.wishM === wm.dataset.wishm ? '' : wm.dataset.wishm; drawHave(); return; }
  const kd = t.closest('#kindSeg [data-kind]'); if (kd) { draft.kind = draft.cat === 'anime' ? (kd.dataset.kind === 'drama' ? 'drama' : '') : draft.cat === 'manga' ? (kd.dataset.kind === 'tate' ? 'tate' : '') : kd.dataset.kind; if (isTate(draft)) { draft.unit = 'ep'; if (!draft.series) { draft.series = true; setSw('#serSw', true); $('#serF').hidden = false; } } drawUnit(); drawProgF(); drawRelL(); if (draft.cat === 'music' && draft.kind === 'live' && !draft.tst) draft.tst = 'apply'; drawKind(); drawMusicF(); drawHave(); drawPhoto(); return; }
  const qp = t.closest('[data-qk]'); if (qp) { const f = $('#fEdit'); f[qp.dataset.qk].value = qp.dataset.qv; drawQP(); if (qp.dataset.qk === 'creator') drawPhoto(); return; }
  const un = t.closest('#unitSeg [data-unit]'); if (un) { draft.unit = un.dataset.unit === 'ep' ? 'ep' : ''; drawUnit(); return; }
  const et = t.closest('[data-etst]'); if (et) { draft.tst = draft.tst === et.dataset.etst ? '' : et.dataset.etst; drawMusicF(); return; }
  const gq = t.closest('[data-genre]'); if (gq) { const f = $('#fEdit'); f.genre.value = f.genre.value.trim() === gq.dataset.genre ? '' : gq.dataset.genre; drawMusicF(); return; }
  const ul = t.closest('[data-unlink]'); if (ul) { draft.links = draft.links.filter((q) => q !== ul.dataset.unlink); drawLinkChips(); return; }
  const md = t.closest('[data-media]'); if (md) { draft.media = draft.media === md.dataset.media ? '' : md.dataset.media; drawHave(); return; }
  const fm = t.closest('[data-fmt]'); if (fm) { const k = fm.dataset.fmt; draft.fmt = draft.fmt.includes(k) ? draft.fmt.filter((q) => q !== k) : [...draft.fmt, k]; drawHave(); return; }
  const ar = t.closest('[data-ar]'); if (ar && crop) { crop.ar = +ar.dataset.ar; cropLayout(true); return; }
  const a = t.closest('[data-act]'); if (!a) return;
  const vx = vol && findItem(vol.id);
  switch (a.dataset.act) {
    case 'new': openEdit(null); break;
    case 'edit': openEdit(curId); break;
    case 'back': closeItem(); break;
    case 'close': { const dl = a.closest('dialog'); if (canClose(dl)) dl.close(); break; }
    case 'settings': drawSettings(); $('#dSet').showModal(); break;
    case 'tower': drawTower(); $('#dTower').showModal(); break;
    case 'money': drawMoney(); $('#dMoney').showModal(); break;
    case 'tagtoggle': ui.tagOpen = !ui.tagOpen; render(); break;
    case 'tagpick': $('#tpNew').value = ''; drawTagPick(); $('#dTagP').showModal(); break;
    case 'tpadd': { const v = $('#tpNew').value.split(/[\s、,，]+/).map((q) => q.replace(/^#/, '').trim()).filter(Boolean); if (!v.length) { toast('タグの名前を入れてね'); break; } setTags([...curTags(), ...v]); $('#tpNew').value = ''; break; }
    case 'filt': ui.tagEdit = false; openFilt(); break;
    case 'fltclear': ui.F = {}; if ($('#dFilt').open) $('#dFilt').close(); render(); break;
    case 'fltreset': ui.Ft = {}; openFilt(); break;
    case 'fltgo': ui.F = ui.Ft || {}; ui.Ft = null; $('#dFilt').close(); ui.filter = ui.filter === 'next' ? 'all' : ui.filter; render(); scrollTo({ top: 0 }); break;
    case 'tagorg': drawTagG(); $('#dTagG').showModal(); break;
    case 'gnew': { const nm = (prompt('新しいグループの名前（例：ジャンル・俳優・気分）') || '').trim().slice(0, 16); if (!nm) break; if (TG().some((g) => g.name === nm)) { toast('同じ名前のグループがもうある'); break; } TG().push({ id: uid(), name: nm, tags: [] }); tagChanged(); toast(`グループ「${nm}」をつくった`); break; }
    case 'kidadd': { const it = findItem(a.dataset.kadd); if (!it) break; it.series = true; it.vols = (it.vols || 0) + 1; touch(it); drawList(); openVol(it, it.vols); setTimeout(() => $('#volTitle').focus(), 350); break; }
    case 'adv': ui.adv = true; $('#fEdit').classList.add('advOpen'); $('#advB').hidden = true; break;
    case 'rateclear': if (x) { x.rating = 0; x.rateFix = false; logEv(x, 'rate', 0); touch(x); drawRate(x); drawTl(x); } break;
    case 'rateavg': if (x) { x.rateFix = false; touch(x); drawRate(x); toast(`${Cx(x).vol}ごとの平均にした`); } break;
    case 'erateclear': draft.rating = 0; drawEditRate(); break;
    case 'xrateclear': draft.exp = 0; drawEditRate(); break;
    case 'dust': if (x) { x.touched = Date.now(); logEv(x, 'dust', 1); save(); renderPage(x); toast('ふっ…きれいになった'); } break;
    case 'wishbuy': if (x && x.wish) {
      const wm = x.wishM; if (wm) x.media = (x.cat === 'manga' || x.cat === 'book') && ((x.media === '電子' && wm === '紙') || (x.media === '紙' && wm === '電子')) ? '両方' : wm;
      if (x.wishP) { if (x.price) x.price += x.wishP; else { x.price = x.wishP; x.pt = Date.now(); } }
      x.wish = false; x.wishM = ''; x.wishP = 0; logEv(x, 'wbuy', x.media || ''); touch(x); renderPage(x); render(); toast(`買った！${x.media ? `持ち方を「${x.media}」にした` : ''}`);
    } break;
    case 'vnord': if (x) { ui.vnOrd = a.dataset.o; drawVnotes(x); } break;
    case 'vnall': if (x) { ui.vnAll = ui.vnAll === x.id ? '' : x.id; drawVnotes(x); } break;
    case 'partadd': if (x) { const i = addPart(x); touch(x); renderPage(x); openPart(x, i); } break;
    case 'partauto': if (x) {
      const pv = int($('#perVol').value), up = int($('#volUpto').value); if (!pv && !up) { toast('話数か巻数を入れてね'); break; }
      const old = x.perVol || 0; if (pv) x.perVol = pv; x.parts = x.parts || [];
      while (x.parts.length < Math.min(up, 500)) x.parts.push({ id: uid(), n: 0 });
      if (pv) x.parts.forEach((q) => { if (!q.n || q.n === old) q.n = pv; });
      touch(x); drawVols(x); toast(`${x.parts.length}巻まで並べた${pv ? `（1巻${pv}話で分けた）` : ''}`);
    } break;
    case 'partmerge': if (x) {
      showPick({ title: 'シーズンとして取り込む', hint: '「2期」みたいに別で登録した作品を選ぶと、この作品のシーズンになる。評価・感想・話の記録・写真も移る（元の登録は消える）。', okL: '取り込む', sel: new Set(), keep: true,
        cands: () => itemsOf('anime').filter((o) => o.id !== x.id), pri: (o) => (norm(o.title).includes(norm(x.title).slice(0, 4)) || (x.links || []).includes(o.id) ? 0 : 1), sub: (o) => [o.season, o.year].filter(Boolean).join('　'),
        save: async (sel) => { const l = [...sel].map(findItem).filter(Boolean); if (!l.length) return; if (!confirm(`「${l.map((o) => o.title).join('」「')}」を、この作品のシーズンとして取り込む。元の登録は消えて、中身はこっちに移る。いい？`)) return; await mergeSeasons(x, l); render(); renderPage(x); toast(`${l.length}つ取り込んだ`); } });
    } break;
    case 'volplus': if (x) { x.vols = (x.vols || 0) + 1; logEv(x, 'vols', x.vols); touch(x); drawVols(x, x.vols); drawTl(x); toast(`${Cx(x).volN(x.vols)}を足した`); } break;
    case 'vjump': if (x) { const n = int($('#vjump').value); if (n >= 1 && n <= x.vols) openVol(x, n); } break;
    case 'setpages': if (x) { const n = int($('#pPages').value); if (n) { x.pages = n; touch(x); drawProg(x); } } break;
    case 'vprev': if (vol) { vol.n = Math.max(1, vol.n - 1); drawVolSheet(); } break;
    case 'vnext': if (vol && vx) { vol.n = Math.min(Math.max(vx.vols, vx.cur), vol.n + 1); drawVolSheet(); } break;
    case 'linksg': { const x = vol && findItem(vol.id); if (!x) break; const n = vol.n, d = x.v[n] || {}, key = songKey(d.t, x.creator);
      showPick({ title: 'つなぐシングルを選ぶ', hint: '同じ曲のシングルを1つ選ぶ。つなぐと評価と感想が共通になる。', okL: 'つなぐ', max: 1, sel: new Set(), keep: true,
        cands: () => itemsOf('music').filter((q) => kindOf(q) === 'song'), pri: (q) => (songKey(q.title, q.creator) === key ? 0 : sameArtist(q.creator, x.creator) && q.creator ? 1 : 2), sub: (q) => q.creator || '',
        save: (sel) => { const s = findItem([...sel][0]); if (!s) return; const dd = vget(x, n); delete dd.nos;
          if ((dd.r && s.rating && dd.r !== s.rating) || (dd.c && s.review && dd.c !== s.review)) { ui.asked.add(`${x.id}~${n}`); linkQ.unshift([x.id, n, s.id]); setTimeout(askLink, 200); } else { linkTrack(x, n, s); toast('つないだ'); }
          save(); drawVolSheet(); drawList(); } });
      break; }
    case 'unlinksg': { const x = vol && findItem(vol.id); if (!x) break; const d = vget(x, vol.n); delete d.sid; d.nos = 1; save(); drawVolSheet(); drawList(); toast('つながりを外した（評価はそのまま残る）'); break; }
    case 'ptrateclear': { const c = curPart(); if (c) { c.p.r = 0; touch(c.x); $('#ptRate').innerHTML = rateHTML(0, 'ptstar', 'ptrateclear'); } break; }
    case 'ptphotorm': { const c = curPart(); if (c && c.p.img) { const k = partKey(c.x, c.p); idb.del(k).catch(() => {}); forget(k); c.p.img = false; if (c.x.coverPart === c.p.id) c.x.coverPart = ''; touch(c.x); drawPartSheet(); } break; }
    case 'ptdel': { const c = curPart(); if (!c) break; if (!confirm(`「${c.P.name}」を消す？${partMode(c.x) === 'season' && c.p.n ? '中の話の評価・感想も消える。' : ''}`)) break; (async () => { await delPart(c.x, part.i); touch(c.x); $('#dPart').close(); })(); break; }
    case 'lks': answerLink('single'); break;
    case 'lkt': answerLink('track'); break;
    case 'lkno': answerLink('no'); break;
    case 'vrateclear': if (vx) { delete vget(vx, vol.n).r; touch(vx); $('#volRate').innerHTML = rateHTML(0, 'vstar', 'vrateclear'); } break;
    case 'volphotorm': if (vx) { const k = `${vx.id}~${vol.n}`; idb.del(k).catch(() => {}); forget(k); delete vget(vx, vol.n).img; touch(vx); drawVolSheet(); } break;
    case 'volread': if (vx) {
      const n = vol.n; vx.cur = n <= vx.cur ? n - 1 : n; logEv(vx, 'cur', vx.cur); touch(vx);
      $('#dVol').close();
      autoStatus(vx, () => { if (curItem() === vx) renderPage(vx); });
      toast(`${Cx(vx).volN(vx.cur || 0)}まで${Cx(vx).did}`);
    } break;
    case 'doneok': if (doneCtx) {
      const st = doneCtx, d = readWhen($('#doneUI'), st);
      if (st.wm !== 'today' && st.wm !== 'none' && !d) { toast('時期を入れてね（わからなければ「覚えてない」）'); break; }
      setStatus(st.x, 'done', d); touch(st.x); doneCtx = null; $('#dDone').close(); toast(`「${stLabel(st.x.cat, 'done')}」にした`);
      if (st.then) st.then(); else render();
      if (curItem() === st.x) renderPage(st.x);
    } break;
    case 'again':
      if (x && confirm(`もう一度${Cx(x).verb}？\n今回の評価と日付は「${x.round}回目」として残るよ。`)) {
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
      else { ui.F = { sh: [h.id] }; ui.filter = 'all'; if ($('#dFilt').open) $('#dFilt').close(); save(); render(); toast(`棚「${name}」をつくった`); if (itemsOf(cat).length) openPick(); }
      break;
    }
    case 'pick': openPick(); break;
    case 'pickok': pickDone(); break;
    case 'bestpick': openBestPick(); break;
    case 'bestord': { const l = bestOf(S.cat, ui.byear).map(boomItem), y = ui.byear, cat = S.cat; if (l.length < 2) break; ord = { list: l, title: `${y}年のベスト10の順番`, save: (arr) => { S.best[cat][y] = arr.map((q) => q.id); } }; openOrd(); break; }
    case 'boomadd': { const m = $('#boomMonth') && $('#boomMonth').value; if (m) openBoomPick(m); else toast('月を選んでね'); break; }
    case 'linkpick': openLinkPick(); break;
    case 'genretoggle': ui.genreOpen = !ui.genreOpen; render(); break;
    case 'rerate': if (x) openRerate(x); break;
    case 'reok': if (re) {
      const { x: rx, old, r } = re;
      if (!r) { toast('星を選んでね'); break; }
      if (r !== old) { rx.rating = r; if (rx.series && volRates(rx).length) rx.rateFix = true; rx.log.push({ t: Date.now(), k: 'rerate', v: [old, r] }); touch(rx); toast(`★${old} → ★${r} に再評価した`); }
      re = null; $('#dRe').close(); if (curItem() === rx) renderPage(rx);
    } break;
    case 'trackadd': if (x) { x.vols = (x.vols || 0) + 1; touch(x); renderPage(x); openVol(x, x.vols); } break;
    case 'epset': if (x) { const raw = $('#epSet').value.trim(); if (raw === '') break; const n = int(raw); x.cur = n; if (x.vols && n > x.vols) { if (x.done) x.cur = x.vols; else { x.vols = n; logEv(x, 'vols', n); } } logEv(x, 'cur', x.cur); autoStatus(x, () => { if (curItem() === x) renderPage(x); }); touch(x); drawVols(x); drawSt(x); drawTl(x); toast(`${Cx(x).volN(x.cur)}まで${Cx(x).did}`); } break;
    case 'epmemo': if (x && x.cur) openVol(x, x.cur); break;
    case 'shren': {
      const h = curShelf(); if (!h) break;
      const name = (prompt('新しい名前', h.name) || '').trim().slice(0, 20); if (!name) break;
      h.name = name; save(); render(); break;
    }
    case 'shdel': {
      const h = curShelf(); if (!h) break;
      if (confirm(`棚「${h.name}」を消す？\n中の作品は消えないよ。`)) { S.shelves = S.shelves.filter((q) => q !== h); for (const it of S.items) it.sh = it.sh.filter((s) => s !== h.id); ui.F.sh = []; save(); render(); toast('棚を消した'); }
      break;
    }
    case 'ordcmp': $('#dOrdC').close(); runCmp(false); break;
    case 'ordcmpall': $('#dOrdC').close(); runCmp(true); break;
    case 'ordman': $('#dOrdC').close(); openOrd(); break;
    case 'ordok': if (ord && ord.tmp && ord.save) { ord.save(ord.tmp); save(); $('#dOrd').close(); drawList(); toast('順番を保存した'); }
      else if (ord && ord.tmp) { ord.tmp.forEach((q, i) => { q.tord = i; q.tk = ord.t; }); save(); $('#dOrd').close(); drawList(); toast(`${ord.t}の順番を保存した`); } break;
    case 'cmpeq': if (cmp) { const c = cmp; cmp = null; c.res(c.b); } break;
    case 'cropok': cropFinish(false); break;
    case 'cropraw': cropFinish(true); break;
    case 'photorm': draft.newImg = null; draft.rmImg = true; drawPhoto(); break;
    case 'delete': {
      const it = findItem(draft.id);
      if (it && confirm(`「${it.title}」を消す？`)) {
        S.items = S.items.filter((i) => i !== it); for (const k of imgKeys(it)) { idb.del(k).catch(() => {}); forget(k); }
        for (const o of S.items) if (o.links.includes(it.id)) o.links = o.links.filter((q) => q !== it.id);
        for (const ys of Object.values(S.best)) for (const y of Object.keys(ys)) ys[y] = ys[y].filter((q) => q !== it.id);
        for (const m of Object.keys(S.boom)) S.boom[m] = S.boom[m].filter((q) => q !== it.id && !String(q).startsWith(it.id + '~'));
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
$('#wishSw').addEventListener('click', () => { draft.wish = !draft.wish; drawHave(); });
$('#serSw').addEventListener('click', () => { draft.series = !draft.series; setSw('#serSw', draft.series); $('#serF').hidden = !draft.series; drawProgF(); drawEditRate(); drawRelL(); });
document.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-tsel]'); if (!sel) return;
  const tg = sel.dataset.tsel, to = +sel.value;
  for (const g of TG()) g.tags = g.tags.filter((q) => q !== tg);
  if (to >= 0 && TG()[to]) TG()[to].tags.push(tg);
  tagChanged();
});
$('#tpNew').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('[data-act="tpadd"]').click(); } });
$('#fEdit').genre.addEventListener('input', () => drawMusicF());
$('#doneSw').addEventListener('click', () => { draft.done = !draft.done; setSw('#doneSw', draft.done); });
$('#oldSw').addEventListener('click', () => {
  draft.old = !draft.old; setSw('#oldSw', draft.old); if (!draft.id) ui.oldDef = draft.old;
  if (draft.old) { draft.buy = 'unk'; if (draft.status === 'done') draft.wm = 'none'; } else { draft.buy = 'now'; if (draft.wm === 'none') draft.wm = 'today'; }
  drawWhen(); drawBuy();
});
$('#volCvSw').addEventListener('click', () => { const x = vol && findItem(vol.id); if (!x) return; x.coverVol = x.coverVol === vol.n ? 0 : vol.n; touch(x); setSw('#volCvSw', x.coverVol === vol.n); toast(x.coverVol ? `${Cx(x).volN(vol.n)}を表紙にした` : '表紙を元に戻した'); });
$('#volOwnSw').addEventListener('click', () => { const x = vol && findItem(vol.id); if (!x) return; const d = vget(x, vol.n); if (!x.ownOn) { x.ownOn = true; for (let i = 1; i <= x.cur; i++) vget(x, i).o = 1; } if (d.o) delete d.o; else { d.o = 1; logEv(x, 'buy', vol.n); } touch(x); setSw('#volOwnSw', owned(x, vol.n)); });
const togg = (k) => () => { S.set[k] = !S.set[k]; save(); drawSettings(); render(); };
$('#todSw').addEventListener('click', togg('tod')); $('#simpleSw').addEventListener('click', togg('simple')); $('#moneySw').addEventListener('click', togg('money')); $('#dustSw').addEventListener('click', togg('dust'));
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'dCrop' && d.id !== 'dCmp' && canClose(d)) d.close(); }));
$('#dEdit').addEventListener('cancel', (e) => { if (!canClose($('#dEdit'))) e.preventDefault(); });
/* シートを下に引っぱると閉じる（上の横棒のところ、または中身がいちばん上までスクロールされているとき） */
(() => {
  let st = null;
  const blocked = (el, d) => { for (let n = el; n && n !== d; n = n.parentElement) { if (n.scrollTop > 0 || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || (n.tagName === 'INPUT' && n.type === 'range')) return true; } return d.scrollTop > 0; };
  for (const d of $$('dialog')) {
    if (d.id === 'dCrop' || d.id === 'dCmp') continue;
    d.addEventListener('touchstart', (e) => { st = e.touches.length === 1 && !blocked(e.target, d) ? { d, y: e.touches[0].clientY, x: e.touches[0].clientX, t: Date.now(), dy: 0, on: false } : null; }, { passive: true });
    d.addEventListener('touchmove', (e) => {
      if (!st || st.d !== d) return;
      const dy = e.touches[0].clientY - st.y, dx = e.touches[0].clientX - st.x;
      if (!st.on) { if (dy < -4 || Math.abs(dx) > 10) { st = null; return; } if (dy < 8 || Math.abs(dx) > dy) return; st.on = true; d.style.transition = 'none'; }
      e.preventDefault(); st.dy = Math.max(0, dy - 8); d.style.transform = `translateY(${st.dy}px)`;
    }, { passive: false });
    const end = () => {
      if (!st || st.d !== d) return; const s0 = st; st = null; if (!s0.on) return;
      const fast = s0.dy > 50 && s0.dy / Math.max(1, Date.now() - s0.t) > 0.6;
      d.style.transition = 'transform .26s cubic-bezier(.2,.8,.2,1)';
      if ((s0.dy > Math.min(150, d.offsetHeight * 0.28) || fast) && canClose(d)) { d.style.transform = 'translateY(100%)'; setTimeout(() => { d.close(); d.style.transform = ''; d.style.transition = ''; }, 250); }
      else { d.style.transform = ''; setTimeout(() => { d.style.transition = ''; }, 280); }
    };
    d.addEventListener('touchend', end); d.addEventListener('touchcancel', end);
  }
})();
$('#q').addEventListener('input', (e) => { ui.q = e.target.value.trim(); drawList(); });
$('#sort').addEventListener('change', (e) => { S.sort = e.target.value; save(); drawList(); });
$('#imp').addEventListener('change', (e) => { if (e.target.files[0]) readImport(e.target.files[0]); e.target.value = ''; });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#page').hidden && !$('dialog[open]')) closeItem(); });
// 背景の大きな文字をスクロールに合わせてゆっくり動かす
let ticking = false;
/* iPhoneでボタンを押した瞬間の「へこむ」表示を効かせる（これがないと押せたか分かりにくい）。ダブルタップ待ちもなくす */
document.addEventListener('touchstart', () => {}, { passive: true });
/* 画面を開いたときに検索欄などへ勝手に入らない（キーボードが出たり画面がズームしたりしない）。見出しに目印だけ置く */
for (const d of $$('dialog')) { const h = d.querySelector('h3, h2'); if (h) { h.tabIndex = -1; h.setAttribute('autofocus', ''); } }
/* iPhone（iOS 26）で、画面の見えている範囲と下の基準がずれて下の固定バーが欠けることがある。そのずれ分だけ持ち上げる（キーボードが出ているときは何もしない） */
(() => {
  const vv = window.visualViewport; if (!vv) return;
  let raf = 0;
  const fix = () => { raf = 0; const gap = Math.round(innerHeight - vv.height - vv.offsetTop), kb = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    document.documentElement.style.setProperty('--vvb', `${vv.scale > 1.01 || kb || gap < 0 || gap > 140 ? 0 : gap}px`); };
  const q = () => { if (!raf) raf = requestAnimationFrame(fix); };
  vv.addEventListener('resize', q); vv.addEventListener('scroll', q); addEventListener('scroll', q, { passive: true }); addEventListener('focusout', () => setTimeout(q, 350)); fix();
})();
addEventListener('scroll', () => { if (!ticking && !reduced) { ticking = true; requestAnimationFrame(() => { $('#giant').style.transform = `translateY(${(-scrollY * 0.18).toFixed(1)}px)`; ticking = false; }); } }, { passive: true });
setInterval(applyNight, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { applyNight(); drawBkHint(); } });

let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400); }

render(true);
if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => { document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); }); }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloaded && !$('dialog[open]') && $('#page').hidden) { reloaded = true; location.reload(); } });
}
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
window.__k = { S: () => S, render, gen: genHTML, open: (id) => openItem(id, null) };
})();
