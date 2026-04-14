'use strict';
/**
 * tools/pptx-renderer.js
 *
 * Universal JSON → PPTX renderer for AI-agent generated course content.
 *
 * Usage:
 *   node tools/pptx-renderer.js <content.json> [output-dir]
 *
 * Schema: content/<topic>.json
 *   {
 *     meta: { title, subtitle, language, accent },
 *     slides: [ { type, title, ... } ]
 *   }
 *
 * Slide types:
 *   cover | overview | concept | table | technique | examples | quiz | pitfalls | summary
 */

const PptxGenJS = require('../packages/pptxgenjs/dist/pptxgen.cjs.js');
const fs = require('fs');
const path = require('path');

// ─── CLI ────────────────────────────────────────────────────────────────────
const contentPath = process.argv[2];
if (!contentPath) {
  console.error('Usage: node tools/pptx-renderer.js <content.json> [output-dir]');
  process.exit(1);
}

const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const { meta, slides } = content;

const slug = path.basename(contentPath, '.json');
const outDir = process.argv[3] || path.join(__dirname, '..', 'output', slug);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const fileName = path.join(outDir, `${slug}.pptx`);

// ─── Design Tokens ──────────────────────────────────────────────────────────
const COLOR = {
  blue:   '2563EB',
  teal:   '0D9488',
  orange: 'EA580C',
  green:  '16A34A',
  red:    'DC2626',
  yellow: 'D97706',
  navy:   '1E3A5F',
  // Backgrounds
  bg:     'F8FAFC',   // slide background
  bgCard: 'FFFFFF',   // card background
  bgMuted:'F1F5F9',   // muted section bg
  // Text
  textPrimary:   '0F172A',
  textSecondary: '475569',
  textMuted:     '94A3B8',
  white:         'FFFFFF',
  border:        'E2E8F0',
};

// Map accent name → hex
function accentColor(name) {
  return COLOR[name] || COLOR.blue;
}

// Lightened version of accent for card backgrounds
const ACCENT_BG = {
  blue:   'EFF6FF', teal:   'F0FDFA', orange: 'FFF7ED',
  green:  'F0FDF4', red:    'FFF1F2', yellow: 'FFFDE7',
  navy:   'EFF6FF',
};
function accentBg(name) { return ACCENT_BG[name] || ACCENT_BG.blue; }

// ─── PptxGenJS instance ──────────────────────────────────────────────────────
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';  // 10" × 7.5"

// ─── Drawing Helpers ────────────────────────────────────────────────────────

/** Horizontal rule */
function rule(s, y, color = COLOR.border, x = 0.35, w = 9.3) {
  s.addShape(pptx.ShapeType.line, {
    x, y, w, h: 0, line: { color, width: 1 },
  });
}

/** Rounded-rectangle card */
function card(s, x, y, w, h, { fill = COLOR.bgCard, border = COLOR.border, shadow = true } = {}) {
  // Fake shadow (offset grey rect)
  if (shadow) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.04, y: y + 0.04, w, h,
      fill: { color: 'D1D5DB' },
      line: { color: 'D1D5DB' },
    });
  }
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: border, width: 1 },
  });
}

/** Left-bar side panel */
function sidePanel(s, text, x, y, w, h, accent = 'blue') {
  const bar = accentColor(accent);
  const bg  = accentBg(accent);
  s.addShape(pptx.ShapeType.rect, { x, y, w: 0.07, h, fill: { color: bar } });
  s.addShape(pptx.ShapeType.rect, {
    x: x + 0.07, y, w: w - 0.07, h,
    fill: { color: bg }, line: { color: bar },
  });
  s.addText(text, {
    x: x + 0.22, y: y + 0.1, w: w - 0.35, h: h - 0.2,
    fontSize: 12.5, color: COLOR.textPrimary, wrap: true,
    lineSpacing: 19, valign: 'top',
  });
}

