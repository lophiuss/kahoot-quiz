import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { QUESTION_SECONDS } from "@/lib/questions.server";

// Create a new game room with a fresh 6-digit PIN.
export async function POST() {
  const supabase = getAdminSupabase();

  for (let attempt = 0; attempt < 8; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { data, error } = await supabase
      .from("games")
      .insert({ pin, question_seconds: QUESTION_SECONDS })
      .select("id, pin")
      .single();

    if (!error && data) {
      return NextResponse.json({ id: data.id, pin: data.pin });
    }
    // 23505 = unique_violation on the pin column; retry with a new pin.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a game PIN, please try again." },
    { status: 500 }
  );
}
