import { useEffect, useRef } from "react";

interface Heart {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  maxSize: number;
  opacity: number;
  duration: number;
  progress: number;
  rotation: number;
  schemeIndex: number;
}

const COLOR_SCHEMES = [
  {
    // Classic Pink
    specular: "#fff1f5",
    bloom: "#fbcfe8",
    body: "#ec4899",
    shadow: "#be185d",
    back: "#701a35",
    glowRgb: "244, 114, 182",
    spotlight: "#ffe4e6",
  },
  {
    // Soft Rose Red (Light Red)
    specular: "#fff1f2",
    bloom: "#ffe4e6",
    body: "#fb7185",
    shadow: "#e11d48",
    back: "#881337",
    glowRgb: "251, 113, 133",
    spotlight: "#fff1f2",
  },
  {
    // Peach Amber (Light Orange)
    specular: "#fffbeb",
    bloom: "#ffedd5",
    body: "#f97316",
    shadow: "#ea580c",
    back: "#7c2d12",
    glowRgb: "249, 115, 22",
    spotlight: "#ffedd5",
  },
  {
    // Velvet Cherry Red
    specular: "#fff1f2",
    bloom: "#fecdd3",
    body: "#e11d48",
    shadow: "#be123c",
    back: "#4c0519",
    glowRgb: "225, 29, 72",
    spotlight: "#ffe4e6",
  },
  {
    // Sunset Coral (Warm Orange-Pink mix)
    specular: "#fff7ed",
    bloom: "#fed7aa",
    body: "#ff6b3d",
    shadow: "#f97316",
    back: "#7c2d12",
    glowRgb: "255, 107, 61",
    spotlight: "#ffedd5",
  },
  {
    // Pastel Bubblegum Pink
    specular: "#fff5f7",
    bloom: "#fdf2f8",
    body: "#f472b6",
    shadow: "#db2777",
    back: "#831843",
    glowRgb: "244, 114, 182",
    spotlight: "#fce7f3",
  },
  {
    // Apricot Nectar (Soft Light Orange)
    specular: "#fffaf0",
    bloom: "#ffebd8",
    body: "#fda4af",
    shadow: "#f43f5e",
    back: "#9f1239",
    glowRgb: "253, 164, 175",
    spotlight: "#fff1f2",
  }
];

