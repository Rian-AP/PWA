"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Download } from "lucide-react"
import { getDirectVideoLinks } from "@/lib/kodik"
import { getKodikPlayers } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useDownloads } from "@/contexts/download-context"

interface Episode {
  id: number
  number: string
  name?: string
}

interface KodikPlayer {
  team: string
  teamSlug: string
  id: number
  translation: string
  link: string
}

interface EpisodeSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodes: Episode[]
  teams: KodikPlayer[]
  onDownload: (episodeIds: number[], teamSlug: string, quality: string) => void
  animeId: number
  animeName: string
  animeImage: string
}

export function EpisodeSelectorDialog({
  open,
  onOpenChange,
  episodes,
  teams,
  animeId,
  animeName,
  animeImage,
}: EpisodeSelectorDialogProps) {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [selectedQuality, setSelectedQuality] = useState<string>("720p")
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()
  const { addDownload } = useDownloads()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0].teamSlug)
    }
  }, [teams, selectedTeam])

  const filteredEpisodes = useMemo(() => {
    if (!episodes || episodes.length === 0) return []
    if (!searchQuery) return episodes
    return episodes.filter((ep) => ep.number.includes(searchQuery))
  }, [episodes, searchQuery])

  const toggleEpisode = (episodeId: number) => {
    const newSelected = new Set(selectedEpisodes)
    if (newSelected.has(episodeId)) {
      newSelected.delete(episodeId)
    } else {
      newSelected.add(episodeId)
    }
    setSelectedEpisodes(newSelected)
  }

  const selectAll = () => {
    setSelectedEpisodes(new Set(filteredEpisodes.map((ep) => ep.id)))
  }

  const deselectAll = () => {
    setSelectedEpisodes(new Set())
  }

  const handleDownload = async () => {
    if (selectedEpisodes.size === 0 || !selectedTeam) return

    setIsLoading(true)

    try {
      const episodeIds = Array.from(selectedEpisodes)

      for (const episodeId of episodeIds) {
        try {
          const kodikPlayers = await getKodikPlayers(episodeId)
          if (!kodikPlayers || kodikPlayers.length === 0) continue

          const selectedPlayer = kodikPlayers.find((p) => p.teamSlug === selectedTeam)
          if (!selectedPlayer) continue

          const directLinks = await getDirectVideoLinks(selectedPlayer.link)
          if (!directLinks) continue

          const qualityKey = selectedQuality.replace("p", "") as "360" | "480" | "720"
          const videoLink = directLinks[qualityKey]?.[0]?.src
          if (!videoLink) continue

          const fullVideoLink = videoLink.startsWith("//") ? `https:${videoLink}` : videoLink
          const episode = episodes.find((ep) => ep.id === episodeId)

          // Добавляем в глобальную очередь загрузок
          addDownload({
            episodeId,
            animeId,
            animeName,
            animeImage,
            episodeNumber: episode?.number || episodeId.toString(),
            audioTeam: selectedPlayer.team,
            audioTranslation: selectedPlayer.translation,
            quality: selectedQuality,
            videoUrl: fullVideoLink,
          })
        } catch (error) {
          console.error(`Ошибка при добавлении эпизода ${episodeId}:`, error)
        }
      }

      toast({
        title: "Загрузки добавлены",
        description: `${episodeIds.length} эпизодов добавлено в очередь`,
      })

      onOpenChange(false)
      setSelectedEpisodes(new Set())
    } catch (error) {
      console.error("Ошибка при добавлении загрузок:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось добавить эпизоды в загрузки",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const hasData = teams && teams.length > 0 && episodes && episodes.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Скачать эпизоды</DialogTitle>
          <DialogDescription>Выберите эпизоды, озвучку и качество для скачивания</DialogDescription>
        </DialogHeader>

        {!hasData ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Выбор озвучки и качества */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Озвучка</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите озвучку" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.teamSlug}>
                        {team.team} ({team.translation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Качество</label>
                <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="360p">360p</SelectItem>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Поиск и кнопки */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Поиск по номеру эпизода..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={selectAll} variant="outline" size="sm">
                Выбрать все
              </Button>
              <Button onClick={deselectAll} variant="outline" size="sm">
                Снять все
              </Button>
            </div>

            {/* Список эпизодов */}
            <ScrollArea className="h-[300px] rounded border p-4">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {filteredEpisodes.map((episode) => {
                  const isSelected = selectedEpisodes.has(episode.id)
                  return (
                    <button
                      key={episode.id}
                      onClick={() => toggleEpisode(episode.id)}
                      disabled={isLoading}
                      className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-muted-foreground/50"
                      } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {episode.number}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>

            <p className="text-sm text-muted-foreground">
              Выбрано эпизодов: {selectedEpisodes.size}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Отмена
          </Button>
          <Button
            onClick={handleDownload}
            disabled={selectedEpisodes.size === 0 || !selectedTeam || isLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? "Добавление..." : `Скачать (${selectedEpisodes.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
