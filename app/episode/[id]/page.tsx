"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { getEpisodeDetails, getKodikPlayers } from "@/lib/api"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface KodikPlayer {
  team: string
  teamSlug: string
  views: number
  translation: string
  link: string
}

export default function EpisodePage() {
  const params = useParams()
  const id = params.id as string

  const [episode, setEpisode] = useState<any>(null)
  const [kodikPlayers, setKodikPlayers] = useState<KodikPlayer[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<KodikPlayer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEpisode = async () => {
      setLoading(true)
      const episodeData = await getEpisodeDetails(Number.parseInt(id))
      setEpisode(episodeData)

      if (episodeData) {
        const players = await getKodikPlayers(episodeData.id)

        if (players && Array.isArray(players) && players.length > 0) {
          setKodikPlayers(players)
          setSelectedPlayer(players[0])
        }
      }
      setLoading(false)
    }

    loadEpisode()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-secondary rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground text-lg">Эпизод не найден</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft size={20} />
          Назад
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Эпизод {episode.number}</h1>
            {episode.title && <p className="text-muted-foreground">{episode.title}</p>}
          </div>

          {selectedPlayer ? (
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded-lg border border-border overflow-hidden">
                <iframe
                  src={selectedPlayer.link}
                  width="100%"
                  height="100%"
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                />
              </div>

              {/* Audio Selection */}
              {kodikPlayers.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Озвучка</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {kodikPlayers.map((player, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPlayer(player)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-left ${
                          selectedPlayer?.teamSlug === player.teamSlug
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary border border-border text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        <div className="font-medium">{player.team}</div>
                        <div className="text-xs opacity-75">{player.translation}</div>
                        <div className="text-xs opacity-60">👁 {player.views}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-card border border-border rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {kodikPlayers.length === 0 ? "Озвучки не найдены" : "Видео загружается..."}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
