'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Mic,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { getCurrentUser, getSpeakingPrompts } from '@/lib/api';
import AudioPlayer from '@/app/components/AudioPlayer';
import LoginRequiredModal from '@/app/components/LoginRequiredModal';

type SpeakingPrompt = {
  id: string;
  taskType: string;
  title: string;
  passage?: string;
  prompt: string;
  imageUrl?: string;
  prepSeconds?: number;
};

const PART_META: Record<number, { label: string; color: string; bg: string; taskLabel: string }> = {
  1: { label: 'Read Aloud', color: 'text-blue-600', bg: 'bg-blue-50', taskLabel: 'Đọc đoạn văn to rõ ràng' },
  2: { label: 'Describe a Picture', color: 'text-purple-600', bg: 'bg-purple-50', taskLabel: 'Mô tả hình ảnh chi tiết' },
  3: { label: 'Respond to Questions', color: 'text-green-600', bg: 'bg-green-50', taskLabel: 'Trả lời câu hỏi ngắn' },
  4: { label: 'Respond to Information', color: 'text-orange-600', bg: 'bg-orange-50', taskLabel: 'Phản hồi thông tin' },
  5: { label: 'Express an Opinion', color: 'text-red-600', bg: 'bg-red-50', taskLabel: 'Trình bày quan điểm cá nhân' },
};

function RecordButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-20 w-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 scale-110'
          : 'bg-primary hover:bg-primary-dark hover:scale-105'
      }`}
    >
      {isRecording ? (
        <Square className="w-7 h-7 text-white" />
      ) : (
        <Mic className="w-7 h-7 text-white" />
      )}
      {/* Pulse ring when recording */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
      )}
    </button>
  );
}

function SpeakingQuestionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partNumber = Number(searchParams.get('partNumber') || '1');
  const partTitle = searchParams.get('title') || 'Speaking';

  const meta = PART_META[partNumber] || PART_META[1];

  const [prompts, setPrompts] = useState<SpeakingPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [transcribedTexts, setTranscribedTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [transcribingByPrompt, setTranscribingByPrompt] = useState<Record<string, boolean>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechCleanupRef = useRef<(() => void) | null>(null);

  const questionLimit = Number(searchParams.get('questionLimit') || '0');
  const transcribingCount = Object.keys(transcribingByPrompt).length;
  const transcribing = transcribingCount > 0;

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser();
      if (!user) { setShowLoginModal(true); setLoading(false); return; }

      try {
        const data = await getSpeakingPrompts(partNumber, questionLimit || undefined);
        setPrompts(data.map(p => ({
          id: p.id,
          taskType: p.task_type,
          title: p.title,
          passage: p.passage || undefined,
          prompt: p.prompt,
          imageUrl: p.image_url || undefined,
          prepSeconds: p.prep_seconds,
        })));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partNumber]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (speechCleanupRef.current) {
        speechCleanupRef.current();
        speechCleanupRef.current = null;
      }
      Object.values(audioUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // Transcribe audio blob using Whisper API
  // ============================================================
  const transcribeBlob = useCallback((promptId: string, blob: Blob) => {
    setTranscribingByPrompt((prev) => ({ ...prev, [promptId]: true }));
    setTranscribedTexts((prev) => {
      const next = { ...prev };
      delete next[promptId];
      return next;
    });

    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');

    fetch('/api/transcribe', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.text) {
          console.log(`[SPEAKING] Transcribed text for prompt ${promptId}:`, data.text);
          setTranscribedTexts(prev => ({ ...prev, [promptId]: data.text }));
        } else {
          console.warn('[SPEAKING] Whisper failed:', data.error);
          setTranscribedTexts(prev => ({ ...prev, [promptId]: `[Lỗi nhận diện: ${data.error}]` }));
        }
      })
      .catch(err => {
        console.error('[SPEAKING] Transcribe error:', err);
        setTranscribedTexts(prev => ({ ...prev, [promptId]: '[Lỗi kết nối, vui lòng thử lại]' }));
      })
      .finally(() => {
        setTranscribingByPrompt((prev) => {
          const next = { ...prev };
          delete next[promptId];
          return next;
        });
      });
  }, []);

  const currentPrompt = prompts[currentIndex];
  const currentAudioUrl = currentPrompt ? audioUrls[currentPrompt.id] : '';
  const isLast = currentIndex === prompts.length - 1;
  const recordedCount = Object.keys(audioUrls).filter(id => audioUrls[id]).length;
  const hasAnyRecording = recordedCount > 0;
  const normalizedCurrentTaskType = String(currentPrompt?.taskType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const isDescribePicture = partNumber === 2 || normalizedCurrentTaskType === 'describepicture';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleStartCountdown = () => {
    if (!currentPrompt) return;
    setRecordingError('');
    setShowCountdown(true);
    setCountdown(10);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setShowCountdown(false);
          setTimeout(() => startRecording(), 0);
          return 0;
        }
        return prev - 1;
      });
    });
  };

  const startRecording = async () => {
    if (!currentPrompt || isRecording) return;
    setRecordingError('');

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Trình duyệt không hỗ trợ thu âm.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const promptId = currentPrompt.id;

        // Stop speech recognition
        if (speechCleanupRef.current) {
          speechCleanupRef.current();
          speechCleanupRef.current = null;
        }

        setAudioUrls(prev => {
          if (prev[promptId]) URL.revokeObjectURL(prev[promptId]);
          return { ...prev, [promptId]: url };
        });

        // Transcribe audio to text
        transcribeBlob(promptId, blob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      setRecordingError('Không thể truy cập microphone. Vui lòng cấp quyền.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (speechCleanupRef.current) {
      speechCleanupRef.current();
      speechCleanupRef.current = null;
    }
    setIsRecording(false);
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
      handleStartCountdown();
    }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(v => v + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(v => v - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    if (!hasAnyRecording) {
      setRecordingError('Bạn chưa thu âm câu nào. Vui lòng thu âm trước khi nộp bài.');
      return;
    }

    if (isRecording) {
      stopRecording();
      setRecordingError('Đã dừng thu âm. Vui lòng đợi hệ thống nhận diện xong rồi bấm Nộp bài lại.');
      return;
    }

    if (transcribing) {
      setRecordingError(`Đang nhận diện giọng nói cho ${transcribingCount} câu. Vui lòng đợi hoàn tất.`);
      return;
    }

    const hasLegacyPlaceholder = Object.values(transcribedTexts).some(
      (text) => text?.trim() === 'Đang chuyển giọng nói thành văn bản...'
    );
    if (hasLegacyPlaceholder) {
      setRecordingError('Hệ thống vẫn đang xử lý nhận diện giọng nói. Vui lòng đợi thêm vài giây.');
      return;
    }

    setIsSubmitting(true);
    const submissionAnswers: Record<string, string> = {};
    for (const p of prompts) {
      submissionAnswers[p.id] = audioUrls[p.id] || '';
    }

    console.log('[SPEAKING-SUBMIT] === SUBMISSION DATA ===');
    console.log('[SPEAKING-SUBMIT] partTitle:', partTitle);
    console.log('[SPEAKING-SUBMIT] partNumber:', partNumber);
    console.log('[SPEAKING-SUBMIT] prompts:', JSON.stringify(prompts, null, 2));
    console.log('[SPEAKING-SUBMIT] audioUrls (blob URLs):', JSON.stringify(audioUrls));
    console.log('[SPEAKING-SUBMIT] transcribedTexts:', JSON.stringify(transcribedTexts));
    console.log('[SPEAKING-SUBMIT] ==============================');

    sessionStorage.setItem('speaking_result', JSON.stringify({
      partTitle,
      partNumber,
      prompts,
      userAnswers: submissionAnswers,
      transcribedTexts,
    }));
    router.push('/home/practice/speaking-result');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Sticky Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-100 -mx-4 px-4 py-3 mb-6 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowExitDialog(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">{partTitle}</h2>
              <p className="text-xs text-slate-500">
                {meta.label} · {currentIndex + 1}/{prompts.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
              AI Chấm
            </div>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mt-3">
          {prompts.map((p, i) => {
            const hasAudio = Boolean(audioUrls[p.id]);
            const active = i === currentIndex;
            return (
              <button
                key={p.id}
                onClick={() => { setCurrentIndex(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`h-1.5 rounded-full transition-all ${
                  active ? 'w-6 bg-primary' : hasAudio ? 'w-1.5 bg-teal-400' : 'w-1.5 bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="px-4 lg:px-0 max-w-3xl mx-auto">
        {/* Prompt card */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mb-6">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-100">
            <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center shrink-0`}>
              <BookOpen className={`w-5 h-5 ${meta.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">{meta.taskLabel}</p>
              <h3 className="text-base font-bold text-slate-800">{currentPrompt.title}</h3>
            </div>
          </div>

          {/* Image */}
          {currentPrompt.imageUrl && (
            <div className={`border-b border-slate-100 ${isDescribePicture ? 'bg-slate-50 p-3' : ''}`}>
              <Image
                src={currentPrompt.imageUrl}
                alt="Hình minh họa"
                width={1200}
                height={700}
                className={isDescribePicture
                  ? 'w-full h-[320px] md:h-[460px] object-contain rounded-xl bg-white'
                  : 'w-full h-52 object-cover'}
                priority
              />
            </div>
          )}

          {/* Passage (Read Aloud) */}
          {currentPrompt.passage && (
            <div className="border-b border-slate-100 bg-blue-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Đoạn văn cần đọc</p>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed italic">{currentPrompt.passage}</p>
            </div>
          )}

          {/* Prompt / Yêu cầu */}
          <div className="p-5">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">
              {currentPrompt.passage ? 'Yêu cầu' : 'Câu hỏi'}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">{currentPrompt.prompt}</p>
          </div>
        </div>

        {/* Recording area */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRecording ? 'bg-red-100' : 'bg-slate-100'}`}>
                <Mic className={`w-4 h-4 ${isRecording ? 'text-red-500' : 'text-slate-500'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {isRecording ? 'Đang thu âm...' : currentAudioUrl ? 'Đã thu âm' : 'Thu âm câu trả lời'}
                </p>
                {isRecording && (
                  <p className="text-xs text-red-500 font-medium">{formatTime(recordingTime)}</p>
                )}
                {transcribing && (
                  <p className="text-xs text-blue-500 font-medium animate-pulse">
                    Đang nhận diện giọng nói... ({transcribingCount} câu)
                  </p>
                )}
              </div>
            </div>
            {currentAudioUrl && !isRecording && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" /> Đã thu
              </span>
            )}
          </div>

          {/* Recording controls */}
          <div className="flex flex-col items-center gap-4 py-8 px-4">
            {recordingError && (
              <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-600 text-center">
                {recordingError}
              </div>
            )}

            <RecordButton isRecording={isRecording} onClick={handleRecordClick} />

            <p className={`text-sm font-medium ${isRecording ? 'text-red-500' : 'text-slate-500'}`}>
              {isRecording ? 'Bấm để dừng' : currentAudioUrl ? 'Thu âm lại' : 'Bấm để bắt đầu'}
            </p>

            {/* Audio playback */}
            {currentAudioUrl && !isRecording && (
              <div className="w-full pt-4 border-t border-slate-100 mt-2">
                <p className="text-xs font-semibold text-slate-500 mb-3">Nghe lại</p>
                <AudioPlayer src={currentAudioUrl} />
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mt-4 px-1">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / prompts.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium shrink-0">
            {recordedCount}/{prompts.length}
          </span>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="mt-8 mb-6 max-w-3xl mx-auto px-4 lg:px-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Câu trước</span>
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / prompts.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium shrink-0">
              {recordedCount}/{prompts.length}
            </span>
          </div>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isRecording || transcribing || !hasAnyRecording}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark disabled:opacity-50 transition-colors shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Nộp bài <Sparkles className="w-3.5 h-3.5" /></>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
            >
              Câu tiếp <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Countdown overlay */}
      {showCountdown && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <p className="text-teal-200 text-sm font-medium mb-4 tracking-wide">Chuẩn bị trong...</p>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-teal-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-400 animate-spin" style={{ animationDuration: '1s' }} />
            <span className="text-6xl font-black text-white">{countdown}</span>
          </div>
          <p className="text-white/60 text-xs mt-6">Hãy chuẩn bị câu trả lời của bạn</p>
          <button
            onClick={() => { clearInterval(countdownRef.current!); setShowCountdown(false); }}
            className="mt-6 px-5 py-2 bg-white/10 text-white/70 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Bỏ qua
          </button>
        </div>
      )}

      {/* Exit dialog */}
      {showExitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowExitDialog(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-lg mb-2">Thoát luyện tập?</h3>
            <p className="text-sm text-slate-500 mb-5">Tiến trình của bạn vẫn sẽ được lưu lại.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitDialog(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Tiếp tục làm
              </button>
              <button
                onClick={() => {
                  setShowExitDialog(false);
                  router.push('/home');
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Yêu cầu đăng nhập"
        description="Bạn cần đăng nhập để luyện nói."
      />
    </div>
  );
}

export default function SpeakingQuestionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <SpeakingQuestionContent />
    </Suspense>
  );
}
