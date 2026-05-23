declare global {
  interface Window {
    __bgmAudio?: HTMLAudioElement & { __playing?: boolean };
  }
}

import React, { useEffect, useRef, useState, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CAMPUS_MEMORIES, COMMEMORATION_STAGES, Memory, Stage } from "./data";
import { BackgroundParticles } from "./components/BackgroundParticles";
import { MemoryCard } from "./components/MemoryCard";
import { MemoryModal } from "./components/MemoryModal";
import { saveMedia, getMedia, deleteMedia, clearAllMedia } from "./lib/db";
import { 
  fetchSharedMemories, 
  saveSharedMemory, 
  deleteSharedMemory, 
  saveAllSharedMemories, 
  fetchSharedMusicConfig, 
  saveSharedMusicConfig 
} from "./lib/firebase";
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Music, 
  Settings, 
  RefreshCw,
  Plus, 
  Trash2, 
  Calendar, 
  MapPin, 
  Download, 
  Upload, 
  Volume2, 
  VolumeX, 
  Info,
  Layers,
  Heart
} from "lucide-react";

export default function App() {
  const [memories, setMemories] = useState<Memory[]>(CAMPUS_MEMORIES);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [focusedMemory, setFocusedMemory] = useState<Memory | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isAutoplaying, setIsAutoplaying] = useState<boolean>(false);
  
  // Custom Screen Dimensions
  const [stageSize, setStageSize] = useState({ width: 1000, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTimeRef = useRef<number>(0);

  // Audio system controls
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(0.04);
  const [musicName, setMusicName] = useState<string>("111.mp3");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userPausedRef = useRef<boolean>(false);

  // DB Sync Status
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);

  // Creative customizer controls
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    subTitle: "",
    description: "",
    date: "",
    imageUrl: "",
    videoUrl: "",
    category: "",
    location: ""
  });

  // Track page loaded state
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [customBgmUrlInput, setCustomBgmUrlInput] = useState<string>("");

  // Touch swipe memory structure for mobile interactions
  const touchStartRef = useRef<{ x: number; y: number; progress: number } | null>(null);

  // 1. Observe parent element sizes for layout calculations
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(container);

    // Initial size
    setStageSize({
      width: container.clientWidth,
      height: container.clientHeight
    });

    return () => observer.disconnect();
  }, []);

  // 2. Playback Slideshow Autoplay Engine
  useEffect(() => {
    if (!isAutoplaying) return;

    const interval = setInterval(() => {
      setScrollProgress((prev) => (prev + 1) % COMMEMORATION_STAGES.length);
    }, 8500);

    return () => clearInterval(interval);
  }, [isAutoplaying]);

  // 2b. Mouse Wheel Navigation for Commemoration Stages
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      // Guard: do not scroll stages when browsing memory details or managing customization resources
      if (focusedMemory || isCustomizerOpen) {
        return;
      }

      // Filter out tiny scrolls/touchpad drifts
      if (Math.abs(e.deltaY) < 5) {
        return;
      }

      setIsAutoplaying(false);

      setScrollProgress((prev) => {
        const totalStages = COMMEMORATION_STAGES.length;
        // Make 450px scroll delta = 1.0 full stage transition density
        let next = prev + e.deltaY / 450;
        
        // Loop the float progress
        if (next >= totalStages) {
          next = next % totalStages;
        } else if (next < 0) {
          next = (next % totalStages) + totalStages;
        }
        return next;
      });
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleGlobalWheel);
    };
  }, [focusedMemory, isCustomizerOpen]);

  // 2c. Mobile Swipe Gestures Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (focusedMemory || isCustomizerOpen) {
      return;
    }
    const touch = e.touches[0];
    if (touch) {
      setIsAutoplaying(false);
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        progress: scrollProgress
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const startState = touchStartRef.current;
    if (!startState || focusedMemory || isCustomizerOpen) {
      return;
    }
    const touch = e.touches[0];
    if (touch) {
      const deltaX = touch.clientX - startState.x;
      const deltaY = touch.clientY - startState.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (e.cancelable) {
          e.preventDefault();
        }

        const containerWidth = stageSize.width || window.innerWidth || 400;
        const dragLimit = Math.max(containerWidth * 0.6, 240);
        const progressDelta = -deltaX / dragLimit;

        const totalStages = COMMEMORATION_STAGES.length;
        let next = startState.progress + progressDelta;

        if (next >= totalStages) {
          next = next % totalStages;
        } else if (next < 0) {
          next = (next % totalStages) + totalStages;
        }
        setScrollProgress(next);
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // 3. Audio Volume Adjuster
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume;
    }
    localStorage.setItem("zsh-music-volume", musicVolume.toString());
  }, [musicVolume]);

  // Helper to persist memories changes into localStorage safely
  const persistMemories = (list: Memory[]) => {
    try {
      const serializable = list.map(m => {
        let savedImg = m.imageUrl || "";
        let savedVid = m.videoUrl || "";
        if (savedImg.startsWith("blob:")) {
          savedImg = `local://image-${m.id}`;
        }
        if (savedVid.startsWith("blob:")) {
          savedVid = `local://video-${m.id}`;
        }
        return {
          ...m,
          imageUrl: savedImg,
          videoUrl: savedVid
        };
      });
      localStorage.setItem("zsh-memories-v4", JSON.stringify(serializable));
    } catch (e) {
      console.error("Failed to save memories config to localStorage", e);
    }
  };

  // 3am. Local Database & Persistent State Initialization Engine
  useEffect(() => {
    async function initDBAndStorage() {
      try {
        // Adopt the pre-created global audio from index.html (created before React loads)
        const bgm = window.__bgmAudio || null;
        if (bgm) {
          audioRef.current = bgm;
          if (bgm.__playing) {
            setIsPlayingMusic(true);
          }
        }

        // Step 1: Resolve Memories with Firestore + Local Fallback
        let dbMemories: Memory[] = [];
        try {
          const fetched = await fetchSharedMemories();
          if (fetched && fetched.length > 0) {
            dbMemories = fetched.map(item => {
              let cleanImg = item.imageUrl || "";
              let cleanVid = item.videoUrl || "";
              if (cleanImg.startsWith("blob:")) {
                cleanImg = `local://image-${item.id}`;
              }
              if (cleanVid.startsWith("blob:")) {
                cleanVid = `local://video-${item.id}`;
              }
              return {
                id: item.id,
                title: item.title,
                subTitle: item.subTitle || "",
                description: item.description,
                date: item.date || "",
                imageUrl: cleanImg,
                videoUrl: cleanVid,
                category: item.category,
                location: item.location
              };
            });
          }
        } catch (fbErr) {
          console.error("Failed to fetch memories from Firestore, falling back to local storage", fbErr);
        }

        let initialMemories: Memory[] = [];
        if (dbMemories.length > 0) {
          // Merge Firestore data with CAMPUS_MEMORIES defaults: ensure all default cards exist
          const firestoreIds = new Set(dbMemories.map(m => m.id));
          const missingDefaults = CAMPUS_MEMORIES.filter(m => !firestoreIds.has(m.id));
          initialMemories = [...dbMemories, ...missingDefaults];
          persistMemories(initialMemories);
        } else {
          // Fallback to localStorage
          const txt = localStorage.getItem("zsh-memories-v4");
          if (txt) {
            try {
              initialMemories = JSON.parse(txt);
              // Also merge with defaults for localStorage data
              const localIds = new Set(initialMemories.map((m: Memory) => m.id));
              const missing = CAMPUS_MEMORIES.filter(m => !localIds.has(m.id));
              if (missing.length > 0) {
                initialMemories = [...initialMemories, ...missing];
              }
            } catch (e) {
              initialMemories = [...CAMPUS_MEMORIES];
            }
          } else {
            initialMemories = [...CAMPUS_MEMORIES];
          }

          // Hydrate/Seed empty Firestore with initial configurations
          try {
            await saveAllSharedMemories(initialMemories.map((m, idx) => {
              let savedImg = m.imageUrl || "";
              let savedVid = m.videoUrl || "";
              if (savedImg.startsWith("blob:")) {
                savedImg = `local://image-${m.id}`;
              }
              if (savedVid.startsWith("blob:")) {
                savedVid = `local://video-${m.id}`;
              }
              return {
                id: m.id,
                title: m.title,
                subTitle: m.subTitle || "",
                description: m.description,
                date: m.date || "",
                imageUrl: savedImg,
                videoUrl: savedVid,
                category: m.category,
                location: m.location,
                orderIndex: idx
              };
            }));
          } catch (seedErr) {
            console.error("Failed to seed initial memories into Firestore", seedErr);
          }
        }

        // For each card, resolve IndexedDB Blobs for those prefixed with local:// or blob:
        // Default cards with valid /media/ paths always prefer their local file over IndexedDB
        const resolvedMemories = await Promise.all(
          initialMemories.map(async (m) => {
            let resImg = m.imageUrl || "";
            let resVid = m.videoUrl || "";

            const defaultMem = CAMPUS_MEMORIES.find(x => x.id === m.id);
            const defaultImg = defaultMem?.imageUrl || "";

            // If a card has a CAMPUS_MEMORIES default with a /media/ path, always use it
            if (defaultImg && defaultImg.startsWith("/media/")) {
              resImg = defaultImg;
            } else if (resImg.startsWith("local://image-") || resImg.startsWith("blob:")) {
              try {
                const b = await getMedia(`card-media-${m.id}-image`);
                if (b && b.size > 0) {
                  resImg = URL.createObjectURL(b);
                }
              } catch {}
            }

            // Final safety
            if (!resImg) {
              resImg = defaultImg || "/media/image-m1.jpg";
            }

            const defaultVid = defaultMem?.videoUrl || "";
            if (defaultVid && defaultVid.startsWith("/media/")) {
              resVid = resVid.startsWith("local://video-") || resVid.startsWith("blob:") ? defaultVid : (resVid || defaultVid);
            } else if (resVid.startsWith("local://video-") || resVid.startsWith("blob:")) {
              try {
                const b = await getMedia(`card-media-${m.id}-video`);
                if (b && b.size > 0) {
                  resVid = URL.createObjectURL(b);
                } else {
                  resVid = defaultVid;
                }
              } catch {
                resVid = defaultVid;
              }
            }

            if (!resVid) resVid = defaultVid;

            return {
              ...m,
              imageUrl: resImg,
              videoUrl: resVid
            };
          })
        );

        setMemories(resolvedMemories);

        // Step 2: Always use local /media/111.mp3 — never override from Firestore/localStorage
        const initialMusicUrl = "/media/111.mp3";
        const initialMusicName = "111.mp3";
        setMusicName(initialMusicName);
        setCustomBgmUrlInput("");
        if (audioRef.current) {
          const audio = audioRef.current;
          // Belt-and-suspenders: ensure src is always /media/111.mp3
          // audio.src returns absolute URL, so check path suffix
          if (!audio.src.includes('/media/111.mp3')) {
            audio.src = initialMusicUrl;
            audio.load();
          }

          if (!userPausedRef.current) {
            if (!audio.paused) {
              // Already playing (inline script succeeded)
              setIsPlayingMusic(true);
              // If still muted after 1s, unmute (belt-and-suspenders for race condition)
              if (audio.muted) {
                setTimeout(function() { audio.muted = false; }, 600);
              }
            } else {
              // Muted-first: browsers allow muted autoplay, then unmute
              audio.muted = true;
              audio.play()
                .then(() => {
                  setIsPlayingMusic(true);
                  setTimeout(() => { audio.muted = false; }, 300);
                })
                .catch(() => {
                  // Blocked: wait for first user gesture
                  const onGesture = () => {
                    if (userPausedRef.current) return;
                    audio.muted = true;
                    audio.play()
                      .then(() => {
                        setIsPlayingMusic(true);
                        setTimeout(() => { audio.muted = false; }, 300);
                      })
                      .catch(() => {});
                    window.removeEventListener("click", onGesture);
                    window.removeEventListener("touchstart", onGesture);
                    window.removeEventListener("wheel", onGesture);
                    window.removeEventListener("keydown", onGesture);
                  };
                  window.addEventListener("click", onGesture, { passive: true });
                  window.addEventListener("touchstart", onGesture, { passive: true });
                  window.addEventListener("wheel", onGesture, { passive: true });
                  window.addEventListener("keydown", onGesture, { passive: true });
                  (audio as any).__onGesture = onGesture;
                });
            }
          }
        }

        setIsDbLoaded(true);
      } catch (err) {
        console.error("Failed to query IndexedDB or Firestore during startup", err);
        setIsDbLoaded(true);
      }
    }

    // On mobile, delay the heavy init to let the canvas render first
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const initDelay = isMobile ? 400 : 0;
    const timer = setTimeout(() => initDBAndStorage(), initDelay);
    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        const onGesture = (audioRef.current as any).__onGesture;
        if (onGesture) {
          window.removeEventListener("click", onGesture);
          window.removeEventListener("touchstart", onGesture);
          window.removeEventListener("wheel", onGesture);
          window.removeEventListener("keydown", onGesture);
        }
      }
    };
  }, []);

  const totalStages = COMMEMORATION_STAGES.length;
  let currentStageIndex = Math.round(scrollProgress) % totalStages;
  if (currentStageIndex < 0) {
    currentStageIndex += totalStages;
  }
  const activeStage = COMMEMORATION_STAGES[currentStageIndex] || COMMEMORATION_STAGES[0];

  // Smooth percentage calculation for clean visual transitions
  const smoothPercent = (() => {
    let p = scrollProgress % totalStages;
    if (p < 0) p += totalStages;
    const idx1 = Math.floor(p) % totalStages;
    const idx2 = (idx1 + 1) % totalStages;
    const t = p - Math.floor(p);
    const p1 = COMMEMORATION_STAGES[idx1].percent;
    const p2 = COMMEMORATION_STAGES[idx2].percent;
    
    // Handle wrap-around when interpolating from depart (100) to arrival (0)
    let adjustedP2 = p2;
    if (p1 - p2 > 50) {
      adjustedP2 = p2 + 100;
    } else if (p2 - p1 > 50) {
      adjustedP2 = p2 - 100;
    }
    
    let mixed = p1 + (adjustedP2 - p1) * t;
    if (mixed > 100) mixed -= 100;
    if (mixed < 0) mixed += 100;
    
    return Math.round(mixed);
  })();

  // Helper calculation for coordinates
  const getCardCoords = (index: number, total: number, stageId: string, W: number, H: number) => {
    // Avoid calculations before mount
    const clientW = W || 1000;
    const clientH = H || 600;

    const padX = Math.max(clientW * 0.4, 180);
    const padY = Math.max(clientH * 0.36, 120);

    let x = 0;
    let y = 0;
    let rotate = 0;
    let scale = 0.95;
    let opacity = 1.0;

    switch (stageId) {
      case "arrival":
        // Stacked at center layout but spread slightly more for structural depth
        const offset = index - (total - 1) / 2;
        x = offset * 8.5;
        y = Math.abs(offset) * 3.5;
        rotate = offset * 4.5;
        scale = 0.95;
        // Top-most is fully visible, others peek out
        opacity = index === total - 1 ? 1 : 0.65;
        break;

      case "cross":
        // X-shaped intersection with wider tension path coords
        const mid = Math.floor(total / 2);
        if (index < mid) {
          const ratio = index / (mid - 1 || 1); // 0 to 1
          x = (ratio - 0.5) * padX * 2.3;
          y = (ratio - 0.5) * padY * 1.7;
          rotate = (ratio - 0.5) * 22;
        } else {
          const ratio = (index - mid) / (total - mid - 1 || 1); // 0 to 1
          x = (ratio - 0.5) * padX * 2.3;
          y = -(ratio - 0.5) * padY * 1.7;
          rotate = -(ratio - 0.5) * 22;
        }
        scale = 0.88;
        break;

      case "gather":
        // Beautiful cluster in a wider, more expansive heart shape
        const angleHeart = (index / total) * Math.PI * 2;
        // Heart curve
        const hx = 16 * Math.pow(Math.sin(angleHeart), 3);
        const hy = 13 * Math.cos(angleHeart) - 5 * Math.cos(2 * angleHeart) - 2 * Math.cos(3 * angleHeart) - Math.cos(4 * angleHeart);
        x = hx * (padX * 0.075);
        y = -hy * (padY * 0.068);
        rotate = Math.sin(angleHeart) * 12;
        scale = 0.86;
        break;

      case "fan":
        // Spreading like a broad fan wings along bottom arc with higher radius and dispersion
        const fanSpan = 145; // degrees
        const fanAngle = -fanSpan / 2 + index * (fanSpan / (total - 1 || 1));
        const fanRad = (fanAngle * Math.PI) / 180;
        const radius = Math.min(clientH * 0.72, 410);
        x = Math.sin(fanRad) * radius * 1.85;
        y = -Math.cos(fanRad) * radius + (clientH * 0.12);
        rotate = fanAngle;
        scale = 0.9;
        break;

      case "grid":
        // Structured calendar grids with significantly wider column and row margins
        const cols = total > 12 ? 5 : 4;
        const rows = Math.ceil(total / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const gridW = (col - (cols - 1) / 2) * (clientW * 0.26);
        const gridY = (row - (rows - 1) / 2) * (clientH * 0.29);
        x = gridW;
        y = gridY;
        rotate = (col - (cols - 1) / 2) * (row - (rows - 1) / 2) * 2.5;
        scale = 0.84;
        break;

      case "spiral":
        // Fibonacci-style spiral expanded widely in orbital distance
        const rotations = 2.4; 
        const spAngle = (index / total) * Math.PI * 2 * rotations;
        const spRadius = 45 + (index / total) * (Math.min(clientW, clientH) * 0.54);
        x = Math.cos(spAngle) * spRadius * 1.55;
        y = Math.sin(spAngle) * spRadius * 1.25;
        rotate = (spAngle * 180) / Math.PI + 90;
        scale = 0.86;
        break;

      case "depart":
        // Wide dispersion ring with centered graduation spotlight
        const circleRad = (index / total) * Math.PI * 2;
        const rx = padX * 1.72;
        const ry = padY * 1.28;
        x = Math.cos(circleRad) * rx;
        y = Math.sin(circleRad) * ry;
        rotate = (circleRad * 180) / Math.PI + 90;
        scale = 0.82;
        break;

      default:
        break;
    }

    return { x, y, rotate, scale, opacity };
  };

  // Helper calculation for interpolated coordinates
  const getInterpolatedCoords = (index: number, total: number, progress: number, W: number, H: number) => {
    let p = progress % totalStages;
    if (p < 0) p += totalStages;

    const idx1 = Math.floor(p) % totalStages;
    const idx2 = (idx1 + 1) % totalStages;
    const t = p - Math.floor(p);

    const coords1 = getCardCoords(index, total, COMMEMORATION_STAGES[idx1].id, W, H);
    const coords2 = getCardCoords(index, total, COMMEMORATION_STAGES[idx2].id, W, H);

    const mix = (v1: number, v2: number, ratio: number) => v1 + (v2 - v1) * ratio;

    return {
      x: mix(coords1.x, coords2.x, t),
      y: mix(coords1.y, coords2.y, t),
      rotate: mix(coords1.rotate, coords2.rotate, t),
      scale: mix(coords1.scale, coords2.scale, t),
      opacity: mix(coords1.opacity, coords2.opacity, t)
    };
  };

  // 4. Modal navigators
  const findMemorySibling = (direction: "prev" | "next") => {
    if (!focusedMemory) return;
    const currentIndex = memories.findIndex(m => m.id === focusedMemory.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === "prev") {
      targetIndex = currentIndex === 0 ? memories.length - 1 : currentIndex - 1;
    } else {
      targetIndex = currentIndex === memories.length - 1 ? 0 : currentIndex + 1;
    }
    setFocusedMemory(memories[targetIndex]);
    setSelectedMemory(memories[targetIndex]);
  };

  // Change background music dynamically and persist changes instantly
  const changeMusic = async (name: string, url: string) => {
    try {
      setMusicName(name);
      localStorage.setItem("zsh-music-name", name);
      localStorage.setItem("zsh-music-url", url);
      
      let realUrl = url;
      if (url === "local") {
        const savedMusicFile = await getMedia("custom-bg-music");
        if (savedMusicFile) {
          realUrl = URL.createObjectURL(savedMusicFile);
        } else {
          // fallback to default
          realUrl = "/media/111.mp3";
          localStorage.setItem("zsh-music-url", realUrl);
          setMusicName("111.mp3");
          localStorage.setItem("zsh-music-name", "111.mp3");
        }
      }

      if (audioRef.current) {
        audioRef.current.src = realUrl;
        audioRef.current.load();
        
        // Auto play on action with robust gesture backup
        audioRef.current.play()
          .then(() => {
            setIsPlayingMusic(true);
            setHasInteracted(true);
          })
          .catch((e) => {
            console.log("Audio updated but play waiting for user interaction support", e);
            setIsPlayingMusic(true);
            setHasInteracted(true);
          });
      }

      // Synchronize back background settings to Firestore (For direct URL support across devices)
      try {
        await saveSharedMusicConfig({
          id: "music",
          name: name,
          url: url
        });
      } catch (fbErr) {
        console.error("Firestore sync failed for music change", fbErr);
      }
    } catch (e) {
      console.error("Change music failed", e);
    }
  };

  // 5. Audio files loader
  const handleMusicUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await saveMedia("custom-bg-music", file);
        await changeMusic(file.name, "local");
      } catch (err) {
        console.error("Failed to save audio file into DB", err);
      }
    }
  };

  const toggleMusicPlay = () => {
    setHasInteracted(true);
    if (!audioRef.current) return;
    
    if (isPlayingMusic) {
      audioRef.current.pause();
      userPausedRef.current = true;
      setIsPlayingMusic(false);
    } else {
      userPausedRef.current = false;
      if (audioRef.current.muted) audioRef.current.muted = false;
      audioRef.current.play()
        .then(() => {
          setIsPlayingMusic(true);
        })
        .catch(e => console.log("Init audio play failed, user gesture needed", e));
    }
  };

  // 6. User Customizer Functions
  const handleEditCardInit = (memory: Memory) => {
    setEditingCardId(memory.id);
    setEditForm({
      title: memory.title,
      subTitle: memory.subTitle,
      description: memory.description,
      date: memory.date,
      imageUrl: memory.imageUrl,
      videoUrl: memory.videoUrl || "",
      category: memory.category,
      location: memory.location
    });
  };

  const handleCardImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingCardId) {
      try {
        await saveMedia(`card-media-${editingCardId}-image`, file);
        const url = URL.createObjectURL(file);
        setEditForm(prev => ({ ...prev, imageUrl: url }));
      } catch (err) {
        console.error("Save card image fail", err);
      }
    }
  };

  const handleCardVideoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingCardId) {
      try {
        await saveMedia(`card-media-${editingCardId}-video`, file);
        const url = URL.createObjectURL(file);
        setEditForm(prev => ({ ...prev, videoUrl: url }));
      } catch (err) {
        console.error("Save card video fail", err);
      }
    }
  };

  const saveEditedCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCardId) return;

    const baseMemory = memories.find(m => m.id === editingCardId);
    if (!baseMemory) return;

    const updatedMemory = {
      ...baseMemory,
      ...editForm,
      // Prevent empty imageUrl from overwriting a valid existing one
      imageUrl: editForm.imageUrl || baseMemory.imageUrl,
      videoUrl: editForm.videoUrl || ""
    };

    const updatedMemories = memories.map(m => 
      m.id === editingCardId ? updatedMemory : m
    );
    setMemories(updatedMemories);
    persistMemories(updatedMemories);

    // Update highlights too
    if (selectedMemory && selectedMemory.id === editingCardId) {
      setSelectedMemory(updatedMemory);
    }
    if (focusedMemory && focusedMemory.id === editingCardId) {
      setFocusedMemory(updatedMemory);
    }

    setEditingCardId(null);

    // Synchronize to Firestore with clean, non-blob URLs
    try {
      const idx = updatedMemories.findIndex(m => m.id === editingCardId);
      let firestoreImg = updatedMemory.imageUrl || "";
      let firestoreVid = updatedMemory.videoUrl || "";
      if (firestoreImg.startsWith("blob:")) {
        firestoreImg = `local://image-${editingCardId}`;
      }
      if (firestoreVid.startsWith("blob:")) {
        firestoreVid = `local://video-${editingCardId}`;
      }

      await saveSharedMemory({
        ...updatedMemory,
        imageUrl: firestoreImg,
        videoUrl: firestoreVid,
        subTitle: updatedMemory.subTitle || "",
        date: updatedMemory.date || "",
        orderIndex: idx >= 0 ? idx : 0
      });
    } catch (fbErr) {
      console.error("Failed to sync edited card to Firestore", fbErr);
    }
  };

  const handleAddNewCard = async () => {
    if (memories.length >= 28) {
      alert("温馨提示：由于3D空间极速飞行渲染效能，卡片最多只能放置 28 个。请先删除不需要的卡片，再进行添加哦。");
      return;
    }
    const freshId = "m" + Date.now();
    const freshMemory: Memory = {
      id: freshId,
      title: "新记忆片段",
      subTitle: "NEW MEMORY CHIP",
      description: "在这里写下关于这段时光的故事与感慨。回忆是唯一的归宿。",
      date: "2026.06.01",
      imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80",
      category: "回忆",
      location: "一号草坪"
    };

    const updatedMemories = [...memories, freshMemory];
    setMemories(updatedMemories);
    persistMemories(updatedMemories);

    // Save to Firestore
    try {
      await saveSharedMemory({
        ...freshMemory,
        subTitle: freshMemory.subTitle || "",
        videoUrl: freshMemory.videoUrl || "",
        date: freshMemory.date || "",
        orderIndex: updatedMemories.length - 1
      });
    } catch (fbErr) {
      console.error("Failed to sync new card to Firestore", fbErr);
    }

    handleEditCardInit(freshMemory);
  };

  const handleRemoveCard = async (id: string) => {
    if (memories.length <= 4) {
      alert("请至少保留4个记忆卡片，以维持华丽的太空流星雨变换。");
      return;
    }
    const updatedMemories = memories.filter(m => m.id !== id);
    setMemories(updatedMemories);
    persistMemories(updatedMemories);

    if (selectedMemory?.id === id) setSelectedMemory(null);
    if (focusedMemory?.id === id) setFocusedMemory(null);

    // Remove DB keys to save space
    await deleteMedia(`card-media-${id}-image`);
    await deleteMedia(`card-media-${id}-video`);

    // Delete representation from Firestore
    try {
      await deleteSharedMemory(id);
    } catch (fbErr) {
      console.error("Failed to sync card deletion to Firestore", fbErr);
    }
  };

  // Reset default configuration
  const handleResetDefaults = async () => {
    if (window.confirm("确定要还原默认的研究生/大学回忆排版和素材吗？这会清除您上传的所有本地照片。")) {
      await clearAllMedia();
      localStorage.removeItem("zsh-memories-v4");
      localStorage.removeItem("zsh-music-name");
      localStorage.removeItem("zsh-music-url");
      localStorage.removeItem("zsh-music-volume");

      setMemories(CAMPUS_MEMORIES);
      setMusicName("111.mp3");
      setCustomBgmUrlInput("");
      if (audioRef.current) {
        audioRef.current.src = "/media/111.mp3";
      }
      setSelectedMemory(null);
      setFocusedMemory(null);
      setEditingCardId(null);

      // Clean Firestore and load default assets
      try {
        const fetched = await fetchSharedMemories();
        for (const m of fetched) {
          await deleteSharedMemory(m.id);
        }

        await saveAllSharedMemories(CAMPUS_MEMORIES.map((m, idx) => ({
          ...m,
          videoUrl: m.videoUrl || "",
          subTitle: m.subTitle || "",
          date: m.date || "",
          orderIndex: idx
        })));

        await saveSharedMusicConfig({
          id: "music",
          name: "111.mp3",
          url: "/media/111.mp3"
        });
      } catch (cleanFbErr) {
        console.error("Failed to reset Firestore config to template presets", cleanFbErr);
      }
    }
  };

  // Export configurations inside a JSON file to transfer across devices
  const handleExportConfiguration = () => {
    const configData = {
      version: "1.0",
      savedAt: new Date().toISOString(),
      musicName: musicName,
      musicVolume: musicVolume,
      musicUrl: localStorage.getItem("zsh-music-url") || "/media/111.mp3",
      memories: memories.map(m => {
        let epImg = m.imageUrl;
        let epVid = m.videoUrl || "";
        if (m.imageUrl.startsWith("blob:")) {
          epImg = `local://image-${m.id}`;
        }
        if (m.videoUrl && m.videoUrl.startsWith("blob:")) {
          epVid = `local://video-${m.id}`;
        }
        return {
          ...m,
          imageUrl: epImg,
          videoUrl: epVid
        };
      })
    };

    const jsonStr = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `Zsh_Campus_Memories_Backup.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import configuration JSON file
  const handleImportConfiguration = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || !Array.isArray(parsed.memories)) {
          alert("导入失败：备份文件不正确，没有检测到可加载的研究生/大学回忆数据！");
          return;
        }

        const loadedMemories = parsed.memories.map((m: any) => ({
          id: m.id || "m" + Math.random().toString(36).substr(2, 4),
          title: m.title || "自定义记忆",
          subTitle: m.subTitle || "CUSTOM MEMORY",
          description: m.description || "",
          date: m.date || "2026.06.01",
          imageUrl: m.imageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80",
          videoUrl: m.videoUrl || "",
          category: m.category || "其它",
          location: m.location || "学校操场"
        }));

        // Resolve Local Assets from Database
        const resolved = await Promise.all(
          loadedMemories.map(async (m: any) => {
            let rsImg = m.imageUrl;
            let rsVid = m.videoUrl;

            if (m.imageUrl.startsWith("local://image-")) {
              const b = await getMedia(`card-media-${m.id}-image`);
              if (b) rsImg = URL.createObjectURL(b);
            }
            if (m.videoUrl && m.videoUrl.startsWith("local://video-")) {
              const b = await getMedia(`card-media-${m.id}-video`);
              if (b) rsVid = URL.createObjectURL(b);
            }

            return {
              ...m,
              imageUrl: rsImg,
              videoUrl: rsVid
            };
          })
        );

        setMemories(resolved);
        persistMemories(resolved);
        if (parsed.musicName) {
          setMusicName(parsed.musicName);
          localStorage.setItem("zsh-music-name", parsed.musicName);
        }
        if (parsed.musicUrl) {
          localStorage.setItem("zsh-music-url", parsed.musicUrl);
          if (audioRef.current) {
            let realUrl = parsed.musicUrl;
            if (parsed.musicUrl === "local") {
              const savedFile = await getMedia("custom-bg-music");
              if (savedFile) {
                realUrl = URL.createObjectURL(savedFile);
              }
            } else {
              setCustomBgmUrlInput(parsed.musicUrl);
            }
            audioRef.current.src = realUrl;
            audioRef.current.load();
          }
        }
        if (typeof parsed.musicVolume === "number") {
          setMusicVolume(parsed.musicVolume);
          localStorage.setItem("zsh-music-volume", parsed.musicVolume.toString());
        }

        // Export/Sync new configuration to Firestore database
        try {
          const sanitizedForCloud = resolved.map((m: any, idx: number) => {
            let savedImg = m.imageUrl || "";
            let savedVid = m.videoUrl || "";
            if (savedImg.startsWith("blob:")) {
              savedImg = `local://image-${m.id}`;
            }
            if (savedVid.startsWith("blob:")) {
              savedVid = `local://video-${m.id}`;
            }
            return {
              id: m.id,
              title: m.title,
              subTitle: m.subTitle || "",
              description: m.description,
              date: m.date || "",
              imageUrl: savedImg,
              videoUrl: savedVid,
              category: m.category,
              location: m.location,
              orderIndex: idx
            };
          });

          await saveAllSharedMemories(sanitizedForCloud);

          if (parsed.musicName && parsed.musicUrl) {
            await saveSharedMusicConfig({
              id: "music",
              name: parsed.musicName,
              url: parsed.musicUrl
            });
          }
        } catch (uploadSaveErr) {
          console.error("Failed to update firestore with imported config", uploadSaveErr);
        }

        alert("🎉 完美！您的大学回忆已成功导入该浏览器并同步到云端！");
      } catch (err) {
        alert("导入解析错误：配置文件解析出错！" + err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-stone-100 overflow-hidden font-sans flex flex-col transition-colors duration-1000">
      
      {/* Audio is created in index.html via window.__bgmAudio before React loads */}

      {/* 1. Cinematic Background Layer */}
      <BackgroundParticles />

      {/* 2. Top Navigation Header (Editorial Journal Layout) */}
      <header className="relative w-full z-10 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between select-none text-white">
        
        {/* Brand Group */}
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/30">
            <Heart className="w-4 h-4 text-pink-400 fill-pink-500/35 animate-pulse" />
          </div>
          <div>
            <span className="font-serif font-bold text-base tracking-widest text-white block">
              Z S H大学生活纪念册
            </span>
          </div>
        </div>

        {/* Action controllers */}
        <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-3">
          
          {/* Audio controller display */}
           <div className="p-1 px-3 flex items-center gap-2 bg-black/35 border border-white/10 rounded-xl shadow-sm">
            <label className="cursor-pointer p-1.5 text-stone-300 hover:text-pink-300 transition-colors" title="点击上传自己珍藏的MP3背景乐">
              <Upload className="w-3.5 h-3.5 text-pink-400" />
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                onChange={handleMusicUpload}
              />
            </label>

            <button 
              onClick={toggleMusicPlay}
              className="p-1 text-stone-300 hover:text-white transition-colors"
              title={isPlayingMusic ? "暂停背景钢琴曲" : "播放轻缓柔和背景曲"}
            >
              {isPlayingMusic ? (
                <div className="flex items-center gap-1">
                  <Pause className="w-3.5 h-3.5 text-pink-400" />
                  {/* Miniature audio music wave visualization */}
                  <div className="flex items-end gap-0.5 h-4 w-5">
                    <span className="w-0.5 bg-pink-400 animate-pulse h-1/2" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                    <span className="w-0.5 bg-pink-400 animate-pulse h-full" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }} />
                    <span className="w-0.5 bg-pink-400 animate-pulse h-1/3" style={{ animationDelay: '0.5s', animationDuration: '0.5s' }} />
                    <span className="w-0.5 bg-pink-400 animate-pulse h-2/3" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                  </div>
                </div>
              ) : (
                <Play className="w-3.5 h-3.5 text-stone-400 hover:text-white" />
              )}
            </button>
            <span className="font-mono text-[10px] text-pink-300 max-w-[120px] truncate uppercase tracking-wider" title={musicName}>
              {musicName}
            </span>

            {/* Mic volume slider */}
            <div className="hidden lg:flex items-center gap-1 ml-1 border-l border-white/10 pl-2">
              <Volume2 className="w-3 h-3 text-stone-400" />
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="accent-pink-500 h-1 cursor-pointer bg-stone-700 rounded-xl w-12"
              />
            </div>
          </div>

          {/* Edit settings launcher */}
          <button 
            onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
            className={`p-1.5 px-3 rounded-xl text-xs font-sans font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              isCustomizerOpen
                ? "bg-pink-600 border border-pink-500 text-white"
                : "bg-black/30 border border-white/10 hover:bg-black/50 text-stone-300 hover:text-white"
            }`}
            title="添加或重命名照片卡，并换上属于我自己的大学瞬间"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>素材定制管理</span>
          </button>
        </div>
      </header>

      {/* Full-Screen Interactive Card Canvas */}
      <div 
        ref={containerRef}
        id="canvas-container"
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden z-5 touch-none"
        onClick={() => setSelectedMemory(null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {memories.map((memory, index) => {
          const currentPositionCoords = getInterpolatedCoords(
            index,
            memories.length,
            scrollProgress,
            stageSize.width,
            stageSize.height
          );

          const isFocused = selectedMemory?.id === memory.id;

          return (
            <MemoryCard
              key={memory.id}
              memory={memory}
              x={currentPositionCoords.x}
              y={currentPositionCoords.y}
              rotate={currentPositionCoords.rotate}
              scale={currentPositionCoords.scale}
              opacity={currentPositionCoords.opacity}
              isFocused={isFocused}
              activeStageId={activeStage.id}
              onSelect={(mem) => setSelectedMemory(mem)}
              onDoubleSelect={(mem) => {
                setSelectedMemory(mem);
                setFocusedMemory(mem);
              }}
            />
          );
        })}
      </div>

      {/* 3. Main Stage Container where polaroid cards flow */}
      <main className="relative flex-1 w-full flex flex-col justify-between overflow-hidden pointer-events-none z-10">
        
        {/* Intro/instruction card */}


        {/* Central visual indicator for DEPART stage */}
        <AnimatePresence>
          {activeStage.id === "depart" && (
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-md px-6 pointer-events-none z-0"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <h1 className="font-serif text-3xl font-bold text-white tracking-wide drop-shadow">
                顶峰相见 • GRADUATION
              </h1>
              <p className="font-sans text-stone-300 text-xs mt-3 leading-relaxed border-t border-white/10 pt-3">
                “凡是过往，皆为序章。所有的告别，都是为了在更高处再次握手同行。毕业快乐，我最璀璨的挚友们。”
              </p>
              <div className="mt-4 inline-flex items-center gap-1 bg-pink-500/10 border border-pink-400/35 px-3 py-1.5 rounded-xl text-[10px] text-pink-300 font-mono tracking-widest uppercase">
                <Sparkles className="w-3 h-3 text-pink-300 animate-bounce" />
                CELEBRATING ETERNAL BLOSSOMS
              </div>
            </motion.div>
          )}

          {activeStage.id === "arrival" && (
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center max-w-md px-6 pointer-events-none z-0"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 1 }}
            >
              <div className="p-6 bg-pink-500/10 rounded-xl border border-pink-500/20 inline-block mb-3 backdrop-blur-sm animate-pulse">
                <Music className="w-10 h-10 text-pink-400 animate-spin" style={{ animationDuration: '12s' }} />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-white tracking-widest">
                双点击中卡片
              </h2>
              <p className="font-mono text-[10px] text-pink-400 uppercase tracking-[0.25em] mt-1.5 font-bold">
                Double-Click any Card to Unfold
              </p>
              <p className="font-sans text-stone-300 text-xs mt-2.5 max-w-xs mx-auto leading-relaxed">
                这些印记与照片是时间的细碎波纹，承载着人生中最无悔、最明丽的四年时光。
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dummy spacer taking the place of original canvas element height dynamically */}
        <div className="flex-1 w-full" />

        {/* 3b. Interactive Bottom Controls: Stages Selector & Progress Bar */}
        <div className="relative w-full z-10 px-6 py-6 pb-8 bg-transparent flex flex-col md:flex-row items-center justify-between gap-5 select-none text-white pointer-events-auto">
          
          {/* Left indicator displaying 2026 */}
          <div className="flex items-center">
            <span className="font-serif text-2xl font-black text-pink-400 tracking-widest bg-pink-500/10 px-4 py-1.5 rounded-xl border border-pink-500/20 leading-none">
              2026
            </span>
          </div>



          {/* Journey Completion Counter */}
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block">
              <span className="font-mono text-stone-400 text-[10px] tracking-widest block font-bold">
                JOURNEY REVEALED
              </span>
              <span className="font-mono text-xs text-pink-400 font-bold tracking-wider block mt-0.5 animate-pulse">
                {memories.length} 校园印记片段 • {smoothPercent}%
              </span>
            </div>
            
            {/* Round dial score */}
            <div className="relative h-12 w-12 flex items-center justify-center rounded-full bg-black/40 border border-white/10">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                <circle 
                  cx="18"  
                  cy="18" 
                  r="16" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.08)" 
                  strokeWidth="2.5"
                />
                <circle 
                  cx="18" 
                  cy="18" 
                  r="16" 
                  fill="none" 
                  stroke="#ec4899" 
                  strokeWidth="2.5"
                  strokeDasharray="100, 100"
                  strokeDashoffset={100 - smoothPercent}
                  className="transition-all duration-150 ease-out"
                />
              </svg>
              <span className="font-mono text-[11px] font-bold text-white relative z-1">
                {smoothPercent}%
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* 4. Slides out Media customizer side drawer/panel */}
      <AnimatePresence>
        {isCustomizerOpen && (
          <>
            {/* Modal backdrop */}
            <motion.div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-80 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomizerOpen(false)}
            />

            {/* Customizer Slider Panel */}
            <motion.div
              className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-[#FDFBF7] border-l border-[#1a1a1a]/15 shadow-2xl z-90 p-6 overflow-y-auto flex flex-col justify-between"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#1a1a1a]/10 pb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#8b4513]" />
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#1a1a1a]">纪念册素材定制管理</h3>
                      <p className="font-sans text-[11px] text-[#8b4513]">您可以在这里更换为您心爱的大学生活照片和视频片段</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsCustomizerOpen(false)}
                    className="p-1 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-[#8b4513] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Submitting instructions */}
                <div className="mt-4 p-3.5 bg-[#8b4513]/5 border border-[#8b4513]/25 rounded-xl text-xs leading-relaxed text-stone-700">
                  <p className="font-sans font-semibold text-[#8b4513] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#8b4513]" />
                    大学时光相册使用提示：
                  </p>
                  <p className="mt-1">
                    由于网页运行在浏览器中，您在此处修改的照片和视频将立即渲染到相卡上（通过本地临时浏览器URL）。您可以点击【添加新卡片】或对已有卡片点击<b>【编辑修改】</b>。
                  </p>
                </div>

                {/* Main memories list manager */}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      已装载的记忆卡片 ({memories.length}/28)
                    </span>
                    <button
                      onClick={handleAddNewCard}
                      disabled={memories.length >= 28}
                      className={`px-2.5 py-1 text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer ${
                        memories.length >= 28 
                          ? "bg-stone-100 border border-stone-200 text-stone-400 cursor-not-allowed opacity-50"
                          : "bg-[#8b4513]/10 border border-[#8b4513]/30 text-[#8b4513] hover:bg-[#8b4513]/20 hover:text-[#5c2d0c]"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      添加新记忆
                    </button>
                  </div>

                  <div className="mt-3.5 flex flex-col gap-2.5 max-h-[30vh] overflow-y-auto pr-1.5 font-sans">
                    {memories.map((m, idx) => (
                      <div 
                        key={m.id} 
                        className={`p-3 bg-white rounded-xl border flex items-center justify-between shadow-sm group transition-all ${
                          editingCardId === m.id ? "border-[#8b4513] ring-1 ring-[#8b4513]/20" : "border-[#1a1a1a]/10 hover:border-[#8b4513]/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 w-[70%]">
                          <img 
                            src={m.imageUrl} 
                            alt={m.title} 
                            className="w-11 h-11 object-cover rounded-xl shadow-sm border border-[#1a1a1a]/10 flex-shrink-0"
                          />
                          <div className="truncate">
                            <h5 className="font-serif font-bold text-xs text-[#1a1a1a] truncate">{m.title}</h5>
                            <p className="font-sans text-[10px] text-stone-500 truncate mt-1 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-[#8b4513]" />
                              {m.date}
                              <span className="text-stone-300">|</span>
                              <MapPin className="w-2.5 h-2.5 text-[#B57C50]" />
                              {m.location}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditCardInit(m)}
                            className="px-2 py-1 bg-stone-100 hover:bg-[#8b4513] hover:text-white text-stone-600 rounded-xl text-[10px] uppercase font-sans transition-all cursor-pointer"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleRemoveCard(m.id)}
                            className="p-1 px-2 text-stone-500 hover:text-rose-600 bg-stone-100 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="删除该时间片段"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submitting editing card form */}
                {editingCardId && (
                  <motion.form 
                    onSubmit={saveEditedCard}
                    className="mt-6 p-4 bg-white border border-[#1a1a1a]/15 rounded-xl text-xs flex flex-col gap-3.5 shadow-md"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <h4 className="font-serif font-bold text-[#8b4513] flex items-center gap-1">
                        正在修改片段：{editForm.title || "未命名"}
                      </h4>
                      <span className="font-mono text-[9px] text-stone-400">
                        CARD ID: {editingCardId}
                      </span>
                    </div>

                    {/* Standard Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">主标题 / Title</label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full p-2 bg-[#FDFBF7] border border-[#1a1a1a]/15 rounded-xl text-[#1a1a1a] focus:outline-none focus:border-[#8b4513]"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">英文副标题 / Subtitle</label>
                        <input
                          type="text"
                          required
                          value={editForm.subTitle}
                          onChange={(e) => setEditForm(prev => ({ ...prev, subTitle: e.target.value }))}
                          className="w-full p-2 bg-[#FDFBF7] border border-[#1a1a1a]/15 rounded-xl text-[#1a1a1a] focus:outline-none focus:border-[#8b4513]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">记忆分类 / Category</label>
                        <input
                          type="text"
                          required
                          value={editForm.category}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full p-2 bg-[#FDFBF7] border border-[#1a1a1a]/15 rounded-xl text-[#1a1a1a] placeholder-stone-400 focus:outline-none focus:border-[#8b4513]"
                          placeholder="如 运动, 生活, 毕业"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">发生年份日期 / Date</label>
                        <input
                          type="text"
                          required
                          value={editForm.date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full p-2 bg-[#FDFBF7] border border-[#1a1a1a]/15 rounded-xl text-[#1a1a1a] placeholder-stone-400 focus:outline-none focus:border-[#8b4513]"
                          placeholder="格式如 2026.06.01"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">地点 / Location</label>
                        <input
                          type="text"
                          required
                          value={editForm.location}
                          onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full p-2 bg-[#FDFBF7] border border-[#1a1a1a]/15 rounded-xl text-[#1a1a1a] placeholder-stone-400 focus:outline-none focus:border-[#8b4513]"
                          placeholder="例: 大讲堂、田径场"
                        />
                      </div>
                    </div>

                     {/* Image & Video file customizers! */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#1a1a1a]/15 flex flex-col gap-1.5 text-[11px]">
                        <span className="font-sans font-semibold text-stone-600">1. 更新珍藏照片照片：</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleCardImageUpload}
                          className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[10px] file:bg-stone-100 file:text-stone-600 file:hover:bg-stone-200 cursor-pointer mb-1"
                        />
                        <span className="text-[10px] font-semibold text-stone-500 mt-0.5">或粘贴线上图片网址 (永久、跨设备共享)：</span>
                        <input
                          type="url"
                          placeholder="以 http:// 或 https:// 开头"
                          value={editForm.imageUrl.startsWith("blob:") || editForm.imageUrl.startsWith("local://") ? "" : editForm.imageUrl}
                          onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          className="w-full p-1 bg-white border border-[#1a1a1a]/15 rounded-md text-[10px] focus:outline-none focus:border-[#8b4513]"
                        />
                        <div className="text-[9px] text-[#8b4513] font-bold truncate mt-0.5">
                          当前照片: {editForm.imageUrl ? (editForm.imageUrl.startsWith("blob:") || editForm.imageUrl.startsWith("local://") ? "📸 已装载本地文件" : "🌐 已链接外部网址") : "无图"}
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#FDFBF7] rounded-xl border border-[#1a1a1a]/15 flex flex-col gap-1.5 text-[11px]">
                        <span className="font-sans font-semibold text-stone-600">2. 装载视频片段 (可选)：</span>
                        <input 
                          type="file" 
                          accept="video/*" 
                          onChange={handleCardVideoUpload}
                          className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[10px] file:bg-stone-100 file:text-stone-600 file:hover:bg-stone-200 cursor-pointer mb-1"
                        />
                        <span className="text-[10px] font-semibold text-stone-500 mt-0.5">或粘贴线上视频网址 (永久、跨设备共享)：</span>
                        <input
                          type="url"
                          placeholder="以 http:// 或 https:// 开头"
                          value={editForm.videoUrl?.startsWith("blob:") || editForm.videoUrl?.startsWith("local://") ? "" : editForm.videoUrl}
                          onChange={(e) => setEditForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                          className="w-full p-1 bg-white border border-[#1a1a1a]/15 rounded-md text-[10px] focus:outline-none focus:border-[#8b4513]"
                        />
                        <div className="text-[9px] text-[#8b4513] font-bold truncate mt-0.5">
                          当前视频: {editForm.videoUrl ? (editForm.videoUrl.startsWith("blob:") || editForm.videoUrl.startsWith("local://") ? "🎥 已装载本地视频" : "🌐 已链接外部视频") : "无/纯照片展示"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-600 font-medium mb-1">感人治愈的故事回忆 / Narrative Description</label>
                      <textarea
                        required
                        rows={3}
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full p-2 bg-[#FDFBF7] border border-[#1a1a1a]/15 rounded-xl text-[#1a1a1a] font-serif leading-relaxed placeholder-stone-400 focus:outline-none focus:border-[#8b4513]"
                        placeholder="在这里书写当时的回忆感触文字..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-[#8b4513] hover:bg-[#5c2d0c] text-white font-bold rounded-xl text-center transition-all cursor-pointer"
                      >
                        保存当前卡片
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCardId(null)}
                        className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-all cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  </motion.form>
                )}
              </div>

              {/* Background Music Customization Block */}
              <div className="mt-6 p-4 bg-[#8b4513]/5 border border-[#8b4513]/15 rounded-2xl font-sans">
                <div className="flex items-center gap-2 border-b border-[#1a1a1a]/10 pb-2.5 mb-3">
                  <Music className="w-4 h-4 text-[#8b4513]" />
                  <h4 className="font-serif font-bold text-xs text-[#1a1a1a]">背景音乐定制管理</h4>
                </div>

                {/* Current Active Music Card status */}
                <div className="p-3 bg-white rounded-xl border border-[#1a1a1a]/10 mb-3 flex items-center justify-between">
                  <div className="truncate w-[65%]">
                    <span className="block text-[9px] font-mono text-stone-400 font-bold uppercase tracking-wider">CURRENT TRACK</span>
                    <span className="font-serif font-bold text-xs text-[#1a1a1a] truncate block mt-0.5" title={musicName}>
                      {musicName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <button
                      type="button"
                      onClick={toggleMusicPlay}
                      className="p-1 px-2.5 bg-[#8b4513] hover:bg-[#5c2d0c] text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {isPlayingMusic ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" />}
                      <span>{isPlayingMusic ? "暂停" : "播放"}</span>
                    </button>
                  </div>
                </div>

                {/* Built-in Preset Songs Selectors */}
                <div className="mb-3.5">
                  <span className="block text-[10px] font-semibold text-stone-500 mb-1.5">🎵 选择内置舒缓背景音轨：</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { name: "静谧星河 - 温柔夜色颂 (Default)", url: "/media/111.mp3" },
{ name: "静谧星河 - 温柔夜色颂", url: "/media/111.mp3" }
                    ].map((track) => (
                      <button
                        key={track.url}
                        type="button"
                        onClick={() => changeMusic(track.name, track.url)}
                        className={`w-full text-left p-2 rounded-xl text-[11px] border transition-all flex items-center justify-between cursor-pointer ${
                          musicName === track.name
                            ? "bg-[#8b4513]/10 border-[#8b4513] text-[#8b4513] font-semibold"
                            : "bg-white border-stone-200 hover:border-stone-300 text-stone-700"
                        }`}
                      >
                        <span className="truncate">{track.name}</span>
                        {musicName === track.name && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8b4513] animate-ping" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload or Custom BGM URL */}
                <div className="flex flex-col gap-2.5">
                  {/* BGM file Upload */}
                  <div className="p-2.5 bg-white border border-stone-200 rounded-xl flex flex-col gap-1 text-[11px]">
                    <span className="font-semibold text-stone-600">📤 上传您喜爱的本地 MP3 金曲：</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleMusicUpload}
                      className="w-full text-[10px] text-stone-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:bg-stone-100 file:text-stone-600 file:hover:bg-stone-200 cursor-pointer"
                    />
                  </div>

                  {/* Online BGM URL input */}
                  <div className="p-2.5 bg-white border border-stone-200 rounded-xl flex flex-col gap-1.5 text-[11px]">
                    <span className="font-semibold text-stone-600">🌐 使用网络在线 MP3 直游链接：</span>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="输入以 http:// 或 https:// 开头的音频网址"
                        value={customBgmUrlInput}
                        onChange={(e) => setCustomBgmUrlInput(e.target.value)}
                        className="flex-1 p-1 px-2 border border-stone-200 rounded-lg text-xs font-sans text-stone-800 bg-[#FDFBF7]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customBgmUrlInput.trim().startsWith("http")) {
                            alert("请输入以 http 或 https 开头的真实音频直链网址！");
                            return;
                          }
                          let customName = "自定义网络背景音乐";
                          try {
                            const parts = customBgmUrlInput.split("/");
                            const lastPart = parts[parts.length - 1];
                            if (lastPart && lastPart.includes(".mp3")) {
                              customName = decodeURIComponent(lastPart);
                            }
                          } catch (e) {}
                          changeMusic(customName, customBgmUrlInput.trim());
                        }}
                        className="px-2.5 py-1 bg-[#8b4513] hover:bg-[#5c2d0c] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        应用
                      </button>
                    </div>
                  </div>

                  {/* Vol controller slider */}
                  <div className="p-2.5 bg-white border border-stone-200 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#1a1a1a] flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-stone-500" />
                      背景音乐音量控制：
                    </span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                        className="accent-[#8b4513] h-1.5 cursor-pointer bg-stone-100 rounded-lg w-24"
                      />
                      <span className="font-mono text-xs text-stone-600 w-6 text-right font-bold">
                        {Math.round(musicVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-dashed border-stone-200/50 bg-[#8b4513]/5 p-3.5 rounded-2xl font-sans">
                <span className="block text-[11px] font-bold text-[#8b4513] mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-500 animate-pulse" /> 跨设备/永久部署备份迁移：
                </span>
                <p className="text-[10px] text-stone-500 mb-2.5 leading-relaxed">
                  若在此处上传了本地照片/背景曲，且希望分享给他人或在此后部署的网址中正常访问，可直接<b>在此导出备份文件</b>，在手机或其他浏览器中打开本网页后，在此点击<b>【导入】</b>即可一秒复原！
                </p>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExportConfiguration}
                    className="flex-1 py-1.5 bg-pink-600 hover:bg-pink-700 text-[#FDFBF7] font-semibold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-3 h-3.5" />
                    <span>💾 导出备份</span>
                  </button>

                  <label className="flex-1 py-1.5 bg-[#FDFBF7] hover:bg-stone-50 border border-stone-300 text-stone-700 font-semibold rounded-xl text-[10px] flex items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center relative">
                    <Upload className="w-3 h-3.5 text-stone-500" />
                    <span>📥 导入备份</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportConfiguration}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-6 border-t border-[#1a1a1a]/10 pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="w-1/2 py-2 bg-zinc-100 hover:bg-rose-50 border border-zinc-200 rounded-xl text-xs font-sans text-rose-600 hover:text-rose-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>恢复初始排版</span>
                </button>

                <button
                  onClick={() => setIsCustomizerOpen(false)}
                  className="w-1/2 py-2 bg-stone-800 hover:bg-stone-900 border border-stone-800 rounded-xl text-xs text-white transition-all flex items-center justify-center cursor-pointer"
                >
                  继续漫游彼校
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. Poetic Full-Sized Details Slider Zoom Modal */}
      <MemoryModal
        isOpen={focusedMemory !== null}
        memory={focusedMemory}
        onClose={() => setFocusedMemory(null)}
        onPrev={() => findMemorySibling("prev")}
        onNext={() => findMemorySibling("next")}
      />

    </div>
  );
}

// Custom Close icon for panels
function X({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  );
}
