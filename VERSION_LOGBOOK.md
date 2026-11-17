# RSN PDF Studio — Upstream Sync & Versioning Logbook

This logbook tracks bi-weekly upstream checks against the Open PDF Studio reference repository, along with all integrated features, architectural improvements, and version releases in **RSN PDF Studio**.

---

## Upstream Reference Sources

| Upstream Project | GitHub Repository | Primary Scope / Modules Monitored | Sync Cadence |
| :--- | :--- | :--- | :--- |
| **Open PDF Studio** | `OpenAEC-Foundation/open-pdf-studio` | AEC & Engineering PDF annotations, scale calibration, quantity takeoff (BOQ), multi-leader callouts/arrows, revision clouds, CAD (`.dwg` / `.dxf`) vector conversion, OSNAP vector snapping | Every 2 weeks (1st & 15th) |

---

## Release & Integration History

### `v1.8.0` — 2026-11-15 (Composite Revision Difference Engine, Digital Signature & Integrity Audit, Print to True Scale & BOQ Submittal Reports)
- **Open PDF Studio Composite Revision Difference Engine (`js/compare.js`, `#compare-bar`):**
  - Upgraded revision comparison from simple overlay to full composite difference rendering matching OpenAEC Open PDF Studio standards:
    - Red (`#dc2626`) highlighting for elements removed in Rev B (Rev A only).
    - Cyan (`#0891b2`) or Emerald (`#16a34a`) highlighting for elements added in Rev B (Rev B only).
    - Dark Slate (`#1e293b`) blending for unchanged common drawing geometry.
    - Selectable color palettes (`Red / Cyan Diff (OpenAEC)`, `Red / Green Diff`, and `Teal Rev B Overlay`).
  - Added quantitative difference metrics: live `% Area Difference` badge and modified pixel count (`#compare-diff-pill`).
- **Digital Signature & Document Integrity Audit (`js/signature.js`, `#sig-verify-modal`):**
  - Integrated digital signature validation and structural inspection:
    - Scans for `/Type /Sig`, `/ByteRange`, `/Contents`, `/SubFilter`, Signer CN, Date, Reason, and Location.
    - Computes whole-file SHA-256 integrity hash via native `crypto.subtle`.
    - Detects whether signatures cover 100% of document bytes (`VALID_INTACT`) or if post-signing revisions/bytes were appended (`REVISED_AFTER_SIGNING`).
    - Added one-click JSON Audit Certificate export (`sig-verify-export-cert`).
