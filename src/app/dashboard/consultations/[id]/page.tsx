
"use client";

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, FileText, MessageSquare, Download, Edit3, Trash2, Loader2, PlayCircle, Languages, MessageCircle, Play, StopCircle, Volume2 } from 'lucide-react';
import type { Consultation } from '@/types';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
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

// Mock data - replace with API call in a real app
const mockConsultations: Consultation[] = [
  {
    id: '1',
    patientName: 'John Doe',
    date: new Date(2023, 10, 15, 10, 30).toISOString(),
    status: 'Completed',
    transcript: `Doctor: Good morning, John. What brings you in today?\nJohn: Morning, Doctor. I've been having this persistent cough for about a week now, and I'm starting to feel quite fatigued.\nDoctor: I see. Any fever or body aches?\nJohn: Yes, a low-grade fever in the evenings, and my muscles feel a bit sore.\nDoctor: Alright, let's have a listen to your lungs... (Sound of stethoscope)... Lungs sound clear. It's likely a viral infection, common this time of year. I'd recommend plenty of rest, stay hydrated, and you can take some over-the-counter medication for the fever and aches. If it doesn't improve in 3-4 days, or if you feel worse, please come back.\nJohn: Okay, Doctor. Thank you.`,
    summary: 'Patient John Doe presented with a week-long persistent cough, fatigue, low-grade evening fevers, and muscle soreness. Lung examination was clear. Diagnosis points to a viral infection. Recommended treatment includes rest, hydration, and OTC medication for symptoms. Advised to return if no improvement in 3-4 days or if condition worsens.',
    audioDataUri: undefined,
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    date: new Date(2023, 10, 16, 14, 0).toISOString(),
    status: 'Completed',
    transcript: `Doctor: Hello Jane, good to see you. Here for your annual check-up?\nJane: Yes, Doctor. Everything's been fine, just the usual.\nDoctor: Excellent. Let's go over your vitals... Blood pressure is 120/80, heart rate is 70. All good. Any changes in your diet or exercise routine?\nJane: I've been trying to eat more vegetables and walk for 30 minutes a day.\nDoctor: That's great to hear, Jane. Keep it up. Your lab results from last week also look perfect. Continue with your healthy habits, and I'll see you next year unless anything comes up.\nJane: Wonderful. Thanks, Doctor!`,
    summary: 'Patient Jane Smith attended for an annual check-up. Vitals (BP 120/80, HR 70) are normal. Patient reports positive lifestyle changes including increased vegetable intake and daily walks. Recent lab results are perfect. Advised to continue healthy habits and schedule next check-up in a year.',
    audioDataUri: undefined,
  },
];


