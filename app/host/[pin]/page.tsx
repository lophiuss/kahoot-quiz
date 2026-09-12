"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useGameRealtime } from "@/lib/useGameRealtime";
import { useSound } from "@/lib/useSound";
import { SoundToggle } from "@/app/components/SoundToggle";

type Game = {
  id: string;
  pin: string;
  status: "lobby" | "question" | "reveal" | "podium";
  current_question: number;
  question_started_at: string | null;
  question_seconds: number;
};

type Player = { id: string; name: string; score: number; streak: number };

type ApiState = {
  game: Game;
  players: Player[];
  question: { q: string; options: [string, string, string, string] } | null;
  totalQuestions: number;
  answeredCount: number;
};

type RevealData = { correctIndex: number; exp: string; counts: number[] };

const SHAPES = ["▲", "◆", "●", "■"];
const COLORS = ["bg-[#e21b3c]", "bg-[#1368ce]", "bg-[#d89e00]", "bg-[#26890c]"];

export default function HostPage() {
  const params = useParams<{ pin: string }>();
  const pin = params.pin;
  const sound = useSound();

  const [state, setState] = useState<ApiState | null>(null);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const revealTriggeredFor = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${pin}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load game");
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load game");
    }
  }, [pin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount
    refresh();
  }, [refresh]);

  useGameRealtime(state?.game.id ?? null, refresh);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const joinUrl = `${window.location.origin}/play/${pin}`;
    QRCode.toDataURL(joinUrl, { width: 220, margin: 1, color: { dark: "#46178f", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [pin]);

  const triggerReveal = useCallback(async () => {
    const res = await fetch(`/api/games/${pin}/reveal`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setReveal(data);
      sound.play("correct");
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, refresh]);

  const triggerRevealRef = useRef(triggerReveal);
  useEffect(() => {
    triggerRevealRef.current = triggerReveal;
  }, [triggerReveal]);

  // Countdown + auto-reveal, driven by the server's question_started_at.
  useEffect(() => {
    const game = state?.game;
    if (!game || game.status !== "question" || !game.question_started_at) return;

    const startedAt = new Date(game.question_started_at).getTime();
    const seconds = game.question_seconds;
    let lastWholeSecond = -1;

    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, Math.ceil(seconds - elapsed));
      setTimeLeft(left);
      if (left !== lastWholeSecond && left > 0) {
        lastWholeSecond = left;
        sound.play(left <= 3 ? "tickUrgent" : "tick");
      }
      if (left <= 0 && revealTriggeredFor.current !== game.current_question) {
        revealTriggeredFor.current = game.current_question;
        triggerRevealRef.current();
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.game.status, state?.game.current_question, state?.game.question_started_at]);

  // Fanfare the moment the podium appears (fires once per game).
  const podiumSoundPlayed = useRef(false);
  useEffect(() => {
    if (state?.game.status === "podium" && !podiumSoundPlayed.current) {
      podiumSoundPlayed.current = true;
      sound.play("victory");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.game.status]);

  async function startQuiz() {
    sound.unlock(); // user gesture: safe to unlock audio here
    setError("");
    const res = await fetch(`/api/games/${pin}/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Could not start");
    else {
      sound.play("start");
      refresh();
    }
  }

  async function nextQuestion() {
    setReveal(null);
    const res = await fetch(`/api/games/${pin}/next`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Could not advance");
    else refresh();
  }

  const sortedPlayers = useMemo(
    () => [...(state?.players ?? [])].sort((a, b) => b.score - a.score),
    [state?.players]
  );

  if (!state) {
    return (
      <main className="min-h-screen bg-[#46178f] text-white flex items-center justify-center p-6">
        {error ? <p className="text-red-300 font-bold">{error}</p> : <p>加载中…</p>}
      </main>
    );
  }

  const { game } = state;

  return (
    <main className="min-h-screen bg-[#46178f] text-white flex flex-col items-center p-4 md:p-8">
      <SoundToggle enabled={sound.enabled} onToggle={sound.toggle} />
      <div className="w-full max-w-5xl mx-auto">
        {game.status === "lobby" && (
          <div className="bg-white text-slate-800 rounded-3xl p-8 shadow-2xl w-full border-4 border-amber-400 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center justify-center bg-purple-50 p-6 rounded-2xl border-2 border-purple-200">
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR code to join" width={200} height={200} className="rounded-xl shadow-md border border-slate-200 bg-white p-2" />
              )}
              <p className="mt-4 font-bold text-purple-900 text-base">📷 用手机扫码加入</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="bg-slate-900 text-white w-full p-4 rounded-2xl mb-6 shadow-inner text-center">
                <span className="text-xs tracking-widest text-slate-400 uppercase font-bold block mb-1">GAME PIN 游戏码</span>
                <span className="font-black text-4xl md:text-5xl text-amber-400 tracking-wider">
                  {game.pin.replace(/(\d{3})(\d{3})/, "$1 $2")}
                </span>
              </div>

              <div className="w-full mb-6">
                <div className="flex justify-between items-center mb-2 px-2">
                  <span className="font-bold text-slate-700">👥 已就绪学员：</span>
                  <span className="bg-purple-100 text-purple-800 font-bold px-3 py-0.5 rounded-full text-sm">
                    {state.players.length} 人
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-[3rem]">
                  {state.players.length === 0 && (
                    <span className="text-slate-400 text-sm py-2">等待学员加入…</span>
                  )}
                  {state.players.map((p) => (
                    <span key={p.id} className="bg-purple-600 text-white font-bold px-4 py-1.5 rounded-xl text-sm shadow">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={startQuiz}
                disabled={state.players.length === 0}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-xl rounded-2xl shadow-lg transition"
              >
                开始答题 (START)
              </button>
            </div>
          </div>
        )}

        {game.status === "question" && state.question && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4 px-2">
              <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full font-bold text-lg">
                问题 {game.current_question + 1} / {state.totalQuestions}
              </span>
              <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full font-bold text-lg">
                ✅ 已作答 {state.answeredCount} / {state.players.length}
              </span>
              <div className="flex items-center space-x-2 bg-amber-400 text-purple-950 px-5 py-1.5 rounded-full font-black text-xl shadow-lg">
                🕒 <span>{timeLeft}</span>
              </div>
            </div>
            <div className="w-full bg-white/20 h-3 rounded-full mb-6 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-[width] duration-200 linear"
                style={{ width: `${(timeLeft / game.question_seconds) * 100}%` }}
              />
            </div>
            <div className="bg-white text-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl w-full text-center mb-6 min-h-[160px] flex items-center justify-center border-4 border-purple-300">
              <h2 className="text-xl md:text-3xl font-bold leading-snug">{state.question.q}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {state.question.options.map((opt, i) => (
                <div key={i} className={`${COLORS[i]} p-5 md:p-6 rounded-2xl text-white font-bold text-lg md:text-xl flex items-center space-x-4`}>
                  <span className="bg-black/20 w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl flex-shrink-0">
                    {SHAPES[i]}
                  </span>
                  <span className="flex-1">{opt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {game.status === "reveal" && state.question && (
          <div className="w-full text-center flex flex-col items-center">
            <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-3xl flex flex-col items-center">
              <h2 className="text-2xl font-black mb-4">
                正确答案：{reveal ? `${SHAPES[reveal.correctIndex]} ${state.question.options[reveal.correctIndex]}` : "…"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mb-6">
                {state.question.options.map((opt, i) => {
                  const count = reveal?.counts[i] ?? 0;
                  const isCorrect = reveal?.correctIndex === i;
                  return (
                    <div
                      key={i}
                      className={`${COLORS[i]} ${isCorrect ? "ring-4 ring-emerald-400" : "opacity-80"} p-4 rounded-2xl text-white font-bold flex items-center justify-between`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="bg-black/20 w-8 h-8 rounded-lg flex items-center justify-center">{SHAPES[i]}</span>
                        {opt}
                      </span>
                      <span className="text-xl">{count}</span>
                    </div>
                  );
                })}
              </div>

              {reveal?.exp && (
                <div className="bg-purple-50 text-purple-900 p-4 rounded-2xl text-left border border-purple-200 w-full mb-6">
                  <span className="font-bold block text-sm mb-1 text-purple-700">💡 核心教理解析：</span>
                  <p className="text-base font-medium leading-relaxed">{reveal.exp}</p>
                </div>
              )}

              <div className="w-full mb-6">
                <h3 className="font-bold text-slate-700 mb-2 text-left">🏆 排行榜</h3>
                <div className="space-y-1">
                  {sortedPlayers.slice(0, 8).map((p, idx) => (
                    <div key={p.id} className="flex justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                      <span className="font-semibold">{idx + 1}. {p.name}</span>
                      <span className="font-black text-purple-700">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={nextQuestion}
                className="w-full py-4 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xl rounded-2xl shadow-lg transition"
              >
                {game.current_question + 1 >= state.totalQuestions ? "查看最终结果 (FINISH)" : "下一题 (NEXT)"}
              </button>
            </div>
          </div>
        )}

        {game.status === "podium" && (
          <div className="w-full text-center flex flex-col items-center">
            <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl border-4 border-amber-400">
              <div className="inline-block bg-amber-100 text-amber-800 p-4 rounded-full mb-3">🏆</div>
              <h2 className="text-3xl font-black mb-1">挑战完成！表现卓越！</h2>
              <p className="text-slate-500 mb-6 font-medium">最终排行榜</p>
              <div className="space-y-2">
                {sortedPlayers.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="font-bold text-lg">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`} {p.name}
                    </span>
                    <span className="font-black text-xl text-purple-700">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-red-300 font-bold text-center mt-4">{error}</p>}
      </div>
    </main>
  );
}
