"use client"

import { useDownloads } from "@/contexts/download-context"
import { Download, X } from "lucide-react"
import { useState } from "react"

export function DownloadProgressIndicator() {
  const { tasks, cancelDownload, clearCompleted, hasActiveDownloads } = useDownloads()
  const [isExpanded, setIsExpanded] = useState(false)

  const activeDownloads = tasks.filter((task) => task.status === "downloading")
  const completedDownloads = tasks.filter((task) => task.status === "completed")
  const failedDownloads = tasks.filter((task) => task.status === "failed")

  if (tasks.length === 0) return null

  const totalProgress = activeDownloads.length > 0
    ? Math.round(activeDownloads.reduce((sum, task) => sum + task.progress, 0) / activeDownloads.length)
    : 0

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Компактный индикатор */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-lg shadow-lg hover:bg-accent transition-colors"
        >
          <Download size={20} className="text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {hasActiveDownloads ? "Скачивание..." : "Загрузки"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeDownloads.length > 0 && `${activeDownloads.length} активных`}
              {completedDownloads.length > 0 && ` • ${completedDownloads.length} завершено`}
            </p>
          </div>
          {hasActiveDownloads && (
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - totalProgress / 100)}`}
                  className="text-primary transition-all"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {totalProgress}%
              </span>
            </div>
          )}
        </button>
      )}

      {/* Развёрнутая панель */}
      {isExpanded && (
        <div className="w-96 max-h-96 bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Заголовок */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Download size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Загрузки</h3>
            </div>
            <div className="flex items-center gap-2">
              {completedDownloads.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Очистить
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Список задач */}
          <div className="overflow-y-auto p-2 space-y-2 max-h-80">
            {tasks.map((task) => (
              <div key={task.id} className="p-3 bg-background rounded-lg border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {task.animeName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Эпизод {task.episodeNumber} • {task.audioTeam}
                    </p>
                  </div>
                  {task.status === "downloading" && (
                    <button
                      onClick={() => cancelDownload(task.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Прогресс бар */}
                {task.status === "downloading" && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{task.progress}%</p>
                  </div>
                )}

                {/* Статус */}
                {task.status === "completed" && (
                  <p className="text-xs text-green-500">✓ Завершено</p>
                )}
                {task.status === "failed" && (
                  <p className="text-xs text-destructive">✗ Ошибка: {task.error}</p>
                )}
                {task.status === "cancelled" && (
                  <p className="text-xs text-muted-foreground">Отменено</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
