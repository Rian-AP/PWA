"use client"

import { createContext, useContext, useState, useCallback, useRef } from "react"
import { downloadEpisode } from "@/lib/downloads"
import { saveDownloadedEpisode } from "@/lib/db"

interface DownloadTask {
  id: string
  episodeId: number
  animeId: number
  animeName: string
  animeImage: string
  episodeNumber: string
  audioTeam: string
  audioTranslation: string
  quality: string
  videoUrl: string
  progress: number
  status: "pending" | "downloading" | "completed" | "failed" | "cancelled"
  error?: string
}

interface DownloadContextType {
  tasks: DownloadTask[]
  addDownload: (task: Omit<DownloadTask, "id" | "progress" | "status">) => void
  cancelDownload: (id: string) => void
  clearCompleted: () => void
  hasActiveDownloads: boolean
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const cancelFlagsRef = useRef<Record<string, boolean>>({})

  const addDownload = useCallback((taskData: Omit<DownloadTask, "id" | "progress" | "status">) => {
    const taskId = `${taskData.episodeId}-${Date.now()}`
    
    const newTask: DownloadTask = {
      ...taskData,
      id: taskId,
      progress: 0,
      status: "downloading",
    }

    setTasks((prev) => [...prev, newTask])
    cancelFlagsRef.current[taskId] = false

    // Запускаем скачивание
    downloadEpisode(
      taskData.videoUrl,
      () => cancelFlagsRef.current[taskId],
      (progress) => {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, progress: Math.round(progress * 100) } : task
          )
        )
      }
    )
      .then(async (videoBlob) => {
        if (cancelFlagsRef.current[taskId]) {
          setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: "cancelled" } : task)))
          return
        }

        // Сохраняем в IndexedDB
        await saveDownloadedEpisode({
          episodeId: taskData.episodeId,
          animeId: taskData.animeId,
          animeName: taskData.animeName,
          animeImage: taskData.animeImage,
          episodeNumber: taskData.episodeNumber,
          audioTeam: taskData.audioTeam,
          audioTranslation: taskData.audioTranslation,
          quality: taskData.quality,
          videoUrl: taskData.videoUrl,
          videoBlob,
          size: videoBlob.size,
        })

        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, status: "completed", progress: 100 } : task))
        )

        delete cancelFlagsRef.current[taskId]
      })
      .catch((error) => {
        if (!cancelFlagsRef.current[taskId]) {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === taskId ? { ...task, status: "failed", error: error.message } : task
            )
          )
        }
        delete cancelFlagsRef.current[taskId]
      })
  }, [])

  const cancelDownload = useCallback((id: string) => {
    cancelFlagsRef.current[id] = true
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "cancelled" } : task)))
  }, [])

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((task) => task.status === "downloading" || task.status === "pending"))
  }, [])

  const hasActiveDownloads = tasks.some((task) => task.status === "downloading")

  return (
    <DownloadContext.Provider value={{ tasks, addDownload, cancelDownload, clearCompleted, hasActiveDownloads }}>
      {children}
    </DownloadContext.Provider>
  )
}

export function useDownloads() {
  const context = useContext(DownloadContext)
  if (!context) {
    throw new Error("useDownloads must be used within DownloadProvider")
  }
  return context
}
