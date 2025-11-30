"use client"

import { useState, useEffect } from "react"
import { getKodikPlayers } from "@/lib/api"

interface KodikPlayer {
  team: string
  teamSlug: string
  views: number
  translation: string
  link: string
  id: number
}

interface VideoPlayerProps {
  episodeId: number
  episodeNumber: number
  selectedPlayerId?: number | null
  onPlayersLoad?: (players: KodikPlayer[]) => void
  animeId?: number
}

export function VideoPlayer({
  episodeId,
  episodeNumber,
  selectedPlayerId,
  onPlayersLoad,
  animeId,
}: VideoPlayerProps) {
  const [kodikPlayers, setKodikPlayers] = useState<KodikPlayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadKodikPlayers = async () => {
      setLoading(true)
      const players = await getKodikPlayers(episodeId)

      if (players && Array.isArray(players) && players.length > 0) {
        setKodikPlayers(players)
        if (onPlayersLoad) {
          onPlayersLoad(players)
        }
      }
      setLoading(false)
    }

    loadKodikPlayers()
  }, [episodeId, onPlayersLoad])

  const selectedPlayer = kodikPlayers.find((p) => p.id === selectedPlayerId) || kodikPlayers[0] || null

  // Добавляем параметры для запоминания настроек
  const getPlayerUrl = (baseUrl: string, player: KodikPlayer) => {
    const url = new URL(baseUrl)
    
    // Сохраняем выбранную озвучку в localStorage
    if (typeof window !== "undefined" && animeId) {
      const savedTranslation = localStorage.getItem(`kodik-translation-${animeId}`)
      const savedQuality = localStorage.getItem(`kodik-quality-${animeId}`)
      
      // Добавляем параметры для автоматического выбора
      if (savedTranslation && url.pathname.includes(savedTranslation)) {
        // URL уже содержит нужную озвучку
      }
      if (savedQuality) {
        url.searchParams.set("default_quality", savedQuality)
      }
      
      // Сохраняем текущую озвучку
      const translationId = player.teamSlug
      localStorage.setItem(`kodik-translation-${animeId}`, translationId)
    }
    
    return url.toString()
  }

  if (loading) {
    return (
      <div className="aspect-video bg-card border border-border rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка видео...</p>
      </div>
    )
  }

  if (!selectedPlayer || kodikPlayers.length === 0) {
    return (
      <div className="aspect-video bg-card border border-border rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Видео недоступно</p>
      </div>
    )
  }

  return (
    <div className="aspect-video bg-black rounded-lg border border-border overflow-hidden">
      <iframe
        src={getPlayerUrl(selectedPlayer.link, selectedPlayer)}
        width="100%"
        height="100%"
        className="w-full h-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
      />
    </div>
  )
}
