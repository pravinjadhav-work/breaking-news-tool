const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');

/* Cached DOM elements */
const els = {
  imageUpload: document.getElementById('imageUpload'),
  headline: document.getElementById('headline'),
  highlight: document.getElementById('highlight'),
  day: document.getElementById('day'),
  month: document.getElementById('month'),
  watermark: document.getElementById('watermark'),
  zoom: document.getElementById('zoom'),
  imageX: document.getElementById('imageX'),
  imageY: document.getElementById('imageY'),
  breakingSize: document.getElementById('breakingSize'),
  headlineSize: document.getElementById('headlineSize'),
  breakingHeadlineGap: document.getElementById('breakingHeadlineGap'),
  headlineLetterSpacing: document.getElementById('headlineLetterSpacing'),
  headlineWordSpacing: document.getElementById('headlineWordSpacing'),
  headlineLineSpacing: document.getElementById('headlineLineSpacing'),
  topPadding: document.getElementById('topPadding'),
  fadeHeight: document.getElementById('fadeHeight'),
  fadeStrength: document.getElementById('fadeStrength'),
  watermarkSize: document.getElementById('watermarkSize'),
  dateSize: document.getElementById('dateSize'),
  dateX: document.getElementById('dateX'),
  dateY: document.getElementById('dateY'),
  downloadBtn: document.getElementById('downloadBtn')
};

let uploadedImage = null;

/* VISUAL TUNING */
const BREAKING_FONT = '"Bebas Neue"';
const HEADLINE_FONT = 'Arial Black';

const BREAKING_SCALE_X = 1.15;
const BREAKING_SCALE_Y = 0.96;
const BREAKING_LETTER_SPACING = 2;

const HEADLINE_WORD_SPACING = 9;
const HEADLINE_LINE_HEIGHT = 1.05;
const HIGHLIGHT_PAD_X = 14;
const HIGHLIGHT_PAD_Y = 7;

/* Image upload handling */
els.imageUpload.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      uploadedImage = img;
      render();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

/* Slider value sync */
function updateSliderValues() {
  document.querySelectorAll('input[type="range"]').forEach(input => {
    const valueEl = document.getElementById(`${input.id}Value`);
    if (valueEl) valueEl.textContent = input.value;
  });
}

document.querySelectorAll('input, textarea').forEach(el => {
  el.addEventListener('input', () => {
    updateSliderValues();
    render();
  });
});

/* Export helper */
els.downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'breaking-news.png';
  a.href = canvas.toDataURL('image/png', 1);
  a.click();
});

/* Text measurement helpers */
function font(size, family = 'Arial Black') {
  return `900 ${size}px ${family}, Impact, sans-serif`;
}

function spacedTextWidth(text, spacing = 0) {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += ctx.measureText(text[i]).width;
    if (i < text.length - 1) width += spacing;
  }
  return width;
}

function drawSpacedText(ctx, text, x, y, spacing = 0) {
  let currentX = x;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    ctx.fillText(char, currentX, y);
    currentX += ctx.measureText(char).width + spacing;
  }
}

/* Breaking text sizing */
function fitBreakingText(text, maxSize, maxVisualWidth) {
  let size = maxSize;

  while (size > 80) {
    ctx.font = font(size, BREAKING_FONT);

    const rawWidth = spacedTextWidth(text, BREAKING_LETTER_SPACING);
    const visualWidth = rawWidth * BREAKING_SCALE_X;

    if (visualWidth <= maxVisualWidth) break;
    size -= 2;
  }

  return size;
}

/* Headline wrapping */
function tokenizeHeadline(text, highlightPhrase) {
  const clean = text.toUpperCase().replace(/\s+/g, ' ').trim();
  const highlight = highlightPhrase.toUpperCase().replace(/\s+/g, ' ').trim();

  if (!highlight || !clean.includes(highlight)) {
    return clean.split(' ').filter(Boolean).map(w => ({
      text: w,
      highlight: false
    }));
  }

  const parts = [];
  let remaining = clean;

  while (remaining.includes(highlight)) {
    const idx = remaining.indexOf(highlight);
    const before = remaining.slice(0, idx).trim();

    if (before) {
      before.split(' ').forEach(w => {
        parts.push({ text: w, highlight: false });
      });
    }

    parts.push({ text: highlight, highlight: true });
    remaining = remaining.slice(idx + highlight.length).trim();
  }

  if (remaining) {
    remaining.split(' ').forEach(w => {
      parts.push({ text: w, highlight: false });
    });
  }

  return parts;
}

