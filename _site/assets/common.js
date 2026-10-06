const fx = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
const fmtF = f => f >= 1000 ? (f/1000).toFixed(2) + ' MHz' : f.toFixed(0) + ' kHz';
const VF = 0.4;
// MOSFET voltage class for a given peak stress, keeping VDS at or below 80% of the rating
const FET_V = [30, 40, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 650, 800, 900];
const fetRating = (v, margin = 0.2) => { const need = v/(1 - margin), r = FET_V.find(x => x >= need); return {need, v: r, ok: r != null && r <= 200}; };