- **True Scale Technical Drawing Printing (`js/print-engine.js`, `#print-scale-modal`, `Ctrl+P`):**
  - Added dedicated AEC technical drawing printing engine that bypasses browser print margin distortions.
  - Supports 1:1 Actual Size (preserving calibrated engineering scales such as 1/4"=1' or 1:50) and Fit to Page with custom quality options (300 DPI vector plot quality or 150 DPI draft).
  - Bakes vector annotations/markups using `buildAnnotatedPdfBytes()` for full print fidelity.
- **AcroForm Form-Data Extraction & Submittal Takeoff Reports (`js/pdf-tools-extra.js`, `js/takeoff.js`):**
  - Added `exportFormFields()` supporting one-click JSON and CSV export of all AcroForm field values.
  - Added `exportBoqSummaryReport()` generating itemized Markdown submittal takeoff reports with trade breakdown, lineal/area/volume metrics, extended costs, and professional PE/Architect review sign-off blocks.
- **Keyboard Workflow Enhancements (`js/main.js`):**
  - Added `Ctrl+P` / `Cmd+P` shortcut for Print Drawing to True Scale.
  - Added `Ctrl+A` / `Cmd+A` shortcut in Select mode to quickly select/toggle markups on the current sheet.

### `v1.7.0` — 2026-11-14 (Open PDF Studio Drawing Ribbon, Granular OSNAP, Modify/Clipboard & AEC / NEN 1414 Symbol Palette)
- **Upstream Alignment (`https://open-pdf-studio.open-aec.com` v2026.44.8):**
  - **Expanded Drawing Ribbon (`#draw-subtoolbar`):** Structured into `SELECTION` (`Select`, `Hand`, `Region`), `DRAW` (`Line`, `Arrow`, `Polyline`, `Polygon`, `Rect`, `Ellipse`, `Arc`, `Cloud`, `Hatch`, `Star`, `Callout`, `Pen`, `Highlight`, `Eraser`), `SNAP` (`Object snap` master toggle + `Endpoint`, `Midpoint`, `Vertex`, `Start point`, `Center` checkboxes with distinct snap glyphs), `MODIFY` (`Rotate CW`, `Rotate CCW`, `Flip H`, `Flip V`, `Duplicate`), `CLIPBOARD` (`Copy`, `Paste`, `Cut`), and `COLLECTION` (`Palette`, `Save Sym`).
  - **AEC & NEN 1414 Tool Palette (`js/symbol-palette.js`, `⊞ Symbols` Tab):** Added 12 searchable, scalable (`0.5x`–`3x`) symbol libraries (`NL IFC Construction`, `NL Electrical`, `NL Construction Site`, `NL Sanitary`, `NL Kitchen`, and 7 `NL NEN 1414` fire/safety/HVAC/sprinkler libraries) plus custom symbol saving, rendered on both SVG and exported PDFs.
  - **Document & Annotations Inspector + Statistics Pill:** Added live `File`, `Pages`, `Page Size`, `Total Markups`, and `On Page` summary rows in the right Properties panel and a `Statistics` badge in the status bar.

### `v1.6.0` — 2026-11-14 (Draw Sub-Toolbar, Single/Two-Page Spreads & Vertical/Horizontal Split View)
- **New Features Integrated:**
  - **Dedicated Draw Toolbar (`#draw-subtoolbar`, `✏ Draw`):** Added full drawing and shape suite matching Open PDF Studio (`Pen`, `Highlighter`, `Eraser`, `Callout`, `Polyline`, `Polygon`, `Revision Cloud`, `Rectangle`, `Circle/Ellipse`, `Straight Line`, and `Arrow`) with full SVG rendering and native `pdf-lib` export (`js/overlay-draw.js`, `js/overlay.js`, `js/exporter.js`).
  - **Layout Options Panel (`◫ Layout` Tab & Button):**
    - **Page Layout:** Switch between **Single Page** (`📄`) and **Two Page** (`📖`) side-by-side book spread views, plus **Show first page alone** cover-page toggle (`js/layout-view.js`).
    - **Split View:** Switch between **No Split** (`▭`), **Vertical Split** (`◫` side-by-side panes), and **Horizontal Split** (`⊟` top-and-bottom panes) with dual mini-page preview cards, **Change** document/page selectors, **Swap (`⇄`)**, and **Sync scroll and zoom**.

### `v1.5.0` — 2026-11-14 (Smart In-Place PDF Text Editor & Typo Fixer)
- **New Features Integrated:**
  - **Edit Existing PDF Text (`edittext`, Shortcut `E`):** Click any text in an open PDF to automatically detect its font family (`Helvetica` / `Courier` / `Times`), bold/italic weight, exact point size (`pt`), ink color, paper background color, and text opacity (`js/text-edit.js`).
  - **Seamless In-Place Masking & Floating Editor:** Launches an inline floating input directly over the clicked text span, masks the original typo with the sampled paper background color, and renders the edited text in the matched font, size, color, and opacity on both the live SVG canvas (`js/overlay-draw.js`) and exported PDFs (`js/exporter.js`).
  - **Text Opacity Inspector Control:** Added `#prop-text-opacity` (`10%–100%`) in the Properties & Style panel (`index.html`, `js/markup-props.js`).

### `v1.4.0` — 2026-11-14 (Baseline Audit, Hardening & Blank PDF Creator)
- **Upstream Alignment:** Full parity audit against Open PDF Studio AEC tools.
- **New Features Integrated:**
  - **Create Blank PDF (`CREATE PDF`):** Added support for Letter, Legal, Tabloid (11×17), A4, A3, ARCH D (24×36), and ARCH E (36×48) sheets in Portrait/Landscape with Plain, Engineering Grid, and Lined Note templates (`js/tools-ui.js`, `js/workbench-ui.js`).
  - **Smooth Region Zoom & Zoom History:** Added marquee region zoom (`Z` or `Shift+Drag`), 60fps ease-out cubic zoom-and-pan transitions (`animateZoomTransition`), Zoom Back stack (`#btn-zoom-back`), Fit Whole Page, and offscreen double-buffered rendering (`js/pdf-engine.js`).
  - **Collapsible & Pinnable Properties Drawer:** Added collapse/expand toggle (`»` / `« PROPERTIES`) and pin state persistence for the right inspector panel (`js/workbench-ui.js`).
  - **Drawing-Aware Find & Auto-OCR (`Ctrl+F`):** Added spatial bounding-box highlights on canvas, markup text search, and Tesseract.js OCR fallback for scanned/SHX drawings (`js/search.js`).
  - **Multi-Leader Callouts & Arrows:** Added `+ Leader` support so a single callout or arrow can point to multiple drawing elements (`js/overlay.js`, `js/overlay-draw.js`, `js/exporter.js`).
- **Hardening & Bug Fixes (`bcf74fb`):**
  - Fixed `hexToRgb` parameter handling for Highlight and Sticky Note PDF exports in `js/exporter.js`.
  - Added custom rectangle fill/opacity and arrowhead style (`closed`, `open`, `dot`, `slash`, `both`) rendering to `exportAnnotatedPdf()`.
  - Protected `state.pdfBytes` against `ArrayBuffer` detachment across all PDF/CAD tools using `.slice().buffer`.
  - Fixed order-independent cutout area & volume (`CY` / `m³`) deductions in `js/takeoff.js` and `js/ui.js`.
  - Verified all 33 ES modules (`node --check`), DOM ID bindings (`0` missing IDs), and 10 automated test suites.

---

## Bi-Weekly Upstream Sync Log

### Sync #2 — 2026-11-15 (`v1.8.0` Bi-Weekly Sync: Composite Revision Diff, Signature Verification, Print to Scale & BOQ Reporting)
- **Sync Date:** `2026-11-15`
- **Target Version:** `v1.8.0`
- **Upstream Changes Detected (`OpenAEC-Foundation/open-pdf-studio`):**
  - **`OpenAEC-Foundation/open-pdf-studio` (`v2026.45.0`):** Dual-mode revision comparison (side-by-side and color-coded overlay difference with change tracking), 1:1 true scale technical drawing printing without margin distortion, takeoff BOQ reporting.
- **Features / Fixes Integrated into RSN PDF Studio:**
  - Full composite revision difference engine (`js/compare.js`) with Red/Cyan and Red/Green diff palettes, unchanged geometry slate blending, and live % area difference / pixel count readout.
  - Digital signature verification and security dictionary auditor (`js/signature.js`, `#sig-verify-modal`): `/ByteRange` coverage, SHA-256 fingerprint, post-signing modification detection, audit certificate JSON export.
  - True scale technical drawing print engine (`js/print-engine.js`, `#print-scale-modal`, `Ctrl+P`) rendering 300 DPI vector plot quality at 1:1 scale with annotations baked in.
  - AcroForm form data export to JSON & CSV (`js/pdf-tools-extra.js`).
  - Itemized Markdown BOQ Submittal Takeoff Report generator (`js/takeoff.js`) with professional certification sign-off block.
- **Verification & Test Suite Status:**
  - Verified all 39 ES modules with `node --check` (`0` syntax errors).
  - Verified all DOM ID bindings (`0` missing static IDs).
  - All modular source files maintained under strict line limits (<250 lines per modular engine, <300 lines per existing UI module).

---

### Sync #1 — 2026-11-14 (`v1.4.0` Verification & Upstream Baseline)
- **Sync Date:** `2026-11-14`
- **Target Version:** `v1.4.0`
- **Upstream Changes Detected:**
  - **`OpenAEC-Foundation/open-pdf-studio` (`v2026.45.0`):** CAD vector DWG/DXF import & export with scale preservation, drawing-aware OCR text search, AEC callouts/stamps/clouds, and direct plan scaling.
- **Features / Fixes Integrated into RSN PDF Studio:**
  - Non-destructive `ArrayBuffer` cloning (`.slice().buffer`) across all PDF/CAD tools so underlying document bytes are never mutated or detached in memory.
  - Full 5-category dropdown workbench header (`All tools ▾`, `Edit ▾`, `Convert ▾`, `E-Sign ▾`, `Measure & CAD ▾`), collapsible/pinnable Properties drawer, smooth 60fps region zoom, Blank PDF creator (including ARCH D & ARCH E engineering sheets), and multi-leader callouts/arrows.
- **Verification & Test Suite Status:** All 33 ES modules (`node --check`) and 10 automated test suites passed.

---

> **Automated Check Template (Appended Every 2 Weeks on the 1st & 15th):**
> - **Sync Date:** `YYYY-MM-DD`
> - **Target Version:** `v1.x.y`
> - **Upstream Changes Detected (`OpenAEC-Foundation/open-pdf-studio`):**
> - **Features / Fixes Integrated into RSN PDF Studio:**
> - **Verification & Test Suite Status:**
