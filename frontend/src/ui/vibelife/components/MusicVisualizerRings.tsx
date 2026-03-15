export interface MusicVisualizerRingsProps {
  isPlaying: boolean;
  amplitude?: number;
  isDark: boolean;
  rings?: number;
}

const RING_KEYS = [
  "ring-a",
  "ring-b",
  "ring-c",
  "ring-d",
  "ring-e",
  "ring-f",
  "ring-g",
  "ring-h",
  "ring-i",
  "ring-j",
];

export function MusicVisualizerRings({ isPlaying, amplitude = 0, isDark, rings = 3 }: MusicVisualizerRingsProps) {
  const a = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0;
  const baseColor = isDark ? "rgba(99, 102, 241," : "rgba(79, 70, 229,";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {RING_KEYS.slice(0, Math.max(0, Math.min(rings, RING_KEYS.length))).map((key, i) => (
        <div
          key={key}
          className={`absolute rounded-full border transition-all duration-75 ease-out ${isPlaying ? "animate-[spin_40s_linear_infinite]" : ""}`}
          style={{
            width: `${400 + i * 200}px`,
            height: `${400 + i * 200}px`,
            opacity: isPlaying ? 0.3 - i * 0.05 : 0.05,
            transform: isPlaying ? `scale(${1 + a * 0.15 * (3 - i)}) rotate(${i * 45}deg)` : "scale(1)",
            borderWidth: "1px",
            borderColor: isPlaying ? `${baseColor} ${0.4 - i * 0.1})` : borderColor,
            borderStyle: i === 1 ? "dashed" : "solid",
          }}
        />
      ))}

      <div
        className={`absolute w-[500px] h-[500px] rounded-full transition-all duration-1000 ${isPlaying ? "opacity-100 scale-110" : "opacity-10 scale-90"}`}
        style={{
          backgroundColor: isDark ? "rgba(99, 102, 241, 0.05)" : "rgba(79, 70, 229, 0.05)",
          filter: "blur(120px)",
        }}
      />
    </div>
  );
}
