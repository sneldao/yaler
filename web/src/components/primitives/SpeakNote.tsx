import React, { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import VoiceOverlay, { type VoicePhase } from './VoiceOverlay';
import { extractMandate, type ExtractedMandate } from '../../lib/mandateExtract';

const VAPI_PUBLIC_KEY = '374778cc-e3a0-4557-a9f2-3908ca8dbdbd';

const SYSTEM_PROMPT =
  'You are Yaler Voice Assistant for London kitchen managers. Ask what equipment emergency they need help with (commercial fridge, extraction hood, freezer), their district (e.g. N1, E1), and budget. Keep it short. Once you have the equipment, district, and budget, summarize and end the call.';

interface Props {
  onTranscript: (text: string) => void;
  onMandateExtracted?: (extracted: ExtractedMandate) => void;
  label?: string;
  className?: string;
}

export default function SpeakNote({ onTranscript, onMandateExtracted, label = 'Speak it', className = '' }: Props) {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('connecting');
  const [interim, setInterim] = useState('');
  const [finalText, setFinalText] = useState('');
  const [extracted, setExtracted] = useState<ExtractedMandate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onMandateRef = useRef(onMandateExtracted);
  onMandateRef.current = onMandateExtracted;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const instance = new Vapi(VAPI_PUBLIC_KEY);
      instance.on('call-start', () => {
        setVoicePhase('listening');
        setError(null);
      });
      instance.on('call-end', () => {
        setVoicePhase((prev) => (prev === 'done' ? prev : 'done'));
      });
      instance.on('message', (message: any) => {
        if (message.type === 'transcript') {
          if (message.transcriptType === 'partial' && message.transcript) {
            setInterim(message.transcript);
          } else if (message.transcriptType === 'final' && message.transcript) {
            setFinalText((prev) => (prev ? prev + ' ' : '') + message.transcript);
            setInterim('');
            onTranscriptRef.current(message.transcript);
          }
        }
      });
      instance.on('error', (err: any) => {
        setError(err?.message || 'Voice connection error');
        setVoicePhase('done');
      });
      setVapi(instance);
    } catch (e) {
      console.warn('Vapi init error:', e);
    }
  }, []);

  // When the call ends, run extraction on the full transcript
  useEffect(() => {
    if (voicePhase !== 'done' || !finalText) return;
    const result = extractMandate(finalText);
    setExtracted(result);
  }, [voicePhase, finalText]);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice is not available in this browser. Type it instead.');
      setVoicePhase('done');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognition.onstart = () => {
        setVoicePhase('listening');
        setError(null);
      };
      recognition.onresult = (event: any) => {
        let interimStr = '';
        let finalStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalStr += result[0].transcript;
          } else {
            interimStr += result[0].transcript;
          }
        }
        if (interimStr) setInterim(interimStr);
        if (finalStr) {
          setFinalText((prev) => (prev ? prev + ' ' : '') + finalStr);
          setInterim('');
          onTranscriptRef.current(finalStr);
        }
      };
      recognition.onerror = (event: any) => {
        setError(`Voice input error: ${event.error}`);
        setVoicePhase('done');
      };
      recognition.onend = () => {
        setVoicePhase('done');
      };
      recognition.start();
    } catch {
      setError('Could not start the microphone.');
      setVoicePhase('done');
    }
  };

  const toggle = async () => {
    if (overlayOpen) {
      // Close / stop
      if (vapi) vapi.stop();
      setOverlayOpen(false);
      resetState();
      return;
    }
    // Open the overlay + start
    setOverlayOpen(true);
    setVoicePhase('connecting');
    setInterim('');
    setFinalText('');
    setExtracted(null);
    setError(null);

    if (!vapi) {
      handleVoiceInput();
      return;
    }
    try {
      await vapi.start({
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }],
        },
        voice: { provider: 'playht', voiceId: 'jennifer' },
      });
    } catch (err) {
      console.warn('Vapi start error, using Web Speech fallback:', err);
      handleVoiceInput();
    }
  };

  const resetState = () => {
    setInterim('');
    setFinalText('');
    setExtracted(null);
    setError(null);
    setVoicePhase('connecting');
  };

  const handleClose = () => {
    if (vapi) vapi.stop();
    setOverlayOpen(false);
    resetState();
  };

  const handleUse = () => {
    if (finalText) onTranscriptRef.current(finalText);
    if (extracted) onMandateRef.current?.(extracted);
    setOverlayOpen(false);
    resetState();
  };

  const extractedFields = extracted
    ? [
        { label: 'Budget', value: extracted.budget ? `£${extracted.budget}` : null },
        { label: 'Area', value: extracted.postalDistrict },
        { label: 'Needed by', value: extracted.deadlineHint?.replace(/-/g, ' ') || null },
        { label: 'Trade', value: extracted.category ? extracted.category.replace(/_/g, ' ') : null },
      ]
    : [];

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
          overlayOpen
            ? 'bg-purple-50 text-purple-600 border-purple-200'
            : 'bg-paper text-ink border-ink/10 hover:border-ink/25'
        }`}
      >
        {overlayOpen ? 'Listening… tap to stop' : label}
      </button>

      {overlayOpen && (
        <VoiceOverlay
          phase={voicePhase}
          interimTranscript={interim}
          finalTranscript={finalText}
          extracted={extractedFields}
          error={error}
          onClose={handleClose}
          onUse={handleUse}
        />
      )}
    </div>
  );
}
