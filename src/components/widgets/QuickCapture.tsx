import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { PixelButton } from './PixelButton';
import { UI } from '../../strings/ui';

const MAX_RECORD_SEC = 60;

export function QuickCapture() {
  const captureOpen = useStore((s) => s.captureOpen);
  const setCaptureOpen = useStore((s) => s.setCaptureOpen);
  const createIdea = useStore((s) => s.createIdea);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [micBlocked, setMicBlocked] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>();

  const titleRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
  };

  const resetForm = () => {
    setTitle('');
    setNote('');
    setRecordSec(0);
    setMicBlocked(false);
    setAudioBlob(undefined);
    chunksRef.current = [];
  };

  useEffect(() => {
    if (!captureOpen) {
      stopRecording();
      resetForm();
      return;
    }
    const t = setTimeout(() => titleRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [captureOpen]);

  useEffect(() => () => stopRecording(), []);

  const startRecording = async () => {
    if (recording) {
      stopRecording();
      return;
    }
    setMicBlocked(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        if (chunksRef.current.length) {
          setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
        }
      };
      rec.start(200);
      setRecording(true);
      setRecordSec(0);
      timerRef.current = setInterval(() => {
        setRecordSec((s) => {
          if (s + 1 >= MAX_RECORD_SEC) {
            stopRecording();
            return MAX_RECORD_SEC;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setMicBlocked(true);
      setRecording(false);
    }
  };

  const onSave = () => {
    const trimmed = title.trim();
    createIdea(trimmed, {
      text: note.trim() || undefined,
      audio: audioBlob,
    });
    resetForm();
  };

  const onClose = () => {
    stopRecording();
    setCaptureOpen(false);
  };

  if (!captureOpen) return null;

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-label="Quick capture"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ph" style={{ marginBottom: 14 }}>
          QUICK CAPTURE
        </div>

        <label style={{ display: 'block', textAlign: 'left', marginBottom: 14 }}>
          <span
            style={{
              fontFamily: 'var(--pixel)',
              fontSize: 8,
              color: 'var(--muted)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            TITLE
          </span>
          <input
            ref={titleRef}
            type="text"
            placeholder="Untitled idea"
            maxLength={40}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div style={{ marginBottom: 14, textAlign: 'left' }}>
          <button
            type="button"
            className={`pxbtn${recording ? ' pink' : ''}`}
            onClick={() => void startRecording()}
            disabled={micBlocked}
            style={{ width: '100%', marginBottom: 6 }}
          >
            {recording ? `● REC ${recordSec}s / ${MAX_RECORD_SEC}s` : '● REC'}
          </button>
          {micBlocked && (
            <p style={{ fontFamily: 'var(--pixel)', fontSize: 8, color: 'var(--pink)' }}>
              {UI['mic.blocked']}
            </p>
          )}
          {audioBlob && !recording && (
            <p style={{ fontSize: 12, color: 'var(--mint)' }}>Voice memo attached</p>
          )}
        </div>

        <label style={{ display: 'block', textAlign: 'left', marginBottom: 18 }}>
          <span
            style={{
              fontFamily: 'var(--pixel)',
              fontSize: 8,
              color: 'var(--muted)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            NOTE
          </span>
          <textarea
            rows={3}
            placeholder="Optional spark notes…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <PixelButton variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            CANCEL
          </PixelButton>
          <PixelButton onClick={onSave} style={{ flex: 2 }}>
            SAVE TO IDEA CRATE
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
