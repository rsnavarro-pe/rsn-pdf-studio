/**
 * Merge Open PDFs dialog: choose/reorder open documents and a merge mode.
 */
import { mergePdfs } from './pdf-tools-org.js';

const MODES = [
  ['sequential', 'Sequential (append in order)', ''],
  ['interleave', 'Interleave pages (A1, B1, A2, B2…)', ''],
  ['page-range', 'Page range from each PDF', 'e.g. 1-2, 4'],
  ['max-pages', 'Split result: max pages per PDF', 'pages, e.g. 10'],
  ['max-size', 'Split result: max size per PDF', 'MB, e.g. 5'],
];

function hint(msg) {
  const el = document.getElementById('tool-hint');
  if (el) el.textContent = msg;
}

export function openMergeDialog({ getDocs, openBytes }) {
  const docs = getDocs();
  if (docs.length < 2) { hint('Open at least two PDFs to merge (File → Open PDF(s)…).'); return; }
  document.getElementById('dm-merge-overlay')?.remove();
  const order = docs.map((d) => ({ d, on: true }));
  const ov = document.createElement('div');
  ov.id = 'dm-merge-overlay';
  ov.className = 'dm-overlay';
  ov.innerHTML = `<div class="dm-card" role="dialog" aria-modal="true" aria-label="Merge open PDFs">
    <h3>Merge Open PDFs</h3>
    <p class="dm-note">Merges the original pages of the selected documents. Use Save first to keep annotations.</p>
    <div id="dm-merge-list" class="dm-merge-list"></div>
    <label class="dm-field">Mode <select id="dm-merge-mode">${MODES.map((m) => `<option value="${m[0]}">${m[1]}</option>`).join('')}</select></label>
    <label class="dm-field" id="dm-param-row">Value <input id="dm-merge-param" type="text" /></label>
    <label class="dm-check"><input id="dm-merge-open" type="checkbox" checked /> Open merged PDF as a new tab</label>
    <label class="dm-check"><input id="dm-merge-dl" type="checkbox" /> Also download the merged file</label>
    <div class="dm-actions"><button id="dm-merge-go" class="btn btn-primary btn-sm">Merge</button><button id="dm-merge-cancel" class="btn btn-secondary btn-sm">Cancel</button></div>
  </div>`;
  document.body.appendChild(ov);
  const $ = (id) => ov.querySelector(id);
  const close = () => ov.remove();

  const renderList = () => {
    const list = $('#dm-merge-list');
    list.innerHTML = '';
    order.forEach((o, i) => {
      const row = document.createElement('div');
      row.className = 'dm-merge-row';
      row.innerHTML = `<label><input type="checkbox" ${o.on ? 'checked' : ''} /> ${i + 1}. ${o.d.name.replace(/[<>&]/g, '')}</label>
        <span><button type="button" data-mv="-1" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-mv="1" ${i === order.length - 1 ? 'disabled' : ''}>↓</button></span>`;
      row.querySelector('input').addEventListener('change', (e) => { o.on = e.target.checked; });
      row.querySelectorAll('[data-mv]').forEach((b) => b.addEventListener('click', () => {
        const j = i + Number(b.dataset.mv);
        [order[i], order[j]] = [order[j], order[i]];
        renderList();
      }));
      list.appendChild(row);
    });
  };
  renderList();

  const syncMode = () => {
    const m = MODES.find((x) => x[0] === $('#dm-merge-mode').value);
    $('#dm-param-row').style.display = m[2] ? '' : 'none';
    $('#dm-merge-param').placeholder = m[2];
    const splits = m[0] === 'max-pages' || m[0] === 'max-size';
    $('#dm-merge-open').disabled = splits;
    if (splits) { $('#dm-merge-open').checked = false; }
  };
  $('#dm-merge-mode').addEventListener('change', syncMode);
  syncMode();
  $('#dm-merge-cancel').addEventListener('click', close);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

  $('#dm-merge-go').addEventListener('click', async () => {
    const picked = order.filter((o) => o.on).map((o) => o.d);
    if (picked.length < 2) { hint('Select at least two PDFs to merge.'); return; }
    const files = picked.map((d) => ({ name: d.name, arrayBuffer: async () => d.bytes.slice().buffer }));
    const asTab = $('#dm-merge-open').checked;
    const dl = $('#dm-merge-dl').checked || !asTab;
    const mode = $('#dm-merge-mode').value;
    const param = $('#dm-merge-param').value;
    close();
    try {
      await mergePdfs(files, {
        mode, param, skipDownload: !dl,
        onResult: async (bytes, name) => { if (asTab) await openBytes(bytes, name); },
      }, hint);
    } catch (err) {
      hint(`Merge failed: ${err?.message || err}`);
    }
  });
}
