'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ChevronRight, Mic, Square } from 'lucide-react';

type SpeakingPrompt = {
  id: string;
  taskType: string;
  title: string;
  prompt: string;
  imageUrl?: string;
};

const speakingPromptsByPart: Record<number, SpeakingPrompt[]> = {
  1: [
    {
      id: 'sp-1',
      taskType: 'read_aloud',
      title: 'Read Aloud',
      prompt:
        'Please read this paragraph aloud: Our company will launch a new customer support portal next month to improve response time and service quality.',
    },
  ],
  2: [
    {
      id: 'sp-2',
      taskType: 'describe_picture',
      title: 'Describe a Picture',
      prompt:
        'Describe a picture of a team meeting in an office. Mention people, actions, and the setting.',
      imageUrl: 'https://images.baoangiang.com.vn/image/fckeditor/upload/2023/20230214/images/bat-tay-422.jpg',
    },
  ],
  3: [
    {
      id: 'sp-3',
      taskType: 'respond_questions',
      title: 'Respond to Questions',
      prompt: 'What do you usually do to prepare for an important presentation?',
    },
  ],
  4: [
    {
      id: 'sp-4',
      taskType: 'respond_information',
      title: 'Respond to Information',
      prompt:
        'Based on a schedule, explain which train the customer should take to arrive before 9:00 AM.',
    },
  ],
  5: [
    {
      id: 'sp-5',
      taskType: 'express_opinion',
      title: 'Express an Opinion',
      prompt:
        'Do you agree that working remotely increases productivity? Give reasons and examples.',
    },
  ],
};

function SpeakingQuestionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partNumber = Number(searchParams.get('partNumber') || '1');
  const partTitle = searchParams.get('title') || 'Speaking';

  const prompts = useMemo(() => speakingPromptsByPart[partNumber] || speakingPromptsByPart[1], [partNumber]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(audioUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [audioUrls]);

  const currentPrompt = prompts[currentIndex];

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex((v) => v + 1);
    }
  };

  const startRecording = async () => {
    if (!currentPrompt || isRecording) return;
    setRecordingError('');

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Trinh duyet khong ho tro thu am.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        setAudioUrls((prev) => {
          const oldUrl = prev[currentPrompt.id];
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
          return {
            ...prev,
            [currentPrompt.id]: url,
          };
        });

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      setRecordingError('Khong the truy cap microphone. Hay cap quyen mic cho trang web.');
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (isRecording) {
      stopRecording();
    }

    setSubmitting(true);
    const emptyAnswers = prompts.reduce<Record<string, string>>((acc, prompt) => {
      acc[prompt.id] = '';
      return acc;
    }, {});

    sessionStorage.setItem(
      'speaking_result',
      JSON.stringify({
        partTitle,
        prompts,
        userAnswers: emptyAnswers,
      })
    );
    router.push('/home/practice/speaking-result');
  };

  const isLast = currentIndex === prompts.length - 1;
  const currentAudioUrl = currentPrompt ? audioUrls[currentPrompt.id] : '';
  const mm = String(Math.floor(recordingTime / 60)).padStart(2, '0');
  const ss = String(recordingTime % 60).padStart(2, '0');

  return (
    <div className="pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{partTitle}</h2>
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / prompts.length) * 100}%` }}
        />
      </div>

      <div className="px-4 lg:px-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">{currentPrompt.title}</p>
          {currentPrompt.imageUrl && (
            <div className="max-w-xl mx-auto rounded-xl overflow-hidden border border-slate-200 mb-3">
              <Image
                src={currentPrompt.imageUrl}
                alt="Hinh mo ta cho Part 2"
                width={1200}
                height={700}
                className="w-full h-44 md:h-52 object-cover"
                priority
              />
            </div>
          )}
          <p className="text-sm text-slate-700 leading-relaxed">{currentPrompt.prompt}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Thu âm câu trả lời</p>
            <span className="text-xs font-semibold text-slate-500">{isRecording ? `${mm}:${ss}` : '00:00'}</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-20 w-20 rounded-full transition-colors flex items-center justify-center ${
                isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-white hover:bg-primary-dark'
              }`}
              aria-label={isRecording ? 'Dừng' : 'Bắt đầu'}
            >
              {isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <p className={`text-xs font-semibold ${isRecording ? 'text-red-600' : 'text-slate-500'}`}>
              {isRecording ? 'Đang thu âm' : 'Bắt đầu thu âm'}
            </p>
          </div>

          {recordingError && <p className="text-xs text-red-600">{recordingError}</p>}

          {currentAudioUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Nghe lai audio</p>
              <audio controls src={currentAudioUrl} className="w-full" />
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-8 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:shadow-none p-4 lg:p-0">
        <button
          onClick={isLast ? handleSubmit : handleNext}
          disabled={submitting}
          className="w-full py-4 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : isLast ? (
            'Nộp bài'
          ) : (
            <>
              Tiếp tục <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SpeakingQuestionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <SpeakingQuestionContent />
    </Suspense>
  );
}
