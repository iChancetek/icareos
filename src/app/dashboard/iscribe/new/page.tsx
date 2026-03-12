"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, StopCircle, Save, Loader2, AlertTriangle, CheckCircle2, Languages, ArrowLeft, BrainCircuit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import type { PipelineUpdate, PipelineStepName } from '@/agents/orchestratorAgent';
import { translateText } from '@/actions/ai/translate-text-flow';
import { sendDataToHubSpot } from '@/services/hubspotService';
import type { IScribe } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WaveformOrb } from '@/components/ui/WaveformOrb';
import { AgentPipelineTracker, type AgentStep } from '@/components/ui/AgentPipelineTracker';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

// Define MediaRecorderErrorEvent & BlobEvent for TS
interface MediaRecorderErrorEvent extends Event { readonly error: DOMException; }
interface BlobEvent extends Event { readonly data: Blob; readonly timecode: number; }

const INITIAL_PIPELINE: AgentStep[] = [
  { name: 'Transcription', shortName: 'Transcribe', status: 'pending' },
  { name: 'NLP Extraction', shortName: 'NLP', status: 'pending' },
  { name: 'SOAP Generation', shortName: 'SOAP', status: 'pending' },
  { name: 'Risk Assessment', shortName: 'Risk', status: 'pending' },
  { name: 'Billing Codes', shortName: 'Billing', status: 'pending' },
  { name: 'Compliance Check', shortName: 'Compliance', status: 'pending' },
];

const SPECIALTIES = [
  'General / Unspecified', 'Internal Medicine', 'Emergency Medicine', 'Cardiology',
  'Pediatrics', 'Orthopedics', 'Psychiatry', 'Neurology', 'Oncology', 'Family Medicine',
];

const LANGUAGES = ['None (Keep Original)', 'English', 'Spanish', 'French', 'German'];

