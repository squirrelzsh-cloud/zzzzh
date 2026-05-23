import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Memory } from "../data";
import { X, Calendar, MapPin, Heart, Play, Film, Volume2, Sparkles, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

interface MemoryModalProps {
  memory: Memory | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function MemoryModal({ memory, isOpen, onClose, onPrev, onNext }: MemoryModalProps) {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset states when memory changes
  useEffect(() => {
    setIsPlayingVideo(false);
  }, [memory]);

  if (!memory) return null;

  const handleTogglePlay = () => {
    if (isPlayingVideo) {
      videoRef.current?.pause();
    } else {
      videoRef.current?.play().catch((err) => console.log("Video play request failed", err));
    }
    setIsPlayingVideo(!isPlayingVideo);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            className="absolute inset-0 bg-[#0d030afd]/90 backdrop-blur-md cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

            {/* Modal Card content wrapper */}
          <motion.div
            className="relative w-full max-w-4xl bg-[#FDFBF7] border border-pink-400/20 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(244,114,182,0.55),_0_0_20px_rgba(244,114,182,0.25)] z-10 flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh]"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
          >
            {/* Left Column: Media Display */}
            <div className="relative flex-1 bg-stone-900 flex items-center justify-center overflow-hidden aspect-video md:aspect-auto">
              {memory.videoUrl ? (
                <div 
                  className="relative w-full h-full group cursor-pointer"
                  onClick={handleTogglePlay}
                >
                  <video
                    ref={videoRef}
                    src={memory.videoUrl}
                    className="w-full h-full object-cover"
                    loop
                    playsInline
                    muted
                  />
                  
                  {/* Decorative Play Button overlay */}
                  <AnimatePresence>
                    {!isPlayingVideo && (
                      <motion.div 
                        className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleTogglePlay}
                      >
                        <div className="p-5 bg-[#8B4513] rounded-xl shadow-lg shadow-[#8B4513]/30 hover:scale-110 active:scale-95 transition-transform duration-300">
                           <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tiny status overlay */}
                  <div className="absolute bottom-3 left-3 bg-[#1A1A1A]/90 px-3 py-1 text-[10px] text-[#B57C50] font-mono flex items-center gap-1.5 rounded-xl">
                    <Film className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                    {isPlayingVideo ? "PLAYING CINEMATIC LOOP" : "VIDEO PAUSED"}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={memory.imageUrl}
                    alt={memory.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Small ambient overlay */}
                  <div className="absolute bottom-3 left-3 bg-[#1A1A1A]/90 px-3 py-1.5 text-[10px] text-[#B57C50] font-mono flex items-center gap-1.5 rounded-xl tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                    PHOTO MEMORY
                  </div>
                </div>
              )}

              {/* Close Button Inside Media Frame on Mobile */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 md:hidden p-2 rounded-xl bg-[#1A1A1A]/80 text-stone-300 hover:text-white transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Right Column: Narrative Panel */}
            <div className="w-full md:w-[380px] bg-[#F9F7F2] p-6 md:p-8 flex flex-col justify-between overflow-y-auto text-[#1A1A1A] border-t md:border-t-0 md:border-l border-[#1A1A1A]/10">
              {/* Header Info */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest bg-[#8B4513] text-[#FDFBF7] rounded-xl uppercase font-bold">
                    {memory.category}
                  </span>
                  
                  {/* Close button inside desktop right col */}
                  <button 
                    onClick={onClose}
                    className="hidden md:flex p-1.5 rounded-xl bg-stone-200/50 hover:bg-stone-250 hover:text-[#8B4513] transition-colors text-stone-600"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-5">
                  <p className="font-mono text-[10px] text-stone-500 tracking-widest leading-none uppercase">
                    [ Campus Memory Moment ]
                  </p>
                  <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-1.5 tracking-wide leading-tight">
                    {memory.title}
                  </h2>
                  <p className="font-mono text-[11px] text-[#8B4513] uppercase tracking-widest mt-1">
                    {memory.subTitle}
                  </p>
                </div>

                {/* Event Metadata Cards */}
                <div className="mt-4 flex flex-col gap-2 border-y border-[#1A1A1A]/10 py-4 font-sans text-xs text-[#4A4A4A]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#8B4513]" />
                    <span className="font-mono font-medium">{memory.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#B57C50]" />
                    <span className="font-medium">{memory.location}</span>
                  </div>
                </div>

                {/* Poetic Description Body */}
                <div className="mt-5 text-[#1A1A1A] leading-relaxed font-serif text-sm relative">
                  <div className="absolute -top-3 -left-3 text-4xl text-[#8B4513]/10 font-serif pointer-events-none">“</div>
                  <p className="relative z-10 whitespace-pre-line pl-3 italic text-[#2A2A2A]">
                    {memory.description}
                  </p>
                </div>
              </div>

              {/* Navigation and Interactions */}
              <div className="mt-8 pt-4 border-t border-[#1A1A1A]/10 flex flex-col gap-4">
                {/* Arrow navigation shortcut */}
                <div className="flex items-center justify-between text-xs font-mono text-stone-500">
                  <button 
                    onClick={onPrev}
                    className="flex items-center gap-1 hover:text-[#1A1A1A] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#8B4513]" />
                    PREV MOMENT
                  </button>
                  <button 
                    onClick={onNext}
                    className="flex items-center gap-1 hover:text-[#1A1A1A] transition-colors"
                  >
                    NEXT MOMENT
                    <ChevronRight className="w-4 h-4 text-[#8B4513]" />
                  </button>
                </div>

                {/* Final Close Button - "返回彼花海" */}
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-[#8B4513] text-[#FDFBF7] hover:bg-[#5c2d0c] border border-[#8B4513]/20 rounded-xl text-xs tracking-widest font-sans font-medium transition-all shadow-sm uppercase cursor-pointer"
                >
                  Return to flower sea • 返回彼花海
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
