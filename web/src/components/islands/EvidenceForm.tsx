import React, { useState } from 'react';
import { navigate } from 'astro:transitions/client';
import { getMission, submitEvidence, uploadImage, type Mission } from '../../lib/api';
import { LoaderGrid } from '../primitives/LoaderGrid';

interface Props {
  missionId: string;
}

export default function EvidenceForm({ missionId }: Props) {
  const [report, setReport] = useState("Technician replaced faulty compressor relay, verified temperature dropping to 3°C.");
  const [photoUrl, setPhotoUrl] = useState("https://storage.googleapis.com/yaler-evidence/proof_temp_check.jpg");
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mission, setMission] = useState<Mission | null>(null);

  React.useEffect(() => {
    getMission(missionId).then(setMission).catch(() => undefined);
  }, [missionId]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadImage(file);
      setPhotoUrl(res.url);
      setPreviewFilename(`${res.filename} (${(res.size / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      setError(err.message || 'Could not upload that photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitEvidence(missionId, `ms_${missionId}`, report, photoUrl);
      setResult(res);
      setTimeout(() => {
        navigate(`/missions/${missionId}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Could not send the photos.');
      setLoading(false);
    }
  };

  return (
    <div className="paper-card rounded-2xl p-5 sm:p-7 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-mandate mb-1">For the engineer</p>
        <h2 className="font-display text-2xl text-ink">Send photos</h2>
        <p className="text-sm text-ink-muted mt-1">A short note and a photo is enough. We’ll check them against what was agreed.</p>
      </div>

      {mission?.diagnosticBrief && (
        <details className="group rounded-xl border border-ink/10 bg-paper-inset/50">
          <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between text-sm text-ink">
            <span className="font-medium">Brief from the manager</span>
            <span className="text-[11px] text-ink-muted group-open:hidden">{mission.diagnosticBrief.confidence}</span>
            <span className="text-[11px] text-ink-muted hidden group-open:inline">collapse</span>
          </summary>
          <div className="px-3 pb-3 pt-2.5 border-t border-ink/10 space-y-2 text-xs">
            <p className="text-ink-muted">{mission.diagnosticBrief.reportedSummary}</p>
            {mission.diagnosticBrief.known.length > 0 && <p><span className="text-ink-muted">Known:</span> {mission.diagnosticBrief.known.join(' · ')}</p>}
            {mission.diagnosticBrief.likelyAreas.length > 0 && <p><span className="text-ink-muted">Possible:</span> {mission.diagnosticBrief.likelyAreas.join(' · ')}</p>}
            {mission.diagnosticBrief.toConfirm.length > 0 && <p><span className="text-ink-muted">Confirm:</span> {mission.diagnosticBrief.toConfirm.join(' · ')}</p>}
            {mission.diagnosticBrief.diagnosticMedia && mission.diagnosticBrief.diagnosticMedia.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {mission.diagnosticBrief.diagnosticMedia.map((media) => (
                  <a key={media.url} href={media.url} target="_blank" rel="noreferrer" className="text-[10px] text-mandate border border-mandate/20 rounded-full px-2 py-1">{media.label}</a>
                ))}
              </div>
            )}
            <p className="text-[10px] text-ink-muted italic">Possible areas are suggestions, not a confirmed diagnosis.</p>
          </div>
        </details>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-ink-muted mb-1.5">
            What did you do?
          </label>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={4}
            className="field-input text-sm leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-ink-muted">
            Photo
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="bg-paper border border-dashed border-ink/20 hover:border-mandate/50 rounded-xl p-5 text-center transition-colors relative"
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div className="space-y-1 pointer-events-none">
              <p className="text-sm text-ink">
                {uploading ? 'Uploading…' : 'Drop a photo here, or tap to choose'}
              </p>
              {previewFilename && (
                <p className="text-xs text-mandate">Uploaded: {previewFilename}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUrl((open) => !open)}
            className="text-xs text-ink-muted hover:text-ink"
          >
            {showUrl ? 'Hide photo link' : 'Use a photo link instead'}
          </button>
          {showUrl && (
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="field-input text-xs"
            />
          )}
        </div>

        {error && (
          <div className="p-3 bg-escalate-light border border-escalate/25 text-escalate rounded-xl text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-mandate-light border border-mandate/20 text-ink rounded-xl text-sm space-y-2 animate-pop-in">
            <p className="font-medium text-mandate">Photos look good.</p>
            {result.evidence?.confidenceScore && (
              <p className="text-xs text-ink-muted">
                Match {(result.evidence.confidenceScore * 100).toFixed(0)}%
              </p>
            )}
            <p className="text-xs text-ink-muted">Taking you back to the job…</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || uploading}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <LoaderGrid />
              <span>Checking the photos…</span>
            </>
          ) : (
            <span>Send and finish</span>
          )}
        </button>
      </form>
    </div>
  );
}
