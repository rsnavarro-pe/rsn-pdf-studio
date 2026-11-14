/**
 * Smart PDF Text Editor ("Edit Text / Fix Typo"):
 * Automatically detects the font family, bold/italic weight, font size (pt), text color,
 * background paper color, and text opacity at any clicked point on the PDF page, and launches
 * an inline floating editor directly over the detected text.
 */
import { state, addMarkup, pushHistory, notify } from './state.js';
import { getPdfDocA } from './pdf-engine.js';
import { pdfToScreen } from './geometry.js';
import { getFontStack } from './markup-props.js';

let pageTextCache = new Map();
let cachedDoc = null;
let inlineInputEl = null;

export async function handleEditTextClick(pt, renderOverlayFn) {
  const existing = [...state.markups]
    .reverse()
    .find((m) => m.page === state.currentPage && m.type === 'edittext' && m.points.length >= 2 &&
      pt.x >= Math.min(m.points[0].x, m.points[1].x) - 4 &&
      pt.x <= Math.max(m.points[0].x, m.points[1].x) + 12 &&
      pt.y >= Math.min(m.points[0].y, m.points[1].y) - 4 &&
      pt.y <= Math.max(m.points[0].y, m.points[1].y) + 4);

  if (existing) {
    state.selectedId = existing.id;
    notify();
    openInlineTextEditor(existing, renderOverlayFn);
    return;
  }

  const span = await detectTextAtPoint(state.currentPage, pt, 12 / state.zoom);
  const id = crypto.randomUUID();

  if (span) {
    Object.assign(state, {
      fontFamily: span.fontFamily, fontSize: span.fontSize,
      fontBold: span.fontBold, fontItalic: span.fontItalic,
      strokeColor: span.color, fillColor: span.bgColor, textOpacity: span.textOpacity,
    });
    const markup = {
      id, page: state.currentPage, type: 'edittext',
      points: [{ x: span.x, y: span.y }, { x: span.x + span.w, y: span.y + span.h }],
      baselineY: span.baselineY, text: span.str, originalText: span.str,
      fontFamily: span.fontFamily, fontSize: span.fontSize,
      fontBold: span.fontBold, fontItalic: span.fontItalic,
      color: span.color, fillColor: span.bgColor, fillOpacity: 1.0,
      textOpacity: span.textOpacity, lineWidth: 1,
    };
    addMarkup(markup);
    const hint = document.getElementById('tool-hint');
    if (hint) {
      hint.textContent = `Auto-detected: ${span.fontFamily}${span.fontBold ? ' Bold' : ''}${span.fontItalic ? ' Italic' : ''} · ${span.fontSize}pt · Opacity ${Math.round(span.textOpacity * 100)}%`;
    }
    openInlineTextEditor(markup, renderOverlayFn);
  } else {
    const fs = state.fontSize || 12;
    const markup = {
      id, page: state.currentPage, type: 'edittext',
      points: [{ x: pt.x, y: pt.y - fs * 0.85 }, { x: pt.x + 90, y: pt.y + fs * 0.35 }],
      baselineY: pt.y, text: 'Edited text',
      fontFamily: state.fontFamily || 'Helvetica', fontSize: fs,
      fontBold: Boolean(state.fontBold), fontItalic: Boolean(state.fontItalic),
      color: state.strokeColor || '#2C2C2E', fillColor: '#ffffff', fillOpacity: 1.0,
      textOpacity: state.textOpacity ?? 1.0, lineWidth: 1,
    };
    addMarkup(markup);
    openInlineTextEditor(markup, renderOverlayFn);
  }
}