export function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Detect if the client is on a mobile platform
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    
    // Set dynamic particle load based on computing capacity to avoid browser crashing
    // Mobile screen sizes are smaller, so 180 is very dense; Desktop gets a lush 500-particle canvas.
    const count = isMobile ? 180 : 500;
    const hearts: Heart[] = [];

    // Pre-render high-fidelity glossy heart sprites to offscreen canvases
    const offscreenCanvases: HTMLCanvasElement[] = COLOR_SCHEMES.map((scheme) => {
      const offscreen = document.createElement("canvas");
      // Scale offscreen base target size to keep graphics ultra-crisp
      offscreen.width = 64;
      offscreen.height = 64;
      
      const octx = offscreen.getContext("2d");
      if (octx) {
        octx.save();
        octx.translate(32, 32);

        // Render soft blooming shadow glow
        octx.shadowColor = `rgba(${scheme.glowRgb}, 0.55)`;
        octx.shadowBlur = 6;
        octx.shadowOffsetX = 0;
        octx.shadowOffsetY = 2;

        // Base heart dimensions in offscreen canvas space (approx. 24px wide/high)
        const w = 24;
        const h = 24;

        // Offset visual center of mass
        octx.translate(0, -h * 0.1);

        octx.beginPath();
        octx.moveTo(0, h * 0.4);
        octx.bezierCurveTo(-w * 0.55, h * 0.05, -w * 0.55, -h * 0.45, -w * 0.1, -h * 0.45);
        octx.bezierCurveTo(0, -h * 0.45, 0, -h * 0.20, 0, -h * 0.10);
        octx.bezierCurveTo(0, -h * 0.20, 0, -h * 0.45, w * 0.1, -h * 0.45);
        octx.bezierCurveTo(w * 0.55, -h * 0.45, w * 0.55, h * 0.05, 0, h * 0.4);
        octx.closePath();

        // 3D Glassy radial filling
        const grad = octx.createRadialGradient(-w * 0.15, -h * 0.2, 0, 0, -h * 0.1, w * 0.55);
        grad.addColorStop(0, scheme.specular);
        grad.addColorStop(0.25, scheme.bloom);
        grad.addColorStop(0.65, scheme.body);
        grad.addColorStop(0.9, scheme.shadow);
        grad.addColorStop(1.0, scheme.back);

        octx.fillStyle = grad;
        octx.fill();

        // High gloss highlight
        octx.shadowColor = "transparent";
        octx.shadowBlur = 0;
        octx.save();
        octx.translate(-w * 0.18, -h * 0.22);
        octx.rotate((-20 * Math.PI) / 180);
        octx.beginPath();
        octx.ellipse(0, 0, w * 0.14, h * 0.09, 0, 0, Math.PI * 2);
        octx.fillStyle = scheme.spotlight;
        octx.globalAlpha = 0.75;
        octx.fill();
        octx.restore();

        octx.restore();
      }
      return offscreen;
    });

    // Initialize with pre-warmed randomized progress values
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const originNoise = Math.random() * 16; // soft cluster near center
      const startX = 50 + Math.cos(angle) * originNoise;
      const startY = 48 + Math.sin(angle) * originNoise;

      const targetDistance = 80 + Math.random() * 75;
      const targetX = 50 + Math.cos(angle) * targetDistance;
      const targetY = 48 + Math.sin(angle) * targetDistance;

      const schemeIndex = Math.floor(Math.random() * COLOR_SCHEMES.length);

      hearts.push({
        startX,
        startY,
        targetX,
        targetY,
        maxSize: Math.random() * 10 + 6, // elegant size range
        opacity: Math.random() * 0.45 + 0.45,
        duration: Math.random() * 12 + 5.5,
        progress: Math.random(), // pre-warmed background populate
        rotation: (Math.random() - 0.5) * 260,
        schemeIndex,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < hearts.length; i++) {
        const h = hearts[i];

        // Frame rate independent progression
        h.progress += delta / h.duration;
        if (h.progress >= 1) {
          h.progress = 0;
          
          const angle = Math.random() * Math.PI * 2;
          const originNoise = Math.random() * 16;
          h.startX = 50 + Math.cos(angle) * originNoise;
          h.startY = 48 + Math.sin(angle) * originNoise;
          const targetDistance = 80 + Math.random() * 75;
          h.targetX = 50 + Math.cos(angle) * targetDistance;
          h.targetY = 48 + Math.sin(angle) * targetDistance;
          h.maxSize = Math.random() * 10 + 6;
          h.opacity = Math.random() * 0.45 + 0.45;
          h.duration = Math.random() * 12 + 5.5;
        }

        const easeProgress = Math.pow(h.progress, 2); // 3D flight spacing effect
        const relativeX = h.startX + (h.targetX - h.startX) * easeProgress;
        const relativeY = h.startY + (h.targetY - h.startY) * easeProgress;
        
        const px = (relativeX / 100) * width;
        const py = (relativeY / 100) * height;

        const currentScale = 0.05 + (1.8 - 0.05) * easeProgress;
        
        let currentOpacity = h.opacity;
        if (h.progress < 0.2) {
          // Fade in smoothly at startup
          currentOpacity = (h.progress / 0.2) * h.opacity;
        } else if (h.progress > 0.8) {
          // Fade out smoothly at edges
          currentOpacity = ((1 - h.progress) / 0.2) * h.opacity;
        }

        const currentRotation = h.rotation * easeProgress;

        // Blazing-fast blitting of pre-rendered heart texture
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((currentRotation * Math.PI) / 180);
        ctx.globalAlpha = currentOpacity;

        // Render scale math: map offscreen canvas dimensions back to desired scale
        const drawSize = (h.maxSize / 24) * 64 * currentScale;

        ctx.drawImage(
          offscreenCanvases[h.schemeIndex],
          -drawSize / 2,
          -drawSize / 2,
          drawSize,
          drawSize
        );
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 bg-black block"
    />
  );
}
