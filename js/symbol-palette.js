/**
 * AEC Symbol Palette (NL IFC & NEN 1414), Modify/Clipboard & Snap Controls
 * Derived from Open PDF Studio (open-aec.com) Drawing Ribbon & Tool Palette
 */
import { state, pushHistory, setTool, notify } from './state.js';

export const AEC_SYMBOL_CATEGORIES = [
  { id: 'ifc-const', name: 'NL IFC Construction', icon: '🏗', count: 53, color: '#3b82f6', items: [
    { id: 'door-1', code: 'DR1', label: 'Single Swing Door', shape: 'door' },
    { id: 'door-2', code: 'DR2', label: 'Double Swing Door', shape: 'rect' },
    { id: 'win-1', code: 'WIN', label: 'Window Element', shape: 'rect' },
    { id: 'col-rc', code: 'COL', label: 'Structural Column', shape: 'rect' },
    { id: 'stair-up', code: 'STR', label: 'Stair Direction', shape: 'triangle' },
    { id: 'sec-cut', code: 'SEC', label: 'Section Cut Marker', shape: 'circle' },
    { id: 'north', code: 'N↑', label: 'North Arrow', shape: 'circle' },
    { id: 'elev-0', code: '±0.0', label: 'Elevation Datum', shape: 'diamond' },
  ]},
  { id: 'nl-elec', name: 'NL Electrical', icon: '⚡', count: 58, color: '#eab308', items: [
    { id: 'wcd-2', code: '2×WCD', label: 'Double Wall Socket (Earthed)', shape: 'circle' },
    { id: 'wcd-1', code: '1×WCD', label: 'Single Wall Socket', shape: 'circle' },
    { id: 'sw-1', code: 'SW1', label: 'Single Pole Switch', shape: 'circle' },
    { id: 'sw-w', code: 'SW~', label: 'Two-Way / Hotel Switch', shape: 'circle' },
    { id: 'lgt-c', code: '⊗', label: 'Ceiling Light Point', shape: 'circle' },
    { id: 'lgt-em', code: 'EM-L', label: 'Emergency Luminaire', shape: 'rect' },
    { id: 'db-mk', code: 'MK', label: 'Distribution Board / Meterkast', shape: 'rect' },
    { id: 'utp-data', code: 'DATA', label: 'Data / RJ45 Outlet', shape: 'triangle' },
  ]},
  { id: 'nl-site', name: 'NL Construction Site', icon: '🚧', count: 4, color: '#f97316', items: [
    { id: 'crane', code: 'CRN', label: 'Tower Crane Radius', shape: 'circle' },
    { id: 'gate', code: 'GATE', label: 'Site Access Gate', shape: 'rect' },
    { id: 'laydown', code: 'MAT', label: 'Material Storage Zone', shape: 'rect' },
    { id: 'muster', code: 'ASM', label: 'Assembly / Muster Point', shape: 'diamond' },
  ]},
  { id: 'nl-san', name: 'NL Sanitary', icon: '🚿', count: 4, color: '#06b6d4', items: [
    { id: 'wc', code: 'WC', label: 'Wall-Hung WC', shape: 'rect' },
    { id: 'sink', code: 'WB', label: 'Washbasin', shape: 'circle' },
    { id: 'shower', code: 'SHW', label: 'Shower Drain Zone', shape: 'rect' },
    { id: 'fdrain', code: 'FD', label: 'Floor Gullies / Drain', shape: 'circle' },
  ]},
  { id: 'nl-kit', name: 'NL Kitchen', icon: '🍳', count: 3, color: '#14b8a6', items: [
    { id: 'ksink', code: 'KSK', label: 'Kitchen Sink Unit', shape: 'rect' },
    { id: 'cook', code: '4×CK', label: 'Induction Cooktop', shape: 'rect' },
    { id: 'fridge', code: 'KK', label: 'Refrigerator / Freezer', shape: 'rect' },
  ]},
  { id: 'nen-fire', name: 'NL NEN 1414 — Fire Protection', icon: '🔥', count: 35, color: '#ef4444', items: [
    { id: 'bmc', code: 'BMC', label: 'Fire Alarm Control Panel', shape: 'rect' },
    { id: 'mcp', code: 'HM', label: 'Manual Call Point (Handmelder)', shape: 'rect' },
    { id: 'sd-opt', code: 'RM', label: 'Optical Smoke Detector', shape: 'circle' },
    { id: 'siren', code: 'SLOW', label: 'Slow-Whoop Sounder', shape: 'triangle' },
    { id: 'fdamp', code: 'BK', label: 'Fire Damper (Brandklep)', shape: 'diamond' },
    { id: 'wbdbo', code: '60′', label: 'WBDBO 60 min Compartment Line', shape: 'diamond' },
  ]},
  { id: 'nen-ext', name: 'NL NEN 1414 — Extinguishing Systems', icon: '🧯', count: 8, color: '#dc2626', items: [
    { id: 'slang', code: 'BSL', label: 'Fire Hose Reel (Brandslanghaspel)', shape: 'circle' },
    { id: 'ext-p', code: 'BLUS', label: 'Portable Fire Extinguisher', shape: 'rect' },
    { id: 'ext-co2', code: 'CO2', label: 'CO2 Extinguisher', shape: 'rect' },
    { id: 'dry-r', code: 'DBV', label: 'Dry Riser Inlet (Droge Blusleiding)', shape: 'diamond' },
  ]},
  { id: 'nen-door', name: 'NL NEN 1414 — Doors', icon: '🚪', count: 10, color: '#ea580c', items: [
    { id: 'fd-30', code: 'BD30', label: 'Fire Door 30 min (Zelfsluitend)', shape: 'door' },
    { id: 'fd-60', code: 'BD60', label: 'Fire Door 60 min', shape: 'door' },
    { id: 'em-exit', code: 'NOOD', label: 'Panic Bar Emergency Exit', shape: 'rect' },
    { id: 'mag-h', code: 'KLEEF', label: 'Magnetic Door Holder', shape: 'circle' },
  ]},
  { id: 'nen-emlight', name: 'NL NEN 1414 — Emergency Lighting', icon: '🏃', count: 12, color: '#16a34a', items: [
    { id: 'exit-l', code: '←🏃', label: 'Escape Route Sign Left', shape: 'rect' },
    { id: 'exit-r', code: '🏃→', label: 'Escape Route Sign Right', shape: 'rect' },
    { id: 'exit-d', code: '🏃↓', label: 'Escape Route Sign Down', shape: 'rect' },
    { id: 'nv-arm', code: 'NV', label: 'Anti-Panic Luminaire', shape: 'circle' },
  ]},
  { id: 'nen-smoke', name: 'NL NEN 1414 — Smoke/Heat Extraction', icon: '💨', count: 16, color: '#9333ea', items: [
    { id: 'rwa-d', code: 'RWA', label: 'Smoke & Heat Exhaust Vent', shape: 'rect' },
    { id: 'hd-th', code: 'TM', label: 'Thermal / Heat Detector', shape: 'circle' },
    { id: 'scurt', code: 'RS', label: 'Smoke Curtain (Rookscherm)', shape: 'diamond' },
    { id: 'efan', code: 'RV', label: 'Smoke Extract Fan', shape: 'circle' },
  ]},
  { id: 'nen-vent', name: 'NL NEN 1414 — Ventilation', icon: '🌀', count: 1, color: '#0284c7', items: [
    { id: 'sup-air', code: 'TOEV', label: 'Supply Air Diffuser', shape: 'circle' },
    { id: 'ret-air', code: 'AFV', label: 'Exhaust / Return Grille', shape: 'rect' },
  ]},
  { id: 'nen-water', name: 'NL NEN 1414 — Water/Sprinkler', icon: '💧', count: 19, color: '#2563eb', items: [
    { id: 'sprk', code: 'SPK', label: 'Sprinkler Head', shape: 'circle' },
    { id: 'mvalve', code: 'HAF', label: 'Main Stop Valve (Hoofdafsluiter)', shape: 'diamond' },
    { id: 'hydr', code: 'BKR', label: 'Underground Fire Hydrant', shape: 'circle' },
  ]},
];

