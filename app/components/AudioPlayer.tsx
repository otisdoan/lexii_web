'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, SkipBack, SkipForward } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  onError?: (error: string) => void;
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type Speed = typeof SPEEDS[number];

function formatTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, onError, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      setDuration(audio.duration);
      setIsPlaying(false);
    };
    const onEnded = () => setIsPlaying(false);
    const onErrorHandler = () => onError?.('Không thể tải audio. Vui lòng thử lại.');

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onErrorHandler);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onErrorHandler);
    };
  }, [onError]);

  // Load new source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.src = src;
    audio.load();
    audio.playbackRate = speed;
    setIsPlaying(false);
    setCurrentTime(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Sync playback rate
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => onError?.('Không thể phát audio.'));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + delta));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-slate-800 rounded-2xl p-5 ${className}`}>
      <audio ref={audioRef} preload="metadata" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-4 h-4 text-teal-400" />
        <span className="text-xs text-slate-400 font-medium">Audio</span>
      </div>

      {/* Progress bar */}
      <div className="mb-1">
        <div
          className="w-full h-1.5 bg-slate-600 rounded-full cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            handleSeek(pct * duration);
          }}
        >
          <div
            className="h-full bg-primary rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-3">
        {/* Speed control */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="px-2.5 py-1 text-xs font-bold text-teal-400 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            {speed}x
          </button>
          {showSpeedMenu && (
            <div className="absolute bottom-full mb-2 left-0 bg-slate-700 rounded-xl shadow-xl overflow-hidden z-20 min-w-[80px]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                  className={`w-full px-4 py-2 text-xs font-medium transition-colors ${
                    speed === s ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main playback buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-5)}
            disabled={!src}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            aria-label="Quay lại 5 giây"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!src}
            className="w-12 h-12 bg-primary hover:bg-primary-dark disabled:opacity-40 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-primary/30"
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip(5)}
            disabled={!src}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            aria-label="Tiến lên 5 giây"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Placeholder for balance */}
        <div className="w-[52px]" />
      </div>
    </div>
  );
}