/** Formula box */
function formulaBox(s, formula, x, y, w, h, accent = 'blue') {
  const bg  = accentBg(accent);
  const fg  = accentColor(accent);
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: bg },
    line: { color: fg, width: 1.5 },
  });
  s.addText(formula, {
    x: x + 0.12, y, w: w - 0.24, h,
    fontSize: 15, bold: true, color: fg,
    fontFace: 'Courier New', align: 'center', valign: 'middle',
  });
}

/** Section label (pill badge) */
function badge(s, text, x, y, accent = 'blue') {
  const c = accentColor(accent);
  s.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.55, h: 0.34,
    fill: { color: c }, line: { color: c },
  });
  s.addText(text, {
    x, y, w: 1.55, h: 0.34,
    fontSize: 11, bold: true, color: COLOR.white,
    align: 'center', valign: 'middle',
  });
}

/**
 * Slide header: left accent stripe + title area
 * Returns the y value where content should start
 */
function addHeader(s, title, subtitle, accent = 'blue') {
  const accentHex = accentColor(accent);

  // Background
  s.background = { color: COLOR.bg };

  // Top slim accent band
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 1.1,
    fill: { color: COLOR.navy },
  });
  // Accent stripe (left edge, full height)
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.18, h: 7.5,
    fill: { color: accentHex },
  });
  // Accent dot on header right
  s.addShape(pptx.ShapeType.ellipse, {
    x: 9.0, y: 0.15, w: 0.8, h: 0.8,
    fill: { color: accentHex },
    line: { color: accentHex },
  });

  // Title
  s.addText(title, {
    x: 0.35, y: 0.1, w: 8.5, h: 0.55,
    fontSize: 26, bold: true, color: COLOR.white,
    fontFace: 'Arial',
  });
  // Subtitle
  if (subtitle) {
    s.addText(subtitle, {
      x: 0.35, y: 0.68, w: 8.5, h: 0.34,
      fontSize: 13, color: 'B0C4DE', italic: true,
    });
  }
  // Footer
  s.addText(`${meta.title}  •  ${meta.subtitle}`, {
    x: 0.35, y: 7.12, w: 9.3, h: 0.24,
    fontSize: 9, color: COLOR.textMuted, align: 'right',
  });

  return 1.25; // content start y
}

// ─── Slide Renderers ────────────────────────────────────────────────────────

function renderCover(s, slide) {
  s.background = { color: COLOR.navy };

  // Decorative right panel
  s.addShape(pptx.ShapeType.rect, { x: 6.8, y: 0, w: 3.2, h: 7.5, fill: { color: '162D4A' } });
  // Decorative circle
  s.addShape(pptx.ShapeType.ellipse, { x: 7.2, y: -0.5, w: 3.5, h: 3.5, fill: { color: '1A3557' }, line: { color: '1A3557' } });

  // Big integral symbol as decorative element
  s.addText('∫', {
    x: 6.9, y: 0.0, w: 3.0, h: 7.5,
    fontSize: 280, color: '1F4272', align: 'center', valign: 'middle',
    fontFace: 'Times New Roman',
  });

  // Badge
  if (slide.badge) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 1.1, w: 1.8, h: 0.36,
      fill: { color: COLOR.blue }, line: { color: COLOR.blue },
    });
    s.addText(slide.badge, {
      x: 0.5, y: 1.1, w: 1.8, h: 0.36,
      fontSize: 12, bold: true, color: COLOR.white, align: 'center', valign: 'middle',
    });
  }

  // Main title
  s.addText(slide.title, {
    x: 0.5, y: 1.6, w: 6.0, h: 1.3,
    fontSize: 54, bold: true, color: COLOR.white,
    fontFace: 'Arial',
  });

  // Subtitle
  s.addText(slide.subtitle, {
    x: 0.5, y: 3.0, w: 5.8, h: 0.55,
    fontSize: 16, color: 'B0C4DE', italic: true,
  });

  // Accent line
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.65, w: 2.5, h: 0.05,
    fill: { color: COLOR.blue },
  });

  // Highlights grid
  if (slide.highlights) {
    slide.highlights.forEach((h, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      s.addText('✦ ' + h, {
        x: 0.5 + col * 2.95, y: 3.85 + row * 0.48, w: 2.8, h: 0.42,
        fontSize: 12.5, color: '7EC8E3',
      });
    });
  }
}

