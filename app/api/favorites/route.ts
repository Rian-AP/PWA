import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { supabase } from "@/lib/supabase"

// GET - получить все избранные для пользователя
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching favorites:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ favorites: data || [] })
}

// POST - добавить в избранное
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { anime_id, anime_slug, anime_name, anime_image } = body

  if (!anime_id || !anime_slug || !anime_name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("favorites")
    .insert({
      user_id: session.user.id,
      anime_id,
      anime_slug,
      anime_name,
      anime_image: anime_image || "",
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding favorite:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ favorite: data })
}

// DELETE - удалить из избранного
export async function DELETE(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const anime_slug = searchParams.get("anime_slug")

  if (!anime_slug) {
    return NextResponse.json(
      { error: "Missing anime_slug parameter" },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", session.user.id)
    .eq("anime_slug", anime_slug)

  if (error) {
    console.error("Error deleting favorite:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
