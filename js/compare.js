/**
 * Revision Comparison Engine: Composite Pixel Diff & Side-by-Side view.
 * Aligned with OpenAEC Foundation Open PDF Studio v2026 revision comparison standards:
 * - Color-coded visual difference (Red = Rev A removed/old, Cyan/Green = Rev B added/new)
 * - Identical drawing geometry blended into neutral dark slate
 * - Quantitative difference metric (% area difference and changed pixel count)
 */
import { state } from './state.js';
import { getPdfDocA, getPdfDocB } from './pdf-engine.js';

export async function renderComparison() {
  const pageStage = document.getElementById('page-stage');
  const sbsStage = document.getElementById('side-by-side-stage');
  const compareCanvas = document.getElementById('compare-canvas');
  const diffPill = document.getElementById('compare-diff-pill');

  if (!state.compare.active) {
    compareCanvas.classList.add('hidden');
    sbsStage.classList.add('hidden');
    if (state.pdfBytes) pageStage.classList.remove('hidden');
    if (diffPill) diffPill.textContent = 'Comparing...';
    return;
  }

  const docA = getPdfDocA();
  const docB = getPdfDocB();
  if (!docA) return;

  if (state.compare.mode === 'side-by-side') {
    pageStage.classList.add('hidden');
    sbsStage.classList.remove('hidden');
    await renderSingleToCanvas(docA, 'sbs-canvas-a');
    if (docB) {
      await renderSingleToCanvas(docB, 'sbs-canvas-b');
      if (diffPill) diffPill.textContent = `Side-by-Side: Page ${state.currentPage}`;
    } else {
      clearCanvas('sbs-canvas-b', 'Load Rev B PDF or click "Use Sample Rev B"');
      if (diffPill) diffPill.textContent = 'Awaiting Rev B...';
    }
    return;
  }

  // Composite Overlay Diff mode
  sbsStage.classList.add('hidden');
  pageStage.classList.remove('hidden');

  if (!docB) {
    compareCanvas.classList.add('hidden');
    if (diffPill) diffPill.textContent = 'Awaiting Rev B...';
    return;
  }

  const pageNumA = Math.min(state.currentPage, docA.numPages);
  const pageNumB = Math.min(state.currentPage, docB.numPages);
  const pageA = await docA.getPage(pageNumA);
  const pageB = await docB.getPage(pageNumB);

  const vp = pageA.getViewport({ scale: state.zoom, rotation: state.rotation });
  const vpB = pageB.getViewport({ scale: state.zoom, rotation: state.rotation });
  const dpr = window.devicePixelRatio || 1;

  const w = Math.floor(vp.width * dpr);
  const h = Math.floor(vp.height * dpr);

  // Render Rev A offscreen
  const canvasA = document.createElement('canvas');
  canvasA.width = w;
  canvasA.height = h;
  const ctxA = canvasA.getContext('2d');
  ctxA.setTransform(dpr, 0, 0, dpr, 0, 0);
  await pageA.render({ canvasContext: ctxA, viewport: vp }).promise;

  // Render Rev B offscreen
  const canvasB = document.createElement('canvas');
  canvasB.width = w;
  canvasB.height = h;
  const ctxB = canvasB.getContext('2d');
  ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
  await pageB.render({ canvasContext: ctxB, viewport: vpB }).promise;

  // Setup live compare canvas
  compareCanvas.width = w;
  compareCanvas.height = h;
  compareCanvas.style.width = `${vp.width}px`;
  compareCanvas.style.height = `${vp.height}px`;
  compareCanvas.style.opacity = String(state.compare.opacity ?? 0.85);
  compareCanvas.classList.remove('hidden');

  const outCtx = compareCanvas.getContext('2d');
  const imgA = ctxA.getImageData(0, 0, w, h);
  const imgB = ctxB.getImageData(0, 0, w, h);
  const outImg = outCtx.createImageData(w, h);

  const palette = state.compare.palette || 'red-cyan';
  const metrics = computeCompositeDiff(imgA, imgB, outImg, palette);
  outCtx.putImageData(outImg, 0, 0);

  state.compare.diffMetrics = metrics;
  if (diffPill) {
    diffPill.textContent = `⚡ ${metrics.diffPct}% Diff (${metrics.diffCount.toLocaleString()} px)`;
    diffPill.title = `Total drawing ink: ${metrics.inkCount.toLocaleString()} px | Differences: ${metrics.diffCount.toLocaleString()} px`;
  }
}

function computeCompositeDiff(imgA, imgB, outImg, palette) {
  const dA = imgA.data;
  const dB = imgB.data;
  const dOut = outImg.data;
  const len = dA.length;

  let inkCount = 0;
  let diffCount = 0;
  const threshold = 232;

  // Colors: [R, G, B]
  const colOld = [220, 38, 38]; // Red for removed / Rev A only
  const colNew = palette === 'red-green' ? [22, 163, 74] : [8, 145, 178]; // Green or Cyan for added / Rev B
  const colCommon = [30, 41, 59]; // Neutral Dark Slate for common unchanged ink

  for (let i = 0; i < len; i += 4) {
    const lumA = (dA[i] + dA[i + 1] + dA[i + 2]) / 3;
    const lumB = (dB[i] + dB[i + 1] + dB[i + 2]) / 3;
    const isA = dA[i + 3] > 35 && lumA < threshold;
    const isB = dB[i + 3] > 35 && lumB < threshold;

    if (palette === 'teal-overlay') {
      if (isB) {
        dOut[i] = 0;
        dOut[i + 1] = 140;
        dOut[i + 2] = 130;
        dOut[i + 3] = 255;
        if (!isA) diffCount++;
      } else {
        dOut[i + 3] = 0;
      }
      if (isA || isB) inkCount++;
      continue;
    }

    if (isA && isB) {
      inkCount++;
      dOut[i] = colCommon[0];
      dOut[i + 1] = colCommon[1];
      dOut[i + 2] = colCommon[2];
      dOut[i + 3] = 255;
    } else if (isA && !isB) {
      diffCount++;
      inkCount++;
      dOut[i] = colOld[0];
      dOut[i + 1] = colOld[1];
      dOut[i + 2] = colOld[2];
      dOut[i + 3] = 255;
    } else if (!isA && isB) {
      diffCount++;
      inkCount++;
      dOut[i] = colNew[0];
      dOut[i + 1] = colNew[1];
      dOut[i + 2] = colNew[2];
      dOut[i + 3] = 255;
    } else {
      dOut[i + 3] = 0; // Transparent background
    }
  }

  const diffPct = inkCount > 0 ? ((diffCount / inkCount) * 100).toFixed(1) : '0.0';
  return { inkCount, diffCount, diffPct };
}

async function renderSingleToCanvas(doc, canvasId) {
  const canvas = document.getElementById(canvasId);
  const pageNum = Math.min(state.currentPage, doc.numPages);
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: Math.min(state.zoom, 1.1), rotation: state.rotation });
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
}

function clearCanvas(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  canvas.width = 480;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8faf9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#5a6866';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}
