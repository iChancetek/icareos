"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  Mic, StopCircle, Play, Save, CheckCircle2, AlertTriangle,
  Copy, Download, X, ChevronRight, Languages, Loader2, BrainCircuit,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { translateText } from '@/ai/flows/translate-text-flow';
import { summarizeIScribe } from '@/ai/flows/summarize-iscribe';
import { useAuth } from '@/hooks/useAuth';
import type { TranslationLanguage } from '@/types';
import { WaveformOrb } from '@/components/ui/WaveformOrb';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

type Step = "idle" | "transcribing" | "translating" | "summarizing" | "saving" | "completed";

const LANGUAGES: { code: TranslationLanguage; label: string; flag: string }[] = [
  { code: 'English', label: 'English', flag: '🇺🇸' },
  { code: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
  { code: 'French', label: 'French', flag: '🇫🇷' },
  { code: 'Mandarin', label: 'Mandarin', flag: '🇨🇳' },
  { code: 'Arabic', label: 'Arabic', flag: '🇸🇦' },
  { code: 'German', label: 'German', flag: '🇩🇪' },
  { code: 'Hebrew', label: 'Hebrew', flag: '🇮🇱' },
  { code: 'Chinese', label: 'Chinese', flag: '🀄' },
];

const STEPS: { key: Step; label: string }[] = [
  { key: 'transcribing', label: 'Transcribing' },
  { key: 'translating', label: 'Translating' },
  { key: 'summarizing', label: 'Summarizing' },
];

interface MediaRecorderErrorEvent extends Event { readonly error: DOMException; }
interface BlobEvent extends Event { readonly data: Blob; readonly timecode: number; }

export default function RealtimeVoiceTranslatorDialog({ isOpen, onOpenChange }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentLang, setCurrentLang] = useState<TranslationLanguage | null>(null);
  const [selectedLang, setSelectedLang] = useState<TranslationLanguage>('English');
  const [transcribedText, setTranscribedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<Step>('idle');
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef('');
  const ttsRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { saveTranslation } = useAuth();
  const { toast } = useToast();

  // Mic permission
  useEffect(() => {
    if (isOpen && !isPermissionChecked) {
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(s => { setHasMicPermission(true); s.getTracks().forEach(t => t.stop()); })
        .catch(() => {
          setHasMicPermission(false);
          toast({ variant: 'destructive', title: 'Microphone Access Denied' });
        })
        .finally(() => setIsPermissionChecked(true));
    }
    return () => {
      if (ttsRef.current) clearTimeout(ttsRef.current);
      window.speechSynthesis?.cancel();
      if (utteranceRef.current) utteranceRef.current.onend = null;
      setIsPlayingTTS(false);
    };
  }, [isOpen, isPermissionChecked, toast]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isRecording) setRecordingDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Auto-scroll results
  useEffect(() => {
    if (translatedText && resultsRef.current) {
      resultsRef.current.scrollTo({ top: resultsRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [translatedText, summaryText]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const reset = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    audioChunksRef.current = []; mimeRef.current = '';
    setIsRecording(false); setCurrentLang(null); setIsProcessing(false);
    setProcessingStep('idle'); setTranscribedText(''); setTranslatedText('');
    setSummaryText(''); setAudioDataUri(null); setSessionSaved(false);
    window.speechSynthesis?.cancel(); setIsPlayingTTS(false);
  };

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    if (!hasMicPermission || isProcessing) return;
    reset();
    setCurrentLang(selectedLang);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/aac'];
      const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
      try {
        mediaRecorderRef.current = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        mimeRef.current = mediaRecorderRef.current.mimeType;
      } catch (err) {
        toast({ title: 'Recorder Error', description: (err as Error).message, variant: 'destructive' });
        stream.getTracks().forEach(t => t.stop()); return;
      }
      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onerror = (e: Event) => {
        toast({ title: 'Recording Error', description: (e as MediaRecorderErrorEvent).error?.message, variant: 'destructive' });
        reset();
      };
      mediaRecorderRef.current.onstop = async () => {
        stream?.getTracks().forEach(t => t.stop());
        if (!audioChunksRef.current.length) { toast({ title: 'No audio recorded' }); reset(); return; }
        const blob = new Blob(audioChunksRef.current, { type: mimeRef.current || 'audio/webm' });
        if (blob.size < 1000) { toast({ title: 'Recording too short' }); reset(); return; }
        try {
          const uri = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.onerror = () => rej(new Error('FileReader failed'));
            r.readAsDataURL(blob);
          });
          setAudioDataUri(uri);
          await processAudio(uri, selectedLang);
        } catch (e) { toast({ title: 'Audio Error', description: (e as Error).message, variant: 'destructive' }); reset(); }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast({ title: `Recording in ${selectedLang}…` });
    } catch (err) {
      toast({ title: 'Could not start recording', description: (err as Error).message, variant: 'destructive' });
      stream?.getTracks().forEach(t => t.stop()); reset();
    }
  };

  const processAudio = async (uri: string, srcLang: TranslationLanguage) => {
    setIsProcessing(true);
    setTranscribedText(''); setTranslatedText(''); setSummaryText(''); setSessionSaved(false);
    try {
      setProcessingStep('transcribing');
      const { transcription } = await transcribeAudio({ audioDataUri: uri });
      if (!transcription?.trim()) throw new Error('No speech detected');
      setTranscribedText(transcription);

      setProcessingStep('translating');
      const { translatedText: tr } = await translateText({ text: transcription, targetLanguage: 'English' });
      setTranslatedText(tr);

      setProcessingStep('summarizing');
      const { summary } = await summarizeIScribe({ transcript: transcription });
      setSummaryText(summary);

      setProcessingStep('completed');
    } catch (err: any) {
      toast({ title: 'Processing Error', description: err.message, variant: 'destructive', duration: 9000 });
      setProcessingStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!audioDataUri || !transcribedText || !translatedText || !summaryText || !currentLang) return;
    setIsProcessing(true); setProcessingStep('saving');
    try {
      const id = await saveTranslation({
        date: new Date().toISOString(),
        sourceLanguage: currentLang,
        targetLanguage: 'English',
        sourceTranscript: transcribedText,
        translatedText,
        summary: summaryText,
        audioDataUri,
      });
      if (!id) throw new Error('Save returned no ID');
      setSessionSaved(true);
      toast({ title: 'Session Saved', description: "Saved to 'My Recordings'" });
    } catch (err) {
      toast({ title: 'Save Failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsProcessing(false); setProcessingStep('completed');
    }
  };

  const handlePlayTTS = async () => {
    if (!translatedText || isPlayingTTS || isProcessing) return;
    setIsPlayingTTS(true);
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: translatedText, lang: 'English' }) });
      if (!res.ok) throw new Error('TTS fetch failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setIsPlayingTTS(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); setIsPlayingTTS(false); };
      await audio.play();
    } catch {
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(translatedText);
      u.onend = () => setIsPlayingTTS(false);
      utteranceRef.current = u;
      window.speechSynthesis?.speak(u);
    }
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const downloadTranscript = () => {
    const content = [
      transcribedText && `SOURCE (${currentLang}):\n${transcribedText}`,
      translatedText && `\nTRANSLATION (English):\n${translatedText}`,
      summaryText && `\nAI SUMMARY:\n${summaryText}`,
    ].filter(Boolean).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    a.download = `translation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const orbState = isRecording ? 'recording' : isProcessing ? 'processing' : processingStep === 'completed' ? 'success' : 'idle';
  const hasResult = !!(transcribedText || translatedText || summaryText);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) reset(); onOpenChange(open); }}>
      <DialogContent className="p-0 gap-0 sm:max-w-4xl w-[95vw] h-[90vh] max-h-[800px] overflow-hidden rounded-2xl border border-border/60 glass-xl">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Languages className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold leading-none">Neural Voice Translator</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Agentic AI · Real-time multilingual</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Neural Active chip */}
            <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Neural Active
            </div>
            <button
              onClick={() => { reset(); onOpenChange(false); }}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

          {/* LEFT: Orb + Language selector + Controls */}
          <div className="md:w-[42%] flex flex-col items-center gap-5 px-6 py-6 border-r border-border/30 overflow-y-auto">

            {/* Mic permission denied */}
            {isPermissionChecked && !hasMicPermission && (
              <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Microphone access denied. Enable it in browser settings.
              </div>
            )}

            {/* WaveformOrb */}
            <div className="flex flex-col items-center gap-1">
              <WaveformOrb state={orbState} size={140} />
              {isRecording && (
                <p className="font-mono text-sm text-red-400 font-bold">{fmt(recordingDuration)}</p>
              )}
            </div>

            {/* Language pills */}
            <div className="w-full space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Source Language</p>
              <div className="grid grid-cols-4 gap-1.5">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => setSelectedLang(l.code)}
                    disabled={isRecording || isProcessing}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-[10px] font-medium transition-all duration-150",
                      selectedLang === l.code
                        ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_hsl(191_97%_58%/0.15)]"
                        : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    )}
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main mic button */}
            <div className="w-full">
              {!isPermissionChecked ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking microphone...
                </div>
              ) : hasMicPermission ? (
                <motion.button
                  whileHover={!isProcessing ? { scale: 1.02 } : {}}
                  whileTap={!isProcessing ? { scale: 0.97 } : {}}
                  onClick={handleRecord}
                  disabled={isProcessing}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 rounded-xl py-4 text-sm font-semibold transition-all duration-200",
                    isRecording
                      ? "bg-red-500/90 text-white hover:bg-red-500"
                      : isProcessing
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "btn-neural"
                  )}
                >
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Processing…</>
                  ) : isRecording ? (
                    <><StopCircle className="h-4 w-4" />Stop Recording</>
                  ) : (
                    <><Mic className="h-4 w-4" />Speak in {selectedLang}</>
                  )}
                </motion.button>
              ) : null}
            </div>

            {/* Agent steps mini-tracker */}
            {isProcessing && (
              <div className="w-full space-y-1.5">
                {STEPS.map((s, i) => {
                  const stepOrder = ['transcribing', 'translating', 'summarizing'];
                  const current = stepOrder.indexOf(processingStep);
                  const thisStep = stepOrder.indexOf(s.key);
                  const done = thisStep < current;
                  const running = thisStep === current;
                  return (
                    <motion.div
                      key={s.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                        done ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" :
                          running ? "border-primary/30 bg-primary/5 text-primary" :
                            "border-border/30 bg-muted/10 text-muted-foreground"
                      )}
                    >
                      {done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> :
                        running ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> :
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current opacity-40" />}
                      <span className="font-medium">{s.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Results */}
          <div ref={resultsRef} className="flex-1 flex flex-col overflow-y-auto px-6 py-6 space-y-5">

            {/* Empty idle state */}
            {!hasResult && !isProcessing && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="relative animate-float">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <BrainCircuit className="h-9 w-9 text-primary" />
                  </div>
                  <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <p className="font-semibold text-sm">Select a language and speak</p>
                  <p className="text-xs text-muted-foreground">
                    Our Agentic AI will transcribe, translate to English, and generate a clinical summary in real time.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
                  {['Transcription', 'Translation', 'AI Summary', 'TTS Playback'].map(f => (
                    <span key={f} className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-primary" />{f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Transcription */}
            <AnimatePresence>
              {transcribedText && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Source · {currentLang}
                    </p>
                    <button
                      onClick={() => copyText(transcribedText, 'source')}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedField === 'source' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedField === 'source' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {transcribedText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Translation */}
            <AnimatePresence>
              {translatedText && (
                <motion.div
                  key="translation"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Translation · English
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyText(translatedText, 'translation')}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedField === 'translation' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedField === 'translation' ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={handlePlayTTS}
                        disabled={isPlayingTTS || isRecording}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                      >
                        <Play className="h-3 w-3" />
                        {isPlayingTTS ? 'Playing…' : 'Play'}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ boxShadow: '0 0 20px hsl(191 97% 58% / 0.06)' }}>
                    {translatedText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Summary */}
            <AnimatePresence>
              {summaryText && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      AI Clinical Summary
                    </p>
                    <button
                      onClick={() => copyText(summaryText, 'summary')}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedField === 'summary' ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedField === 'summary' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-card/60 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {summaryText}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action row: Download / Save / Clear */}
            <AnimatePresence>
              {processingStep === 'completed' && (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30"
                >
                  {sessionSaved ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Session saved to recordings
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleSave}
                      className="btn-neural flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Session
                    </motion.button>
                  )}
                  <button
                    onClick={downloadTranscript}
                    className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .txt
                  </button>
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all ml-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    New Session
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-t border-border/30 px-6 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <p className="text-[10px] text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">Agentic AI</span> ·
            Transcription → Translation → Clinical Summary · All data encrypted
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
