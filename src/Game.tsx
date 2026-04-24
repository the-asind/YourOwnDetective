import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Square } from './data/mock';
import { useSquares } from './store';
import { useStamina } from './hooks/useStamina';
import { formatTimeAgo } from './lib/format';
import * as api from './api';
import BottomSheet from './components/BottomSheet';
import { getPlayableAudioUrl } from './lib/audio';

interface GameProps {
  playerName: string;
}

export default function Game({ playerName }: GameProps) {
  const { squares, setSquares, refresh } = useSquares();
  const [activeTab, setActiveTab] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [errorFeedback, setErrorFeedback] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState(false);
  
  const { stamina, consumeStamina } = useStamina();

  // Generate dynamic tabs based on who opened squares
  const openedSquares = squares.filter(s => s.isOpened).sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
  const uniqueNames = Array.from(new Set(openedSquares.map(s => s.openedBy).filter(Boolean))) as string[];
  const tabs = ['Все', ...uniqueNames];

  // Filter squares by active tab
  const displayedSquares = openedSquares.filter(s => 
    activeTab === 'Все' ? true : s.openedBy === activeTab
  );

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check stamina
    if (!consumeStamina(100)) {
      triggerError();
      return;
    }

    try {
      const result = await api.guess(searchQuery.trim(), playerName);

      if (result.success && result.square) {
        // Optimistic update: inject the opened square into local state
        setSquares((prev) =>
          prev.map((s) => (s.id === result.square!.id ? result.square! : s)),
        );
        setSuccessFeedback(true);
        setTimeout(() => setSuccessFeedback(false), 1500);
        setSearchQuery('');
        // Refresh from server to get canonical state
        refresh();
      } else {
        triggerError();
      }
    } catch (err) {
      console.error('Guess failed:', err);
      triggerError();
    }
  };

  const triggerError = () => {
    setErrorFeedback(true);
    setTimeout(() => setErrorFeedback(false), 400);
  };

  // Stamina bar visual calculations
  const staminaPercentage = (stamina / 300) * 100;

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-white flex flex-col relative">
      {/* Sticky Top Section: Search & Stamina */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-5 pb-2">
        <form className="px-4" onSubmit={handleSearchSubmit}>
          <motion.div 
            animate={errorFeedback ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.3 }}
            className={`relative flex flex-col bg-[#F3F4F6] rounded-[28px] overflow-hidden transition-colors ${successFeedback ? 'bg-green-50 ring-2 ring-green-400' : ''}`}
          >
            <div className="relative flex items-center h-14 px-5">
              <Search className="w-6 h-6 text-gray-400 mr-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Запросить"
                className="w-full bg-transparent text-lg focus:outline-none placeholder-gray-400 font-medium pb-1"
              />
            </div>
            
            {/* Embedded Stamina Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gray-200">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-blue-500"
                style={{ width: `${staminaPercentage}%` }}
              />
              {/* Notches */}
              <div className="absolute top-0 bottom-0 left-[33.33%] w-[2px] bg-white z-10" />
              <div className="absolute top-0 bottom-0 left-[66.66%] w-[2px] bg-white z-10" />
            </div>
          </motion.div>
        </form>
      </div>

      {/* Scrollable Tabs */}
      <div className="px-4 py-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-base font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-gray-200 text-gray-900' 
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Squares Grid */}
      <div className="px-4 pb-20 pt-2 flex-1">
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {displayedSquares.map((square) => (
              <SquareCard 
                key={square.id} 
                square={square} 
                onClick={() => setSelectedSquare(square)} 
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detailed Overlay */}
      <BottomSheet 
        square={selectedSquare} 
        onClose={() => setSelectedSquare(null)} 
      />
    </div>
  );
}

// Formatter for grid audio duration
const formatDuration = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return "0:00";
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Subcomponent: SquareCard
function SquareCard({ square, onClick }: { key?: string | number; square: Square; onClick: () => void }) {
  const timeAgo = square.openedAt ? formatTimeAgo(square.openedAt) : '';
  const [realDuration, setRealDuration] = useState<string | null>(null);

  useEffect(() => {
    const audioUrl = square.type === 'audio' ? getPlayableAudioUrl(square) : undefined;

    if (square.type === 'audio' && audioUrl) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = audioUrl;
      // Tell browser we only need metadata (duration) for grid view
      audio.preload = 'metadata'; 

      const handleMetadata = () => {
        setRealDuration(formatDuration(audio.duration));
      };

      if (audio.readyState >= 1) {
        handleMetadata();
      } else {
        audio.addEventListener('loadedmetadata', handleMetadata);
      }

      return () => audio.removeEventListener('loadedmetadata', handleMetadata);
    }
  }, [square.type, square.audioUrl, square.audioFallbackUrl]);

  return (
    <motion.button
      layout="position"
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.18, layout: { duration: 0.18 } }}
      onClick={onClick}
      className="relative aspect-square w-full rounded-[20px] overflow-hidden active:scale-95 transition-transform flex flex-col border border-gray-100/50 shadow-sm"
    >
      {square.type === 'image' && (
        <>
          <img 
            src={square.content} 
            alt="Открытый квадрат" 
            className="absolute inset-0 w-full h-full object-cover" 
            referrerPolicy="no-referrer"
          />
          {/* Subtle gradient for text visibility on images */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        </>
      )}

      {square.type === 'text' && (
        <div className="absolute inset-0 bg-[#F8F5E6] p-3 pt-5 flex flex-col items-center">
          <p className="font-serif text-[10px] leading-relaxed text-center text-slate-800 line-clamp-4 relative">
            {square.content}
            {/* Fade out effect for text bottom */}
            <span className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F5E6] to-transparent block pointer-events-none" />
          </p>
        </div>
      )}

      {square.type === 'audio' && (
        <div className="absolute inset-0 bg-[#F5F6F8] flex flex-col justify-center items-center px-6 text-center">
          <div className="absolute top-4 inset-x-0 px-2 lg:px-4">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#93A3BE] uppercase break-words line-clamp-2 leading-tight">
              {square.secretName}
            </span>
          </div>
          {/* Static waveform illustration */}
          <div className="flex items-center gap-[2px] opacity-40 mb-2 mt-4 h-4">
            <div className="w-[1.5px] h-2 bg-slate-600 rounded-full"></div>
            <div className="w-[1.5px] h-3 bg-slate-600 rounded-full"></div>
            <div className="w-[1.5px] h-full bg-slate-600 rounded-full"></div>
            <div className="w-[1.5px] h-2 bg-slate-600 rounded-full"></div>
            <div className="w-[1.5px] h-1 bg-slate-600 rounded-full"></div>
            <div className="w-[1.5px] h-3 bg-slate-600 rounded-full"></div>
            <div className="w-[1.5px] h-2 bg-slate-600 rounded-full"></div>
          </div>
          {realDuration ? (
            <span className="text-sm font-medium text-slate-600 tracking-wide">{realDuration}</span>
          ) : (
            <div className="w-8 h-3.5 bg-slate-200/80 animate-pulse rounded-full mt-0.5"></div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className={`absolute bottom-2 inset-x-0 text-[9px] text-center font-medium ${
        square.type === 'image' ? 'text-white/90 drop-shadow-md' : 'text-slate-500/80'
      }`}>
        {timeAgo}
      </div>
    </motion.button>
  );
}
