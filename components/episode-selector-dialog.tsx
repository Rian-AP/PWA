"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import * as React from "react"
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
import { downloadEpisode } from "@/lib/downloads"
import { useToast } from "@/hooks/use-toast"

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
  animeSlug: string
  onDownloadStart?: () => void
  onDownloadEnd?: () => void
  onDownloadProgress?: (progress: number, status: string) => void
}

export function EpisodeSelectorDialog({
  open,
  onOpenChange,
  episodes,
  teams,
  onDownload,
  animeId,
  animeName,
  animeImage,
  animeSlug,
  onDownloadStart,
  onDownloadEnd,
  onDownloadProgress,
}: EpisodeSelectorDialogProps) {
  useEffect(() => {
    if (open) {
      console.log("[v0] ===== ДИАЛОГ ОТКРЫТ =====")
      console.log("[v0] Episodes prop:", episodes?.length || 0, "эпизодов")
      console.log("[v0] Teams prop:", teams?.length || 0, "команд")
      console.log("[v0] Episodes:", episodes)
      console.log("[v0] Teams:", teams)
    }
  }, [open, episodes, teams])

  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [selectedQuality, setSelectedQuality] = useState<string>("720p")
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState(false)
  const [episodeProgress, setEpisodeProgress] = useState<Map<number, number>>(new Map())
  const [episodeErrors, setEpisodeErrors] = useState<Set<number>>(new Set())
  const isCancelledRef = useRef(false)

  useEffect(() => {
    console.log("[v0] Teams изменились:", teams?.length || 0)
    console.log("[v0] Текущий selectedTeam:", selectedTeam)
    if (teams && teams.length > 0 && !selectedTeam) {
      console.log("[v0] Устанавливаем первую команду:", teams[0].teamSlug)
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

    console.log("[v0] ===== НАЧАЛО СКАЧИВАНИЯ =====")
    console.log("[v0] Выбрано эпизодов:", selectedEpisodes.size)
    console.log("[v0] Выбранная озвучка:", selectedTeam)
    console.log("[v0] Выбранное качество:", selectedQuality)

    setIsDownloading(true)
    isCancelledRef.current = false
    
    // Уведомляем родительский компонент о начале загрузки
    if (onDownloadStart) {
      onDownloadStart()
    }
    
    // Инициализируем прогресс для всех выбранных эпизодов
    const initialProgress = new Map<number, number>()
    Array.from(selectedEpisodes).forEach(id => initialProgress.set(id, 0))
    setEpisodeProgress(initialProgress)
    setEpisodeErrors(new Set())

    try {
      const episodeIds = Array.from(selectedEpisodes)
      console.log("[v0] ID эпизодов для скачивания:", episodeIds)
      let successCount = 0
      let failCount = 0
      const failedEpisodes: number[] = []
      const totalEpisodes = episodeIds.length

      // Первый проход - скачиваем все эпизоды
      for (let idx = 0; idx < episodeIds.length; idx++) {
        const episodeId = episodeIds[idx]
        // Проверяем отмену
        if (isCancelledRef.current) {
          console.log("[v0] ⚠️ Загрузка отменена пользователем")
          break
        }
        // Устанавливаем прогресс для текущего эпизода
        setEpisodeProgress(prev => new Map(prev).set(episodeId, 1))
        console.log(`[v0] ----- Обработка эпизода ${episodeId} -----`)
        try {
          // Получаем Kodik плееры для эпизода
          console.log(`[v0] Загрузка Kodik плееров для эпизода ${episodeId}...`)
          const kodikPlayers = await getKodikPlayers(episodeId)
          console.log(`[v0] Получено плееров:`, kodikPlayers?.length || 0)

          if (!kodikPlayers || kodikPlayers.length === 0) {
            console.error(`[v0] ❌ Нет Kodik плееров для эпизода ${episodeId}`)
            failCount++
            continue
          }

          // Находим плеер с выбранной озвучкой
          console.log(`[v0] Поиск плеера с озвучкой ${selectedTeam}...`)
          const selectedPlayer = kodikPlayers.find((p) => p.teamSlug === selectedTeam)
          console.log(
            `[v0] Найден плеер:`,
            selectedPlayer ? `ID ${selectedPlayer.id}, команда ${selectedPlayer.team}` : "не найден",
          )

          if (!selectedPlayer) {
            console.error(`[v0] ❌ Плеер с озвучкой ${selectedTeam} не найден`)
            failCount++
            continue
          }

          // Получаем прямые ссылки через kodikwrapper
          console.log(`[v0] Получение прямых ссылок для плеера...`)
          console.log(`[v0] Kodik URL:`, selectedPlayer.link)
          const directLinks = await getDirectVideoLinks(selectedPlayer.link)
          console.log(`[v0] Прямые ссылки получены:`, directLinks ? "да" : "нет")
          console.log(`[v0] Структура ссылок:`, directLinks)

          if (!directLinks) {
            console.error(`[v0] ❌ Не удалось получить прямые ссылки для эпизода ${episodeId}`)
            failCount++
            continue
          }

          // Выбираем нужное качество
          const qualityKey = selectedQuality.replace("p", "") as "360" | "480" | "720"
          console.log(`[v0] Выбор качества ${qualityKey}...`)
          const videoLink = directLinks[qualityKey]?.[0]?.src
          console.log(`[v0] Ссылка на видео:`, videoLink || "не найдена")

          if (!videoLink) {
            console.error(`[v0] ❌ Нет ссылки для качества ${selectedQuality}`)
            console.log(`[v0] Доступные качества:`, Object.keys(directLinks))
            failCount++
            continue
          }

          // Добавляем https: если нужно
          const fullVideoLink = videoLink.startsWith("//") ? `https:${videoLink}` : videoLink
          console.log(`[v0] Полная ссылка на видео:`, fullVideoLink)

          // Находим информацию об эпизоде
          const episode = episodes.find((ep) => ep.id === episodeId)
          const episodeName = episode ? `Эпизод ${episode.number}` : `Эпизод ${episodeId}`
          console.log(`[v0] Название эпизода:`, episodeName)

          // Скачиваем эпизод
          console.log(`[v0] Добавление в загрузки...`)
          await downloadEpisode({
            episodeId,
            animeId,
            animeName,
            animeImage,
            animeSlug,
            episodeNumber: episode.number,
            audioTeam: selectedPlayer.team,
            audioTranslation: selectedPlayer.translation,
            quality: selectedQuality,
            videoUrl: fullVideoLink,
            onProgress: (progress) => {
              setEpisodeProgress(prev => new Map(prev).set(episodeId, progress))
              
              // Обновляем общий прогресс в реальном времени
              if (onDownloadProgress) {
                // Считаем: завершенные эпизоды + прогресс текущего
                const completedEpisodes = idx
                const currentEpisodeProgress = progress / 100
                const totalProgress = ((completedEpisodes + currentEpisodeProgress) / totalEpisodes) * 100
                onDownloadProgress(
                  Math.round(totalProgress),
                  `Скачивание ${idx + 1}/${totalEpisodes}`
                )
              }
            },
            isCancelled: () => isCancelledRef.current,
          })
          console.log(`[v0] ✅ Эпизод ${episodeId} успешно добавлен в загрузки`)
          
          // Устанавливаем 100% для завершенного эпизода
          setEpisodeProgress(prev => new Map(prev).set(episodeId, 100))
          successCount++
        } catch (error) {
          // Если отмена пользователем - просто выходим
          if (error instanceof Error && error.message === "Download cancelled by user") {
            console.log(`[v0] ⚠️ Загрузка эпизода ${episodeId} отменена`)
            break
          }
          
          // Проверяем, был ли эпизод уже загружен (прогресс 100%)
          const currentProgress = episodeProgress.get(episodeId) || 0
          if (currentProgress === 100) {
            console.log(`[v0] ℹ️ Эпизод ${episodeId} уже загружен, пропускаем retry`)
            successCount++
          } else {
            console.log(`[v0] ⚠️ Эпизод ${episodeId} не загрузился (прогресс: ${currentProgress}%), добавлен в очередь повтора`)
            setEpisodeErrors(prev => new Set(prev).add(episodeId))
            failedEpisodes.push(episodeId)
            failCount++
          }
        }
      }

      // Второй проход - повторяем загрузку упавших эпизодов
      if (failedEpisodes.length > 0 && !isCancelledRef.current) {
        console.log(`[v0] ===== ПОВТОРНАЯ ЗАГРУЗКА ${failedEpisodes.length} УПАВШИХ ЭПИЗОДОВ =====`)
        
        for (const episodeId of failedEpisodes) {
          // Проверяем отмену
          if (isCancelledRef.current) {
            console.log("[v0] ⚠️ Повторная загрузка отменена пользователем")
            break
          }
          
          console.log(`[v0] ----- Повторная попытка для эпизода ${episodeId} -----`)
          
          // Убираем ошибку и ставим прогресс на 1%
          setEpisodeErrors(prev => {
            const newSet = new Set(prev)
            newSet.delete(episodeId)
            return newSet
          })
          setEpisodeProgress(prev => new Map(prev).set(episodeId, 1))
          
          try {
            const kodikPlayers = await getKodikPlayers(episodeId)
            if (!kodikPlayers || kodikPlayers.length === 0) {
              console.error(`[v0] ❌ Нет Kodik плееров для эпизода ${episodeId}`)
              setEpisodeErrors(prev => new Set(prev).add(episodeId))
              continue
            }

            const selectedPlayer = kodikPlayers.find((p) => p.teamSlug === selectedTeam)
            if (!selectedPlayer) {
              console.error(`[v0] ❌ Плеер с озвучкой ${selectedTeam} не найден`)
              setEpisodeErrors(prev => new Set(prev).add(episodeId))
              continue
            }

            const directLinks = await getDirectVideoLinks(selectedPlayer.link)
            if (!directLinks) {
              console.error(`[v0] ❌ Не удалось получить прямые ссылки для эпизода ${episodeId}`)
              setEpisodeErrors(prev => new Set(prev).add(episodeId))
              continue
            }

            const qualityKey = selectedQuality.replace("p", "") as "360" | "480" | "720"
            const videoLink = directLinks[qualityKey]?.[0]?.src
            if (!videoLink) {
              console.error(`[v0] ❌ Нет ссылки для качества ${selectedQuality}`)
              setEpisodeErrors(prev => new Set(prev).add(episodeId))
              continue
            }

            const fullVideoLink = videoLink.startsWith("//") ? `https:${videoLink}` : videoLink
            const episode = episodes.find((ep) => ep.id === episodeId)

            await downloadEpisode({
              episodeId,
              animeId,
              animeName,
              animeImage,
              animeSlug,
              episodeNumber: episode ? episode.number : episodeId.toString(),
              audioTeam: selectedPlayer.team,
              audioTranslation: selectedPlayer.translation,
              quality: selectedQuality,
              videoUrl: fullVideoLink,
              onProgress: (progress) => {
                setEpisodeProgress(prev => new Map(prev).set(episodeId, progress))
                
                // Обновляем общий прогресс при повторной загрузке
                if (onDownloadProgress) {
                  const currentEpisodeProgress = progress / 100
                  const totalProgress = (currentEpisodeProgress / totalEpisodes) * 100
                  onDownloadProgress(
                    Math.round(totalProgress),
                    `Повтор ${failedEpisodes.indexOf(episodeId) + 1}/${failedEpisodes.length}`
                  )
                }
              },
              isCancelled: () => isCancelledRef.current,
            })
            
            console.log(`[v0] ✅ Эпизод ${episodeId} успешно скачан при повторной попытке`)
            setEpisodeProgress(prev => new Map(prev).set(episodeId, 100))
            successCount++
            failCount--
          } catch (error) {
            // Если отмена пользователем - просто выходим
            if (error instanceof Error && error.message === "Download cancelled by user") {
              console.log(`[v0] ⚠️ Повторная загрузка эпизода ${episodeId} отменена`)
              break
            }
            
            console.log(`[v0] ❌ Повторная попытка для эпизода ${episodeId} не удалась`)
            setEpisodeErrors(prev => new Set(prev).add(episodeId))
          }
        }
      }

      console.log("[v0] ===== СКАЧИВАНИЕ ЗАВЕРШЕНО =====")
      console.log(`[v0] Успешно: ${successCount}, Ошибок: ${failCount}`)

      if (isCancelledRef.current) {
        toast({
          title: "Загрузка отменена",
          description: `Скачано: ${successCount} эпизодов`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Загрузка завершена",
          description: `Успешно: ${successCount}, Ошибок: ${failCount}`,
        })
      }

      // Закрываем диалог и очищаем выбор
      onOpenChange(false)
      setSelectedEpisodes(new Set())
      setEpisodeProgress(new Map())
      setEpisodeErrors(new Set())
      isCancelledRef.current = false
      
      // Уведомляем родительский компонент о завершении
      if (onDownloadEnd) {
        onDownloadEnd()
      }
    } catch (error) {
      console.error("[v0] ❌ КРИТИЧЕСКАЯ ОШИБКА в handleDownload:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось добавить эпизоды в загрузки",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
      
      // На всякий случай уведомляем о завершении
      if (onDownloadEnd) {
        onDownloadEnd()
      }
    }
  }

  // Вычисляем общий процент загрузки
  const overallProgress = React.useMemo(() => {
    if (episodeProgress.size === 0) return 0
    const total = Array.from(episodeProgress.values()).reduce((sum, val) => sum + val, 0)
    return Math.round(total / episodeProgress.size)
  }, [episodeProgress])

  const hasData = teams && teams.length > 0 && episodes && episodes.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Скачать эпизоды</DialogTitle>
          <DialogDescription>Выберите озвучку и эпизоды для скачивания</DialogDescription>
        </DialogHeader>

        {!hasData ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">Загрузка данных...</div>
        ) : (
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Озвучка</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите озвучку" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.teamSlug} value={team.teamSlug}>
                        <div className="flex items-center gap-2">
                          <span>{team.team}</span>
                          <span className="text-xs text-muted-foreground">({team.translation})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Качество</label>
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Поиск по номеру эпизода..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} className="flex-1 bg-transparent">
                Выбрать всё
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll} className="flex-1 bg-transparent">
                Убрать всё
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-md min-h-0 h-[300px]">
              <div className="p-4 space-y-2">
                {filteredEpisodes.map((episode) => {
                  const progress = episodeProgress.get(episode.id)
                  const isDownloadingEpisode = progress !== undefined
                  const isSelected = selectedEpisodes.has(episode.id)
                  const isDisabled = isDownloading && !isSelected
                  
                  return (
                    <div
                      key={episode.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-accent cursor-pointer"
                      }`}
                      onClick={() => !isDownloading && toggleEpisode(episode.id)}
                    >
                      {isDownloadingEpisode ? (
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-muted"
                              opacity="0.25"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-primary"
                              strokeDasharray={`${(progress / 100) * 50.27} 50.27`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEpisode(episode.id)}
                          disabled={isDisabled}
                        />
                      )}
                      <div className="flex-1">
                        <span className="font-medium">Эпизод {episode.number}</span>
                        {episode.name && <span className="text-sm text-muted-foreground ml-2">- {episode.name}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              Выбрано: {selectedEpisodes.size} из {filteredEpisodes.length}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              if (isDownloading) {
                isCancelledRef.current = true
                console.log("[v0] Пользователь отменил загрузку")
              } else {
                onOpenChange(false)
              }
            }}
          >
            {isDownloading ? "Отменить загрузку" : "Отмена"}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={selectedEpisodes.size === 0 || !hasData || isDownloading}
            className="gap-2"
          >
            <Download size={16} />
            {isDownloading 
              ? `Скачивание... ${overallProgress}%` 
              : `Скачать выбранное (${selectedEpisodes.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
