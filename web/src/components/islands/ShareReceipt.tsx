import React, { useState } from 'react';

interface Props {
  receiptId: string;
  summary: string;
  shareToken?: string;
}

export default function ShareReceipt({ receiptId, summary, shareToken }: Props) {
  const [copied, setCopied] = useState(false);

  const receiptUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/missions/${receiptId}/receipt`
    : `/missions/${receiptId}/receipt`;

  const shareText = `Job done: ${summary?.slice(0, 80)} — verified on Yaler`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${receiptUrl}`)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(receiptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = receiptUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Yaler Receipt', text: shareText, url: receiptUrl });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <div className="paper-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-ink-muted">Share this receipt</p>
        {shareToken && (
          <span className="text-[11px] text-ink-muted font-mono">{shareToken}</span>
        )}
      </div>

      <p className="text-sm text-ink-muted leading-relaxed">
        Pin it to the kitchen wall, send it to your manager, or share with other operators.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="btn-secondary text-sm py-2.5 flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <span className="text-mandate">✓</span>
              Copied
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy link
            </>
          )}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-2.5 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>

        {'share' in (typeof navigator !== 'undefined' ? navigator : {}) && (
          <button
            type="button"
            onClick={nativeShare}
            className="btn-secondary text-sm py-2.5 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16,6 12,2 8,6" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Share
          </button>
        )}
      </div>
    </div>
  );
}
