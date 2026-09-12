import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { questions } from "@/lib/questions.server";

// Host advances from the reveal screen to the next question, or to the
// final podium if that was the last question.
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
  if (game.status !== "reveal") {
    return NextResponse.json(
      { error: "Question hasn't been revealed yet" },
      { status: 409 }
    );
  }

  const nextIndex = game.current_question + 1;

  if (nextIndex >= questions.length) {
    const { error } = await supabase
      .from("games")
      .update({ status: "podium" })
      .eq("id", game.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, finished: true });
  }

  const { error } = await supabase
    .from("games")
    .update({
      status: "question",
      current_question: nextIndex,
      question_started_at: new Date().toISOString(),
    })
    .eq("id", game.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, finished: false });
}