function segWidth(seg, letterSpacing) {
  const raw = letterSpacing
    ? spacedTextWidth(seg.text, letterSpacing)
    : ctx.measureText(seg.text).width;
  return seg.highlight ? raw + HIGHLIGHT_PAD_X * 2 : raw;
}

function wrapSegments(segments, maxWidth, fontSize, wordSpacing, letterSpacing) {
  ctx.font = font(fontSize, HEADLINE_FONT);

  const lines = [];
  let line = [];
  let width = 0;

  for (const seg of segments) {
    const w = segWidth(seg, letterSpacing);
    const add = line.length ? w + wordSpacing : w;

    if (line.length && width + add > maxWidth) {
      lines.push({ segments: line, width });
      line = [seg];
      width = w;
    } else {
      line.push(seg);
      width += add;
    }
  }

  if (line.length) lines.push({ segments: line, width });
  return lines;
}

function drawHeadline(lines, startY, size, wordSpacing, letterSpacing, lineHeight) {
  ctx.font = font(size, HEADLINE_FONT);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    let x = (canvas.width - line.width) / 2;

    for (const seg of line.segments) {
      const rawW = letterSpacing
        ? spacedTextWidth(seg.text, letterSpacing)
        : ctx.measureText(seg.text).width;

      if (seg.highlight) {
        const rectX = x - HIGHLIGHT_PAD_X;
        const rectY = y - size * 0.89;
        const rectW = rawW + HIGHLIGHT_PAD_X * 2;
        const rectH = size * 0.95 + HIGHLIGHT_PAD_Y;

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(rectX, rectY, rectW, rectH);

        ctx.fillStyle = '#ffffff';
        if (letterSpacing) {
          drawSpacedText(ctx, seg.text, x, y, letterSpacing);
        } else {
          ctx.fillText(seg.text, x, y);
        }

        x += rawW + HIGHLIGHT_PAD_X * 2 + wordSpacing;
      } else {
        ctx.fillStyle = '#000000';
        if (letterSpacing) {
          drawSpacedText(ctx, seg.text, x, y, letterSpacing);
        } else {
          ctx.fillText(seg.text, x, y);
        }

        x += rawW + wordSpacing;
      }
    }
  });
}

/* Fallback background */
function drawDefaultPhotoPlaceholder() {
  const g = ctx.createLinearGradient(0, 430, 0, canvas.height);
  g.addColorStop(0, '#c8d9dc');
  g.addColorStop(0.25, '#45636a');
  g.addColorStop(0.65, '#173940');
  g.addColorStop(1, '#081d22');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#071417';

  for (const [x, y, r] of [[280, 760, 150], [540, 720, 185], [800, 760, 150]]) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - r * 0.55, y + 60, r * 1.1, 460);
  }

  ctx.restore();
}