function renderOverview(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'blue');

  const cards = slide.cards || [];
  cards.forEach((c, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const bx  = 0.28 + col * 2.38;
    const by  = startY + 0.1 + row * 2.78;
    const ac  = accentColor(c.accent || 'blue');

    // Card body
    s.addShape(pptx.ShapeType.roundRect, {
      x: bx + 0.05, y: by + 0.05, w: 2.18, h: 2.55,
      fill: { color: 'C0C0C0' }, line: { color: 'C0C0C0' },
    });
    s.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: by, w: 2.18, h: 2.55,
      fill: { color: ac }, line: { color: ac },
    });
    // Number
    s.addText(c.num, {
      x: bx, y: by + 0.05, w: 2.18, h: 0.75,
      fontSize: 34, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });
    // Top separator
    s.addShape(pptx.ShapeType.rect, {
      x: bx + 0.2, y: by + 0.82, w: 1.78, h: 0.04,
      fill: { color: 'FFFFFF' },
    });
    // Title
    s.addText(c.title, {
      x: bx + 0.08, y: by + 0.92, w: 2.02, h: 0.75,
      fontSize: 13.5, bold: true, color: COLOR.white,
      align: 'center', wrap: true,
    });
    // Sub
    s.addText(c.sub, {
      x: bx + 0.08, y: by + 1.72, w: 2.02, h: 0.72,
      fontSize: 10, color: 'D4E6F1',
      align: 'center', italic: true, wrap: true,
    });
  });
}

function renderConcept(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'blue');
  const body   = slide.body || {};

  let curY = startY + 0.1;

  // Banner formula
  if (body.banner) {
    formulaBox(s, body.banner.formula, 0.3, curY, 9.4, 0.7, body.banner.accent || slide.accent);
    curY += 0.82;
  }

  // Two-section layout
  if (body.twoSection) {
    body.twoSection.forEach((sec, i) => {
      const sx = 0.3 + i * 4.85;
      const sw = 4.5;
      s.addText(sec.sectionTitle, {
        x: sx, y: curY, w: sw, h: 0.38,
        fontSize: 13, bold: true, color: COLOR.navy,
      });
      formulaBox(s, sec.formula, sx, curY + 0.42, sw, 0.65, sec.accent || slide.accent);
      s.addText(sec.explanation, {
        x: sx, y: curY + 1.12, w: sw, h: 1.3,
        fontSize: 11.5, color: COLOR.textSecondary,
        wrap: true, lineSpacing: 18,
      });
    });
    curY += 2.6;
  }

  // Sidebar + right column
  const hasSidebar = body.sidebar;
  const rightX = hasSidebar ? 4.85 : 0.3;
  const rightW = hasSidebar ? 4.85 : 9.4;

  if (hasSidebar) {
    const panelH = Math.min(5.2 - curY + startY + 0.1, 3.2);
    sidePanel(s, body.sidebar, 0.3, curY, 4.45, panelH, body.sidebarAccent || slide.accent);
  }

  // Worked examples (right side)
  if (body.examples) {
    body.examples.forEach((ex, i) => {
      const ey = curY + i * 0.9;
      formulaBox(s, ex.q, rightX, ey, 1.95, 0.62, 'blue');
      s.addText('→', { x: rightX + 2.0, y: ey, w: 0.45, h: 0.62, fontSize: 18, color: accentColor(slide.accent), align: 'center', valign: 'middle' });
      formulaBox(s, ex.a, rightX + 2.48, ey, 2.2, 0.62, slide.accent || 'blue');
      s.addText(ex.check, { x: rightX, y: ey + 0.64, w: rightW - 0.1, h: 0.24, fontSize: 9.5, color: COLOR.textMuted, italic: true });
    });
  }

  // Steps list (right side)
  if (body.steps) {
    s.addText(body.steps.title, {
      x: rightX, y: curY, w: rightW - 0.1, h: 0.36,
      fontSize: 13, bold: true, color: COLOR.navy,
    });
    body.steps.items.forEach((item, i) => {
      const isLast = i === body.steps.items.length - 1;
      const isHL   = body.steps.highlightLast && isLast;
      s.addShape(pptx.ShapeType.rect, {
        x: rightX, y: curY + 0.42 + i * 0.56,
        w: rightW - 0.1, h: 0.51,
        fill: { color: isHL ? accentBg(slide.accent) : (i % 2 === 0 ? COLOR.bgMuted : COLOR.bgCard) },
        line: { color: COLOR.border, width: 0.5 },
      });
      s.addText(item, {
        x: rightX + 0.12, y: curY + 0.42 + i * 0.56,
        w: rightW - 0.35, h: 0.51,
        fontSize: 12.5, bold: isHL, fontFace: 'Courier New',
        color: isHL ? accentColor(slide.accent) : COLOR.textPrimary,
        valign: 'middle',
      });
    });
  }

  // Formulas list (right side, for "what is integral" slide)
  if (body.formulas) {
    body.formulas.forEach((f, i) => {
      const fy = curY + i * 1.6;
      s.addText(f.label, {
        x: rightX, y: fy, w: rightW - 0.1, h: 0.36,
        fontSize: 12, bold: true, color: COLOR.navy,
      });
      formulaBox(s, f.formula, rightX, fy + 0.4, rightW - 0.1, 0.62, f.accent || slide.accent);
      s.addText(f.note, {
        x: rightX, y: fy + 1.08, w: rightW - 0.1, h: 0.42,
        fontSize: 11, color: COLOR.textSecondary, italic: true,
      });
    });
  }

  // Warning strip
  if (body.warning) {
    s.addShape(pptx.ShapeType.rect, {
      x: 0.3, y: 6.45, w: 9.4, h: 0.56,
      fill: { color: 'FFFDE7' }, line: { color: COLOR.yellow, width: 1 },
    });
    s.addText('⚠️  ' + body.warning, {
      x: 0.5, y: 6.45, w: 9.1, h: 0.56,
      fontSize: 13, bold: true, color: '78350F', valign: 'middle',
    });
  }
}

