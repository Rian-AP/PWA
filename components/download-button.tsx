"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { EpisodeSelectorDialog } from "./episode-selector-dialog"

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
}

interface DownloadButtonProps {
  episodes: Episode[]
  teams: KodikPlayer[]
  animeId: number
  animeName: string
  animeImage: string
  animeSlug: string
}

export function DownloadButton({ episodes, teams, animeId, animeName, animeImage, animeSlug }: DownloadButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadStatus, setDownloadStatus] = useState("")

  console.log("[v0] DownloadButton рендер:")
  console.log("[v0] - episodes:", episodes?.length || 0, "эпизодов")
  console.log("[v0] - teams:", teams?.length || 0, "команд")
  console.log("[v0] - dialogOpen:", dialogOpen)

  const handleDownload = async (episodeIds: number[], teamSlug: string) => {
    console.log("[v0] Downloading episodes:", episodeIds, "with team:", teamSlug)
    // TODO: Implement actual download logic
  }

  const handleOpenChange = (open: boolean) => {
    console.log("[v0] Диалог открывается:", open)
    console.log("[v0] Передаем в диалог:")
    console.log("[v0] - episodes:", episodes?.length || 0)
    console.log("[v0] - teams:", teams?.length || 0)
    setDialogOpen(open)
  }

  return (
    <>
      {isDownloading ? (
        <button
          onClick={() => handleOpenChange(true)}
          className="flex flex-col gap-2 w-[200px] p-3 rounded-md border bg-card hover:bg-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{downloadStatus}</span>
            <span className="font-medium">{downloadProgress}%</span>
          </div>
          <Progress value={downloadProgress} className="h-2" />
        </button>
      ) : (
        <Button 
          onClick={() => handleOpenChange(true)} 
          variant="outline" 
          className="gap-2 bg-transparent w-[200px] h-[52px]"
        >
          <Download size={16} />
          Скачать эпизоды
        </Button>
      )}

      <EpisodeSelectorDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        episodes={episodes}
        teams={teams}
        onDownload={handleDownload}
        animeId={animeId}
        animeName={animeName}
        animeImage={animeImage}
        animeSlug={animeSlug}
        onDownloadStart={() => setIsDownloading(true)}
        onDownloadEnd={() => setIsDownloading(false)}
        onDownloadProgress={(progress, status) => {
          setDownloadProgress(progress)
          setDownloadStatus(status)
        }}
      />
    </>
  )
}
