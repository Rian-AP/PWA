import { type NextRequest, NextResponse } from "next/server"
import { VideoLinks } from "kodikwrapper"

async function getDirectLinks(link: string) {
  console.log("[v0] getDirectLinks вызвана с URL:", link)

  try {
    console.log("[v0] Получение актуального endpoint...")
    const parsedLink = await VideoLinks.parseLink({
      link,
      extended: true,
    })
    console.log("[v0] Ссылка распарсена:", parsedLink)

    let endpoint: string | undefined

    if (parsedLink.ex?.playerSingleUrl) {
      console.log("[v0] Получение актуального videoInfoEndpoint...")
      endpoint = await VideoLinks.getActualVideoInfoEndpoint(parsedLink.ex.playerSingleUrl)
      console.log("[v0] Актуальный endpoint:", endpoint)
    }

    console.log("[v0] Получение прямых ссылок через VideoLinks.getLinks...")
    const links = await VideoLinks.getLinks({
      link,
      videoInfoEndpoint: endpoint,
    })

    console.log("[v0] ✅ Прямые ссылки успешно получены:", links)
    return links
  } catch (error) {
    console.error("[v0] ❌ Ошибка в getDirectLinks:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] ===== API ROUTE /api/kodik/direct-links вызван =====")

  try {
    const body = await request.json()
    console.log("[v0] Тело запроса:", body)
    const { kodikLink } = body

    if (!kodikLink) {
      console.error("[v0] ❌ kodikLink отсутствует в запросе")
      return NextResponse.json({ error: "kodikLink is required" }, { status: 400 })
    }

    console.log("[v0] Получение прямых ссылок...")
    const links = await getDirectLinks(kodikLink)
    console.log("[v0] ✅ Ссылки получены, отправка ответа")

    return NextResponse.json({ links })
  } catch (error) {
    console.error("[v0] ❌ Ошибка в API route:", error)
    return NextResponse.json(
      { error: "Failed to get direct video links", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
