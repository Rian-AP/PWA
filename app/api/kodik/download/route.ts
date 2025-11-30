import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] ===== API ROUTE /api/kodik/download вызван =====")

  try {
    const body = await request.json()
    console.log("[v0] Тело запроса:", body)
    const { url } = body

    if (!url) {
      console.error("[v0] ❌ url отсутствует в запросе")
      return NextResponse.json({ error: "url is required" }, { status: 400 })
    }

    console.log("[v0] Загрузка URL через прокси:", url)

    // Загружаем через сервер чтобы обойти CORS
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://kodik.info/",
      },
    })

    console.log("[v0] Ответ от сервера, статус:", response.status)

    if (!response.ok) {
      console.error("[v0] ❌ Ошибка загрузки:", response.statusText)
      return NextResponse.json({ error: `Failed to fetch: ${response.statusText}` }, { status: response.status })
    }

    const contentType = response.headers.get("content-type") || ""
    console.log("[v0] Content-Type:", contentType)

    // Для m3u8 возвращаем текст
    if (url.includes(".m3u8") || contentType.includes("application/vnd.apple.mpegurl")) {
      const text = await response.text()
      console.log("[v0] ✅ M3U8 загружен, длина:", text.length)
      return NextResponse.json({ text })
    }

    // Для сегментов возвращаем как blob
    const arrayBuffer = await response.arrayBuffer()
    console.log("[v0] ✅ Сегмент загружен, размер:", arrayBuffer.byteLength)

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
    })
  } catch (error) {
    console.error("[v0] ❌ Ошибка в API route:", error)
    return NextResponse.json(
      { error: "Failed to download", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
