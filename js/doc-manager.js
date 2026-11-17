/**
 * Multi-document manager: open several PDFs in tabs, switch, close,
 * Save / Save As, Exit, and merge open documents.
 */
import { state, subscribe, notify, hooks } from './state.js';
import { loadPdfA, reloadPdfPreserving } from './pdf-engine.js';
import { buildAnnotatedPdfBytes } from './exporter.js';
import { triggerDownload } from './pdf-tools-org.js';
import { recordRecentFile, clearWorkbenchForce } from './workbench-ui.js';
import { openMergeDialog } from './doc-merge.js';

const docs = [];
let activeId = null;
let seenSeq = 0;
let switching = false;
let lastKey = '';

const active = () => docs.find((d) => d.id === activeId);
const isDirty = (d) => d.dirtyBase || (d.id === activeId && state.undoStack.length > d.cleanAt);
const hint = (msg) => { const el = document.getElementById('tool-hint'); if (el) el.textContent = msg; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function snapshot() {
  const d = active();
  if (!d || !state.pdfBytes) return;
  d.dirtyBase = isDirty(d);
  d.cleanAt = 0;
  Object.assign(d, {
    bytes: state.pdfBytes, name: state.pdfName, markups: state.markups, page: state.currentPage,
    unitsPerPt: state.unitsPerPt, scaleLabel: state.scaleLabel, unit: state.unit,
    takeoffItems: state.takeoffItems, activeTakeoffId: state.activeTakeoffId,
  });
}

function onState() {
  if (state.loadSeq !== seenSeq) {
    seenSeq = state.loadSeq;
    if (state.pdfBytes && !switching) {
      const cur = active();
      if (state._reloading && cur) {
        cur.bytes = state.pdfBytes; cur.name = state.pdfName; cur.dirtyBase = true; cur.cleanAt = 0;
      } else {
        const d = { id: crypto.randomUUID(), name: state.pdfName, bytes: state.pdfBytes, markups: [], dirtyBase: false, cleanAt: 0, page: 1, handle: null };
        docs.push(d);
        activeId = d.id;
      }
    }
  }
  renderTabs();
}

function renderTabs() {
  const el = document.getElementById('doc-tabs');
  const has = Boolean(state.pdfBytes);
  const key = JSON.stringify([docs.map((d) => [d.id, d.name, isDirty(d)]), activeId, has]);
  const set = (id, dis) => { const b = document.getElementById(id); if (b) b.disabled = dis; };
  set('btn-file-save', !has); set('btn-file-saveas', !has); set('btn-file-close', !has); set('btn-file-closeall', !docs.length);
  if (!el || key === lastKey) return;
  lastKey = key;
  el.classList.toggle('hidden', !docs.length);
  el.innerHTML = '';
  docs.forEach((d) => {
    const tab = document.createElement('div');
    tab.className = `doc-tab${d.id === activeId ? ' active' : ''}`;
    tab.title = d.name;
    tab.innerHTML = `<span class="doc-tab-name">${esc(d.name)}${isDirty(d) ? ' •' : ''}</span><button type="button" class="doc-tab-x" title="Close">✕</button>`;
    tab.addEventListener('click', () => activateDoc(d.id));
    tab.querySelector('.doc-tab-x').addEventListener('click', (e) => { e.stopPropagation(); closeDoc(d.id); });
    el.appendChild(tab);
  });
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'doc-tab-add'; add.title = 'Open PDF(s)…'; add.textContent = '＋';
  add.addEventListener('click', () => document.getElementById('pdf-file-input')?.click());
  el.appendChild(add);
  if (docs.length > 1) {
    const mg = document.createElement('button');
    mg.type = 'button'; mg.className = 'doc-tab-add'; mg.title = 'Merge open PDFs'; mg.textContent = '⊞ Merge';
    mg.addEventListener('click', mergeOpen);
    el.appendChild(mg);
  }
}

export async function activateDoc(id) {
  const t = docs.find((d) => d.id === id);
  if (!t || id === activeId) return;
  snapshot();
  switching = true;
  activeId = id;
  try {
    await reloadPdfPreserving(t.bytes, t.name, {
      markups: t.markups, unitsPerPt: t.unitsPerPt, scaleLabel: t.scaleLabel, unit: t.unit,
      takeoffItems: t.takeoffItems, activeTakeoffId: t.activeTakeoffId, targetPage: t.page,
    });
    t.cleanAt = 0;
  } finally { switching = false; }
  clearWorkbenchForce();
  notify();
}

function resetState() {
  Object.assign(state, { pdfBytes: null, pdfName: '', numPages: 0, currentPage: 1, markups: [], undoStack: [], redoStack: [], selectedId: null });
  activeId = null;
  const th = document.getElementById('thumbnails-list');
  if (th) th.innerHTML = '';
  notify();
}

export async function closeDoc(id) {
  const idx = docs.findIndex((d) => d.id === id);
  if (idx < 0) return;
  if (isDirty(docs[idx]) && !window.confirm(`"${docs[idx].name}" has unsaved changes. Close without saving?`)) return;
  const wasActive = id === activeId;
  docs.splice(idx, 1);
  lastKey = '';
  if (!wasActive) { renderTabs(); return; }
  activeId = null;
  if (docs.length) await activateDoc(docs[Math.min(idx, docs.length - 1)].id);
  else resetState();
}

export function closeAll() {
  if (docs.some(isDirty) && !window.confirm('Some documents have unsaved changes. Close all without saving?')) return false;
  docs.length = 0; lastKey = '';
  resetState();
  return true;
}

export async function openFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  clearWorkbenchForce();
  for (const f of files) {
    try {
      hint(`Opening ${f.name}…`);
      const buf = await f.arrayBuffer();
      await loadPdfA(buf, f.name);
      recordRecentFile(f.name, state.numPages, buf.byteLength);
    } catch (err) { hint(`Could not open ${f.name}: ${err?.message || err}`); }
  }
  hint(files.length > 1 ? `Opened ${files.length} PDFs — switch using the tabs above the canvas.` : 'Ready.');
}

