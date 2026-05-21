import {
  getClientValidationError,
  normalizeClientInput,
} from "@/lib/client-validation";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (clientsError) {
      console.error("Database error:", clientsError);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    return NextResponse.json({ clients }, { status: 200 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationError = getClientValidationError(body);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const normalizedInput = normalizeClientInput(body);

    const { data: client, error: insertError } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name: normalizedInput.name,
        phone: normalizedInput.phone,
        email: normalizedInput.email,
        address: normalizedInput.address,
        notes: normalizedInput.notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return NextResponse.json(
        { error: "Failed to create client. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
