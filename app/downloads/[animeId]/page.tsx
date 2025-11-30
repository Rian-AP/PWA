"use client"

import { use, useState, useEffect, useRef } from "react"
import { Header } from "@/components/header"
import { getDownloadedEpisodes, deleteDownloadedEpisode } from "@/lib/db"
import { formatFileSize } from "@/lib/downloads"
import Image from "next/image"
import { Trash2, ChevronLeft, ChevronRight, Settings, Heart } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
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

export default function OfflineAnimePage({ params }: { params: Promise<{ animeId: string }> }) {
  const resolvedParams = use(params)
  const [episodes, setEpisodes] = useState<DownloadedEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEpisode, setSelectedEpisode] = useState<DownloadedEpisode | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<number>>(new Set())
  const [imageError, setImageError] = useState(false)
  const { isFavorite, toggleFavorite } = useFavorites()

  const animeId = Number.parseInt(resolvedParams.animeId)

  useEffect(() => {
    loadEpisodes()
  }, [animeId])

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  const loadEpisodes = async () => {
    try {
      setLoading(true)
      const allEpisodes = await getDownloadedEpisodes()
      const filtered = allEpisodes.filter((ep) => ep.animeId === animeId)
      
      // Сортируем по номеру эпизода
      filtered.sort((a, b) => Number.parseInt(a.episodeNumber) - Number.parseInt(b.episodeNumber))
      
      setEpisodes(filtered)
      
      // Автоматически выбираем первый эпизод
      if (filtered.length > 0 && !selectedEpisode) {
        handleSelectEpisode(filtered[0])
      }
    } catch (error) {
      console.error("Failed to load episodes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEpisode = (episode: DownloadedEpisode) => {
    // Очищаем предыдущий URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }

    setSelectedEpisode(episode)

    if (episode.videoBlob) {
      const url = URL.createObjectURL(episode.videoBlob)
      setVideoUrl(url)

      // Устанавливаем источник после небольшой задержки
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = url
          videoRef.current.load()
        }
      }, 100)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedForDeletion.size === 0) return

    try {
      const idsToDelete = Array.from(selectedForDeletion)
      
      for (const id of idsToDelete) {
        await deleteDownloadedEpisode(id)
      }

      const newEpisodes = episodes.filter((ep) => !selectedForDeletion.has(ep.id))
      setEpisodes(newEpisodes)

      // Если удалили текущий эпизод, переключаемся на первый доступный
      if (selectedEpisode && selectedForDeletion.has(selectedEpisode.id)) {
        if (newEpisodes.length > 0) {
          handleSelectEpisode(newEpisodes[0])
        } else {
          setSelectedEpisode(null)
          if (videoUrl) {
            URL.revokeObjectURL(videoUrl)
            setVideoUrl(null)
          }
        }
      }

      setSelectedForDeletion(new Set())
      setManageDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete episodes:", error)
    }
  }

  const toggleEpisodeSelection = (id: number) => {
    const newSet = new Set(selectedForDeletion)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedForDeletion(newSet)
  }

  const selectAllForDeletion = () => {
    setSelectedForDeletion(new Set(episodes.map((ep) => ep.id)))
  }

  const deselectAll = () => {
    setSelectedForDeletion(new Set())
  }

  const handlePrevious = () => {
    if (!selectedEpisode) return
    const currentIndex = episodes.findIndex((ep) => ep.id === selectedEpisode.id)
    if (currentIndex > 0) {
      handleSelectEpisode(episodes[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (!selectedEpisode) return
    const currentIndex = episodes.findIndex((ep) => ep.id === selectedEpisode.id)
    if (currentIndex < episodes.length - 1) {
      handleSelectEpisode(episodes[currentIndex + 1])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-secondary rounded w-1/3" />
            <div className="aspect-video bg-secondary rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <Link href="/downloads" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ChevronLeft size={20} />
            Назад к загрузкам
          </Link>
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Эпизоды не найдены</p>
          </div>
        </main>
      </div>
    )
  }

  const anime = episodes[0]
  const currentIndex = selectedEpisode ? episodes.findIndex((ep) => ep.id === selectedEpisode.id) : -1

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Кнопка назад */}
        <Link href="/downloads" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft size={20} />
          Назад к загрузкам
        </Link>

        {/* Заголовок */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative w-24 h-36 flex-shrink-0 rounded-lg overflow-hidden border border-border bg-secondary">
            {!imageError ? (
              <Image
                src={anime.animeImage || "/placeholder.svg"}
                alt={anime.animeName}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-4xl">📺</span>
              </div>
            )}

            {/* Кнопка избранного */}
            <button
              onClick={() => {
                const animeData: Anime = {
                  id: anime.animeId,
                  name: anime.animeName,
                  slug_url: anime.animeSlug || `anime-${anime.animeId}`,
                  image_url: anime.animeImage,
                }
                toggleFavorite(animeData)
              }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <Heart
                size={14}
                className={isFavorite(anime.animeSlug || `anime-${anime.animeId}`) ? "fill-red-500 text-red-500" : "text-white"}
              />
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{anime.animeName}</h1>
            <p className="text-muted-foreground text-sm mb-4">
              {episodes.length} эпизодов • Оффлайн просмотр
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManageDialogOpen(true)}
              className="gap-2"
            >
              <Settings size={16} />
              Управление эпизодами
            </Button>
          </div>
        </div>

        {/* Плеер */}
        {selectedEpisode && (
          <section className="mb-12">
            <div className="flex flex-col gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">Просмотр</h2>

              {/* Селектор эпизода */}
              {episodes.length > 0 && (
                <div className="max-w-md">
                  <label className="text-sm font-semibold text-foreground mb-2 block">Выберите эпизод</label>
                  <Select
                    value={selectedEpisode.id.toString()}
                    onValueChange={(value) => {
                      const episode = episodes.find((ep) => ep.id === Number.parseInt(value))
                      if (episode) handleSelectEpisode(episode)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {episodes.map((episode) => (
                        <SelectItem key={episode.id} value={episode.id.toString()}>
                          Эпизод {episode.episodeNumber} • {episode.audioTeam} ({episode.quality})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Видео плеер */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full"
                  onEnded={handleNext}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-white">Загрузка видео...</p>
                </div>
              )}
            </div>

            {/* Кнопки навигации */}
            {episodes.length > 1 && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span className="font-medium">Предыдущая серия</span>
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex === episodes.length - 1}
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

      {/* Диалог управления эпизодами */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Управление эпизодами</DialogTitle>
            <DialogDescription>
              Выберите эпизоды для удаления
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={selectAllForDeletion} variant="outline" size="sm">
                Выбрать все
              </Button>
              <Button onClick={deselectAll} variant="outline" size="sm">
                Снять все
              </Button>
            </div>

            <ScrollArea className="h-[400px] rounded border p-4">
              <div className="space-y-2">
                {episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={selectedForDeletion.has(episode.id)}
                      onCheckedChange={() => toggleEpisodeSelection(episode.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Эпизод {episode.episodeNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {episode.audioTeam} ({episode.audioTranslation}) • {episode.quality} • {formatFileSize(episode.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-sm text-muted-foreground">
              Выбрано для удаления: {selectedForDeletion.size} из {episodes.length}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedForDeletion.size === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить ({selectedForDeletion.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