export default function ConsultationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

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


  useEffect(() => {
    if (id) {
      setIsLoading(true);
      // Simulating API call delay
      setTimeout(() => {
        const storedPatientName = localStorage.getItem(`consultation-${id}-patientName`);
        const storedTranscript = localStorage.getItem(`consultation-${id}-transcript`);
        const storedSummary = localStorage.getItem(`consultation-${id}-summary`);
        const storedDate = localStorage.getItem(`consultation-${id}-date`);
        const storedAudioDataUri = localStorage.getItem(`consultation-${id}-audioDataUri`);
        const storedTranslatedTranscript = localStorage.getItem(`consultation-${id}-translatedTranscript`);
        const storedTranslatedTranscriptLanguage = localStorage.getItem(`consultation-${id}-translatedTranscriptLanguage`);

        let foundConsultation: Consultation | undefined;

        if (storedPatientName && storedDate) { // Transcript and summary can be empty initially
          foundConsultation = {
            id: id,
            patientName: storedPatientName,
            date: storedDate,
            status: 'Completed',
            transcript: storedTranscript || '',
            summary: storedSummary || '',
            audioDataUri: storedAudioDataUri || undefined,
            translatedTranscript: storedTranslatedTranscript || undefined,
            translatedTranscriptLanguage: storedTranslatedTranscriptLanguage || undefined,
          };
        } else {
          foundConsultation = mockConsultations.find(c => c.id === id);
           if (foundConsultation) { // Store mock data if loaded
            localStorage.setItem(`consultation-${id}-patientName`, foundConsultation.patientName);
            localStorage.setItem(`consultation-${id}-transcript`, foundConsultation.transcript || '');
            localStorage.setItem(`consultation-${id}-summary`, foundConsultation.summary || '');
            localStorage.setItem(`consultation-${id}-date`, foundConsultation.date);
            if (foundConsultation.audioDataUri) localStorage.setItem(`consultation-${id}-audioDataUri`, foundConsultation.audioDataUri);
          }
        }
        
        if (!foundConsultation) {
            // Fallback for directly accessing a non-existent ID or if localStorage is cleared
            foundConsultation = {
                id: id,
                patientName: `Patient ${id.substring(0,4)}`,
                date: new Date().toISOString(),
                status: 'Completed',
                transcript: `This is a sample transcript for consultation ID ${id}. The patient discussed various symptoms with the doctor. The doctor provided advice and a potential treatment plan. This is a longer text to simulate a real transcript which can be quite extensive and cover multiple topics during the medical consultation. It's important for the AI to accurately capture all key details.`,
                summary: `This is an AI-generated summary for consultation ID ${id}. Key points: symptom discussion, doctor's advice, treatment plan. This summary is concise and highlights the most critical information for quick review.`,
                audioDataUri: undefined,
            };
        }
        
        setConsultation(foundConsultation);
        setEditableSummary(foundConsultation.summary || '');
        setEditableTranscript(foundConsultation.transcript || '');
        
        setIsLoading(false);
      }, 500);
    }
    // Cleanup TTS when component unmounts or id changes
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeakingSummary(false);
      }
    };
  }, [id]);

  const handleSaveSummary = () => {
    if (!consultation) return;
    console.log("Saving summary:", editableSummary);
    const updatedConsultation = { ...consultation, summary: editableSummary };
    setConsultation(updatedConsultation);
    setIsEditingSummary(false);
    localStorage.setItem(`consultation-${consultation.id}-summary`, editableSummary);
    setTranslatedSummary(null);
    setSummaryDisplayLanguage("original");
    toast({ title: "Summary Updated", description: "Your changes have been saved." });
  };

  const handleSaveTranscript = () => {
     if (!consultation) return;
    console.log("Saving transcript:", editableTranscript);
    const updatedConsultation = { ...consultation, transcript: editableTranscript };
    setConsultation(updatedConsultation);
    setIsEditingTranscript(false);
    localStorage.setItem(`consultation-${consultation.id}-transcript`, editableTranscript);
    setTranslatedOriginalTranscript(null);
    setOriginalTranscriptDisplayLanguage("original");
    toast({ title: "Transcript Updated", description: "Your changes have been saved." });
  };

  const handleDeleteConsultation = () => {
    if (!consultation) return;
    console.log("Deleting consultation:", id);
    // Stop any active speech before deleting
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeakingSummary(false);
    }
    localStorage.removeItem(`consultation-${id}-patientName`);
    localStorage.removeItem(`consultation-${id}-transcript`);
    localStorage.removeItem(`consultation-${id}-summary`);
    localStorage.removeItem(`consultation-${id}-date`);
    localStorage.removeItem(`consultation-${id}-audioDataUri`);
    localStorage.removeItem(`consultation-${id}-translatedTranscript`);
    localStorage.removeItem(`consultation-${id}-translatedTranscriptLanguage`);
    toast({ title: "Consultation Deleted", description: `Consultation for ${consultation?.patientName} has been removed.` });
    router.push('/dashboard/consultations');
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
        console.error("Speech synthesis error", event);
        toast({ title: "TTS Error", description: "Could not play the summary.", variant: "destructive" });
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
    return <div className="text-center py-10">Consultation not found. Please go back and create one.</div>;
  }

  const summaryTextToDisplay = summaryDisplayLanguage !== 'original' && translatedSummary !== null ? translatedSummary : (consultation.summary || '');
  const originalTranscriptTextToDisplay = originalTranscriptDisplayLanguage !== 'original' && translatedOriginalTranscript !== null ? translatedOriginalTranscript : consultation.transcript;

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Button variant="outline" onClick={() => router.push('/dashboard/consultations')} className="mb-6 shadow hover:shadow-md">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Consultations
      </Button>

      <Card className="shadow-xl mb-8">
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


    