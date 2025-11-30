"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { getAnimeDetails, getEpisodes, Episode as APIEpisode } from "@/lib/api"
import Image from "next/image"
import { ChevronLeft, Star, ChevronRight, Heart } from "lucide-react"
import Link from "next/link"
import { VideoPlayer } from "@/components/video-player"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { DownloadButton } from "@/components/download-button"
import { useFavorites } from "@/contexts/favorites-context"

interface AnimeDetails {
  id: number
  name: string
  rus_name?: string
  eng_name?: string
  slug_url: string
  image_url: string
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

interface Episode {
  id: number
  number: string
  name?: string
}

interface KodikPlayer {
  team: string
  teamSlug: string
  views: number
  translation: string
  link: string
  id: number
}

export default function AnimePage() {
  const params = useParams()
  const slug = params.slug as string

  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<string>("1080p")
  const [kodikPlayers, setKodikPlayers] = useState<KodikPlayer[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [selectedTeamSlug, setSelectedTeamSlug] = useState<string | null>(null)
  const { isFavorite, toggleFavorite } = useFavorites()

  const playersLoadedRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && anime?.id) {
      const savedTeamSlug = localStorage.getItem(`kodik-translation-${anime.id}`)
      if (savedTeamSlug) {
        setSelectedTeamSlug(savedTeamSlug)
      }
    }
  }, [anime?.id])

  useEffect(() => {
    if (typeof window !== "undefined" && anime?.id && selectedTeamSlug) {
      localStorage.setItem(`kodik-translation-${anime.id}`, selectedTeamSlug)
    }
  }, [anime?.id, selectedTeamSlug])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      try {
        const animeData = await getAnimeDetails(slug)
        setAnime(animeData)

        if (animeData?.id) {
          const episodesData = await getEpisodes(animeData.id)
          setEpisodes(episodesData)

          if (episodesData.length > 0) {
            setSelectedEpisodeId(episodesData[0].id)
          }
        }
      } catch (error) {
        console.error("Error loading anime data:", error)
      }

      setLoading(false)
    }

    loadData()
  }, [slug])

  const handlePlayersLoad = useCallback(
    (players: KodikPlayer[]) => {
      if (playersLoadedRef.current === selectedEpisodeId) {
        return
      }

      playersLoadedRef.current = selectedEpisodeId
      setKodikPlayers(players)

      // Пытаемся найти плеера с сохраненной озвучкой
      if (selectedTeamSlug) {
        const cachedPlayer = players.find((p) => p.teamSlug === selectedTeamSlug)
        if (cachedPlayer) {
          setSelectedPlayerId(cachedPlayer.id)
          return
        }
      }

      // Если сохраненной озвучки нет или плеер не найден - берем первого
      if (players.length > 0) {
        setSelectedPlayerId(players[0].id)
        // Сохраняем команду первого плеера
        if (!selectedTeamSlug) {
          setSelectedTeamSlug(players[0].teamSlug)
        }
      }
    },
    [selectedEpisodeId, selectedTeamSlug],
  )

  useEffect(() => {
    playersLoadedRef.current = null
  }, [selectedEpisodeId])

  const filteredPlayers = useMemo(() => {
    if (!selectedTeamSlug) return kodikPlayers
    return kodikPlayers.filter((p) => p.teamSlug === selectedTeamSlug)
  }, [kodikPlayers, selectedTeamSlug])

  const uniqueTeams = useMemo(() => {
    const teamsMap = new Map<string, KodikPlayer>()
    kodikPlayers.forEach((player) => {
      if (!teamsMap.has(player.teamSlug)) {
        teamsMap.set(player.teamSlug, player)
      }
    })
    return Array.from(teamsMap.values())
  }, [kodikPlayers])

  useEffect(() => {
    console.log("[v0] Данные для DownloadButton обновлены:")
    console.log("[v0] - episodes:", episodes.length, "эпизодов")
    console.log("[v0] - uniqueTeams:", uniqueTeams.length, "команд")
    console.log("[v0] - kodikPlayers:", kodikPlayers.length, "плееров")
  }, [episodes, uniqueTeams, kodikPlayers])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-secondary rounded-lg" />
            <div className="h-12 bg-secondary rounded-lg w-2/3" />
            <div className="h-32 bg-secondary rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground text-lg">Аниме не найдено</p>
        </div>
      </div>
    )
  }

  const selectedEpisode = episodes.find((ep) => ep.id === selectedEpisodeId)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft size={20} />
          Назад
        </Link>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-1">
            <div className="relative aspect-[5/7] w-full overflow-hidden rounded-lg bg-secondary">
              <Image
                src={anime.image_url || "/placeholder.svg?height=400&width=300&query=anime-poster"}
                alt={anime.name}
                fill
                className="object-cover"
              />
              
              {/* Кнопка избранного */}
              <button
                onClick={() => anime && toggleFavorite(anime)}
                className="absolute top-3 right-3 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <Heart
                  size={20}
                  className={anime && isFavorite(anime.slug_url) ? "fill-red-500 text-red-500" : "text-white"}
                />
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <h1 className="text-4xl font-bold text-white mb-2">{anime.rus_name || anime.name}</h1>
            {anime.eng_name && anime.eng_name !== anime.name && (
              <p className="text-lg text-muted-foreground mb-4">{anime.eng_name}</p>
            )}

            {/* Рейтинги */}
            <div className="flex gap-3 mb-6">
              {anime.rating && (
                <div className="flex flex-col gap-1 px-4 py-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="text-2xl font-bold text-foreground">{anime.rating.toFixed(1)}</span>
                  </div>
                  {anime.rating_votes && (
                    <span className="text-xs text-muted-foreground">{anime.rating_votes} голосов</span>
                  )}
                </div>
              )}
              {anime.shiki_rate && (
                <a
                  href={anime.shikimori_href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1 px-4 py-3 bg-card rounded-lg border border-border hover:border-yellow-500 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-6 h-6 fill-yellow-500 text-yellow-500 group-hover:scale-110 transition-transform" />
                    <span className="text-2xl font-bold text-foreground">{anime.shiki_rate.toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Shikimori</span>
                </a>
              )}
            </div>

            {/* Бейджики */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-wrap gap-3">
                {anime.ageRestriction && (
                  <div className="px-3 py-1 bg-destructive/20 rounded-full text-sm text-destructive border border-destructive/50">
                    {anime.ageRestriction.label}
                  </div>
                )}
                {anime.type && (
                  <div className="px-3 py-1 bg-card rounded-full text-sm text-muted-foreground border border-border">
                    {anime.type}
                  </div>
                )}
                {anime.status && (
                  <div className="px-3 py-1 bg-primary/20 rounded-full text-sm text-primary border border-primary/50">
                    {anime.status}
                  </div>
                )}
              </div>
              {anime.releaseDateString && (
                <div className="text-sm text-muted-foreground">
                  Дата выхода: {anime.releaseDateString}
                </div>
              )}
            </div>

            {anime.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Описание</h3>
                <p className="text-muted-foreground leading-relaxed line-clamp-5">{anime.description}</p>
              </div>
            )}

            <div className="flex items-center gap-4 mb-4">
              {anime.episodes_count && (
                <div className="text-sm text-muted-foreground">Всего эпизодов: {anime.episodes_count}</div>
              )}
              <DownloadButton
                episodes={episodes}
                teams={uniqueTeams}
                animeId={anime.id}
                animeName={anime.rus_name || anime.name}
                animeImage={anime.image_url}
                animeSlug={anime.slug_url}
              />
            </div>
          </div>
        </div>

        {selectedEpisode && (
          <section className="mb-12">
            <div className="flex flex-col gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">Просмотр</h2>

              {episodes.length > 0 && (
                <div className="max-w-md">
                  <label className="text-sm font-semibold text-foreground mb-2 block">Выберите эпизод</label>
                  <Select
                    value={selectedEpisodeId?.toString() || ""}
                    onValueChange={(value) => {
                      setSelectedEpisodeId(Number.parseInt(value))
                      setSelectedPlayerId(null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите эпизод" />
                    </SelectTrigger>
                    <SelectContent>
                      {episodes.map((episode) => (
                        <SelectItem key={episode.id} value={episode.id.toString()}>
                          Эпизод {episode.number}
                          {episode.name ? ` - ${episode.name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <VideoPlayer
              episodeId={selectedEpisode.id}
              episodeNumber={Number.parseInt(selectedEpisode.number)}
              selectedPlayerId={selectedPlayerId}
              onPlayersLoad={handlePlayersLoad}
              animeId={anime.id}
            />

            {/* Кнопки навигации */}
            {episodes.length > 1 && (
              <div className="flex gap-4 mt-6 justify-center">
                <button
                  onClick={() => {
                    const currentIndex = episodes.findIndex((ep) => ep.id === selectedEpisodeId)
                    if (currentIndex > 0) {
                      setSelectedEpisodeId(episodes[currentIndex - 1].id)
                      setSelectedPlayerId(null)
                    }
                  }}
                  disabled={episodes.findIndex((ep) => ep.id === selectedEpisodeId) === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span className="font-medium">Предыдущая серия</span>
                </button>

                <button
                  onClick={() => {
                    const currentIndex = episodes.findIndex((ep) => ep.id === selectedEpisodeId)
                    if (currentIndex < episodes.length - 1) {
                      setSelectedEpisodeId(episodes[currentIndex + 1].id)
                      setSelectedPlayerId(null)
                    }
                  }}
                  disabled={episodes.findIndex((ep) => ep.id === selectedEpisodeId) === episodes.length - 1}
                  className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="font-medium">Следующая серия</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