export function initSymbolPalette(callbacks = {}) {
  const listEl = document.getElementById('symbol-palette-list');
  const searchEl = document.getElementById('symbol-search');
  const scaleEl = document.getElementById('symbol-scale-select');

  function renderPalette(query = '') {
    if (!listEl) return;
    const q = query.trim().toLowerCase();
    listEl.innerHTML = '';

    const allCats = state.customSymbols.length
      ? [{ id: 'custom', name: 'Custom Collection', icon: '★', count: state.customSymbols.length, color: '#10b981', items: state.customSymbols }, ...AEC_SYMBOL_CATEGORIES]
      : AEC_SYMBOL_CATEGORIES;

    allCats.forEach((cat, idx) => {
      const filtered = q
        ? cat.items.filter(it => it.label.toLowerCase().includes(q) || it.code.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q))
        : cat.items;
      if (q && !filtered.length) return;

      const details = document.createElement('details');
      details.className = 'sym-cat';
      if (idx === 0 || q) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'sym-cat-header';
      summary.innerHTML = `<span class="sym-cat-badge" style="border-color:${cat.color};color:${cat.color}">${cat.icon}</span>
        <span class="sym-cat-title">${cat.name}</span>
        <span class="sym-cat-count">${q ? filtered.length : cat.count}</span>`;
      details.appendChild(summary);

      const grid = document.createElement('div');
      grid.className = 'sym-grid';
      filtered.forEach(item => {
        const btn = document.createElement('button');
        const isActive = state.activeTool === 'symbol' && state.activeSymbol?.id === item.id;
        btn.className = `sym-item-btn${isActive ? ' active' : ''}`;
        btn.title = `${item.label} (${item.code}) — Click to place on PDF`;
        btn.innerHTML = `<span class="sym-glyph" style="border-color:${cat.color};color:${cat.color}">${item.code}</span>
          <span class="sym-label">${item.label}</span>`;
        btn.addEventListener('click', () => {
          state.activeSymbol = { ...item, color: item.color || cat.color, category: cat.name };
          setTool('symbol');
          renderPalette(searchEl?.value || '');
        });
        grid.appendChild(btn);
      });
      details.appendChild(grid);
      listEl.appendChild(details);
    });
  }

  searchEl?.addEventListener('input', () => renderPalette(searchEl.value));
  scaleEl?.addEventListener('change', () => { state.symbolScale = parseFloat(scaleEl.value) || 1; });

  // Wire SNAP checkboxes in Drawing Ribbon
  const snapMaster = document.getElementById('snap-master');
  ['endpoint', 'midpoint', 'vertex', 'startpoint', 'center'].forEach(k => {
    const cb = document.getElementById(`snap-${k}`);
    cb?.addEventListener('change', () => { state.snapModes[k] = cb.checked; });
  });
  snapMaster?.addEventListener('change', () => {
    state.osnap = snapMaster.checked;
    document.getElementById('btn-osnap')?.classList.toggle('active', state.osnap);
    notify();
  });

  // Wire MODIFY & CLIPBOARD buttons
  const transformSelected = (fn) => {
    const m = state.markups.find(x => x.id === state.selectedId);
    if (!m || !m.points || m.points.length < 1) return;
    pushHistory();
    const cx = m.points.reduce((s, p) => s + p.x, 0) / m.points.length;
    const cy = m.points.reduce((s, p) => s + p.y, 0) / m.points.length;
    fn(m, cx, cy);
    notify();
  };

  document.getElementById('mod-rot-cw')?.addEventListener('click', () => transformSelected((m, cx, cy) => {
    m.points = m.points.map(p => ({ x: cx - (p.y - cy), y: cy + (p.x - cx) }));
    m.rotation = ((m.rotation || 0) + 90) % 360;
  }));
  document.getElementById('mod-rot-ccw')?.addEventListener('click', () => transformSelected((m, cx, cy) => {
    m.points = m.points.map(p => ({ x: cx + (p.y - cy), y: cy - (p.x - cx) }));
    m.rotation = ((m.rotation || 0) + 270) % 360;
  }));
  document.getElementById('mod-flip-h')?.addEventListener('click', () => transformSelected((m, cx) => {
    m.points = m.points.map(p => ({ x: 2 * cx - p.x, y: p.y }));
  }));
  document.getElementById('mod-flip-v')?.addEventListener('click', () => transformSelected((m, _, cy) => {
    m.points = m.points.map(p => ({ x: p.x, y: 2 * cy - p.y }));
  }));
  document.getElementById('mod-duplicate')?.addEventListener('click', () => {
    const m = state.markups.find(x => x.id === state.selectedId);
    if (!m || !m.points) return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(m));
    copy.id = crypto.randomUUID();
    copy.points = copy.points.map(p => ({ x: p.x + 18, y: p.y + 18 }));
    state.markups.push(copy);
    state.selectedId = copy.id;
    notify();
  });
  document.getElementById('clip-copy')?.addEventListener('click', () => {
    const m = state.markups.find(x => x.id === state.selectedId);
    if (m) state.clipboardMarkup = JSON.parse(JSON.stringify(m));
  });
  document.getElementById('clip-cut')?.addEventListener('click', () => {
    const idx = state.markups.findIndex(x => x.id === state.selectedId);
    if (idx === -1) return;
    pushHistory();
    state.clipboardMarkup = JSON.parse(JSON.stringify(state.markups[idx]));
    state.markups.splice(idx, 1);
    state.selectedId = null;
    notify();
  });
  document.getElementById('clip-paste')?.addEventListener('click', () => {
    if (!state.clipboardMarkup) return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(state.clipboardMarkup));
    copy.id = crypto.randomUUID();
    copy.page = state.currentPage;
    copy.points = (copy.points || []).map(p => ({ x: p.x + 15, y: p.y + 15 }));
    state.markups.push(copy);
    state.selectedId = copy.id;
    notify();
  });
  document.getElementById('mod-save-symbol')?.addEventListener('click', () => {
    const m = state.markups.find(x => x.id === state.selectedId);
    if (!m) return;
    const label = m.text || `${m.type.toUpperCase()} #${state.customSymbols.length + 1}`;
    const code = label.slice(0, 4).toUpperCase();
    state.customSymbols.push({ id: `cust-${Date.now()}`, code, label, color: m.color || state.strokeColor || '#10b981', shape: 'rect' });
    renderPalette(searchEl?.value || '');
  });
  document.getElementById('btn-open-symbol-palette')?.addEventListener('click', () => {
    document.querySelector('.sidebar-tabs .tab-btn[data-tab="symbols"]')?.click();
  });

  renderPalette();
  return { renderPalette };
}

