/**
 * Print Engine: Professional AEC & Technical Drawing Printing to True Scale.
 * Avoids browser print-fit scaling distortions so 1:1, 1/4"=1', and 1:50 drawings print calibrated.
 */
import { state } from './state.js';
import { getPdfDocA } from './pdf-engine.js';
import { buildAnnotatedPdfBytes } from './exporter.js';

export function initPrintModal() {
  const modal = document.getElementById('print-scale-modal');
  const btnTrigger = document.getElementById('btn-print-scale');
  const btnCancel = document.getElementById('print-scale-cancel');
  const btnConfirm = document.getElementById('print-scale-confirm');
  if (!modal) return;

  if (btnTrigger) btnTrigger.addEventListener('click', openPrintModal);
  if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.add('hidden'));

  if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
      const mode = document.getElementById('print-scale-mode')?.value || 'true-scale';
      const scope = document.getElementById('print-scale-scope')?.value || 'current';
      const quality = document.getElementById('print-scale-quality')?.value || '300';
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Preparing Print Sheets...';
      try {
        await executePrintToScale({ mode, scope, dpi: Number(quality) || 300 });
        modal.classList.add('hidden');
      } catch (err) {
        alert(`Print Preparation Error: ${err?.message || 'Failed'}`);
      } finally {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Print Technical Drawing';
      }
    });
  }
}

export function openPrintModal() {
  const modal = document.getElementById('print-scale-modal');
  if (!modal) return;
  if (!state.pdfBytes) {
    alert('Please load a PDF drawing before opening Print to Scale.');
    return;
  }

  const wIn = (state.pageWidthPt / 72).toFixed(1);
  const hIn = (state.pageHeightPt / 72).toFixed(1);
  const wMm = Math.round(state.pageWidthPt * 0.352778);
  const hMm = Math.round(state.pageHeightPt * 0.352778);

  const docLabel = document.getElementById('print-scale-docname');
  const sizeLabel = document.getElementById('print-scale-sheet-size');
  const scaleLabel = document.getElementById('print-scale-calib');

  if (docLabel) docLabel.textContent = state.pdfName || 'Technical Drawing';
  if (sizeLabel) sizeLabel.textContent = `${wIn}" × ${hIn}" (${wMm} × ${hMm} mm)`;
  if (scaleLabel) scaleLabel.textContent = state.scaleLabel !== 'Not Set' ? state.scaleLabel : 'Uncalibrated (Screen 100%)';

  modal.classList.remove('hidden');
}

export async function executePrintToScale({ mode, scope, dpi }) {
  const baseDoc = getPdfDocA();
  if (!baseDoc) throw new Error('No PDF document loaded.');

  // If there are annotations/markups, bake them into vector PDF bytes for print fidelity
  let printDoc = baseDoc;
  if (state.markups && state.markups.length > 0) {
    const annBytes = await buildAnnotatedPdfBytes();
    if (annBytes && window.pdfjsLib) {
      printDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(annBytes) }).promise;
    }
  }

  const pagesToPrint = scope === 'all'
    ? Array.from({ length: printDoc.numPages }, (_, i) => i + 1)
    : [state.currentPage];

  const scale = (dpi || 300) / 72;
  const printFrames = [];

  for (const pageNum of pagesToPrint) {
    const page = await printDoc.getPage(pageNum);
    const vp = page.getViewport({ scale, rotation: state.rotation });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    printFrames.push({
      dataUrl,
      wIn: (state.pageWidthPt / 72).toFixed(2),
      hIn: (state.pageHeightPt / 72).toFixed(2),
    });
  }

  openPrintFrame(printFrames, mode);
}

function openPrintFrame(frames, mode) {
  let iframe = document.getElementById('print-engine-frame');
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = 'print-engine-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>RSN PDF Studio — Print to Scale</title>
        <style>
          @page {
            size: ${frames[0]?.wIn}in ${frames[0]?.hIn}in;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .sheet {
            page-break-after: always;
            width: 100%;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          .sheet:last-child {
            page-break-after: avoid;
          }
          img {
            max-width: 100%;
            max-height: 100%;
            object-fit: ${mode === 'fit' ? 'contain' : 'fill'};
            display: block;
          }
        </style>
      </head>
      <body>
        ${frames.map((f) => `<div class="sheet"><img src="${f.dataUrl}" alt="Print Sheet" /></div>`).join('')}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
  }, 400);
}
