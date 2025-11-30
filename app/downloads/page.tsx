"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { getDownloadedEpisodes } from "@/lib/db"
import { formatFileSize } from "@/lib/downloads"
import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import { useFavorites } from "@/contexts/favorites-context"
import type { Anime } from "@/lib/api"

interface DownloadedEpisode {
  id: number
  episodeId: number
  animeId: number
  animeName: string
  animeImage: string
  episodeNumber: string
  audioTeam: string
  audioTranslation: string
  quality: string
  videoUrl: string
  videoBlob?: Blob
  downloadedAt: number
  size: number
}

interface AnimeGroup {
  animeId: number
  animeName: string
  animeImage: string
  episodes: DownloadedEpisode[]
  totalSize: number
}

export default function DownloadsPage() {
  const [animeGroups, setAnimeGroups] = useState<AnimeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const { isFavorite, toggleFavorite } = useFavorites()

  useEffect(() => {
    loadDownloadedEpisodes()
  }, [])

  const loadDownloadedEpisodes = async () => {
    try {
      setLoading(true)
      const data = await getDownloadedEpisodes()
      
      // Группируем по аниме
      const grouped = data.reduce(
        (acc, ep) => {
          const key = ep.animeId
          if (!acc[key]) {
            acc[key] = {
              animeId: ep.animeId,
              animeName: ep.animeName,
              animeImage: ep.animeImage,
              episodes: [],
              totalSize: 0,
            }
          }
          acc[key].episodes.push(ep)
          acc[key].totalSize += ep.size
          return acc
        },
        {} as Record<number, AnimeGroup>
      )
      
      setAnimeGroups(Object.values(grouped))
    } catch (error) {
      console.error("[v0] Failed to load episodes:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-4 md:px-6 max-w-7xl mx-auto py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Загрузки</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[5/7] bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (animeGroups.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-4 md:px-6 max-w-7xl mx-auto py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Загрузки</h1>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">У вас нет скачанных эпизодов</p>
              <p className="text-muted-foreground text-sm mt-2">
                Скачайте эпизоды для офлайн просмотра
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 md:px-6 max-w-7xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Загрузки</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {animeGroups.map((group) => {
            // Создаем объект Anime для работы с избранным
            const animeData: Anime = {
              id: group.animeId,
              name: group.animeName,
              slug_url: group.episodes[0]?.animeSlug || `anime-${group.animeId}`,
              image_url: group.animeImage,
            }

            return (
              <div key={group.animeId} className="block group relative">
                <Link href={`/downloads/${group.animeId}`}>
                  <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-muted-foreground/50 transition-colors h-full flex flex-col">
                    {/* Постер */}
                    <div className="relative w-full aspect-[5/7] bg-secondary flex-shrink-0">
                      <Image
                        src={group.animeImage || "/placeholder.svg"}
                        alt={group.animeName}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                        className="object-cover"
                      />
                      
                      {/* Бейдж с количеством */}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-primary rounded-full text-xs font-medium text-primary-foreground">
                        {group.episodes.length} эп.
                      </div>

                      {/* Кнопка избранного */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(animeData)
                        }}
                        className="absolute top-2 left-2 p-1.5 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                      >
                        <Heart
                          size={16}
                          className={isFavorite(animeData.slug_url) ? "fill-red-500 text-red-500" : "text-white"}
                        />
                      </button>
                    </div>

                    {/* Информация */}
                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {group.animeName}
                      </h3>
                      <div className="text-xs text-muted-foreground">{formatFileSize(group.totalSize)}</div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
