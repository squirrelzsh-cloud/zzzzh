import React, { useEffect, useState, MouseEvent } from "react";
import { motion } from "motion/react";
import { Memory } from "../data";
import { Play, Image as ImageIcon, MapPin, Calendar, Heart } from "lucide-react";

interface MemoryCardProps {
  key?: string | number;
  memory: Memory;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
  onSelect: (memory: Memory) => void;
  onDoubleSelect: (memory: Memory) => void;
  isFocused: boolean;
  activeStageId?: string;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80";
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const springConfig = isMobile
  ? { type: "spring" as const, stiffness: 40, damping: 20, mass: 0.8 }
  : { type: "spring" as const, stiffness: 85, damping: 15, mass: 1.1 };

export function MemoryCard({
  memory,
  x,
  y,
  rotate,
  scale,
  opacity,
  onSelect,
  onDoubleSelect,
  isFocused,
  activeStageId
}: MemoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [imgSrc, setImgSrc] = useState(memory.imageUrl);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; scale: number; rotate: number }[]>([]);

  // Sync imgSrc when memory.imageUrl changes externally
  useEffect(() => {
    setImgSrc(memory.imageUrl);
  }, [memory.imageUrl]);

  // Determine media badge — treat empty string as no video
  const hasVideo = !!(memory.videoUrl && memory.videoUrl.trim() !== "");

