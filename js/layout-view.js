/**
 * Page Layout & Split View Controller + Draw Sub-Toolbar Controller:
 *  - Page Layout: Single Page vs Two-Page Spread (with "Show first page alone" cover mode)
 *  - Split View: No Split | Vertical (side-by-side) | Horizontal (top-and-bottom)
 *  - Document/Page Cards with live mini previews, "Change", Swap (⇄), and "Sync scroll and zoom"
 *  - Draw Sub-Toolbar toggle (Pen, Highlighter, Eraser, Callout, Polyline, Polygon, Cloud, Rect, Ellipse, Line, Arrow)
 */
import { state, notify, setTool } from './state.js';
import { getPdfDocA, getPdfDocB, renderCurrentPage } from './pdf-engine.js';

let syncScrollLock = false;

export function getSpreadCompanionPage(basePage, totalPages) {
  if (state.layout.pageMode !== 'two-page' || totalPages < 2) return null;
  if (state.layout.firstPageAlone && basePage === 1) return null;
  if (basePage + 1 <= totalPages) return basePage + 1;
  return null;
}

export function initLayoutView() {
  const drawBarBtn = document.getElementById('btn-draw-bar-toggle');
  const layoutBtn = document.getElementById('btn-layout-tab');

  drawBarBtn?.addEventListener('click', () => {
    state.layout.drawBarOpen = !state.layout.drawBarOpen;
    if (state.layout.drawBarOpen && ['select', 'pan'].includes(state.activeTool)) {
      setTool('pen');
    } else {
      notify();
    }
  });

  layoutBtn?.addEventListener('click', () => {
    const tab = document.querySelector('.tab-btn[data-tab="layout"]');
    if (tab) tab.click();
  });

  // Page Layout buttons (Single Page / Two Page)
  document.querySelectorAll('[data-page-layout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.layout.pageMode = btn.dataset.pageLayout;
      if (state.layout.pageMode === 'two-page' && state.numPages >= 2 && state.currentPage === 1 && !state.layout.firstPageAlone) {
        state.currentPage = 1;
      }
      await renderCurrentPage();
    });
  });

  const firstAloneEl = document.getElementById('layout-first-alone');
  firstAloneEl?.addEventListener('change', async () => {
    state.layout.firstPageAlone = firstAloneEl.checked;
    await renderCurrentPage();
  });

  // Split View buttons (No Split / Vertical / Horizontal)
  document.querySelectorAll('[data-split-mode]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.layout.splitMode = btn.dataset.splitMode;
      if (state.layout.splitMode !== 'none' && (!state.layout.splitPage || state.layout.splitPage === state.currentPage)) {
        state.layout.splitPage = Math.min(state.numPages || 1, state.currentPage + 1);
      }
      await renderCurrentPage();
    });
  });

  const syncScrollEl = document.getElementById('layout-sync-scroll');
  syncScrollEl?.addEventListener('change', () => {
    state.layout.syncScrollZoom = syncScrollEl.checked;
  });

  // Split pane page navigation & Change / Swap buttons
  document.getElementById('btn-split-prev')?.addEventListener('click', async () => {
    const docB = getPdfDocB() || getPdfDocA();
    if (!docB) return;
    const step = state.layout.pageMode === 'two-page' ? 2 : 1;
    state.layout.splitPage = Math.max(1, (state.layout.splitPage || 1) - step);
    await renderLayoutViews();
  });

  document.getElementById('btn-split-next')?.addEventListener('click', async () => {
    const docB = getPdfDocB() || getPdfDocA();
    if (!docB) return;
    const step = state.layout.pageMode === 'two-page' ? 2 : 1;
    state.layout.splitPage = Math.min(docB.numPages, (state.layout.splitPage || 1) + step);
    await renderLayoutViews();
  });

  document.getElementById('btn-split-load-pdf')?.addEventListener('click', () => {
    document.getElementById('rev-b-input')?.click();
  });
  document.getElementById('btn-layout-change-a')?.addEventListener('click', () => {
    document.getElementById('pdf-file-input')?.click();
  });
  document.getElementById('btn-layout-change-b')?.addEventListener('click', () => {
    document.getElementById('rev-b-input')?.click();
  });
  document.getElementById('btn-layout-swap')?.addEventListener('click', async () => {
    const tmp = state.currentPage;
    state.currentPage = Math.max(1, Math.min(state.numPages || 1, state.layout.splitPage || 1));
    state.layout.splitPage = tmp;
    await renderCurrentPage();
  });

  // Synchronized scroll between primary pane and secondary split pane
  const paneA = document.getElementById('primary-pane-scroller');
  const paneB = document.getElementById('secondary-pane-scroller');
  const syncScroll = (src, dst) => {
    if (!state.layout.syncScrollZoom || state.layout.splitMode === 'none' || syncScrollLock) return;
    syncScrollLock = true;
    const maxSrcX = Math.max(1, src.scrollWidth - src.clientWidth);
    const maxSrcY = Math.max(1, src.scrollHeight - src.clientHeight);
    const maxDstX = Math.max(0, dst.scrollWidth - dst.clientWidth);
    const maxDstY = Math.max(0, dst.scrollHeight - dst.clientHeight);
    dst.scrollLeft = (src.scrollLeft / maxSrcX) * maxDstX;
    dst.scrollTop = (src.scrollTop / maxSrcY) * maxDstY;
    requestAnimationFrame(() => { syncScrollLock = false; });
  };
  paneA?.addEventListener('scroll', () => syncScroll(paneA, paneB), { passive: true });
  paneB?.addEventListener('scroll', () => syncScroll(paneB, paneA), { passive: true });
}