export function openInlineTextEditor(markup, renderOverlayFn) {
  closeInlineTextEditor();
  const stage = document.getElementById('page-stage');
  if (!stage || !markup.points?.length) return;

  const p0 = pdfToScreen(markup.points[0].x, markup.points[0].y, state.zoom, state.rotation, state.pageWidthPt, state.pageHeightPt);
  const p1 = markup.points[1]
    ? pdfToScreen(markup.points[1].x, markup.points[1].y, state.zoom, state.rotation, state.pageWidthPt, state.pageHeightPt)
    : { x: p0.x + 120, y: p0.y + 20 };

  const x = Math.min(p0.x, p1.x) - 2, y = Math.min(p0.y, p1.y) - 2;
  const fSizePx = (markup.fontSize || 12) * state.zoom;
  const w = Math.max(80, Math.abs(p1.x - p0.x) + 28, (markup.text || '').length * (fSizePx * 0.6) + 24);
  const h = Math.max(22, Math.abs(p1.y - p0.y) + 6, fSizePx * 1.32);

  const input = document.createElement('input');
  input.type = 'text';
  input.value = markup.text || '';
  input.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;font-family:${getFontStack(markup.fontFamily)};font-size:${fSizePx}px;font-weight:${markup.fontBold ? '700' : '400'};font-style:${markup.fontItalic ? 'italic' : 'normal'};color:${markup.color || '#2C2C2E'};background:${markup.fillColor || '#ffffff'};opacity:${markup.textOpacity ?? 1};border:1.5px solid #0ea5e9;border-radius:2px;padding:0 3px;margin:0;outline:none;z-index:45;box-shadow:0 2px 8px rgba(14,165,233,0.28);`;

  let pushed = false;
  input.addEventListener('input', () => {
    if (!pushed) { pushHistory(); pushed = true; }
    markup.text = input.value;
    const propInput = document.getElementById('prop-text-content');
    if (propInput) propInput.value = input.value;
    input.style.width = `${Math.max(w, input.value.length * (fSizePx * 0.6) + 24)}px`;
    if (renderOverlayFn) renderOverlayFn();
  });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); closeInlineTextEditor(); notify(); }
  });
  input.addEventListener('blur', () => { closeInlineTextEditor(); notify(); });

  stage.appendChild(input);
  inlineInputEl = input;
  requestAnimationFrame(() => { input.focus(); input.select(); });
}

export function closeInlineTextEditor() {
  if (inlineInputEl) { inlineInputEl.remove(); inlineInputEl = null; }
}

export async function getPageTextSpans(pageNum) {
  const doc = getPdfDocA();
  if (!doc) return [];
  if (cachedDoc !== doc) { pageTextCache = new Map(); cachedDoc = doc; }
  if (pageTextCache.has(pageNum)) return pageTextCache.get(pageNum);

  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: 1, rotation: 0 });
  const tc = await page.getTextContent();
  const styles = tc.styles || {};
  const util = window.pdfjsLib?.Util;
  const raw = [];

  for (const it of tc.items) {
    const str = it.str || '';
    if (!str.trim()) continue;
    const tx = util ? util.transform(vp.transform, it.transform) : it.transform;
    const fontSize = Math.max(6, Math.round((Math.hypot(tx[2], tx[3]) || it.height || 11) * 2) / 2);
    const w = Math.max(8, it.width || str.length * fontSize * 0.54);
    const h = Math.max(8, fontSize * 1.18);
    const x = tx[4], y = tx[5] - fontSize * 0.84;
    const fontHint = `${it.fontName || ''} ${(styles[it.fontName] || {}).fontFamily || ''}`.toLowerCase();

    let fontFamily = 'Helvetica';
    if (/courier|mono|consolas|menlo|code|fixed/.test(fontHint)) fontFamily = 'Courier';
    else if (/times|georgia|garamond|serif|roman|cambria|minion/.test(fontHint) && !/sans/.test(fontHint)) fontFamily = 'Times';

    const fontBold = /bold|black|heavy|demi|semibold|[ -]bd/.test(fontHint);
    const fontItalic = /italic|oblique|[ -]it/.test(fontHint);
    raw.push({ str, x, y, w, h, baselineY: tx[5], fontSize, fontFamily, fontBold, fontItalic });
  }

  const merged = [];
  for (const item of raw) {
    const prev = merged[merged.length - 1];
    if (
      prev && Math.abs(prev.baselineY - item.baselineY) <= 2.5 &&
      Math.abs(prev.fontSize - item.fontSize) <= 1.5 &&
      item.x >= prev.x && item.x - (prev.x + prev.w) <= prev.fontSize * 0.9
    ) {
      const gap = item.x - (prev.x + prev.w);
      const sep = gap > prev.fontSize * 0.18 && !prev.str.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '';
      prev.str += sep + item.str;
      prev.w = Math.max(prev.w, (item.x + item.w) - prev.x);
      prev.h = Math.max(prev.h, item.h);
    } else merged.push({ ...item });
  }
  pageTextCache.set(pageNum, merged);
  return merged;
}