function renderTable(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'blue');
  const tbl    = slide.table;
  const cols   = tbl.headers;

  // Column widths
  const colW = [1.4, 1.8, 3.0, 1.7];
  const colX = [0.28];
  for (let k = 1; k < colW.length; k++) colX.push(colX[k-1] + colW[k-1]);

  const rowH = 0.48;
  const rows = [cols, ...tbl.rows];

  rows.forEach((row, ri) => {
    const isHeader = ri === 0;
    const even     = ri % 2 === 0;
    row.forEach((cell, ci) => {
      s.addShape(pptx.ShapeType.rect, {
        x: colX[ci], y: startY + ri * rowH,
        w: colW[ci], h: rowH,
        fill: { color: isHeader ? COLOR.navy : (even ? 'EFF6FF' : COLOR.bgCard) },
        line: { color: COLOR.border, width: 0.5 },
      });
      s.addText(cell, {
        x: colX[ci] + 0.06, y: startY + ri * rowH,
        w: colW[ci] - 0.12, h: rowH,
        fontSize: isHeader ? 11 : 11.5,
        bold: isHeader,
        color: isHeader ? COLOR.white : (ci === 2 ? accentColor(slide.accent || 'teal') : COLOR.textPrimary),
        fontFace: (ci === 1 || ci === 2) && !isHeader ? 'Courier New' : 'Arial',
        align: ci === 0 ? 'left' : 'center',
        valign: 'middle',
        wrap: true,
      });
    });
  });
}