  const handleSingleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (isFocused) {
      onDoubleSelect(memory);
    } else {
      onSelect(memory);
    }
  };

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onDoubleSelect(memory);
  };

  const handleLike = (e: MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);

    // Create a burst of delightful floating hearts
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: Date.now() + i + Math.random(),
      x: (Math.random() - 0.5) * 45, // slightly narrower dispersion for smaller hearts
      scale: Math.random() * 0.3 + 0.4, // smaller dynamic size variations
      rotate: (Math.random() - 0.5) * 50, // random rotation
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);

    // Automatically remove after animation completes
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.find((nh) => nh.id === h.id)));
    }, 1500);
  };

  const isArrival = activeStageId === "arrival";
  const seed = memory.id.charCodeAt(memory.id.length - 1) || 0;
  const jitterDuration = 5.0 + (seed % 4);
  const jitterDelay = (seed % 6) * 0.3;

  return (
    <motion.div
      className="absolute cursor-pointer select-none origin-center"
      style={{
        zIndex: isFocused ? 50 : isHovered ? 40 : 10,
        width: 230,
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        rotate: 0, 
        scale: 0.2, 
        opacity: 0 
      }}
      animate={{
        x,
        y,
        rotate: isHovered ? rotate * 0.4 : rotate,
        scale: isHovered ? scale * 1.12 : scale,
        opacity: opacity,
      }}
      transition={springConfig}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSingleClick}
      onDoubleClick={handleDoubleClick}
      id={`memory-card-${memory.id}`}
    >
      <motion.div
        animate={isArrival ? {
          x: [0, (seed % 2 === 0 ? 3.5 : -3.5), (seed % 3 === 0 ? -2.5 : 2.5), 0],
          y: [0, (seed % 2 === 0 ? -4 : 4), (seed % 3 === 0 ? 3 : -3), 0],
          rotate: [0, 0.7, -0.7, 0]
        } : {
          x: 0,
          y: 0,
          rotate: 0
        }}
        transition={isArrival ? {
          duration: jitterDuration,
          delay: jitterDelay,
          repeat: Infinity,
          ease: "easeInOut",
        } : {
          duration: 0.3
        }}
        className="w-full h-full relative"
      >
        {/* Polaroid Container with Editorial outline, warm tint, and beautiful pink/rose glowing halo */}
        <div 
          className={`relative w-full aspect-[3/4] bg-[#fcfbfa]/95 rounded-xl border transition-all duration-300 overflow-hidden ${
            isHovered 
              ? "shadow-[0_0_25px_rgba(244,114,182,0.7),_0_0_10px_rgba(244,114,182,0.4)] -translate-y-2 border-pink-400 ring-1 ring-pink-400/50" 
              : isFocused 
                ? "shadow-[0_0_35px_rgba(244,114,182,0.85),_0_0_15px_rgba(244,114,182,0.5)] border-pink-500 ring-2 ring-pink-500/60" 
                : "shadow-[0_0_15px_rgba(244,114,182,0.35),_0_4px_12px_rgba(0,0,0,0.15)] border-pink-300/30"
          }`}
        >
        {/* Main Image */}
        <img
          src={imgSrc}
          alt={memory.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none pointer-events-none rounded-xl"
        />

        {/* Film Scan & Ambient Shadow Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20 pointer-events-none rounded-xl" />

        {/* Play/Image Indicator */}
        <div className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 backdrop-blur-sm rounded-xl text-white pointer-events-none">
          {hasVideo ? (
            <Play className="w-3.5 h-3.5 text-[#B57C50] fill-[#B57C50] animate-pulse" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5 text-amber-100" />
          )}
        </div>

        {/* Category Tag */}
        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-xl bg-[#8B4513] text-[9px] font-sans tracking-wide text-[#F9F7F2] font-semibold uppercase">
          {memory.category}
        </span>

        {/* Narrative Text/Details overlaying the image at the bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3 pt-8 pb-3 bg-gradient-to-t from-black/60 via-black/40 to-transparent text-left flex flex-col justify-end pointer-events-none">
          {/* Card Title */}
          <h4 className="font-serif text-[13px] font-semibold text-white tracking-wide truncate drop-shadow">
            {memory.title}
          </h4>

          {/* Card subtitle/english */}
          <p className="font-mono text-[8px] text-stone-300 uppercase tracking-widest leading-none mt-1 truncate drop-shadow-sm">
            {memory.subTitle}
          </p>

          <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2 text-[8px] text-stone-300 font-sans">
            <span className="flex items-center gap-0.5 font-mono drop-shadow-sm">
              <Calendar className="w-2.5 h-2.5 text-[#B57C50]" />
              {memory.date}
            </span>
            <span className="flex items-center gap-0.5 text-right w-1/2 justify-end truncate drop-shadow-sm">
              <MapPin className="w-2.5 h-2.5 text-amber-300 flex-shrink-0" />
              <span className="truncate">{memory.location}</span>
            </span>
          </div>
        </div>

        {/* Play/View Button overlay for easy single-tap on mobile/focused state */}
        {(isFocused || isHovered) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDoubleSelect(memory);
            }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-2 bg-pink-500/90 text-[#FDFBF7] font-semibold font-sans text-[11px] rounded-xl flex items-center gap-1 shadow-lg border border-pink-400 hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer animate-pulse"
          >
            {hasVideo ? <Play className="w-3.5 h-3.5 fill-current text-white animate-pulse" /> : <ImageIcon className="w-3.5 h-3.5 text-white" />}
            <span>{hasVideo ? "播放视频 / Play" : "查看详情 / View"}</span>
          </button>
        )}

        {/* Quick Like Button overlayed above details */}
        <button 
          onClick={handleLike}
          className="absolute bottom-[3.5rem] right-2.5 p-1.5 rounded-xl bg-white/95 backdrop-blur-sm border border-[#1A1A1A]/10 shadow-md transition-all duration-300 hover:scale-110 active:scale-95 group-hover:opacity-100"
        >
          <Heart 
            className={`w-3 h-3 transition-colors ${
              isLiked ? "fill-[#8B4513] text-[#8B4513]" : "text-stone-400 hover:text-[#8B4513]"
            }`} 
          />
        </button>

        {/* Floating cosmic hearts animation */}
        {floatingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            className="absolute pointer-events-none z-50 text-pink-500 fill-pink-500"
            style={{
              bottom: "4rem",
              right: "1.2rem",
            }}
            initial={{ opacity: 1, y: 0, x: 0, scale: 0.2, rotate: 0 }}
            animate={{
              opacity: 0,
              y: -140 - Math.random() * 50,
              x: heart.x,
              scale: heart.scale,
              rotate: heart.rotate,
            }}
            transition={{
              duration: 1.4,
              ease: "easeOut",
            }}
          >
            <Heart className="w-3 h-3 fill-pink-500 text-pink-400 drop-shadow-[0_1px_5px_rgba(244,114,182,0.8)]" />
          </motion.div>
        ))}
      </div>
      </motion.div>
    </motion.div>
  );
}