export async function renderLayoutViews() {
  const docA = getPdfDocA();
  const docB = getPdfDocB() || docA;

  // Sync active state on Layout options buttons
  document.querySelectorAll('[data-page-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.pageLayout === state.layout.pageMode);
  });
  document.querySelectorAll('[data-split-mode]').forEach((b) => {
    b.classList.toggle('active', b.dataset.splitMode === state.layout.splitMode);
  });

  const drawTools = ['pen', 'highlight', 'eraser', 'callout', 'polyline', 'polygon', 'cloud', 'rect', 'ellipse', 'line', 'arrow'];
  const showDrawBar = Boolean(state.pdfBytes) && (state.layout.drawBarOpen || drawTools.includes(state.activeTool));
  document.getElementById('draw-subtoolbar')?.classList.toggle('hidden', !showDrawBar);
  document.getElementById('btn-draw-bar-toggle')?.classList.toggle('active', showDrawBar);

  const shell = document.getElementById('viewport-split-shell');
  const secPane = document.getElementById('secondary-pane-scroller');
  const rightStageA = document.getElementById('page-stage-right');

  if (!docA || !shell) return;

  shell.className = `viewport-split-shell split-${state.layout.splitMode}`;
  const isSplit = state.layout.splitMode !== 'none' && !state.compare.active;
  secPane?.classList.toggle('hidden', !isSplit);

  // 1. Primary Two-Page Spread companion canvas
  const compA = getSpreadCompanionPage(state.currentPage, docA.numPages);
  if (compA && !state.compare.active) {
    rightStageA?.classList.remove('hidden');
    await paintPageToCanvas(docA, compA, 'pdf-canvas-right', 'page-stage-right');
  } else {
    rightStageA?.classList.add('hidden');
  }

  // 2. Secondary Split View Pane (Vertical or Horizontal)
  if (isSplit && docB) {
    const splitP = Math.max(1, Math.min(docB.numPages, state.layout.splitPage || Math.min(docB.numPages, state.currentPage + 1)));
    state.layout.splitPage = splitP;
    await paintPageToCanvas(docB, splitP, 'split-canvas-left', 'split-stage-left');

    const compB = getSpreadCompanionPage(splitP, docB.numPages);
    const rightStageB = document.getElementById('split-stage-right');
    if (compB) {
      rightStageB?.classList.remove('hidden');
      await paintPageToCanvas(docB, compB, 'split-canvas-right', 'split-stage-right');
    } else {
      rightStageB?.classList.add('hidden');
    }

    const titleEl = document.getElementById('split-pane-title');
    const indEl = document.getElementById('split-page-indicator');
    const nameB = getPdfDocB() ? (state.compare.revBName || 'Second PDF') : (state.pdfName || 'Same PDF');
    if (titleEl) titleEl.textContent = nameB;
    if (indEl) indEl.textContent = compB ? `P${splitP}–${compB} / ${docB.numPages}` : `P${splitP} / ${docB.numPages}`;
  }

  // 3. Update mini preview thumbnails in the Layout options panel
  await renderMiniThumb(docA, state.currentPage, 'layout-thumb-a');
  await renderMiniThumb(docB, state.layout.splitPage || 1, 'layout-thumb-b');
  const lblA = document.getElementById('layout-doc-a-name');
  const lblB = document.getElementById('layout-doc-b-name');
  if (lblA) lblA.textContent = `${(state.pdfName || 'Doc A').slice(0, 14)} (P${state.currentPage})`;
  if (lblB) lblB.textContent = `${(getPdfDocB() ? state.compare.revBName : (state.pdfName || 'Doc A')).slice(0, 14)} (P${state.layout.splitPage || 1})`;
}

async function paintPageToCanvas(doc, pageNum, canvasId, stageId) {
  const canvas = document.getElementById(canvasId);
  const stage = document.getElementById(stageId);
  if (!canvas || !stage) return;
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: state.zoom, rotation: state.rotation });
  const dpr = window.devicePixelRatio || 1;

  stage.style.width = `${vp.width}px`;
  stage.style.height = `${vp.height}px`;
  canvas.style.width = `${vp.width}px`;
  canvas.style.height = `${vp.height}px`;

  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(vp.width * dpr));
  off.height = Math.max(1, Math.floor(vp.height * dpr));
  const offCtx = off.getContext('2d');
  offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  await page.render({ canvasContext: offCtx, viewport: vp }).promise;

  canvas.width = off.width;
  canvas.height = off.height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(off, 0, 0);
}

async function renderMiniThumb(doc, pageNum, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !doc) return;
  const p = Math.max(1, Math.min(doc.numPages, pageNum));
  const page = await doc.getPage(p);
  const vp0 = page.getViewport({ scale: 1, rotation: 0 });
  const scale = Math.min(84 / vp0.width, 108 / vp0.height);
  const vp = page.getViewport({ scale, rotation: 0 });
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
}