export async function saveDoc(asNew) {
  const d = active();
  if (!d || !state.pdfBytes) return;
  let name = state.pdfName || 'document.pdf';
  if (!/\.pdf$/i.test(name)) name += '.pdf';
  let handle = (!asNew && d.handle) || null;
  if (!handle && window.showSaveFilePicker) {
    try {
      handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] });
    } catch (e) { if (e?.name === 'AbortError') return; handle = null; }
  } else if (!handle && asNew) {
    const p = window.prompt('Save As (file name):', name);
    if (!p) return;
    name = /\.pdf$/i.test(p) ? p : `${p}.pdf`;
  }
  const bytes = await buildAnnotatedPdfBytes();
  if (!bytes) return;
  if (handle) {
    const w = await handle.createWritable();
    await w.write(bytes); await w.close();
    d.handle = handle; name = handle.name;
  } else {
    triggerDownload(new Blob([bytes], { type: 'application/pdf' }), name);
  }
  d.dirtyBase = false; d.cleanAt = state.undoStack.length; lastKey = '';
  renderTabs();
  hint(`Saved ${name}.`);
}

export function mergeOpen() {
  snapshot();
  openMergeDialog({
    getDocs: () => docs,
    openBytes: async (bytes, name) => { await loadPdfA(bytes, name); const d = active(); if (d) d.dirtyBase = true; lastKey = ''; renderTabs(); },
  });
}

export function exitApp() {
  if (docs.some(isDirty) && !window.confirm('You have unsaved changes. Exit anyway?')) return;
  docs.length = 0; lastKey = '';
  resetState();
  try { window.close(); } catch (_) { /* browsers only close script-opened tabs */ }
  hint('All documents closed. You can close this browser tab.');
}

export function initDocManager() {
  hooks.beforeLoad = snapshot;
  subscribe(onState);
  const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
  on('btn-file-save', () => saveDoc(false));
  on('btn-file-saveas', () => saveDoc(true));
  on('btn-file-close', () => { if (activeId) closeDoc(activeId); });
  on('btn-file-closeall', closeAll);
  on('btn-file-merge', mergeOpen);
  on('btn-file-exit', exitApp);
  on('btn-file-exit-menu', exitApp);
  window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); saveDoc(e.shiftKey); }
    else if (k === 'o') { e.preventDefault(); document.getElementById('pdf-file-input')?.click(); }
  });
  window.addEventListener('beforeunload', (e) => {
    if (docs.some(isDirty)) { e.preventDefault(); e.returnValue = ''; }
  });
}
