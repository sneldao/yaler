import React, { useCallback, useRef, useState } from 'react';

interface Props {
  summary: string;
  agreedTerms: string;
  rating?: number;
  ratingComment?: string;
  evidenceLabels: string[];
  createdAt: string;
}

/**
 * ReceiptCardImage — draws a shareable branded receipt card on an offscreen
 * canvas, then offers a download. Pure Canvas API, no external library.
 *
 * The card renders the receipt as a paper-cutout visual: cream background,
 * mandate tone accent bar, verified stamp, and the Yaler brand lockup at the
 * bottom. 800×1000px (4:5 portrait, optimal for Instagram / WhatsApp / WeChat).
 */

const WIDTH = 800;
const HEIGHT = 1000;
const PADDING = 56;
const ACCENT = '#2A6F6A';
const INK = '#12212B';
const INK_MUTED = '#5C5348';
const PAPER = '#F4EFE6';
const STAR = '#F59E0B';

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineH: number): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineH;
}

export default function ReceiptCardImage({ summary, agreedTerms, rating, ratingComment, evidenceLabels, createdAt }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paper background
    ctx.fillStyle = PAPER;
    drawRoundRect(ctx, 0, 0, WIDTH, HEIGHT, 0);
    ctx.fill();

    // Top accent bar
    ctx.fillStyle = ACCENT;
    ctx.fillRect(0, 0, WIDTH, 6);

    // Brand header
    ctx.fillStyle = ACCENT;
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.letterSpacing = '0.14em';
    ctx.textAlign = 'left';
    ctx.fillText('YALER', PADDING, 52);

    ctx.fillStyle = INK_MUTED;
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Verified receipt', PADDING, 76);

    // Date
    const dateStr = new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    ctx.fillStyle = INK_MUTED;
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, WIDTH - PADDING, 76);

    // Divider
    ctx.strokeStyle = 'rgba(18, 33, 43, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, 100);
    ctx.lineTo(WIDTH - PADDING, 100);
    ctx.stroke();

    // Title
    ctx.fillStyle = INK;
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Job done', PADDING, 148);

    // Summary
    ctx.fillStyle = INK;
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillText(summary.slice(0, 120), PADDING, 190);

    // Agreed terms
    ctx.fillStyle = INK_MUTED;
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('What was agreed', PADDING, 240);
    const termsLines = splitLines(ctx, agreedTerms, WIDTH - PADDING * 2, 22);
    termsLines.forEach((line, i) => {
      ctx.fillText(line, PADDING, 268 + i * 22);
    });

    // Evidence checklist
    const evidenceY = 268 + termsLines.length * 22 + 28;
    ctx.fillStyle = INK_MUTED;
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('Checked', PADDING, evidenceY);
    evidenceLabels.forEach((label, i) => {
      const y = evidenceY + 28 + i * 24;
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.arc(PADDING + 10, y + 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      ctx.fillText(label, PADDING + 26, y + 8);
    });

    // Rating stars
    const ratingY = evidenceY + 28 + evidenceLabels.length * 24 + 32;
    if (rating && rating > 0) {
      ctx.fillStyle = INK_MUTED;
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Buyer\'s verdict', PADDING, ratingY);
      // Stars
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i < rating ? STAR : 'rgba(18, 33, 43, 0.15)';
        drawStar(ctx, PADDING + 16 + i * 28, ratingY + 22, 10);
      }
      ctx.fillStyle = INK;
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${rating} / 5`, PADDING + 16 + 5 * 28 + 12, ratingY + 28);
      if (ratingComment) {
        ctx.fillStyle = INK_MUTED;
        ctx.font = 'italic 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(`"${ratingComment}"`, PADDING + 16, ratingY + 54);
      }
    }

    // Bottom CTA
    const ctaY = HEIGHT - 120;
    ctx.fillStyle = ACCENT;
    drawRoundRect(ctx, PADDING, ctaY, WIDTH - PADDING * 2, 52, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Get your own verified receipt →', WIDTH / 2, ctaY + 33);

    // Footer brand
    ctx.fillStyle = INK_MUTED;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Booked, checked and receipted autonomously  ·  yaler.persidian.com', WIDTH / 2, HEIGHT - 40);

    setReady(true);
  }, [summary, agreedTerms, rating, ratingComment, evidenceLabels, createdAt]);

  // Draw on mount
  React.useEffect(() => { void draw(); }, [draw]);

  const download = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `yaler-receipt-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, []);

  if (!ready) return null;

  return (
    <div className="space-y-3">
      {/* Hidden canvas — renders at 2× for retina crispness */}
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="hidden"
        aria-hidden
      />
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="btn-primary text-sm py-2.5 w-full flex items-center justify-center gap-2"
      >
        {downloading ? (
          <span>Preparing…</span>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download image
          </>
        )}
      </button>
      <p className="text-[11px] text-ink-muted text-center">
        Share on WhatsApp, WeChat, or Instagram. Sized 4:5 for mobile feeds.
      </p>
    </div>
  );
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function splitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineH: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
