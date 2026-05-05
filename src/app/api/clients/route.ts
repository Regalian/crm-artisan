import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Dev bypass - set DEV_USER_ID env var to bypass auth (remove in production)
const DEV_USER_ID: string | undefined = process.env.DEV_USER_ID;

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Use dev user if set
    let userId: string | null | undefined = DEV_USER_ID;
    
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

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
    
    // Use dev user if set
    let userId: string | null | undefined = DEV_USER_ID;
    
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, email, address, notes } = body;

    // Server-side validation
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && typeof email === "string" && email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: "Please enter a valid email address" },
          { status: 400 }
        );
      }
    }

    const { data: client, error: insertError } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
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