function renderTechnique(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'orange');
  const body   = slide.body || {};

  let curY = startY + 0.05;

  // Banner formula
  if (body.banner) {
    formulaBox(s, body.banner.formula, 0.3, curY, 9.4, 0.68, body.banner.accent || slide.accent);
    curY += 0.8;
  }

  // Left: steps OR LIATE
  const leftX = 0.3, leftW = 4.3;

  if (body.steps) {
    s.addText(body.steps.title, {
      x: leftX, y: curY, w: leftW, h: 0.36,
      fontSize: 13, bold: true, color: COLOR.navy,
    });
    body.steps.items.forEach((item, i) => {
      const ac = accentColor(body.steps.accent || slide.accent);
      s.addShape(pptx.ShapeType.rect, {
        x: leftX, y: curY + 0.42 + i * 0.65,
        w: leftW, h: 0.6,
        fill: { color: i % 2 === 0 ? accentBg(slide.accent) : COLOR.bgCard },
        line: { color: COLOR.border, width: 0.5 },
      });
      s.addShape(pptx.ShapeType.rect, {
        x: leftX, y: curY + 0.42 + i * 0.65,
        w: 0.06, h: 0.6,
        fill: { color: ac },
      });
      s.addText(item, {
        x: leftX + 0.18, y: curY + 0.42 + i * 0.65,
        w: leftW - 0.25, h: 0.6,
        fontSize: 12.5, color: COLOR.textPrimary, valign: 'middle',
      });
    });
  }

  if (body.liate) {
    s.addText(body.liate.title, {
      x: leftX, y: curY, w: leftW, h: 0.36,
      fontSize: 13, bold: true, color: COLOR.navy,
    });
    body.liate.items.forEach((item, i) => {
      const ac = accentColor(item.accent);
      const iy = curY + 0.44 + i * 0.6;
      s.addShape(pptx.ShapeType.roundRect, {
        x: leftX, y: iy, w: 0.46, h: 0.52,
        fill: { color: ac }, line: { color: ac },
      });
      s.addText(item.letter, {
        x: leftX, y: iy, w: 0.46, h: 0.52,
        fontSize: 18, bold: true, color: COLOR.white, align: 'center', valign: 'middle',
      });
      s.addText(item.eng, {
        x: leftX + 0.52, y: iy, w: 1.7, h: 0.52,
        fontSize: 11.5, bold: true, color: COLOR.textPrimary, valign: 'middle',
      });
      s.addText(item.chi, {
        x: leftX + 2.24, y: iy, w: 2.0, h: 0.52,
        fontSize: 11, color: COLOR.textSecondary, valign: 'middle', italic: true,
      });
    });
    if (body.liate.note) {
      const noteY = curY + 0.44 + body.liate.items.length * 0.6;
      s.addText('↑ ' + body.liate.note, {
        x: leftX, y: noteY, w: leftW, h: 0.32,
        fontSize: 10, color: COLOR.textMuted, italic: true,
      });
    }
  }

  // Right: worked example
  if (body.workedExample) {
    const wx = 5.0, ww = 4.6;
    const ex = body.workedExample;
    s.addText(ex.title, {
      x: wx, y: curY, w: ww, h: 0.36,
      fontSize: 13, bold: true, color: COLOR.navy,
    });
    ex.steps.forEach((step, i) => {
      const isLast = i === ex.steps.length - 1;
      s.addShape(pptx.ShapeType.rect, {
        x: wx, y: curY + 0.42 + i * 0.6,
        w: ww, h: 0.55,
        fill: { color: isLast ? accentBg(slide.accent) : (i % 2 === 0 ? COLOR.bgMuted : COLOR.bgCard) },
        line: { color: COLOR.border, width: 0.5 },
      });
      s.addText(step, {
        x: wx + 0.12, y: curY + 0.42 + i * 0.6,
        w: ww - 0.2, h: 0.55,
        fontSize: 12, fontFace: 'Courier New',
        color: isLast ? accentColor(slide.accent) : COLOR.textPrimary,
        bold: isLast, valign: 'middle',
      });
    });
  }

  // Tip bar at bottom
  if (body.tip) {
    s.addShape(pptx.ShapeType.rect, {
      x: 0.3, y: 6.45, w: 9.4, h: 0.58,
      fill: { color: accentBg(slide.accent) },
      line: { color: accentColor(slide.accent), width: 1 },
    });
    s.addText('💡  ' + body.tip, {
      x: 0.48, y: 6.45, w: 9.0, h: 0.58,
      fontSize: 12.5, color: accentColor(slide.accent), valign: 'middle',
    });
  }
}

