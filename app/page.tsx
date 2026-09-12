"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleHost() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/games", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create game");
      router.push(`/host/${data.pin}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setCreating(false);
    }
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanPin = pin.replace(/\D/g, "");
    if (cleanPin.length !== 6) {
      setError("请输入 6 位游戏码 PIN");
      return;
    }
    setJoining(true);
    router.push(`/play/${cleanPin}`);
  }

  return (
    <main className="min-h-screen bg-[#46178f] text-white flex flex-col items-center justify-center p-6">
      <div className="bg-white text-purple-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl border-4 border-amber-400 text-center">
        <span className="bg-amber-100 text-amber-800 font-bold px-4 py-1.5 rounded-full text-sm inline-block mb-3">
          🎮 Kahoot 知识大挑战
        </span>
        <h1 className="font-black text-3xl md:text-4xl mb-3 text-purple-950">
          教会与教堂的团体结构
        </h1>
        <p className="text-slate-600 font-medium mb-8 text-base md:text-lg">
          探索基督的肢体与共同体的使命 · 10题趣味竞答 · 线上多人实时对战
        </p>

        <div className="space-y-4 w-full">
          <button
            onClick={handleHost}
            disabled={creating}
            className="w-full py-4 px-6 bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white font-bold rounded-2xl text-lg md:text-xl shadow-lg transition transform hover:-translate-y-0.5"
          >
            {creating ? "创建房间中…" : "📱 主持一场游戏（生成 PIN 供大家加入）"}
          </button>

          <form onSubmit={handleJoin} className="flex flex-col gap-3 pt-2 border-t border-slate-200 mt-2">
            <p className="text-slate-500 font-semibold text-sm mt-4">或输入 PIN 加入一场游戏：</p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              placeholder="输入游戏 PIN"
              maxLength={6}
              className="w-full text-center text-2xl font-black tracking-widest py-3 rounded-2xl border-2 border-purple-200 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={joining}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-2xl text-lg md:text-xl shadow-lg transition transform hover:-translate-y-0.5"
            >
              ⚡ 加入游戏
            </button>
          </form>

          {error && <p className="text-red-600 font-bold text-sm">{error}</p>}
        </div>
      </div>
    </main>
  );
}
