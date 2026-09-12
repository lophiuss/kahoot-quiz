"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useGameRealtime } from "@/lib/useGameRealtime";

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
};

type AnswerResult = { questionIndex: number; isCorrect: boolean; points: number };
type RevealData = { correctIndex: number; exp: string; counts: number[] };

const SHAPES = ["▲", "◆", "●", "■"];
const COLORS = ["bg-[#e21b3c]", "bg-[#1368ce]", "bg-[#d89e00]", "bg-[#26890c]"];

function storageKey(pin: string) {
  return `kahoot_player_${pin}`;
}

export default function PlayPage() {
  const params = useParams<{ pin: string }>();
  const pin = params.pin;

  const [name, setName] = useState("");
  const [player, setPlayer] = useState<{ id: string; name: string } | null>(null);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const [state, setState] = useState<ApiState | null>(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(pin));
    if (saved) {
      try {
        setPlayer(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, [pin]);

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
    refresh();
  }, [refresh]);

  useGameRealtime(state?.game.id ?? null, refresh);

  // Fetch the reveal (correct answer + explanation) once the host flips status.
  useEffect(() => {
    if (state?.game.status !== "reveal") {
      setReveal(null);
      return;
    }
    fetch(`/api/games/${pin}/reveal`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setReveal(d);
      })
      .catch(() => {});
  }, [state?.game.status, pin]);

  // Local countdown for the question view.
  useEffect(() => {
    const game = state?.game;
    if (!game || game.status !== "question" || !game.question_started_at) return;
    const startedAt = new Date(game.question_started_at).getTime();
    const seconds = game.question_seconds;
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(seconds - elapsed)));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [state?.game.status, state?.game.current_question, state?.game.question_started_at]);

  // Reset per-question UI when a new question starts.
  useEffect(() => {
    setAnswerResult(null);
  }, [state?.game.current_question, state?.game.status === "question"]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 24);
    if (!cleanName) {
      setJoinError("请输入你的名字");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/games/${pin}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加入失败");
      const p = { id: data.player.id, name: data.player.name };
      localStorage.setItem(storageKey(pin), JSON.stringify(p));
      setPlayer(p);
      refresh();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "加入失败");
    } finally {
      setJoining(false);
    }
  }

  async function submitAnswer(selectedIndex: number | null) {
    if (!player || !state || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/games/${pin}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          questionIndex: state.game.current_question,
          selectedIndex,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnswerResult({
          questionIndex: state.game.current_question,
          isCorrect: !!data.isCorrect,
          points: data.points ?? 0,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-submit a "no answer" once time runs out, if the player hasn't answered.
  useEffect(() => {
    if (state?.game.status === "question" && timeLeft === 0 && !answerResult && !submitting) {
      submitAnswer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, state?.game.status]);

  const myPlayer = useMemo(
    () => state?.players.find((p) => p.id === player?.id) ?? null,
    [state?.players, player?.id]
  );
  if (!player) {
    return (
      <main className="min-h-screen bg-[#46178f] text-white flex items-center justify-center p-6">
        <form onSubmit={handleJoin} className="bg-white text-purple-900 rounded-3xl p-8 shadow-2xl w-full max-w-md border-4 border-amber-400 text-center">
          <h1 className="font-black text-2xl mb-1">加入游戏</h1>
          <p className="text-slate-500 font-medium mb-6">PIN: {pin}</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入你的名字"
            maxLength={24}
            autoFocus
            className="w-full text-center text-xl font-bold py-3 rounded-2xl border-2 border-purple-200 focus:outline-none focus:border-purple-500 mb-4"
          />
          <button
            type="submit"
            disabled={joining}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-2xl text-lg shadow-lg transition"
          >
            {joining ? "加入中…" : "加入 (JOIN)"}
          </button>
          {joinError && <p className="text-red-600 font-bold text-sm mt-3">{joinError}</p>}
        </form>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-screen bg-[#46178f] text-white flex items-center justify-center p-6">
        {error ? <p className="text-red-300 font-bold">{error}</p> : <p>加载中…</p>}
      </main>
    );
  }

  const { game } = state;

  return (
    <main className="min-h-screen bg-[#46178f] text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto">
        {game.status === "lobby" && (
          <div className="bg-white text-slate-800 rounded-3xl p-8 shadow-2xl text-center border-4 border-amber-400">
            <p className="text-2xl font-black mb-2">你好，{player.name}！</p>
            <p className="text-slate-500 font-medium">等待房主开始游戏…</p>
            <div className="mt-6 animate-pulse text-4xl">⏳</div>
          </div>
        )}

        {game.status === "question" && state.question && !answerResult && (
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4 px-2">
              <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full font-bold">
                问题 {game.current_question + 1} / {state.totalQuestions}
              </span>
              <div className="flex items-center space-x-2 bg-amber-400 text-purple-950 px-5 py-1.5 rounded-full font-black text-xl shadow-lg">
                🕒 <span>{timeLeft}</span>
              </div>
            </div>
            <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl w-full text-center mb-6 min-h-[120px] flex items-center justify-center border-4 border-purple-300">
              <h2 className="text-lg md:text-2xl font-bold leading-snug">{state.question.q}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              {state.question.options.map((_, i) => (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={submitting}
                  className={`${COLORS[i]} disabled:opacity-60 p-8 rounded-2xl text-white font-black text-4xl flex items-center justify-center transition transform active:scale-95`}
                >
                  {SHAPES[i]}
                </button>
              ))}
            </div>
          </div>
        )}

        {game.status === "question" && answerResult && (
          <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl text-center border-4 border-purple-300">
            <p className="text-2xl font-black mb-2">✅ 已提交答案</p>
            <p className="text-slate-500 font-medium">等待其他同学作答…</p>
          </div>
        )}

        {game.status === "reveal" && (
          <div className={`bg-white text-slate-900 rounded-3xl p-8 shadow-2xl text-center border-4 ${answerResult?.isCorrect ? "border-emerald-500" : "border-red-500"}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4 mx-auto text-white ${answerResult?.isCorrect ? "bg-emerald-500" : "bg-red-500"}`}>
              {answerResult ? (answerResult.isCorrect ? "✓" : "✗") : "…"}
            </div>
            <h2 className="text-2xl font-black mb-2">
              {answerResult ? (answerResult.isCorrect ? "回答正确！太棒了！" : "回答错误，继续加油！") : "时间到！"}
            </h2>
            <p className="text-lg font-bold text-amber-600 mb-4">
              {answerResult ? `+${answerResult.points} 分` : "+0 分"}
            </p>
            {reveal && state.question && (
              <>
                <p className="font-bold text-emerald-700 mb-3">
                  正确答案：{SHAPES[reveal.correctIndex]} {state.question.options[reveal.correctIndex]}
                </p>
                <div className="bg-purple-50 text-purple-900 p-4 rounded-2xl text-left border border-purple-200 w-full mb-2">
                  <span className="font-bold block text-sm mb-1 text-purple-700">💡 核心教理解析：</span>
                  <p className="text-base font-medium leading-relaxed">{reveal.exp}</p>
                </div>
              </>
            )}
            {myPlayer && <p className="mt-4 font-bold text-slate-500">当前总分：{myPlayer.score}</p>}
          </div>
        )}

        {game.status === "podium" && (
          <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl text-center border-4 border-amber-400">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black mb-4">挑战完成！</h2>
            <div className="bg-slate-900 text-white p-6 rounded-2xl mb-4 shadow-inner">
              <span className="text-xs text-slate-400 font-bold block mb-1">最终得分</span>
              <span className="text-4xl font-black text-amber-400">{myPlayer?.score ?? 0}</span>
            </div>
            {state.players.length > 0 && (
              <p className="text-slate-500 font-medium">
                排名第 {[...state.players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === player.id) + 1} 名，共 {state.players.length} 人
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-300 font-bold text-center mt-4">{error}</p>}
      </div>
    </main>
  );
}