export async function detectTextAtPoint(pageNum, pt, tol = 10) {
  const spans = await getPageTextSpans(pageNum);
  let best = null, bestDist = Infinity;
  for (const s of spans) {
    const dx = pt.x < s.x ? s.x - pt.x : (pt.x > s.x + s.w ? pt.x - (s.x + s.w) : 0);
    const dy = pt.y < s.y ? s.y - pt.y : (pt.y > s.y + s.h ? pt.y - (s.y + s.h) : 0);
    const d = Math.hypot(dx, dy);
    if (d <= tol && d < bestDist) { bestDist = d; best = s; }
  }
  if (!best) return null;
  const sampled = sampleCanvasColorsAndOpacity(best);
  return { ...best, color: sampled.textColor, bgColor: sampled.bgColor, textOpacity: sampled.textOpacity };
}

function sampleCanvasColorsAndOpacity(span) {
  const fallback = { textColor: '#2C2C2E', bgColor: '#ffffff', textOpacity: 1 };
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas || !canvas.width || !canvas.height) return fallback;

  const p1 = pdfToScreen(span.x, span.y, state.zoom, state.rotation, state.pageWidthPt, state.pageHeightPt);
  const p2 = pdfToScreen(span.x + span.w, span.y + span.h, state.zoom, state.rotation, state.pageWidthPt, state.pageHeightPt);
  const scaleX = canvas.width / Math.max(1, parseFloat(canvas.style.width) || canvas.width);
  const scaleY = canvas.height / Math.max(1, parseFloat(canvas.style.height) || canvas.height);

  const rx = Math.max(0, Math.floor(Math.min(p1.x, p2.x) * scaleX) - 2);
  const ry = Math.max(0, Math.floor(Math.min(p1.y, p2.y) * scaleY) - 2);
  const rw = Math.min(canvas.width - rx, Math.ceil(Math.abs(p2.x - p1.x) * scaleX) + 4);
  const rh = Math.min(canvas.height - ry, Math.ceil(Math.abs(p2.y - p1.y) * scaleY) + 4);
  if (rw < 3 || rh < 3) return fallback;

  try {
    const data = canvas.getContext('2d').getImageData(rx, ry, rw, rh).data;
    let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
    for (let x = 0; x < rw; x += Math.max(1, Math.floor(rw / 12))) {
      for (const y of [0, rh - 1]) {
        const idx = (y * rw + x) * 4;
        bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]; bgCount++;
      }
    }
    bgR = bgCount ? Math.round(bgR / bgCount) : 255;
    bgG = bgCount ? Math.round(bgG / bgCount) : 255;
    bgB = bgCount ? Math.round(bgB / bgCount) : 255;

    let maxDist = 0;
    const inkPixels = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
      if (dist > maxDist) maxDist = dist;
      if (dist > 28) inkPixels.push({ r, g, b, dist });
    }
    if (!inkPixels.length) return { ...fallback, bgColor: rgbToHex(bgR, bgG, bgB) };

    inkPixels.sort((a, b) => b.dist - a.dist);
    const topN = inkPixels.slice(0, Math.max(1, Math.min(20, Math.ceil(inkPixels.length * 0.2))));
    const inkR = Math.round(topN.reduce((s, p) => s + p.r, 0) / topN.length);
    const inkG = Math.round(topN.reduce((s, p) => s + p.g, 0) / topN.length);
    const inkB = Math.round(topN.reduce((s, p) => s + p.b, 0) / topN.length);
    const rawOp = Math.min(1, Math.max(0.25, +(maxDist / 215).toFixed(2)));
    return { textColor: rgbToHex(inkR, inkG, inkB), bgColor: rgbToHex(bgR, bgG, bgB), textOpacity: rawOp >= 0.82 ? 1 : rawOp };
  } catch {
    return fallback;
  }
}

function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