export function drawAecSymbolSvg(g, pt, sym, zoom, createSvg) {
  const s = (sym?.scale || 1) * 14 * zoom;
  const col = sym?.color || '#ef4444';
  const shape = sym?.shape || 'rect';
  if (shape === 'circle') {
    g.appendChild(createSvg('circle', { cx: pt.x, cy: pt.y, r: s, fill: 'rgba(255,255,255,0.94)', stroke: col, 'stroke-width': 2 }));
  } else if (shape === 'diamond') {
    const d = `M ${pt.x} ${pt.y - s} L ${pt.x + s} ${pt.y} L ${pt.x} ${pt.y + s} L ${pt.x - s} ${pt.y} Z`;
    g.appendChild(createSvg('path', { d, fill: 'rgba(255,255,255,0.94)', stroke: col, 'stroke-width': 2 }));
  } else if (shape === 'triangle') {
    const d = `M ${pt.x} ${pt.y - s} L ${pt.x + s} ${pt.y + s * 0.85} L ${pt.x - s} ${pt.y + s * 0.85} Z`;
    g.appendChild(createSvg('path', { d, fill: 'rgba(255,255,255,0.94)', stroke: col, 'stroke-width': 2 }));
  } else if (shape === 'door') {
    g.appendChild(createSvg('rect', { x: pt.x - s, y: pt.y - s * 0.85, width: s * 2, height: s * 1.7, rx: 2, fill: 'rgba(255,255,255,0.94)', stroke: col, 'stroke-width': 2 }));
    const arcD = `M ${pt.x - s * 0.7} ${pt.y + s * 0.6} L ${pt.x - s * 0.7} ${pt.y - s * 0.5} A ${s * 1.1} ${s * 1.1} 0 0 1 ${pt.x + s * 0.4} ${pt.y + s * 0.6} Z`;
    g.appendChild(createSvg('path', { d: arcD, fill: 'none', stroke: col, 'stroke-width': 1.2, 'stroke-dasharray': '2,2' }));
  } else {
    g.appendChild(createSvg('rect', { x: pt.x - s * 1.15, y: pt.y - s * 0.8, width: s * 2.3, height: s * 1.6, rx: 3, fill: 'rgba(255,255,255,0.94)', stroke: col, 'stroke-width': 2 }));
  }
  const t = createSvg('text', { x: pt.x, y: pt.y + 3.5 * zoom, 'text-anchor': 'middle', fill: col, 'font-size': Math.max(8, 9 * (sym?.scale || 1) * zoom), 'font-weight': '700', 'font-family': 'Aptos, Calibri, sans-serif' });
  t.textContent = sym?.code || 'SYM';
  g.appendChild(t);
}

export function syncDocAndAnnotationInspector() {
  const fEl = document.getElementById('doc-info-file');
  const pEl = document.getElementById('doc-info-pages');
  const sEl = document.getElementById('doc-info-size');
  const aTot = document.getElementById('annot-info-total');
  const aPg = document.getElementById('annot-info-page');
  const statPill = document.getElementById('status-stats-pill');

  if (fEl) fEl.textContent = state.pdfName || 'No file open';
  if (pEl) pEl.textContent = state.numPages ? String(state.numPages) : '-';
  if (sEl) sEl.textContent = state.pageWidthPt ? `${Math.round(state.pageWidthPt)} × ${Math.round(state.pageHeightPt)} pt` : '-';
  const onPage = state.markups.filter(m => m.page === state.currentPage).length;
  if (aTot) aTot.textContent = String(state.markups.length);
  if (aPg) aPg.textContent = `${onPage} (page ${state.currentPage})`;
  if (statPill) statPill.textContent = `Statistics: ${state.markups.length} markups (${onPage} on pg)`;
}
