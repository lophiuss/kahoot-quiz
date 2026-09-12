import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// A player joins the lobby with a display name.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 24);

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

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
      { error: "This game has already started" },
      { status: 409 }
    );
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({ game_id: game.id, name })
    .select("id, name, score, streak")
    .single();

  if (playerError || !player) {
    return NextResponse.json(
      { error: playerError?.message ?? "Could not join" },
      { status: 500 }
    );
  }

  return NextResponse.json({ player, gameId: game.id });
}