export default function NewIScribePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, saveIScribe } = useAuth();

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [progress, setProgress] = useState(0);
  const [patientName, setPatientName] = useState('');
  const [specialty, setSpecialty] = useState('none');
  const [targetTranslationLanguage, setTargetTranslationLanguage] = useState('none');
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [pipeline, setPipeline] = useState<AgentStep[]>(INITIAL_PIPELINE);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const effectiveMimeTypeRef = useRef<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mic permission
  useEffect(() => {
    const check = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        s.getTracks().forEach(t => t.stop());
      } catch {
        setHasMicPermission(false);
        toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Enable microphone permissions and refresh.' });
      } finally { setIsPermissionChecked(true); }
    };
    if (navigator?.mediaDevices && !isPermissionChecked) check();
    else if (!navigator?.mediaDevices) { setHasMicPermission(false); setIsPermissionChecked(true); }
  }, [isPermissionChecked, toast]);

  // Recording timer
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingState === 'idle') setRecordingDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordingState]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const updatePipeline = (index: number, patch: Partial<AgentStep>) =>
    setPipeline(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));

  // ── Start Recording ──────────────────────────────────────────
  const handleStartRecording = async () => {
    if (!patientName.trim()) { toast({ title: "Patient Name Required", variant: "destructive" }); return; }
    if (!hasMicPermission) { toast({ title: "Microphone Required", variant: "destructive" }); return; }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setAudioDataUri(null);
      setPipeline(INITIAL_PIPELINE);

      const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/aac'];
      const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';

      try {
        mediaRecorderRef.current = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        effectiveMimeTypeRef.current = mediaRecorderRef.current.mimeType;
      } catch (err) {
        toast({ title: "Recording Error", description: (err as Error).message, variant: "destructive" });
        stream.getTracks().forEach(t => t.stop());
        setRecordingState('error');
        return;
      }

      mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onerror = (e: Event) => {
        const err = (e as MediaRecorderErrorEvent).error;
        toast({ title: "Recording Error", description: err?.message || 'Unknown error', variant: "destructive" });
        setRecordingState('error');
        stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.onstop = () => {
        const actualMime = effectiveMimeTypeRef.current || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMime });
        if (blob.size === 0) {
          toast({ title: "No Audio Recorded", description: "Please try again and speak clearly.", variant: "destructive" });
          setRecordingState('idle'); setAudioDataUri(null); setProgress(0);
          stream?.getTracks().forEach(t => t.stop());
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          setAudioDataUri(reader.result as string);
          setRecordingState('idle');
          setProgress(100);
          setCurrentStepMessage("Recording complete — ready to process.");
          toast({ title: "Recording Ready", description: `${Math.round(blob.size / 1024)} KB captured` });
        };
        stream?.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start();
      setRecordingState('recording');
      setProgress(0);
      setCurrentStepMessage('Recording in progress...');
      toast({ title: "Recording Started" });
    } catch (err: any) {
      toast({ title: "Recording Error", description: err.message || 'Unknown error', variant: "destructive" });
      setRecordingState('error');
      setCurrentStepMessage(`Failed: ${err.message}`);
      stream?.getTracks().forEach(t => t.stop());
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    else if (recordingState === 'recording') {
      setRecordingState('idle');
      toast({ title: "Recording Stopped" });
    }
  };

  // ── Process + Save ───────────────────────────────────────────
  const handleSaveIScribe = async () => {
    if (!patientName.trim()) { toast({ title: "Patient Name Required", variant: "destructive" }); return; }
    if (!audioDataUri) { toast({ title: "No Audio", variant: "destructive" }); return; }
    if (!audioDataUri.startsWith('data:audio/')) { toast({ title: "Invalid Audio", variant: "destructive" }); setRecordingState('error'); return; }
    if (!user) { toast({ title: "Not Authenticated", variant: "destructive" }); return; }

    setRecordingState('processing');
    setProgress(5);
    setCurrentStepMessage('Initialising iCareOS clinical intelligence agents...');

    const STEP_INDEX: Record<PipelineStepName, number> = {
      'Transcription': 0,
      'NLP Extraction': 1,
      'SOAP Generation': 2,
      'Risk Assessment': 3,
      'Billing Codes': 4,
      'Compliance Check': 5,
    };

    // Applies a pipeline update event to local UI state
    const applyPipelineUpdate = (update: PipelineUpdate) => {
      const idx = STEP_INDEX[update.step];
      if (idx === undefined) return;
      updatePipeline(idx, {
        status: update.status,
        ...(update.confidence !== undefined ? { confidence: update.confidence } : {}),
      });
      if (update.status === 'running') setCurrentStepMessage(`Running ${update.step}...`);
      if (update.status === 'done') setCurrentStepMessage(`${update.step} complete ✓`);
      if (update.status === 'error') setCurrentStepMessage(`${update.step} degraded — session continuing...`);
    };

    try {
      // ─ POST to the SSE API Route — fully serializable, no Server Action boundary
      const res = await fetch('/api/iscribe/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioDataUri,
          specialty: specialty !== 'none' ? specialty : undefined,
          language: targetTranslationLanguage !== 'none' ? targetTranslationLanguage : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Network error');
        throw new Error(`Pipeline request failed (${res.status}): ${errText}`);
      }

      // ─ Read SSE stream synchronously until 'complete' or 'error'
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let session: any = null;
      let doneCount = 0;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newline
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const eventLine = part.match(/^event: (\S+)/m);
          // Extract data field without 's' flag (ES2017 target)
          const dataPrefix = 'data: ';
          const dataStart = part.indexOf(dataPrefix);
          if (!eventLine || dataStart === -1) continue;
          const dataRaw = part.slice(dataStart + dataPrefix.length).split('\n')[0].trim();

          const eventName = eventLine[1];
          const payload = JSON.parse(dataRaw);

          if (eventName === 'pipeline_update') {
            applyPipelineUpdate(payload as PipelineUpdate);
            if ((payload as PipelineUpdate).status === 'done') {
              doneCount++;
              setProgress(5 + Math.round((doneCount / 6) * 70));
            }
          } else if (eventName === 'complete') {
            session = payload;
            break outer;
          } else if (eventName === 'error') {
            throw new Error(payload.message ?? 'Pipeline error');
          }
        }
      }

      if (!session) throw new Error('Pipeline completed without returning a session.');

      // Mark all pipeline steps as done with their final confidence scores
      setPipeline(INITIAL_PIPELINE.map((s, i) => ({
        ...s,
        status: 'done',
        confidence: [
          session.transcription.meta.confidence,
          session.nlp.meta.confidence,
          session.soap.meta.confidence,
          session.risk.meta.confidence,
          session.billing.meta.confidence,
          session.compliance.meta.confidence,
        ][i],
      })));
      setProgress(75);
      setCurrentStepMessage('Agents complete. Saving record...');

      let translatedTranscript: string | undefined;
      let finalTranslationLanguage: string | undefined;
      if (targetTranslationLanguage !== 'none' && session.transcription.transcript.trim()) {
        try {
          const tr = await translateText({ text: session.transcription.transcript, targetLanguage: targetTranslationLanguage });
          translatedTranscript = tr.translatedText;
          finalTranslationLanguage = targetTranslationLanguage;
        } catch { toast({ title: "Translation skipped", variant: "default" }); }
      }

      const iScribeToSave: Omit<IScribe, 'id' | 'userId'> = {
        patientName,
        date: new Date().toISOString(),
        status: 'Completed',
        transcript: session.transcription.transcript,
        summary: session.soap.structuredSummary,
        audioDataUri,
        translatedTranscript,
        translatedTranscriptLanguage: finalTranslationLanguage,
        soapNote: session.soap.soap,
        laymanSummary: session.soap.laymanSummary,
        icdCodes: session.billing.icdCodes,
        cptCodes: session.billing.cptCodes,
        riskLevel: session.risk.riskLevel,
        riskScore: session.risk.riskScore,
        riskFactors: session.risk.riskFactors,
        overallConfidence: session.meta.overallConfidence,
        requiresHumanReview: session.meta.requiresHumanReview,
        agentSessionId: session.meta.sessionId,
        agentLatency_ms: session.meta.totalLatency_ms,
        specialty: specialty !== 'none' ? specialty : undefined,
      };

      const newId = await saveIScribe(iScribeToSave);
      if (!newId) throw new Error('Failed to save record.');

      sendDataToHubSpot({ ...iScribeToSave, id: newId, userId: user.uid }, audioDataUri).catch(() => { });
      setProgress(100);
      setRecordingState('success');
      setCurrentStepMessage('Session complete!');
      toast({ title: 'Session Complete', description: `Confidence: ${Math.round((session.meta.overallConfidence ?? 0) * 100)}%` });
      setTimeout(() => router.push(`/dashboard/iscribe/${newId}`), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setRecordingState('error');
      setCurrentStepMessage(`Error: ${msg}`);
      setPipeline(p => p.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
      toast({ title: 'Processing Error', description: msg, variant: 'destructive', duration: 7000 });
    }
  };

  const canRecord = isPermissionChecked && hasMicPermission && patientName.trim().length > 0;
  const isDisabled = recordingState === 'processing' || recordingState === 'recording';

  return (
    <div className="min-h-screen px-4 md:px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <Link href="/dashboard/iscribe">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">New iScribe Session</h1>
            <p className="text-xs text-muted-foreground">6-agent AI clinical documentation · MediScribe AI</p>
          </div>
        </motion.div>

        {/* 3-Panel Grid */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT PANEL: Session Config ─── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="glass neural-border rounded-2xl p-6 space-y-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-[10px] font-black text-primary">01</span>
                </div>
                <h2 className="text-sm font-semibold">Session Details</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Patient Name *
                  </Label>
                  <Input
                    id="patientName"
                    placeholder="Full name"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    disabled={isDisabled}
                    className="bg-background/50 border-border/60 focus:border-primary/50 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Clinical Specialty
                  </Label>
                  <Select value={specialty} onValueChange={setSpecialty} disabled={isDisabled}>
                    <SelectTrigger className="bg-background/50 border-border/60 rounded-xl text-sm">
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General / Unspecified</SelectItem>
                      {SPECIALTIES.slice(1).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Translate Transcript
                  </Label>
                  <Select value={targetTranslationLanguage} onValueChange={setTargetTranslationLanguage} disabled={isDisabled}>
                    <SelectTrigger className="bg-background/50 border-border/60 rounded-xl text-sm">
                      <Languages className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Keep Original)</SelectItem>
                      {LANGUAGES.slice(1).map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Mic permission status */}
            <div className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs",
              hasMicPermission
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                : "border-red-500/20 bg-red-500/5 text-red-400"
            )}>
              {hasMicPermission
                ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Microphone ready</>
                : <><AlertTriangle className="h-3.5 w-3.5" />Microphone unavailable</>
              }
            </div>

            {/* Recorded audio preview */}
            {audioDataUri && recordingState === 'idle' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Preview</p>
                <audio controls src={audioDataUri} className="w-full h-9 rounded-xl" />
              </div>
            )}
          </motion.div>

          {/* ── CENTER PANEL: Orb + Controls ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="glass neural-border rounded-2xl p-6 flex flex-col items-center justify-between gap-6"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-black text-primary">02</span>
              </div>
              <h2 className="text-sm font-semibold">Live Recording</h2>
              {recordingState === 'recording' && (
                <span className="ml-auto font-mono text-xs text-red-400">{formatDuration(recordingDuration)}</span>
              )}
            </div>

            {/* Waveform Orb */}
            <div className="flex-1 flex items-center justify-center py-4">
              <WaveformOrb state={recordingState} size={160} />
            </div>

            {/* Status message */}
            <AnimatePresence mode="wait">
              {currentStepMessage && (
                <motion.p
                  key={currentStepMessage}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-center text-muted-foreground max-w-xs"
                >
                  {currentStepMessage}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            {(recordingState === 'processing' || recordingState === 'success') && (
              <div className="w-full space-y-1.5">
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    style={{ boxShadow: "0 0 8px hsl(191 97% 58% / 0.6)" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <p className="text-right text-[10px] text-muted-foreground font-mono">{progress}%</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="w-full space-y-2">
              {recordingState === 'idle' && !audioDataUri && (
                <motion.button
                  whileHover={canRecord ? { scale: 1.03 } : {}}
                  whileTap={canRecord ? { scale: 0.97 } : {}}
                  onClick={handleStartRecording}
                  disabled={!canRecord}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                    canRecord
                      ? "btn-neural"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <Mic className="h-4 w-4" />
                  Start Recording
                </motion.button>
              )}
              {recordingState === 'recording' && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStopRecording}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-red-500/90 text-white hover:bg-red-500 transition-all"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop Recording
                </motion.button>
              )}
              {recordingState === 'idle' && audioDataUri && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveIScribe}
                  disabled={!patientName.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold btn-neural"
                >
                  <BrainCircuit className="h-4 w-4" />
                  Run AI Agents & Save
                </motion.button>
              )}
              {(recordingState === 'error') && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setRecordingState('idle'); setProgress(0);
                    setCurrentStepMessage(''); setAudioDataUri(null);
                    audioChunksRef.current = []; effectiveMimeTypeRef.current = '';
                    setPipeline(INITIAL_PIPELINE);
                    setTargetTranslationLanguage('none');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-all"
                >
                  Try Again
                </motion.button>
              )}
              {recordingState === 'success' && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Redirecting to your session...
                </div>
              )}
            </div>
          </motion.div>

          {/* ── RIGHT PANEL: Agent Pipeline ─── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="glass neural-border rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-black text-primary">03</span>
              </div>
              <h2 className="text-sm font-semibold">AI Agent Pipeline</h2>
            </div>

            <AgentPipelineTracker steps={pipeline} />

            {/* Model info */}
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>MediScribe AI · Parallel execution</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                Agents run in two stages: Transcription → (NLP + SOAP in parallel) → (Risk + Billing + Compliance in parallel).
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
