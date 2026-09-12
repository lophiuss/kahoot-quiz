import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Host starts the quiz from the lobby: moves to question 0.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const supabase = getAdminSupabase();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("pin", pin)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.status !== "lobby") {
    return NextResponse.json(
      { error: "Game already started" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("games")
    .update({
      status: "question",
      current_question: 0,
      question_started_at: new Date().toISOString(),
    })
    .eq("id", game.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
