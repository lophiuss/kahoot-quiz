import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { questions, QUESTION_SECONDS } from "@/lib/questions.server";
import { computePoints } from "@/lib/scoring";

// A player submits an answer. Correctness and points are computed here,
// server-side, against the authoritative question bank and the server's
// own clock (question_started_at) — never trusting the client's timer or
// its claim of which answer is "correct".
export async function POST(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const body = await req.json().catch(() => ({}));
  const playerId = String(body?.playerId ?? "");
  const questionIndex = Number(body?.questionIndex);
  const selectedIndexRaw = body?.selectedIndex;
  const selectedIndex =
    selectedIndexRaw === null || selectedIndexRaw === undefined
      ? null
      : Number(selectedIndexRaw);

  if (!playerId || !Number.isInteger(questionIndex)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    selectedIndex !== null &&
    (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3)
  ) {
    return NextResponse.json({ error: "Invalid answer index" }, { status: 400 });
  }

  const supabase = getAdminSupabase();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_question, question_started_at, question_seconds")
    .eq("pin", pin)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "question" || game.current_question !== questionIndex) {
    return NextResponse.json(
      { error: "This question is no longer active" },
      { status: 409 }
    );
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, game_id, streak")
    .eq("id", playerId)
    .single();

  if (playerError || !player || player.game_id !== game.id) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Idempotent: a player can only answer a given question once.
  const { data: existing } = await supabase
    .from("answers")
    .select("id, selected_index, is_correct, points")
    .eq("player_id", playerId)
    .eq("question_index", questionIndex)
    .maybeSingle();

  if (existing) {
    const qData = questions[questionIndex];
    return NextResponse.json({
      alreadyAnswered: true,
      isCorrect: existing.is_correct,
      points: existing.points,
      exp: qData.exp,
    });
  }

  const startedAt = game.question_started_at
    ? new Date(game.question_started_at).getTime()
    : Date.now();
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const questionSeconds = game.question_seconds ?? QUESTION_SECONDS;
  const timeLeft = Math.max(0, questionSeconds - elapsedSeconds);
  const withinTime = elapsedSeconds <= questionSeconds + 1; // 1s grace for network lag

  const qData = questions[questionIndex];
  const isCorrect =
    withinTime && selectedIndex !== null && selectedIndex === qData.correct;
  const newStreak = isCorrect ? (player.streak ?? 0) + 1 : 0;
  const points = computePoints(isCorrect, timeLeft, newStreak);

  const { error: insertError } = await supabase.from("answers").insert({
    game_id: game.id,
    player_id: playerId,
    question_index: questionIndex,
    selected_index: selectedIndex,
    is_correct: isCorrect,
    points,
  });

  if (insertError) {
    // Unique violation = a concurrent duplicate submit; treat as already-answered.
    if (insertError.code === "23505") {
      return NextResponse.json({ alreadyAnswered: true });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Read-then-write increment (no stored procedure needed). Fine at
  // classroom scale: at most one answer write per player per question,
  // and each question is only answerable once due to the unique
  // constraint on answers(player_id, question_index) above.
  const { data: freshPlayer } = await supabase
    .from("players")
    .select("score")
    .eq("id", playerId)
    .single();
  await supabase
    .from("players")
    .update({ score: (freshPlayer?.score ?? 0) + points, streak: newStreak })
    .eq("id", playerId);

  return NextResponse.json({
    isCorrect,
    points,
    streak: newStreak,
    exp: qData.exp,
  });
}