function renderExamples(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'green');
  const probs  = slide.problems || [];

  probs.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx  = 0.28 + col * 4.85;
    const by  = startY + 0.1 + row * 2.95;
    const ac  = p.accent || slide.accent || 'blue';

    card(s, bx, by, 4.5, 2.72);

    badge(s, p.tag, bx + 2.72, by + 0.1, ac);

    s.addText(p.id, {
      x: bx + 0.14, y: by + 0.1, w: 0.6, h: 0.34,
      fontSize: 13, bold: true, color: COLOR.textMuted,
    });

    // Question
    s.addText(p.question, {
      x: bx + 0.14, y: by + 0.5, w: 4.2, h: 0.72,
      fontSize: 15, bold: true, color: COLOR.textPrimary,
      fontFace: 'Courier New', wrap: true,
    });

    rule(s, by + 1.3, COLOR.border, bx + 0.1, 4.3);

    // Answer
    s.addText('答：', {
      x: bx + 0.14, y: by + 1.36, w: 0.6, h: 0.35,
      fontSize: 11, bold: true, color: accentColor(ac),
    });
    s.addText(p.answer, {
      x: bx + 0.72, y: by + 1.36, w: 3.65, h: 0.55,
      fontSize: 11.5, color: COLOR.textPrimary,
      fontFace: 'Courier New', wrap: true,
    });

    if (p.hint) {
      s.addText('💡 ' + p.hint, {
        x: bx + 0.14, y: by + 1.96, w: 4.2, h: 0.65,
        fontSize: 10, color: COLOR.textMuted, italic: true, wrap: true,
      });
    }
  });
}

function renderQuiz(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'yellow');
  const probs  = slide.problems || [];

  probs.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx  = 0.28 + col * 3.22;
    const by  = startY + 0.1 + row * 2.85;

    card(s, bx, by, 3.0, 2.65, { fill: 'FFFDE7', border: 'FDE68A' });

    // Number badge
    s.addShape(pptx.ShapeType.ellipse, {
      x: bx + 0.12, y: by + 0.1, w: 0.42, h: 0.42,
      fill: { color: COLOR.yellow }, line: { color: COLOR.yellow },
    });
    s.addText(p.num, {
      x: bx + 0.12, y: by + 0.1, w: 0.42, h: 0.42,
      fontSize: 14, bold: true, color: COLOR.white, align: 'center', valign: 'middle',
    });

    // Question
    s.addText(p.question, {
      x: bx + 0.12, y: by + 0.6, w: 2.76, h: 0.86,
      fontSize: 13.5, bold: true, color: COLOR.textPrimary,
      fontFace: 'Courier New', align: 'center', wrap: true,
    });

    rule(s, by + 1.56, 'FDE68A', bx + 0.12, 2.76);

    // Answer box
    s.addShape(pptx.ShapeType.rect, {
      x: bx + 0.12, y: by + 1.62, w: 2.76, h: 0.88,
      fill: { color: 'FFF9C4' }, line: { color: 'FDE68A', width: 0.5 },
    });
    s.addText('▶ ' + p.answer, {
      x: bx + 0.2, y: by + 1.64, w: 2.6, h: 0.84,
      fontSize: 10, color: COLOR.yellow, wrap: true, lineSpacing: 16,
      fontFace: 'Courier New', valign: 'top',
    });
  });
}

