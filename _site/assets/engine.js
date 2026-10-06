(function(){
const C = window.CFG, PERIODS = 3, SEC_PER_T = 3, NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const P = Object.assign({}, C.defaults);
// ---------- parameter UI ----------
C.params.forEach(d => {
const w = document.createElement('div'); w.className = 'param';
w.innerHTML = `<div class="top"><label for="p_${d.k}">${d.zh}<span class="en">${d.en}</span></label><output id="o_${d.k}"></output></div>
<input type="range" id="p_${d.k}" min="${d.min}" max="${d.max}" step="${d.step}">`;
$('params').appendChild(w);
$('p_'+d.k).addEventListener('input', e => { P[d.k] = parseFloat(e.target.value); syncParams(d.k); rebuild(); });
});
function syncParams(changed){
if (C.clamp) C.clamp(P);
C.params.forEach(d => {
const el = $('p_'+d.k);
if (d.dynMin) el.min = d.dynMin(P);
if (d.dynMax) el.max = d.dynMax(P);
// also write back to the slider being dragged when clamp() changed its value
if (d.k !== changed || parseFloat(el.value) !== P[d.k]) el.value = P[d.k];
$('o_'+d.k).textContent = d.fmt(P[d.k]);
});
}
C.presets.forEach(p => {
const b = document.createElement('button'); b.type = 'button'; b.textContent = p.label;
b.addEventListener('click', () => { Object.assign(P, p.v); syncParams(); rebuild(); });
$('presets').appendChild(b);
});
// ---------- waveforms ----------
const X0 = 64, X1 = 606, ROW = 105;
const tx = t => X0 + (t/PERIODS)*(X1 - X0);
let M, ys = [], cur = null;
function el(tag, attrs, parent, text){
const e = document.createElementNS(NS, tag);
for (const a in attrs) e.setAttribute(a, attrs[a]);
if (text != null) e.textContent = text;
parent.appendChild(e); return e;
}
function drawWaves(){
const rows = C.rows;
$('wave').setAttribute('viewBox', `0 0 620 ${rows.length*ROW + 4}`);
const g = $('wfStatic'); g.innerHTML = '';
// outside the model's valid range: say so instead of drawing a normal-looking steady state
$('wfWarn').hidden = !M.infeasible;
$('wfWarn').textContent = M.infeasible ? '⚠ 指定條件無法穩壓／超出模型範圍：' + M.infeasible : '';
g.style.opacity = M.infeasible ? .35 : 1;
rows.forEach((r, i) => {
const top = i*ROW, y0 = top + 26, y1 = top + 96;
const [lo, hi] = r.range(M);
const ysc = v => y1 - (v - lo)/(hi - lo)*(y1 - y0);
ys[i] = ysc;
for (let p = 0; p < PERIODS; p++) {
el('rect', {x:tx(p), y:y0, width:tx(p+M.D)-tx(p), height:y1-y0, fill:'var(--on)', 'fill-opacity':.07}, g);
el('rect', {x:tx(p+M.D), y:y0, width:tx(p+M.D+M.D2)-tx(p+M.D), height:y1-y0, fill:'var(--off)', 'fill-opacity':.06}, g);
}
const t = el('text', {x:4, y:top+14, class:'wf-title'}, g, r.zh + '  ');
el('tspan', {class:'en2'}, t, r.en);
el('line', {x1:X0, x2:X1, y1:ysc(0), y2:ysc(0), class:'axis'}, g);
el('line', {x1:X0, x2:X0, y1:y0-4, y2:y1, class:'axis'}, g);
el('text', {x:X0-6, y:ysc(0)+4, 'text-anchor':'end', class:'tick'}, g, '0');
const used = [];
(r.refs ? r.refs(M) : []).forEach(f => {
const y = ysc(f.v);
if (!f.noline) el('line', {x1:X0, x2:X1, y1:y, y2:y, class:'ref', stroke:f.c}, g);
const lx = f.side==='end' ? X1-2 : f.side==='start' ? X0+4 : tx(M.D + PERIODS - 1);
const anchor = f.side==='end' ? 'end' : f.side==='start' ? 'start' : 'middle';
let ly = y - 4;
if (used.some(u => u.side === f.side && Math.abs(u.y - ly) < 12)) ly = y + 12;
used.push({side:f.side, y:ly});
el('text', {x:lx, y:ly, 'text-anchor':anchor, class:'ref-lbl', fill:f.c}, g, f.l + ' ' + fx(f.v) + (r.unit==='V' ? ' V' : ' A'));
});
let d = '';
for (let p = 0; p < PERIODS; p++) r.pts(M).forEach(([tt, v], j) => {
d += (p===0 && j===0 ? 'M' : 'L') + tx(p+tt).toFixed(1) + ',' + ysc(v).toFixed(1) + ' ';
});
el('path', {d, fill:'none', stroke:r.c, 'stroke-width':2.4, 'stroke-linejoin':'round'}, g);
});
const cg = $('wfCursor');
if (!cur) {
cur = {};
cur.line = el('line', {y1:20, y2:rows.length*ROW, stroke:'var(--ink)', 'stroke-width':1.4, 'stroke-opacity':.55}, cg);
cur.dots = rows.map(r => el('circle', {r:4.8, fill:r.c, stroke:'var(--paper)', 'stroke-width':2}, cg));
cur.vals = rows.map((r, i) => el('text', {x:X1, y:i*ROW+14, 'text-anchor':'end', class:'wf-val', fill:r.c}, cg));
}
}
// ---------- calc + takeaway ----------
function drawCalc(){
const c = C.calc(M, P);
if (M.infeasible) c.badges.unshift(['warn', '無法穩壓：以下數值僅供示意，見波形區說明']);
$('badges').innerHTML = c.badges.map(([cls, txt]) => `<span class="badge ${cls}">${txt}</span>`).join('');
$('formulas').innerHTML = c.rows.map(([zh, en, eq, res]) =>
`<div class="f-row"><div class="name">${zh}<span class="en">${en}</span></div><div class="eq">${eq}</div><div class="res">${res}</div></div>`).join('');
const items = c.items;
const op = (a, b, ge) => Math.abs(a-b) < 0.005 ? '=' : a > b ? (ge ? '≥' : '&gt;') : '&lt;';
$('relation').innerHTML = items.map((it, i) => (i ? `<span class="op">${op(items[i-1].v, it.v, i===1)}</span>` : '') + it.s).join('');
const mx = Math.max(...items.map(i => i.v));
$('bars').innerHTML = items.map(it => `<div class="bar-row"><div class="bl">${it.zh} ${it.s}<span class="en">${it.en}</span></div>
<div class="bar-track"><div class="bar-fill" style="width:${(it.v/mx*100).toFixed(1)}%;background:${it.c}"></div></div>
<div class="bv">${fx(it.v)} A</div></div>`).join('');
if ($('cardIdle')) $('cardIdle').hidden = M.mode !== 'DCM';
if (C.after) C.after(M, P, $);
}
let PILL = {on:'Q 導通 ON', off:'Q 關斷 OFF', idle:'DCM 空檔 idle'};
function rebuild(){
M = C.model(P);
if (C.paths) {
const p = C.paths(M);
document.querySelectorAll('#gOn path').forEach(e => e.setAttribute('d', p.on));
document.querySelectorAll('#gOff path').forEach(e => e.setAttribute('d', p.off));
}
if (C.labels) {
const l = C.labels(M);
PILL = {on:l.on, off:l.off, idle:PILL.idle};
$('btnOn').textContent = l.on; $('btnOff').textContent = l.off;
}
drawWaves(); drawCalc(); lastPh = null; render();
}
// ---------- animation ----------
let t = 0, playing = true, speed = 1, last = null, offOn = 0, offOff = 0, lastPh = null;
if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) playing = false;
const flowsOn = [...document.querySelectorAll('#gOn .flow')], flowsOff = [...document.querySelectorAll('#gOff .flow')];
function render(){
const s = C.at(M, t % 1), ph = s.ph;
if (ph !== lastPh) {
lastPh = ph;
$('gOn').style.opacity = ph==='on' ? 1 : 0;
$('gOff').style.opacity = ph==='off' ? 1 : 0;
const bl = typeof C.blade === 'function' ? C.blade(M, ph) : {blade: C.blade[ph]};
for (const id in bl) $(id).setAttribute('transform', bl[id]);
const tx2 = typeof C.phaseText === 'function' ? C.phaseText(M, ph) : C.phaseText[ph];
for (const id in tx2) if ($(id)) $(id).textContent = tx2[id];
document.querySelectorAll('#circuit .pol').forEach(p => p.setAttribute('fill', ph==='on' ? 'var(--on)' : 'var(--off)'));
const pill = $('phasePill'); pill.textContent = PILL[ph]; pill.className = 'phase-pill ' + ph;
['On','Off','Idle'].forEach(n => { const c = $('card'+n); if (c) c.classList.toggle('active', n.toLowerCase()===ph); });
}
for (const id in s.read) $(id).textContent = s.read[id];
const x = tx(t);
cur.line.setAttribute('x1', x); cur.line.setAttribute('x2', x);
C.rows.forEach((r, i) => {
const v = s[r.k];
cur.dots[i].setAttribute('cx', x); cur.dots[i].setAttribute('cy', ys[i](v));
cur.vals[i].textContent = '= ' + fx(v) + (r.unit==='V' ? ' V' : ' A');
});
$('scrub').value = (t*100).toFixed(1);
$('scrubVal').textContent = fx(t) + ' T';
}
function frame(ts){
if (last == null) last = ts;
const dt = Math.min(0.05, (ts - last)/1000); last = ts;
if (playing) {
t = (t + dt*speed/SEC_PER_T) % PERIODS;
const s = C.at(M, t % 1), k = 76*speed*(0.35 + 0.65*Math.max(0, Math.min(1, s.flow)));
const dir = s.dir === -1 ? -1 : 1;   // negative current (e.g. forced PWM at light load) flows backwards
if (s.ph==='on') offOn -= dir*k*dt; else if (s.ph==='off') offOff -= dir*k*dt;
flowsOn.forEach(f => f.style.strokeDashoffset = offOn);
flowsOff.forEach(f => f.style.strokeDashoffset = offOff);
render();
}
requestAnimationFrame(frame);
}
function setPlaying(v){ playing = v; $('btnPlay').textContent = v ? '暫停 Pause' : '播放 Play'; }
$('btnPlay').addEventListener('click', () => setPlaying(!playing));
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
speed = +b.dataset.speed;
document.querySelectorAll('[data-speed]').forEach(o => o.setAttribute('aria-pressed', o===b));
}));
const jump = tau => { setPlaying(false); t = Math.floor(t) + tau; render(); };
$('btnOn').addEventListener('click', () => jump(M.D/2));
$('btnOff').addEventListener('click', () => jump(M.D + M.D2/2));
$('scrub').addEventListener('input', e => { setPlaying(false); t = Math.min(PERIODS - 1e-4, e.target.value/100); render(); });
$('chkHot').addEventListener('change', e => { $('hotGroup').style.display = e.target.checked ? '' : 'none'; });
syncParams(); rebuild(); setPlaying(playing);
requestAnimationFrame(frame);
})();
