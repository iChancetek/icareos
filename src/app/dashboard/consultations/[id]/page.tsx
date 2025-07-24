
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, FileText, MessageSquare, Download, Edit3, Trash2, Loader2, PlayCircle, Languages, MessageCircle, Play, StopCircle, Volume2 } from 'lucide-react';
import type { Consultation } from '@/types';
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
import { translateText } from '@/ai/flows/translate-text-flow';


export default function ConsultationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { getConsultationById, updateConsultation, deleteConsultation } = useAuth();


  const [consultation, setConsultation] = useState<Consultation | null>(null);
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

  const fetchConsultation = useCallback(async () => {
    if (id) {
        setIsLoading(true);
        const foundConsultation = await getConsultationById(id);
        
        if (!foundConsultation) {
            toast({
                title: "Consultation Not Found",
                description: "Could not find the requested consultation. It may have been deleted or you may not have access.",
                variant: "destructive"
            });
            router.push('/dashboard/consultations');
            return;
        }
        
        setConsultation(foundConsultation);
        setEditableSummary(foundConsultation.summary || '');
        setEditableTranscript(foundConsultation.transcript || '');
        
        setIsLoading(false);
    }
  }, [id, getConsultationById, router, toast]);

  useEffect(() => {
    fetchConsultation();

    // Cleanup TTS when component unmounts or id changes
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeakingSummary(false);
      }
    };
  }, [id, fetchConsultation]);

  const handleSaveSummary = async () => {
    if (!consultation) return;
    const success = await updateConsultation(consultation.id, { summary: editableSummary });
    if (success) {
      setConsultation(prev => prev ? { ...prev, summary: editableSummary } : null);
      setIsEditingSummary(false);
      setTranslatedSummary(null);
      setSummaryDisplayLanguage("original");
      toast({ title: "Summary Updated", description: "Your changes have been saved." });
    } else {
        toast({ title: "Update Failed", description: "Could not save the summary. Please try again.", variant: "destructive" });
    }
  };

  const handleSaveTranscript = async () => {
     if (!consultation) return;
    const success = await updateConsultation(consultation.id, { transcript: editableTranscript });
    if(success) {
        setConsultation(prev => prev ? { ...prev, transcript: editableTranscript } : null);
        setIsEditingTranscript(false);
        setTranslatedOriginalTranscript(null);
        setOriginalTranscriptDisplayLanguage("original");
        toast({ title: "Transcript Updated", description: "Your changes have been saved." });
    } else {
        toast({ title: "Update Failed", description: "Could not save the transcript. Please try again.", variant: "destructive" });
    }
  };

  const handleDeleteConsultation = async () => {
    if (!consultation) return;
    
    // Stop any active speech before deleting
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeakingSummary(false);
    }

    const success = await deleteConsultation(id);
    if(success) {
        toast({ title: "Consultation Deleted", description: `Consultation for ${consultation?.patientName} has been removed.` });
        router.push('/dashboard/consultations');
    } else {
        toast({ title: "Delete Failed", description: "Could not delete the consultation. Please try again.", variant: "destructive" });
    }
  };

  const handleDownloadConsultation = () => {
    if (!consultation) return;

    const { patientName, date } = consultation;
    const summaryToDownload = summaryDisplayLanguage !== 'original' && translatedSummary ? translatedSummary : consultation.summary;
    const originalTranscriptToDownload = originalTranscriptDisplayLanguage !== 'original' && translatedOriginalTranscript ? translatedOriginalTranscript : consultation.transcript;

    const formattedDate = format(new Date(date), "yyyy-MM-dd_HH-mm");
    const filename = `consultation_${patientName.replace(/\s+/g, '_')}_${formattedDate}.txt`;

    let content = `Patient Name: ${patientName}\nConsultation Date: ${format(new Date(date), "PPP p")}\n\nAI Summary (${summaryDisplayLanguage === 'original' ? 'Original' : summaryDisplayLanguage}):\n--------------------------------------------------\n${summaryToDownload || 'No summary available.'}\n\nFull Transcript (${originalTranscriptDisplayLanguage === 'original' ? 'Original' : originalTranscriptDisplayLanguage}):\n--------------------------------------------------\n${originalTranscriptToDownload || 'No transcript available.'}\n`;

    if (consultation.translatedTranscript && consultation.translatedTranscriptLanguage) {
      content += `\nInitial Translation (${consultation.translatedTranscriptLanguage}):\n--------------------------------------------------\n${consultation.translatedTranscript}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Download Started", description: `Downloading ${filename}` });
  };

  const handleTextTranslate = async (
    textType: 'summary' | 'originalTranscript',
    targetLanguage: string
  ) => {
    if (!consultation) return;

    const originalText = textType === 'summary' ? consultation.summary : consultation.transcript;

    if (!originalText?.trim()) {
      toast({ title: "Nothing to Translate", description: `The ${textType === 'summary' ? 'summary' : 'original transcript'} is empty.`, variant: "default" });
      if (textType === 'summary') {
        setSummaryDisplayLanguage(targetLanguage);
        setTranslatedSummary("");
      } else {
        setOriginalTranscriptDisplayLanguage(targetLanguage);
        setTranslatedOriginalTranscript("");
      }
      return;
    }

    if (targetLanguage === 'original') {
      if (textType === 'summary') {
        setSummaryDisplayLanguage('original');
        setTranslatedSummary(null);
      } else {
        setOriginalTranscriptDisplayLanguage('original');
        setTranslatedOriginalTranscript(null);
      }
      return;
    }

    if (textType === 'summary') {
      setIsTranslatingSummary(true);
      // If summary is currently being spoken, stop it before translating
      if (isSpeakingSummary) {
        window.speechSynthesis.cancel();
        setIsSpeakingSummary(false);
      }
    } else {
      setIsTranslatingOriginalTranscript(true);
    }

    try {
      const result = await translateText({ text: originalText, targetLanguage });
      if (textType === 'summary') {
        setTranslatedSummary(result.translatedText);
        setSummaryDisplayLanguage(targetLanguage);
      } else {
        setTranslatedOriginalTranscript(result.translatedText);
        setOriginalTranscriptDisplayLanguage(targetLanguage);
      }
      toast({ title: `${textType === 'summary' ? 'Summary' : 'Original Transcript'} Translated`, description: `Successfully translated to ${targetLanguage}.` });
    } catch (error) {
      console.error(`Error translating ${textType}:`, error);
      toast({ title: "Translation Failed", description: `Could not translate the ${textType === 'summary' ? 'summary' : 'original transcript'}. Please try again.`, variant: "destructive" });
    } finally {
      if (textType === 'summary') {
        setIsTranslatingSummary(false);
      } else {
        setIsTranslatingOriginalTranscript(false);
      }
    }
  };

  const handleTogglePlayStopSummary = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
      return;
    }

    if (isSpeakingSummary) {
      window.speechSynthesis.cancel();
      setIsSpeakingSummary(false);
    } else {
      const textToSpeak = summaryTextToDisplay;
      if (!textToSpeak || textToSpeak.trim() === 'No summary available.') {
        toast({ title: "Nothing to Play", description: "The summary is empty or unavailable.", variant: "default" });
        return;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = ttsSummaryLanguage;
      utterance.onend = () => {
        setIsSpeakingSummary(false);
      };
      utterance.onerror = (event) => {
        // Log more details from the event object
        console.error("Speech synthesis error. Event object:", event);
        if (event instanceof SpeechSynthesisErrorEvent) {
          console.error("Speech synthesis error code:", event.error);
          toast({ title: "TTS Error", description: `Could not play the summary. Error: ${event.error}`, variant: "destructive" });
        } else {
          toast({ title: "TTS Error", description: "Could not play the summary due to an unknown speech error.", variant: "destructive" });
        }
        setIsSpeakingSummary(false);
      };
      
      // Cancel any previous speech before starting new
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsSpeakingSummary(true);
    }
  };

  const handleTtsLanguageChange = (lang: string) => {
    setTtsSummaryLanguage(lang);
    if (isSpeakingSummary) {
      window.speechSynthesis.cancel();
      setIsSpeakingSummary(false);
      // Optionally, you could auto-play with new language, but for now, user needs to press play again.
      toast({ title: "Speech Language Changed", description: `Next playback will be in ${lang === 'en-US' ? 'English' : 'Spanish'}. Press play to start.`});
    }
  };


  if (isLoading) {
    return <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!consultation) {
    return <div className="text-center py-10 text-white">Consultation not found. It may have been deleted or you may not have access.</div>;
  }

  const summaryTextToDisplay = summaryDisplayLanguage !== 'original' && translatedSummary !== null ? translatedSummary : (consultation.summary || '');
  const originalTranscriptTextToDisplay = originalTranscriptDisplayLanguage !== 'original' && translatedOriginalTranscript !== null ? translatedOriginalTranscript : consultation.transcript;

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Button variant="outline" onClick={() => router.push('/dashboard/consultations')} className="mb-6 shadow hover:shadow-md">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Consultations
      </Button>

      <Card className="shadow-xl mb-8 bg-card/80">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="text-3xl font-bold">{consultation.patientName}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="shadow-sm" onClick={handleDownloadConsultation}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shadow-sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      consultation data for {consultation.patientName}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConsultation}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <CardDescription>
            Consultation Date: {format(new Date(consultation.date), "PPP p")}
          </CardDescription>
        </CardHeader>
        
        <Separator />

        <CardContent className="pt-6 grid md:grid-cols-2 gap-8">
          {/* Summary Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-semibold flex items-center">
                <FileText className="mr-3 h-7 w-7 text-primary" />
                AI Summary
              </h2>
              <div className="flex items-center gap-2">
                {!isEditingSummary ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingSummary(true)} disabled={isSpeakingSummary || isTranslatingSummary}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={handleSaveSummary}>Save</Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsEditingSummary(false);
                      setEditableSummary(consultation.summary || '');
                    }}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* TTS and Text Translation Controls for Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleTogglePlayStopSummary} 
                    variant="outline" 
                    size="sm" 
                    disabled={isEditingSummary || isTranslatingSummary}
                    className="shadow-sm"
                  >
                    {isSpeakingSummary ? <StopCircle className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                    {isSpeakingSummary ? 'Stop' : 'Listen'}
                  </Button>
                  <Select
                    value={ttsSummaryLanguage}
                    onValueChange={handleTtsLanguageChange}
                    disabled={isEditingSummary || isTranslatingSummary || isSpeakingSummary}
                  >
                    <SelectTrigger className="w-auto sm:w-[120px] text-xs h-9" aria-label="Select speech language for summary">
                       <Languages className="mr-1 h-3.5 w-3.5 opacity-70" />
                      <SelectValue placeholder="Speech" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              <div className="flex items-center gap-2">
                 {isTranslatingSummary && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  <Select
                    value={summaryDisplayLanguage}
                    onValueChange={(value) => handleTextTranslate('summary', value)}
                    disabled={isEditingSummary || isTranslatingSummary || isSpeakingSummary}
                  >
                    <SelectTrigger className="w-auto sm:w-[160px] text-xs h-9" aria-label="Select display language for summary">
                       <Languages className="mr-1 h-3.5 w-3.5 opacity-70" />
                      <SelectValue placeholder="Translate Text" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Show Original</SelectItem>
                      <SelectItem value="Spanish">To Spanish</SelectItem>
                      <SelectItem value="English">To English</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>

            {isEditingSummary ? (
              <div className="space-y-2">
                <Label htmlFor="summary-edit" className="sr-only">Edit Summary</Label>
                <Textarea
                  id="summary-edit"
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                  rows={10}
                  className="text-base leading-relaxed bg-background/70 shadow-inner"
                />
              </div>
            ) : (
              <ScrollArea className="h-64 rounded-md border p-4 bg-accent/30 shadow-inner">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {summaryTextToDisplay || 'No summary available.'}
                </p>
              </ScrollArea>
            )}
          </div>

          {/* Original Transcript Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-semibold flex items-center">
                <MessageSquare className="mr-3 h-7 w-7 text-primary" />
                Full Transcript
              </h2>
              <div className="flex items-center gap-2">
                 {isTranslatingOriginalTranscript && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                <Select
                  value={originalTranscriptDisplayLanguage}
                  onValueChange={(value) => handleTextTranslate('originalTranscript', value)}
                  disabled={isEditingTranscript || isTranslatingOriginalTranscript}
                >
                  <SelectTrigger className="w-[180px] text-xs h-9" disabled={isEditingTranscript}>
                    <Languages className="mr-1 h-3.5 w-3.5 opacity-70" />
                    <SelectValue placeholder="Translate Text" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Show Original</SelectItem>
                    <SelectItem value="Spanish">To Spanish</SelectItem>
                    <SelectItem value="English">To English</SelectItem>
                  </SelectContent>
                </Select>
               {!isEditingTranscript ? (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingTranscript(true)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={handleSaveTranscript}>Save</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingTranscript(false);
                    setEditableTranscript(consultation.transcript || '');
                  }}>Cancel</Button>
                </div>
              )}
              </div>
            </div>
             {isEditingTranscript ? (
              <div className="space-y-2">
                <Label htmlFor="transcript-edit" className="sr-only">Edit Transcript</Label>
                <Textarea
                  id="transcript-edit"
                  value={editableTranscript}
                  onChange={(e) => setEditableTranscript(e.target.value)}
                  rows={15}
                  className="text-sm leading-relaxed bg-background/70 shadow-inner"
                />
              </div>
            ) : (
              <ScrollArea className="h-[26.5rem] rounded-md border p-4 bg-background/50 shadow-inner">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {originalTranscriptTextToDisplay || 'No transcript available.'}
                </p>
              </ScrollArea>
            )}
          </div>
          
          {/* Initial Translation Section */}
          {consultation.translatedTranscript && consultation.translatedTranscriptLanguage && (
            <div className="space-y-4 md:col-span-2 pt-4 border-t mt-8">
              <h2 className="text-2xl font-semibold flex items-center">
                <MessageCircle className="mr-3 h-7 w-7 text-primary" />
                Initial Translation ({consultation.translatedTranscriptLanguage})
              </h2>
              <ScrollArea className="h-64 rounded-md border p-4 bg-background/40 shadow-inner">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {consultation.translatedTranscript}
                </p>
              </ScrollArea>
            </div>
          )}

          {/* Audio Player Section */}
          <div className="space-y-4 md:col-span-2 pt-4 border-t mt-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold flex items-center">
                <PlayCircle className="mr-3 h-7 w-7 text-primary" />
                Audio Recording
              </h2>
            </div>
            {consultation.audioDataUri ? (
              <audio controls src={consultation.audioDataUri} className="w-full rounded-md shadow-inner bg-accent/10 p-2">
                Your browser does not support the audio element.
              </audio>
            ) : (
              <div className="rounded-md border p-4 bg-accent/30 shadow-inner">
                <p className="text-muted-foreground">No audio recording available for this consultation.</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 text-center">
            <p className="text-xs text-muted-foreground w-full">
                This information is AI-generated and should be reviewed by a medical professional.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
