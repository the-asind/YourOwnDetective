import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Square } from '../data/mock';
import { getPlayableAudioUrl } from '../lib/audio';

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface BottomSheetProps {
  square: Square | null;
  onClose: () => void;
}

export default function BottomSheet({ square, onClose }: BottomSheetProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [frequencies, setFrequencies] = useState<number[]>(new Array(12).fill(10));
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number>(undefined);
  const dragControls = useDragControls();
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    const audioUrl = square?.type === 'audio' ? getPlayableAudioUrl(square) : undefined;

    if (square?.type === 'audio' && audioUrl) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous"; // Essential for Web Audio API so it doesn't mute the track!
      audio.src = audioUrl;
      audioRef.current = audio;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; 
      
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) {
        console.log("Audio Routing Error (CORS):", e);
      }

      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('ended', () => setIsPlaying(false));
      
      const updateWaveform = () => {
        if (!audio.paused && analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          
          const isCorsBlocked = dataArray.every(val => val === 0);
          
          const newFreqs = Array.from({length: 12}).map((_, i) => {
            if (isCorsBlocked) {
              return 15 + Math.random() * 50; // Visual fallback if CORS prevents byte access
            }
            const val = dataArray[i + 2] || 0; 
            return 10 + (val / 255) * 90;
          });
          setFrequencies(newFreqs);
        } else {
          setFrequencies(new Array(12).fill(10));
        }
        requestRef.current = requestAnimationFrame(updateWaveform);
      };

      // Auto-play the audio
      audio.play().then(() => {
        setIsPlaying(true);
        if (ctx.state === 'suspended') ctx.resume();
        requestRef.current = requestAnimationFrame(updateWaveform);
      }).catch(err => {
        console.error("Autoplay prevented:", err);
      });
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setFrequencies(new Array(12).fill(10));
    };
  }, [square]);

  const handleDragEnd = (e: any, info: any) => {
    const shouldClose = info.velocity.y > 200 || info.offset.y > 100;
    if (shouldClose) {
      onClose();
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration)) return;

    audio.currentTime = time;
    setCurrentTime(time);

    if (audio.paused) {
      audio.play().then(() => {
        setIsPlaying(true);
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      }).catch(err => {
        console.error("Playback resume prevented:", err);
      });
    }
  };

  if (!square) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-center">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        
        {/* Scrollable Overlay Wrapper */}
        <div className="absolute inset-0 overflow-y-auto no-scrollbar pointer-events-auto z-10">
          <div className="min-h-full flex flex-col justify-end w-full max-w-md mx-auto pointer-events-none">
            
            {/* Clickable spacer to close the sheet if clicked outside */}
            <div 
              className="flex-1 w-full min-h-[10vh] pointer-events-auto" 
              onClick={onClose} 
            />

            {/* Actual Sheet Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              dragControls={dragControls}
              dragListener={false}
              onDragEnd={handleDragEnd}
              className="relative bg-white w-full rounded-t-[32px] flex flex-col pt-4 pb-8 shadow-2xl pointer-events-auto h-auto"
            >
              {/* Draggable Handle Area */}
              <div 
                className="w-full flex flex-col items-center cursor-grab active:cursor-grabbing pb-4"
                onPointerDown={(e) => dragControls.start(e, { snapToCursor: false })}
                style={{ touchAction: 'none' }}
              >
                <div className="w-16 h-1.5 bg-gray-200 rounded-full shrink-0" />
              </div>
              
              {/* Header Title */}
              <div className="flex justify-center items-start mb-6 px-6 shrink-0">
                <div className="text-center">
                  <h2 className="text-2xl font-medium tracking-tight whitespace-pre-wrap break-words">
                    {square.secretName.charAt(0).toUpperCase() + square.secretName.slice(1)}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Открыл <span className="text-gray-900">{square.openedBy}</span>
                  </p>
                </div>
              </div>

              {/* Fully Expanded Content Representation */}
              <div className="mx-4 rounded-[28px] bg-gray-50 relative">
                {square.type === 'image' && (
                  <div className="w-full h-full flex items-center justify-center bg-black/5 p-2 rounded-[28px]">
                    <img 
                      src={square.content} 
                      className="w-full h-auto object-contain rounded-[20px] drop-shadow-sm" 
                      alt="Full size"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                
                {square.type === 'text' && (
                  <div className="px-8 py-16 flex items-center justify-center bg-[#F8F5E6] rounded-[28px]">
                    <p className="font-serif text-xl sm:text-2xl text-center leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {square.content}
                    </p>
                  </div>
                )}
                
                {square.type === 'audio' && (
                  <div className="p-8 py-16 flex flex-col items-center justify-center rounded-[28px]">
                    <div className="flex gap-1 items-end mb-8 h-16 w-full justify-center">
                       {frequencies.map((height, i) => (
                         <motion.div 
                            key={i}
                            animate={{ height: `${height}%` }}
                            transition={{ type: "tween", duration: 0.1 }}
                            className={`w-2.5 rounded-full ${isPlaying ? 'bg-blue-500' : 'bg-gray-300'}`}
                         />
                       ))}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.01}
                      value={currentTime}
                      disabled={!duration}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      aria-label="Перемотка аудио"
                      className="mb-7 h-2 w-full max-w-[220px] cursor-pointer appearance-none rounded-full disabled:cursor-default disabled:opacity-50 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-sm"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`,
                      }}
                    />
                    <div className="text-3xl font-mono tracking-tight text-gray-800">
                      {formatTime(currentTime)} <span className="text-gray-400 text-xl">/ {formatTime(duration)}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
