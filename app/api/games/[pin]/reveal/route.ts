import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { questions } from "@/lib/questions.server";

// Host (or the host's own countdown) ends the current question and
// reveals the correct answer + per-option breakdown to everyone.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const supabase = getAdminSupabase();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_question")
    .eq("pin", pin)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "question") {
    return NextResponse.json({ error: "No active question" }, { status: 409 });
  }

  const { error } = await supabase
    .from("games")
    .update({ status: "reveal" })
    .eq("id", game.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: answers } = await supabase
    .from("answers")
    .select("selected_index")
    .eq("game_id", game.id)
    .eq("question_index", game.current_question);

  const counts = [0, 0, 0, 0];
  for (const a of answers ?? []) {
    if (a.selected_index !== null && a.selected_index >= 0 && a.selected_index <= 3) {
      counts[a.selected_index]++;
    }
  }

  const qData = questions[game.current_question];

  return NextResponse.json({
    correctIndex: qData.correct,
    exp: qData.exp,
    counts,
  });
}

// Players fetch this once the game status flips to "reveal" to learn the
// correct answer, explanation, and answer-distribution for the question
// they just answered. Refused while the question is still live so the
// answer can't be read early.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const supabase = getAdminSupabase();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status, current_question")
    .eq("pin", pin)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "reveal" && game.status !== "podium") {
    return NextResponse.json(
      { error: "Answer not revealed yet" },
      { status: 409 }
    );
  }

  const revealedIndex =
    game.status === "reveal" ? game.current_question : game.current_question;

  const { data: answers } = await supabase
    .from("answers")
    .select("selected_index")
    .eq("game_id", game.id)
    .eq("question_index", revealedIndex);

  const counts = [0, 0, 0, 0];
  for (const a of answers ?? []) {
    if (a.selected_index !== null && a.selected_index >= 0 && a.selected_index <= 3) {
      counts[a.selected_index]++;
    }
  }

  const qData = questions[revealedIndex];

  return NextResponse.json({
    correctIndex: qData.correct,
    exp: qData.exp,
    counts,
  });
}
