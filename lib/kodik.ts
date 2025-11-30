export async function getDirectVideoLinks(kodikLink: string) {
  console.log("[v0] getDirectVideoLinks вызвана с URL:", kodikLink)

  try {
    console.log("[v0] Отправка запроса к /api/kodik/direct-links...")
    const response = await fetch("/api/kodik/direct-links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kodikLink }),
    })

    console.log("[v0] Ответ получен, статус:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] ❌ Ошибка ответа:", errorText)
      throw new Error(`Failed to fetch direct links: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("[v0] Данные получены:", data)
    console.log("[v0] Ссылки:", data.links)

    return data.links
  } catch (error) {
    console.error("[v0] ❌ Ошибка в getDirectVideoLinks:", error)
    return null
  }
}