/* Image draw pipeline */
function drawCoverImage(img) {
  const zoom = Number(els.zoom.value);
  const offsetX = Number(els.imageX.value);
  const offsetY = Number(els.imageY.value);

  const iw = img.width;
  const ih = img.height;

  const scale = Math.max(canvas.width / iw, canvas.height / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;

  const maxX = Math.max(0, (dw - canvas.width) / 2);
  const maxY = Math.max(0, (dh - canvas.height) / 2);

  const x = (canvas.width - dw) / 2 + (offsetX / 100) * maxX * 2.2;
  const y = (canvas.height - dh) / 2 + (offsetY / 100) * maxY * 3.2;

  ctx.drawImage(img, x, y, dw, dh);
}

/* Date badge rendering */
function drawDateBox() {
  const boxH = Number(els.dateSize.value);
  const boxW = boxH * 0.74;
  const x = Number(els.dateX.value);
  const y = canvas.height - boxH - Number(els.dateY.value);

  ctx.fillStyle = '#f00000';
  ctx.beginPath();
  ctx.roundRect(x, y, boxW, boxH, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = font(boxH * 0.48, 'Impact');
  ctx.fillText(els.day.value.toUpperCase(), x + boxW / 2, y + boxH * 0.35);

  ctx.font = font(boxH * 0.28, 'Impact');
  ctx.fillText(els.month.value.toUpperCase(), x + boxW / 2, y + boxH * 0.72);
}

/* Watermark rendering */
function drawWatermark() {
  ctx.save();

  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const size = Number(els.watermarkSize?.value ?? 31);
  ctx.font = font(size, 'Arial Black');

  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 1.5;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = '#ffffff';
  ctx.fillText(els.watermark.value.toUpperCase(), 1036, 1272);

  ctx.restore();
}

/* Breaking banner rendering */
function drawBreakingText(size, y) {
  ctx.save();

  ctx.font = font(size, BREAKING_FONT);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const rawWidth = spacedTextWidth('BREAKING', BREAKING_LETTER_SPACING);
  const visualWidth = rawWidth * BREAKING_SCALE_X;

  const startX = (canvas.width - visualWidth) / 2;

  ctx.translate(startX, y);
  ctx.scale(BREAKING_SCALE_X, BREAKING_SCALE_Y);

  drawSpacedText(ctx, 'BREAKING', 0, 0, BREAKING_LETTER_SPACING);

  ctx.restore();
}

/* Canvas render pipeline */
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (uploadedImage) {
    drawCoverImage(uploadedImage);
  } else {
    drawDefaultPhotoPlaceholder();
  }

  const breakingMax = Number(els.breakingSize.value);
  const topPadding = Number(els.topPadding.value);
  const headlineSize = Number(els.headlineSize.value);
  const breakingHeadlineGap = Number(els.breakingHeadlineGap.value);
  const headlineLetterSpacing = Number(els.headlineLetterSpacing.value);
  const headlineWordSpacing = Number(els.headlineWordSpacing.value);
  const headlineLineSpacing = Number(els.headlineLineSpacing.value);

  const breakingSize = fitBreakingText('BREAKING', breakingMax, canvas.width - 60);
  const breakingY = topPadding + breakingSize * 0.82;

  const segments = tokenizeHeadline(els.headline.value, els.highlight.value);
  const lines = wrapSegments(segments, 1000, headlineSize, headlineWordSpacing, headlineLetterSpacing);

  const headlineStartY = breakingY + headlineSize * 1.02 + breakingHeadlineGap;
  const headlineBottom =
    headlineStartY +
    (lines.length - 1) * headlineSize * headlineLineSpacing +
    headlineSize * 0.35;

  const whiteHeight = Math.max(410, headlineBottom +1);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, whiteHeight);

  const fadeH = Number(els.fadeHeight.value);
  const fadeY = whiteHeight - 8;
  const strength = Number(els.fadeStrength.value) / 100;

  const fade = ctx.createLinearGradient(0, fadeY, 0, fadeY + fadeH);
  fade.addColorStop(0, `rgba(255,255,255,${1 * strength})`);
  fade.addColorStop(0.18, `rgba(255,255,255,${0.92 * strength})`);
  fade.addColorStop(0.38, `rgba(255,255,255,${0.68 * strength})`);
  fade.addColorStop(0.62, `rgba(255,255,255,${0.36 * strength})`);
  fade.addColorStop(0.82, `rgba(255,255,255,${0.12 * strength})`);
  fade.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = fade;
  ctx.fillRect(0, fadeY, canvas.width, fadeH);

  drawBreakingText(breakingSize, breakingY);
  drawHeadline(
    lines,
    headlineStartY,
    headlineSize,
    headlineWordSpacing,
    headlineLetterSpacing,
    headlineSize * headlineLineSpacing
  );
  drawDateBox();
  drawWatermark();
}

/* Initial render */
updateSliderValues();
render();

/* Re-render after fonts load */
document.fonts?.ready?.then(render);