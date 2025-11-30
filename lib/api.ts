const API_BASE = "https://animelib-api.vercel.app"

export interface Episode {
  id: number
  number: string
  name?: string
  anime_id: number
}

export interface KodikPlayer {
  id: number
  team: string
  teamSlug: string
  views: number
  translation: string
  link: string
}

export interface Anime {
  id: number
  name: string
  rus_name?: string
  eng_name?: string
  slug_url: string
  image_url: string
  thumbnail_url?: string
  description?: string
  rating?: number
  type?: string
  status?: string
  year?: number
  episodes_count?: number
  ageRestriction?: { label: string }
  releaseDateString?: string
  shikimori_href?: string
  shiki_rate?: number
  rating_votes?: string
}

interface RawAnime {
  id: number
  name?: string
  rus_name?: string
  slug_url?: string
  cover?: {
    default?: string
    thumbnail?: string
  }
  image_url?: string
  description?: string
  rating?: number
  type?: { id: number; label: string } | string
  status?: { id: number; label: string } | string
  year?: number
  episodes_count?: number
}

function parseAnime(raw: any): Anime {
  const rating = raw.rating?.average ? Number(raw.rating.average) : raw.rating ? Number(raw.rating) : undefined
  const typeValue = typeof raw.type === "object" ? raw.type?.label : raw.type
  const statusValue = typeof raw.status === "object" ? raw.status?.label : raw.status

  return {
    id: raw.id,
    name: raw.name || "Unknown",
    rus_name: raw.rus_name,
    eng_name: raw.eng_name,
    slug_url: raw.slug_url || `anime-${raw.id}`,
    image_url: raw.image_url || raw.cover?.default || "/placeholder.svg?height=280&width=200",
    thumbnail_url: raw.cover?.thumbnail,
    description: raw.description,
    rating: isNaN(rating!) ? undefined : rating,
    type: typeValue,
    status: statusValue,
    year: raw.year,
    episodes_count: raw.episodes_count,
    ageRestriction: raw.ageRestriction,
    releaseDateString: raw.releaseDateString,
    shikimori_href: raw.shikimori_href,
    shiki_rate: raw.shiki_rate,
    rating_votes: raw.rating?.votesFormated,
  }
}

export async function searchAnime(q: string, limit = 20, page = 1): Promise<Anime[]> {
  try {
    const url = `${API_BASE}/api/proxy/anime?q=${encodeURIComponent(q)}&limit=${limit}&page=${page}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data) ? data : data.data || data.results || []
    return results.map(parseAnime)
  } catch (error) {
    console.error("Search error:", error)
    return []
  }
}

export async function getPopularAnime(limit = 20, page = 1, type?: number): Promise<Anime[]> {
  try {
    let url = `${API_BASE}/api/popular?limit=${limit}&page=${page}`
    if (type) url += `&type=${type}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data) ? data : data.data || data.results || []
    return results.map(parseAnime)
  } catch (error) {
    console.error("Popular error:", error)
    return []
  }
}

export async function getRecentAnime(limit = 20, page = 1): Promise<Anime[]> {
  try {
    const url = `${API_BASE}/api/filter?status=1&limit=${limit}&page=${page}&sort=-updated_at`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data) ? data : data.data || data.results || []
    return results.map(parseAnime)
  } catch (error) {
    console.error("Recent error:", error)
    return []
  }
}

export async function getAnimeDetails(slug: string): Promise<Anime | null> {
  try {
    const url = `${API_BASE}/api/proxy/anime/${slug}`
    const res = await fetch(url, { cache: "no-store" })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    const animeData = data.data || data
    const parsed = parseAnime(animeData)

    return parsed
  } catch (error) {
    console.error("Details error:", error)
    return null
  }
}

export async function getEpisodes(animeId: number, limit = 24): Promise<Episode[]> {
  try {
    const url = `${API_BASE}/api/proxy/episodes?anime_id=${animeId}&limit=${limit}`
    const res = await fetch(url, { cache: "no-store" })

    if (!res.ok) {
      return []
    }

    const data = await res.json()
    const results = Array.isArray(data) ? data : data.data || data.results || []

    return results
  } catch (error) {
    console.error("Episodes error:", error)
    return []
  }
}

export async function getEpisodeDetails(id: number) {
  try {
    const url = `${API_BASE}/api/proxy/episodes/${id}`
    const res = await fetch(url, { cache: "no-store" })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    return data.data || data
  } catch (error) {
    console.error("Episode details error:", error)
    return null
  }
}

export async function getKodikPlayers(episodeId: number): Promise<KodikPlayer[] | null> {
  try {
    const url = `${API_BASE}/api/proxy/episodes/${episodeId}`
    const res = await fetch(url, { cache: "force-cache" })

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    const episodeData = data.data || data

    if (episodeData?.players && Array.isArray(episodeData.players)) {
      const kodikPlayers = episodeData.players
        .filter((player: any) => player.player === "Kodik")
        .map((player: any) => {
          const embedUrl = player.src.startsWith("//") ? `https:${player.src}` : player.src

          return {
            id: player.id,
            team: player.team?.name || "Unknown",
            teamSlug: player.team?.slug || `team-${player.id}`,
            views: player.views || 0,
            translation: player.translation_type?.label || "Unknown",
            link: embedUrl,
          }
        })

      return kodikPlayers
    }

    return null
  } catch (error) {
    console.error("Kodik players error:", error)
    return null
  }
}

export async function getKodikLinks(episodeId: number) {
  try {
    const url = `${API_BASE}/api/kodik/episode?episode_id=${episodeId}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch (error) {
    console.error("Kodik error:", error)
    return null
  }
}
