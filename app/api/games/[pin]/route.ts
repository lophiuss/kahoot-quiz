import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { publicQuestions } from "@/lib/questions.client";

// Snapshot of a game's current state for initial page load
// (live updates after that come from Supabase Realtime).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const supabase = getAdminSupabase();

  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("pin", pin)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const { data: players } = await supabase
    .from("players")
    .select("id, name, score, streak")
    .eq("game_id", game.id)
    .order("score", { ascending: false });

  const question =
    game.status === "question" || game.status === "reveal"
      ? publicQuestions[game.current_question]
      : null;

  let answeredCount = 0;
  if (game.status === "question") {
    const { count } = await supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("game_id", game.id)
      .eq("question_index", game.current_question);
    answeredCount = count ?? 0;
  }

  return NextResponse.json({
    game,
    players: players ?? [],
    question,
    totalQuestions: publicQuestions.length,
    answeredCount,
  });
}
