import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Classroom } from '../types.js';

/**
 * Generate an interactive knowledge graph HTML file from a classroom structure.
 *
 * The graph is a force-directed SVG rendered entirely in vanilla JS (no deps).
 * Nodes: course root → scenes → key points.
 * Edges: flow edges connect scenes in sequence; concept edges connect scenes to key points.
 */
export async function generateGraph(
  classroom: Classroom,
  outputPath: string
): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log('🕸️  Export: Generating Knowledge Graph');
  console.log('='.repeat(50));

  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // ── Build graph data ──────────────────────────────────────────────────────
  type NodeType = 'root' | 'scene' | 'point';
  interface GraphNode {
    id: string;
    label: string;
    type: NodeType;
    sceneType?: string;
  }
  interface GraphEdge {
    source: string;
    target: string;
    kind: 'flow' | 'concept';
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const rootId = 'root';
  nodes.push({ id: rootId, label: classroom.title, type: 'root' });

  for (let si = 0; si < classroom.scenes.length; si++) {
    const scene = classroom.scenes[si];
    const sceneId = `scene_${si}`;
    nodes.push({ id: sceneId, label: scene.title, type: 'scene', sceneType: scene.type });
    edges.push({ source: rootId, target: sceneId, kind: 'flow' });

    // Sequential flow edges between consecutive scenes
    if (si > 0) {
      edges.push({ source: `scene_${si - 1}`, target: sceneId, kind: 'flow' });
    }

    // Key point nodes
    for (let ki = 0; ki < (scene.keyPoints ?? []).length; ki++) {
      const pointId = `point_${si}_${ki}`;
      const label = scene.keyPoints[ki];
      nodes.push({ id: pointId, label, type: 'point' });
      edges.push({ source: sceneId, target: pointId, kind: 'concept' });
    }
  }

  const graphData = { nodes, edges, title: classroom.title };

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${classroom.title} — Knowledge Graph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      padding: 14px 24px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    header h1 { font-size: 18px; font-weight: 600; color: #f1f5f9; }
    header span { font-size: 13px; color: #94a3b8; }
    .legend {
      display: flex;
      gap: 20px;
      margin-left: auto;
      font-size: 12px;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot {
      width: 12px; height: 12px; border-radius: 50%;
    }
    #canvas-wrap {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
    }
    #canvas-wrap:active { cursor: grabbing; }
    svg { width: 100%; height: 100%; }

    .node circle { stroke-width: 2; transition: r 0.15s; }
    .node:hover circle { stroke-width: 3; }
    .node text {
      pointer-events: none;
      font-size: 11px;
      fill: #e2e8f0;
      text-anchor: middle;
      dominant-baseline: central;
    }

    .link {
      stroke-opacity: 0.55;
      fill: none;
    }
    .link.flow { stroke: #3b82f6; stroke-width: 1.5; }
    .link.concept { stroke: #8b5cf6; stroke-width: 1; stroke-dasharray: 4,3; }

    #tooltip {
      position: absolute;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      max-width: 260px;
      pointer-events: none;
      display: none;
      z-index: 10;
      line-height: 1.5;
    }
    #tooltip strong { color: #f1f5f9; display: block; margin-bottom: 2px; }
    #tooltip em { color: #94a3b8; font-style: normal; font-size: 12px; }

    .controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .controls button {
      width: 32px; height: 32px;
      background: #1e293b;
      border: 1px solid #334155;
      color: #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .controls button:hover { background: #334155; }
  </style>
</head>
<body>
  <header>
    <h1>🕸️ ${classroom.title}</h1>
    <span>知識圖譜 · ${classroom.scenes.length} 場景 · ${nodes.filter(n => n.type === 'point').length} 個知識點</span>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>課程主題</div>
      <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>場景</div>
      <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div>知識點</div>
    </div>
  </header>
  <div id="canvas-wrap">
    <svg id="svg">
      <defs>
        <marker id="arrow-flow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" opacity="0.7"/>
        </marker>
        <marker id="arrow-concept" markerWidth="6" markerHeight="6" refX="5" refY="2.5" orient="auto">
          <path d="M0,0 L0,5 L6,2.5 z" fill="#8b5cf6" opacity="0.7"/>
        </marker>
      </defs>
      <g id="g-links"></g>
      <g id="g-nodes"></g>
    </svg>
    <div id="tooltip"></div>
    <div class="controls">
      <button id="btn-in" title="放大">+</button>
      <button id="btn-out" title="縮小">−</button>
      <button id="btn-fit" title="重置" style="font-size:13px">⟳</button>
    </div>
  </div>

  <script>
  (function() {
    const DATA = ${JSON.stringify(graphData)};

    // ── Node colors & sizes ─────────────────────────────────────────────────
    function nodeColor(n) {
      if (n.type === 'root')  return '#f59e0b';
      if (n.type === 'scene') return n.sceneType === 'quiz' ? '#10b981' : '#3b82f6';
      return '#8b5cf6';
    }
    function nodeRadius(n) {
      if (n.type === 'root')  return 38;
      if (n.type === 'scene') return 22;
      return 14;
    }

    // ── Force simulation (spring + repulsion + gravity) ─────────────────────
    const W = window.innerWidth;
    const H = window.innerHeight - 56; // minus header

    const nodes = DATA.nodes.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 400,
      y: H / 2 + (Math.random() - 0.5) * 300,
      vx: 0, vy: 0,
    }));

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    const edges = DATA.edges.map(e => ({
      ...e,
      source: nodeMap[e.source],
      target: nodeMap[e.target],
    }));

    // Place root at center, scenes in a circle
    const sceneNodes = nodes.filter(n => n.type === 'scene');
    sceneNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / sceneNodes.length - Math.PI / 2;
      const r = Math.min(W, H) * 0.28;
      n.x = W / 2 + Math.cos(angle) * r;
      n.y = H / 2 + Math.sin(angle) * r;
    });
    nodes.filter(n => n.type === 'root').forEach(n => { n.x = W / 2; n.y = H / 2; });

    // Run simulation
    const ITERATIONS = 300;
    const SPRING_LEN = { flow: 160, concept: 80 };
    const SPRING_K = { flow: 0.04, concept: 0.06 };
    const REPULSE_K = 3000;
    const DAMP = 0.85;
    const GRAVITY = 0.01;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      nodes.forEach(n => { n.fx = 0; n.fy = 0; });

      // Gravity toward center
      nodes.forEach(n => {
        n.fx += (W / 2 - n.x) * GRAVITY;
        n.fy += (H / 2 - n.y) * GRAVITY;
      });

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = REPULSE_K / (dist * dist);
          const fx = (dx / dist) * f, fy = (dy / dist) * f;
          a.fx -= fx; a.fy -= fy;
          b.fx += fx; b.fy += fy;
        }
      }

      // Spring (edges)
      edges.forEach(e => {
        const s = e.source, t = e.target;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const len = SPRING_LEN[e.kind] ?? 120;
        const f = (dist - len) * (SPRING_K[e.kind] ?? 0.04);
        const fx = (dx / dist) * f, fy = (dy / dist) * f;
        s.fx += fx; s.fy += fy;
        t.fx -= fx; t.fy -= fy;
      });

      // Integrate
      nodes.forEach(n => {
        n.vx = (n.vx + n.fx) * DAMP;
        n.vy = (n.vy + n.fy) * DAMP;
        n.x += n.vx;
        n.y += n.vy;
      });
    }

    // ── Render ──────────────────────────────────────────────────────────────
    const svg = document.getElementById('svg');
    const gLinks = document.getElementById('g-links');
    const gNodes = document.getElementById('g-nodes');

    // Draw edges
    edges.forEach(e => {
      const s = e.source, t = e.target;
      const dx = t.x - s.x, dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const r = nodeRadius(t);
      // Shorten line so arrow tip doesn't overlap node
      const tx = t.x - (dx / dist) * (r + 6);
      const ty = t.y - (dy / dist) * (r + 6);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'link ' + e.kind);
      line.setAttribute('x1', s.x);
      line.setAttribute('y1', s.y);
      line.setAttribute('x2', tx);
      line.setAttribute('y2', ty);
      line.setAttribute('marker-end', 'url(#arrow-' + e.kind + ')');
      gLinks.appendChild(line);
    });

    // Draw nodes
    nodes.forEach(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'node');
      g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
      g.style.cursor = 'pointer';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const r = nodeRadius(n);
      circle.setAttribute('r', r);
      circle.setAttribute('fill', nodeColor(n));
      circle.setAttribute('stroke', '#1e293b');
      g.appendChild(circle);

      // Label (truncated)
      const maxChars = n.type === 'root' ? 8 : (n.type === 'scene' ? 6 : 5);
      const label = n.label.length > maxChars ? n.label.slice(0, maxChars) + '…' : n.label;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = label;
      text.style.fontSize = n.type === 'root' ? '12px' : (n.type === 'scene' ? '10px' : '9px');
      g.appendChild(text);

      // Tooltip
      const tooltip = document.getElementById('tooltip');
      g.addEventListener('mouseenter', (ev) => {
        tooltip.style.display = 'block';
        const typeLabel = n.type === 'root' ? '課程主題' : (n.type === 'scene' ? ('場景 · ' + (n.sceneType || 'slide')) : '知識點');
        tooltip.innerHTML = '<strong>' + n.label + '</strong><em>' + typeLabel + '</em>';
      });
      g.addEventListener('mousemove', (ev) => {
        const wrap = document.getElementById('canvas-wrap');
        const rect = wrap.getBoundingClientRect();
        let tx = ev.clientX - rect.left + 14;
        let ty = ev.clientY - rect.top - 10;
        if (tx + 270 > wrap.clientWidth) tx -= 280;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
      });
      g.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      gNodes.appendChild(g);
    });

    // ── Pan & Zoom ───────────────────────────────────────────────────────────
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, lastX = 0, lastY = 0;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Move existing groups into transform group
    g.id = 'viewport';
    svg.appendChild(g);
    g.appendChild(gLinks);
    g.appendChild(gNodes);

    function applyTransform() {
      g.setAttribute('transform', 'translate(' + tx + ',' + ty + ') scale(' + scale + ')');
    }

    const wrap = document.getElementById('canvas-wrap');
    wrap.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      applyTransform();
    });
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      tx = mx + (tx - mx) * factor;
      ty = my + (ty - my) * factor;
      scale *= factor;
      applyTransform();
    }, { passive: false });

    document.getElementById('btn-in').onclick = () => { scale *= 1.2; applyTransform(); };
    document.getElementById('btn-out').onclick = () => { scale *= 0.8; applyTransform(); };
    document.getElementById('btn-fit').onclick = () => { scale = 1; tx = 0; ty = 0; applyTransform(); };
  })();
  </script>
</body>
</html>`;

  writeFileSync(outputPath, html);
  console.log(`✅ Knowledge graph saved: ${outputPath}`);
}