function renderPitfalls(s, slide) {
  const startY = addHeader(s, slide.title, slide.subtitle, slide.accent || 'red');
  const items  = slide.items || [];

  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx  = 0.28 + col * 4.85;
    const by  = startY + 0.1 + row * 2.93;

    card(s, bx, by, 4.5, 2.72, { fill: 'FFF1F2', border: 'FCA5A5' });

    // Title
    s.addText('✗  ' + item.title, {
      x: bx + 0.14, y: by + 0.1, w: 4.2, h: 0.38,
      fontSize: 14, bold: true, color: COLOR.red,
    });

    // Wrong
    s.addShape(pptx.ShapeType.rect, {
      x: bx + 0.14, y: by + 0.55, w: 4.2, h: 0.52,
      fill: { color: 'FEE2E2' }, line: { color: 'FCA5A5', width: 0.5 },
    });
    s.addText('✗  ' + item.wrong, {
      x: bx + 0.22, y: by + 0.55, w: 4.04, h: 0.52,
      fontSize: 10.5, color: COLOR.red, fontFace: 'Courier New', valign: 'middle', wrap: true,
    });

    // Right
    s.addShape(pptx.ShapeType.rect, {
      x: bx + 0.14, y: by + 1.12, w: 4.2, h: 0.52,
      fill: { color: 'DCFCE7' }, line: { color: '86EFAC', width: 0.5 },
    });
    s.addText('✓  ' + item.right, {
      x: bx + 0.22, y: by + 1.12, w: 4.04, h: 0.52,
      fontSize: 10.5, color: COLOR.green, fontFace: 'Courier New', valign: 'middle', wrap: true,
    });

    // Note
    s.addText(item.note, {
      x: bx + 0.14, y: by + 1.7, w: 4.2, h: 0.88,
      fontSize: 10.5, color: COLOR.textSecondary, italic: true, wrap: true, lineSpacing: 16,
    });
  });
}

function renderSummary(s, slide) {
  s.background = { color: COLOR.navy };

  // Right decoration
  s.addShape(pptx.ShapeType.rect, { x: 7.1, y: 0, w: 2.9, h: 7.5, fill: { color: '162D4A' } });
  s.addText('∫', {
    x: 6.9, y: 0.0, w: 3.0, h: 7.5,
    fontSize: 260, color: '1E3F62', align: 'center', valign: 'middle',
    fontFace: 'Times New Roman',
  });

  s.addText('📚 ' + slide.title, {
    x: 0.5, y: 0.3, w: 6.4, h: 0.55,
    fontSize: 22, bold: true, color: COLOR.white,
  });
  s.addText(slide.subtitle, {
    x: 0.5, y: 0.88, w: 6.4, h: 0.34,
    fontSize: 13, color: 'B0C4DE', italic: true,
  });

  rule(s, 1.28, '2D4E7A', 0.5, 6.3);

  (slide.points || []).forEach((pt, i) => {
    const even = i % 2 === 0;
    s.addText(pt.emoji + '  ' + pt.text, {
      x: 0.5, y: 1.4 + i * 0.62, w: 6.35, h: 0.58,
      fontSize: 13, color: even ? COLOR.white : 'B0C4DE',
      lineSpacing: 18,
    });
  });

  rule(s, 5.36, '2D4E7A', 0.5, 6.3);

  s.addText('🚀 下一步建議', {
    x: 0.5, y: 5.44, w: 6.4, h: 0.4,
    fontSize: 15, bold: true, color: '7EC8E3',
  });
  (slide.next || []).forEach((n, i) => {
    s.addText('→  ' + n, {
      x: 0.6, y: 5.9 + i * 0.46, w: 6.2, h: 0.42,
      fontSize: 12, color: 'B0C4DE',
    });
  });
}

// ─── Slide Dispatcher ───────────────────────────────────────────────────────
const RENDERERS = {
  cover:     renderCover,
  overview:  renderOverview,
  concept:   renderConcept,
  table:     renderTable,
  technique: renderTechnique,
  examples:  renderExamples,
  quiz:      renderQuiz,
  pitfalls:  renderPitfalls,
  summary:   renderSummary,
};

slides.forEach((slide, idx) => {
  const s = pptx.addSlide();
  const render = RENDERERS[slide.type];
  if (render) {
    render(s, slide);
  } else {
    console.warn(`[slide ${idx}] Unknown type: "${slide.type}", skipping visual rendering.`);
    addHeader(s, slide.title || '（未知 slide type）', slide.subtitle, 'blue');
  }
  if (slide.notes) s.addNotes(slide.notes);
});

// ─── Output ─────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName })
  .then(() => console.log(`✅  [${slides.length} slides]  →  ${fileName}`))
  .catch(err => { console.error(err); process.exit(1); });
