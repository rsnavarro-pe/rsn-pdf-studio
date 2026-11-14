/**
 * CAD Object Snap (OSNAP) extractor for PDF vector endpoints & corners.
 * Stores points in top-left unrotated PDF point coordinates (matching overlay.js).
 */

export async function extractPageSnapPoints(page, OPS) {
  const vp = page.getViewport({ scale: 1 });
  const pageH = vp.height;
  const opList = await page.getOperatorList();

  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const pts = [];
  const seen = new Set();

  const addPt = (x, y, kind = 'endpoint') => {
    const px = ctm[0] * x + ctm[2] * y + ctm[4];
    const py = pageH - (ctm[1] * x + ctm[3] * y + ctm[5]);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
    const key = `${kind}:${Math.round(px * 2)},${Math.round(py * 2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      pts.push({ x: px, y: py, kind });
    }
    return { x: px, y: py };
  };

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === OPS.save) {
      stack.push([...ctm]);
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    } else if (fn === OPS.transform) {
      ctm = mulMat(ctm, args);
    } else if (fn === OPS.constructPath) {
      const [ops, coords] = args;
      let idx = 0;
      let prev = null;
      for (const subOp of ops) {
        if (subOp === OPS.moveTo) {
          prev = addPt(coords[idx++], coords[idx++], 'startpoint');
        } else if (subOp === OPS.lineTo) {
          const cur = addPt(coords[idx++], coords[idx++], 'endpoint');
          if (prev && cur) {
            pts.push({ x: (prev.x + cur.x) / 2, y: (prev.y + cur.y) / 2, kind: 'midpoint' });
            pts.push({ x: cur.x, y: cur.y, kind: 'vertex' });
          }
          prev = cur;
        } else if (subOp === OPS.curveTo) {
          idx += 4;
          prev = addPt(coords[idx++], coords[idx++], 'vertex');
        } else if (subOp === OPS.curveTo2 || subOp === OPS.curveTo3) {
          idx += 2;
          prev = addPt(coords[idx++], coords[idx++], 'vertex');
        } else if (subOp === OPS.rectangle) {
          const x = coords[idx++], y = coords[idx++], w = coords[idx++], h = coords[idx++];
          const c1 = addPt(x, y, 'vertex'), c2 = addPt(x + w, y, 'vertex');
          const c3 = addPt(x + w, y + h, 'vertex'), c4 = addPt(x, y + h, 'vertex');
          addPt(x + w / 2, y + h / 2, 'center');
          if (c1 && c2) pts.push({ x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2, kind: 'midpoint' });
          if (c2 && c3) pts.push({ x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2, kind: 'midpoint' });
          if (c3 && c4) pts.push({ x: (c3.x + c4.x) / 2, y: (c3.y + c4.y) / 2, kind: 'midpoint' });
          if (c4 && c1) pts.push({ x: (c4.x + c1.x) / 2, y: (c4.y + c1.y) / 2, kind: 'midpoint' });
        }
      }
    } else if (fn === OPS.moveTo) {
      addPt(args[0], args[1], 'startpoint');
    } else if (fn === OPS.lineTo) {
      addPt(args[0], args[1], 'endpoint');
    } else if (fn === OPS.rectangle) {
      const [x, y, w, h] = args;
      addPt(x, y, 'vertex'); addPt(x + w, y, 'vertex'); addPt(x + w, y + h, 'vertex'); addPt(x, y + h, 'vertex');
      addPt(x + w / 2, y + h / 2, 'center');
    }
    if (pts.length >= 16000) break;
  }

  return pts;
}

export function findNearestSnap(pt, snapPoints, thresholdPt, snapModes = null) {
  if (!snapPoints || !snapPoints.length) return { pt, snapped: false };
  let best = null;
  let bestD2 = thresholdPt * thresholdPt;
  for (let i = 0; i < snapPoints.length; i++) {
    const sp = snapPoints[i];
    if (snapModes && sp.kind && snapModes[sp.kind] === false) continue;
    const dx = sp.x - pt.x;
    const dy = sp.y - pt.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = sp;
    }
  }
  return best ? { pt: best, snapped: true, kind: best.kind || 'endpoint' } : { pt, snapped: false };
}

function mulMat(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}
