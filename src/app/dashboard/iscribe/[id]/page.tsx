
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, FileText, MessageSquare, Download, Edit3, Trash2, Loader2, PlayCircle, Languages, MessageCircle, StopCircle, Volume2, ShieldCheck, CreditCard, BrainCircuit } from 'lucide-react';
import type { IScribe } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { translateText } from '@/actions/ai/translate-text-flow';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const riskColors = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-700",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-700",
  high: "bg-orange-500/20 text-orange-400 border-orange-700",
  critical: "bg-red-500/20 text-red-400 border-red-700",
};

export default function IScribeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { getIScribeById, updateIScribe, deleteIScribe } = useAuth();

  const [iscribe, setIScribe] = useState<IScribe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editableSummary, setEditableSummary] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');

  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [isTranslatingSummary, setIsTranslatingSummary] = useState(false);
  const [summaryDisplayLanguage, setSummaryDisplayLanguage] = useState('original');

  const [translatedOriginalTranscript, setTranslatedOriginalTranscript] = useState<string | null>(null);
  const [isTranslatingOriginalTranscript, setIsTranslatingOriginalTranscript] = useState(false);
  const [originalTranscriptDisplayLanguage, setOriginalTranscriptDisplayLanguage] = useState('original');

  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);
  const [ttsSummaryLanguage, setTtsSummaryLanguage] = useState('en-US');
  const [showAIPanel, setShowAIPanel] = useState(false);

  const fetchIScribe = useCallback(async () => {
    if (id) {
      setIsLoading(true);
      const foundIScribe = await getIScribeById(id);
      if (!foundIScribe) {
        toast({ title: "iScribe Not Found", variant: "destructive" });
        router.push('/dashboard/iscribes');
        return;
      }
      setIScribe(foundIScribe);
      setEditableSummary(foundIScribe.summary || '');
      setEditableTranscript(foundIScribe.transcript || '');
      setIsLoading(false);
    }
  }, [id, getIScribeById, router, toast]);

  useEffect(() => {
    fetchIScribe();
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id, fetchIScribe]);

  const handleSaveSummary = async () => {
    if (!iscribe) return;
    const success = await updateIScribe(iscribe.id, { summary: editableSummary });
    if (success) {
      setIScribe(prev => prev ? { ...prev, summary: editableSummary } : null);
      setIsEditingSummary(false);
      setTranslatedSummary(null);
      setSummaryDisplayLanguage("original");
      toast({ title: "Summary Updated" });
    } else {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleSaveTranscript = async () => {
    if (!iscribe) return;
    const success = await updateIScribe(iscribe.id, { transcript: editableTranscript });
    if (success) {
      setIScribe(prev => prev ? { ...prev, transcript: editableTranscript } : null);
      setIsEditingTranscript(false);
      setTranslatedOriginalTranscript(null);
      setOriginalTranscriptDisplayLanguage("original");
      toast({ title: "Transcript Updated" });
    } else {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDeleteIScribe = async () => {
    if (!iscribe) return;
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    const success = await deleteIScribe(id);
    if (success) {
      toast({ title: "iScribe Deleted" });
      router.push('/dashboard/iscribes');
    } else {
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const handleDownloadIScribe = () => {
    if (!iscribe) return;
    const { patientName, date } = iscribe;
    const summaryToDownload = summaryDisplayLanguage !== 'original' && translatedSummary ? translatedSummary : iscribe.summary;
    const formattedDate = format(new Date(date), "yyyy-MM-dd_HH-mm");
    const filename = `iscribe_${patientName.replace(/\s+/g, '_')}_${formattedDate}.txt`;

    let content = `Patient: ${patientName}\nDate: ${format(new Date(date), "PPP p")}\n\n`;
    if (iscribe.soapNote) {
      content += `SOAP NOTE:\nS: ${iscribe.soapNote.subjective}\nO: ${iscribe.soapNote.objective}\nA: ${iscribe.soapNote.assessment}\nP: ${iscribe.soapNote.plan}\n\n`;
    }
    content += `AI Summary:\n${summaryToDownload || ''}\n\nFull Transcript:\n${iscribe.transcript || ''}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Download Started" });
  };

  const handleTextTranslate = async (textType: 'summary' | 'originalTranscript', targetLanguage: string) => {
    if (!iscribe) return;
    const originalText = textType === 'summary' ? iscribe.summary : iscribe.transcript;
    if (!originalText?.trim() || targetLanguage === 'original') {
      if (textType === 'summary') { setSummaryDisplayLanguage('original'); setTranslatedSummary(null); }
      else { setOriginalTranscriptDisplayLanguage('original'); setTranslatedOriginalTranscript(null); }
      return;
    }
    textType === 'summary' ? setIsTranslatingSummary(true) : setIsTranslatingOriginalTranscript(true);
    try {
      const result = await translateText({ text: originalText, targetLanguage });
      if (textType === 'summary') { setTranslatedSummary(result.translatedText); setSummaryDisplayLanguage(targetLanguage); }
      else { setTranslatedOriginalTranscript(result.translatedText); setOriginalTranscriptDisplayLanguage(targetLanguage); }
    } catch {
      toast({ title: "Translation Failed", variant: "destructive" });
    } finally {
      textType === 'summary' ? setIsTranslatingSummary(false) : setIsTranslatingOriginalTranscript(false);
    }
  };

  const handleTogglePlayStopSummary = () => {
    if (!window.speechSynthesis) return;
    if (isSpeakingSummary) { window.speechSynthesis.cancel(); setIsSpeakingSummary(false); return; }
    const text = summaryTextToDisplay;
    if (!text?.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsSummaryLanguage;
    utterance.onend = () => setIsSpeakingSummary(false);
    utterance.onerror = () => setIsSpeakingSummary(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeakingSummary(true);
  };

  if (isLoading) return <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!iscribe) return <div className="text-center py-10">iScribe not found.</div>;

  const summaryTextToDisplay = summaryDisplayLanguage !== 'original' && translatedSummary !== null ? translatedSummary : (iscribe.summary || '');
  const originalTranscriptTextToDisplay = originalTranscriptDisplayLanguage !== 'original' && translatedOriginalTranscript !== null ? translatedOriginalTranscript : iscribe.transcript;

  return (
    <div className="container mx-auto py-8 px-4 md:px-0 space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard/iscribes')} className="shadow hover:shadow-md">
        <ArrowLeft className="mr-2 h-4 w-4" />Back to iScribes
      </Button>

      {/* Header Card */}
      <Card className="shadow-xl bg-card/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-3xl font-bold">{iscribe.patientName}</CardTitle>
              <CardDescription>
                {format(new Date(iscribe.date), "PPP p")}
                {iscribe.specialty && <span className="ml-2 text-primary">· {iscribe.specialty}</span>}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {iscribe.riskLevel && (
                <Badge className={cn("border text-xs font-semibold capitalize", riskColors[iscribe.riskLevel])}>
                  {iscribe.riskLevel} risk {iscribe.riskScore != null ? `(${iscribe.riskScore})` : ''}
                </Badge>
              )}
              {iscribe.overallConfidence != null && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(iscribe.overallConfidence * 100)}% confidence
                </Badge>
              )}
              {iscribe.requiresHumanReview && (
                <Badge className="bg-yellow-900 text-yellow-300 border-yellow-700 text-xs">⚠ Review Needed</Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleDownloadIScribe}><Download className="mr-2 h-4 w-4" />Download</Button>
              <Button variant="outline" size="sm" onClick={() => setShowAIPanel(p => !p)}>
                <BrainCircuit className="mr-2 h-4 w-4" />{showAIPanel ? 'Hide' : 'AI Report'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete iScribe?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the record for {iscribe.patientName}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteIScribe}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* SOAP Note */}
          {iscribe.soapNote && (
            <Card className="shadow-lg bg-card/80">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />SOAP Note
                </CardTitle>
                {iscribe.soapNote.chiefComplaint && (
                  <CardDescription>Chief Complaint: {iscribe.soapNote.chiefComplaint}</CardDescription>
                )}
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 grid sm:grid-cols-2 gap-5">
                {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
                  <div key={section} className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{section}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{iscribe.soapNote![section]}</p>
                  </div>
                ))}
                {iscribe.soapNote.differentialDiagnoses && iscribe.soapNote.differentialDiagnoses.length > 0 && (
                  <div className="sm:col-span-2 space-y-1 border-t pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Differential Diagnoses</h3>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                      {iscribe.soapNote.differentialDiagnoses.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ICD / CPT Codes */}
          {(iscribe.icdCodes?.length || iscribe.cptCodes?.length) ? (
            <Card className="shadow-lg bg-card/80">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />Billing Codes
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 grid sm:grid-cols-2 gap-6">
                {iscribe.icdCodes && iscribe.icdCodes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ICD-10</h3>
                    <div className="space-y-1.5">
                      {iscribe.icdCodes.map((c, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs">
                          <span className={cn("font-mono font-bold mr-2", c.type === 'primary' ? 'text-primary' : 'text-muted-foreground')}>{c.code}</span>
                          <span className="text-muted-foreground flex-1 truncate">{c.description}</span>
                          <span className="ml-2 text-muted-foreground shrink-0">{Math.round(c.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {iscribe.cptCodes && iscribe.cptCodes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CPT</h3>
                    <div className="space-y-1.5">
                      {iscribe.cptCodes.map((c, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs">
                          <span className="font-mono font-bold mr-2 text-blue-400">{c.code}</span>
                          <span className="text-muted-foreground flex-1 truncate">{c.description}</span>
                          <span className="ml-2 text-muted-foreground shrink-0">{Math.round(c.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Summary + Transcript */}
          <Card className="shadow-xl bg-card/80">
            <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
              {/* Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />AI Summary</h2>
                  <div className="flex items-center gap-2">
                    {!isEditingSummary ? (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingSummary(true)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={handleSaveSummary}>Save</Button>
                        <Button variant="outline" size="sm" onClick={() => { setIsEditingSummary(false); setEditableSummary(iscribe.summary || ''); }}>Cancel</Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={handleTogglePlayStopSummary} variant="outline" size="sm" disabled={isEditingSummary}>
                    {isSpeakingSummary ? <StopCircle className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                    {isSpeakingSummary ? 'Stop' : 'Listen'}
                  </Button>
                  <Select value={ttsSummaryLanguage} onValueChange={setTtsSummaryLanguage}>
                    <SelectTrigger className="w-[110px] text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                  {isTranslatingSummary && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Select value={summaryDisplayLanguage} onValueChange={(v) => handleTextTranslate('summary', v)}>
                    <SelectTrigger className="w-[140px] text-xs h-9"><Languages className="mr-1 h-3.5 w-3.5 opacity-70" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      <SelectItem value="Spanish">To Spanish</SelectItem>
                      <SelectItem value="English">To English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isEditingSummary ? (
                  <Textarea value={editableSummary} onChange={(e) => setEditableSummary(e.target.value)} rows={10} className="text-sm" />
                ) : (
                  <ScrollArea className="h-56 rounded-md border p-4 bg-accent/30">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{summaryTextToDisplay || 'No summary available.'}</p>
                  </ScrollArea>
                )}
                {iscribe.laymanSummary && (
                  <div className="rounded-lg border border-blue-800 bg-blue-950/40 p-3">
                    <p className="text-xs font-semibold text-blue-400 mb-1">Patient-Friendly Summary</p>
                    <p className="text-xs text-muted-foreground">{iscribe.laymanSummary}</p>
                  </div>
                )}
              </div>

              {/* Full Transcript */}
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" />Transcript</h2>
                  <div className="flex items-center gap-2">
                    {isTranslatingOriginalTranscript && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Select value={originalTranscriptDisplayLanguage} onValueChange={(v) => handleTextTranslate('originalTranscript', v)}>
                      <SelectTrigger className="w-[140px] text-xs h-9"><Languages className="mr-1 h-3.5 w-3.5 opacity-70" /><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="Spanish">To Spanish</SelectItem>
                        <SelectItem value="English">To English</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isEditingTranscript ? (
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingTranscript(true)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" onClick={handleSaveTranscript}>Save</Button>
                        <Button variant="outline" size="sm" onClick={() => { setIsEditingTranscript(false); setEditableTranscript(iscribe.transcript || ''); }}>Cancel</Button>
                      </div>
                    )}
                  </div>
                </div>
                {isEditingTranscript ? (
                  <Textarea value={editableTranscript} onChange={(e) => setEditableTranscript(e.target.value)} rows={14} className="text-sm" />
                ) : (
                  <ScrollArea className="h-64 rounded-md border p-4 bg-background/50">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{originalTranscriptTextToDisplay || 'No transcript available.'}</p>
                  </ScrollArea>
                )}
              </div>

              {/* Initial Translation */}
              {iscribe.translatedTranscript && iscribe.translatedTranscriptLanguage && (
                <div className="md:col-span-2 pt-4 border-t space-y-3">
                  <h2 className="text-xl font-semibold flex items-center"><MessageCircle className="mr-2 h-5 w-5 text-primary" />Initial Translation ({iscribe.translatedTranscriptLanguage})</h2>
                  <ScrollArea className="h-48 rounded-md border p-4 bg-background/40">
                    <p className="text-sm whitespace-pre-wrap">{iscribe.translatedTranscript}</p>
                  </ScrollArea>
                </div>
              )}

              {/* Audio */}
              <div className="md:col-span-2 pt-4 border-t space-y-3">
                <h2 className="text-xl font-semibold flex items-center"><PlayCircle className="mr-2 h-5 w-5 text-primary" />Audio Recording</h2>
                {iscribe.audioDataUri ? (
                  <audio controls src={iscribe.audioDataUri} className="w-full rounded-md" />
                ) : (
                  <p className="text-muted-foreground text-sm">No audio recording available.</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <p className="text-xs text-muted-foreground w-full text-center">
                AI-generated. Review by a medical professional is required.
                {iscribe.agentSessionId && <span className="ml-2 font-mono opacity-50">{iscribe.agentSessionId}</span>}
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* AI Intelligence Sidebar */}
        {showAIPanel && iscribe.riskLevel && (
          <div className="xl:col-span-1">
            <Card className="shadow-xl bg-card/80 sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />AI Intelligence Report
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-4">
                {/* Risk */}
                <div>
                  <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-2">Risk Level</p>
                  <div className={cn("flex items-center justify-between rounded-lg border px-4 py-2.5", riskColors[iscribe.riskLevel])}>
                    <span className="font-bold capitalize text-sm">{iscribe.riskLevel}</span>
                    <span className="text-xl font-black">{iscribe.riskScore}</span>
                  </div>
                  {iscribe.riskFactors && iscribe.riskFactors.slice(0, 3).map((f, i) => (
                    <p key={i} className="text-xs text-muted-foreground mt-1">● {f.factor}</p>
                  ))}
                </div>
                {/* Confidence */}
                <div>
                  <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-2">Overall Confidence</p>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", (iscribe.overallConfidence ?? 0) >= 0.8 ? 'bg-emerald-500' : (iscribe.overallConfidence ?? 0) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500')}
                      style={{ width: `${Math.round((iscribe.overallConfidence ?? 0) * 100)}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground mt-1">{Math.round((iscribe.overallConfidence ?? 0) * 100)}%</p>
                </div>
                {/* Processing */}
                {iscribe.agentLatency_ms && (
                  <div>
                    <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-1">Processing Time</p>
                    <p className="text-sm text-muted-foreground">{(iscribe.agentLatency_ms / 1000).toFixed(1)}s · MediScribe AI</p>
                  </div>
                )}
                {iscribe.requiresHumanReview && (
                  <div className="rounded-lg border border-yellow-700 bg-yellow-950/40 p-3 text-xs text-yellow-300">
                    ⚠️ <strong>Clinician review recommended</strong> by one or more agents.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
