const fx = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
const fmtF = f => f >= 1000 ? (f/1000).toFixed(2) + ' MHz' : f.toFixed(0) + ' kHz';
const VF = 0.4;
