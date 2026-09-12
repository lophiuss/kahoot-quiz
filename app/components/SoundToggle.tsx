"use client";

export function SoundToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={enabled ? "关闭音效" : "开启音效"}
      className="fixed top-4 right-4 z-20 cursor-pointer bg-white/10 hover:bg-white/20 p-3 rounded-full transition duration-200 text-xl"
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
