"use client"

import { saveDownloadedEpisode, updateDownloadProgress } from "./db"
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null

async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance

  console.log('[FFmpeg] Инициализация...')
  const ffmpeg = new FFmpeg()
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message)
  })

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  console.log('[FFmpeg] ✅ Готов!')
  ffmpegInstance = ffmpeg
  return ffmpeg
}

export interface DownloadOptions {
  episodeId: number
  animeId: number
  animeName: string
  animeImage: string
  episodeNumber: string
  audioTeam: string
  audioTranslation: string
  quality: string
  videoUrl: string
  onProgress?: (progress: number) => void
  isCancelled?: () => boolean
}

async function parseM3U8(m3u8Url: string): Promise<string[]> {
  console.log("[v0] Загрузка m3u8 манифеста через прокси:", m3u8Url)

  // Загружаем через наш API прокси
  const response = await fetch("/api/kodik/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: m3u8Url }),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch m3u8: ${response.statusText}`)
  }

  const data = await response.json()
  const text = data.text

  const lines = text.split("\n").filter((line: string) => line.trim() && !line.startsWith("#"))

  // Определяем базовый URL для относительных путей
  const baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1)

  const segmentUrls = lines.map((line: string) => {
    if (line.startsWith("http://") || line.startsWith("https://")) {
      return line.trim()
    }
    return baseUrl + line.trim()
  })

  console.log(`[v0] Найдено ${segmentUrls.length} сегментов`)
  return segmentUrls
}

async function downloadSegment(url: string): Promise<ArrayBuffer> {
  // Загружаем через наш API прокси
  const response = await fetch("/api/kodik/download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error(`Failed to download segment: ${response.statusText}`)
  }

  return await response.arrayBuffer()
}

async function convertTsToMp4(tsBlob: Blob): Promise<Blob> {
  console.log("[v0] Конвертация TS в MP4 через FFmpeg...")
  console.log(`[v0] TS размер: ${tsBlob.size} байт`)

  const ffmpeg = await initFFmpeg()

  // Записываем TS в FFmpeg
  await ffmpeg.writeFile('input.ts', await fetchFile(tsBlob))
  console.log('[v0] TS файл загружен в FFmpeg')

  // Конвертируем с правильными параметрами для Safari
  console.log('[v0] Запуск FFmpeg конвертации...')
  await ffmpeg.exec([
    '-i', 'input.ts',
    '-c:v', 'copy',              // Копируем видео (не перекодируем)
    '-c:a', 'copy',              // Копируем аудио (не перекодируем)
    '-movflags', '+faststart',   // Метаданные в начало
    '-fflags', '+genpts',        // Генерировать правильные timestamps
    'output.mp4'
  ])

  console.log('[v0] ✅ FFmpeg конвертация завершена')

  // Читаем результат
  const data = await ffmpeg.readFile('output.mp4')
  const mp4Blob = new Blob([data], { type: 'video/mp4' })
  
  console.log(`[v0] MP4 создан, размер: ${mp4Blob.size} байт`)

  // Очищаем
  await ffmpeg.deleteFile('input.ts')
  await ffmpeg.deleteFile('output.mp4')

  return mp4Blob
}

async function downloadAllSegments(
  segmentUrls: string[],
  onProgress?: (downloaded: number, total: number) => void,
  isCancelled?: () => boolean
): Promise<Blob> {
  const segments: ArrayBuffer[] = []
  let downloaded = 0

  console.log(`[v0] Начинаем скачивание ${segmentUrls.length} сегментов...`)

  for (const url of segmentUrls) {
    // Проверяем отмену
    if (isCancelled && isCancelled()) {
      console.log("[v0] ⚠️ Загрузка сегментов отменена пользователем")
      throw new Error("Download cancelled by user")
    }

    try {
      const segment = await downloadSegment(url)
      segments.push(segment)
      downloaded++
      if (onProgress) {
        onProgress(downloaded, segmentUrls.length)
      }
      console.log(`[v0] Скачано сегментов: ${downloaded}/${segmentUrls.length}`)
    } catch (error) {
      // Не логируем как error - это может быть временная проблема
      // Просто пробрасываем ошибку, и система автоматически повторит попытку
      throw error
    }
  }

  // Склеиваем все сегменты в один TS файл
  console.log("[v0] Склеивание сегментов в один TS файл...")
  const tsBlob = new Blob(segments, { type: "video/mp2t" })
  console.log(`[v0] TS файл готов, размер: ${tsBlob.size} байт`)

  // Конвертируем TS в MP4
  const mp4Blob = await convertTsToMp4(tsBlob)
  return mp4Blob
}

export async function downloadEpisode(options: DownloadOptions): Promise<void> {
  const {
    episodeId,
    videoUrl,
    animeId,
    animeName,
    animeImage,
    animeSlug,
    episodeNumber,
    audioTeam,
    audioTranslation,
    quality,
    onProgress,
    isCancelled,
  } = options

  try {
    console.log("[v0] ===== НАЧАЛО СКАЧИВАНИЯ ЭПИЗОДА =====")
    console.log("[v0] URL:", videoUrl)

    await updateDownloadProgress({
      episodeId,
      progress: 0,
      status: "downloading",
    })

    let videoBlob: Blob
    let size: number

    // Проверяем, является ли это HLS поток
    if (videoUrl.includes(".m3u8")) {
      console.log("[v0] Обнаружен HLS поток, начинаем скачивание сегментов...")

      // Парсим m3u8 и получаем список сегментов
      const segmentUrls = await parseM3U8(videoUrl)

      // Скачиваем все сегменты с отслеживанием прогресса
      videoBlob = await downloadAllSegments(
        segmentUrls,
        (downloaded, total) => {
          const progress = Math.round((downloaded / total) * 100)

          // Обновляем прогресс в UI
          if (onProgress) {
            onProgress(progress)
          }

          updateDownloadProgress({
            episodeId,
            progress,
            status: "downloading",
          }).catch(console.error)
        },
        isCancelled
      )

      size = videoBlob.size
    } else {
      // Обычный видео файл
      console.log("[v0] Обычный видео файл, скачиваем напрямую...")
      const response = await fetch(videoUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`)
      }
      videoBlob = await response.blob()
      size = videoBlob.size
    }

    console.log(`[v0] Видео скачано, размер: ${size} байт`)
    console.log("[v0] Сохранение в IndexedDB...")

    // Сохраняем в IndexedDB
    try {
      const episodeData = {
        episodeId,
        animeId,
        animeName,
        animeImage,
        animeSlug,
        episodeNumber,
        audioTeam,
        audioTranslation,
        quality,
        videoUrl,
        videoBlob,
        size,
        downloadedAt: Date.now(),
      }
      console.log("[v0] Данные для сохранения:", {
        ...episodeData,
        videoBlob: `Blob(${videoBlob.size} bytes, ${videoBlob.type})`
      })
      
      const savedId = await saveDownloadedEpisode(episodeData)
      console.log(`[v0] ✅ Эпизод сохранен в IndexedDB с ID: ${savedId}`)

      await updateDownloadProgress({
        episodeId,
        progress: 100,
        status: "completed",
      })

      console.log("[v0] ✅ Эпизод успешно скачан и сохранен!")
    } catch (saveError) {
      console.error("[v0] ❌ Ошибка при сохранении в IndexedDB:", saveError)
      throw new Error(`Failed to save to IndexedDB: ${saveError}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    // Если отмена пользователем - не логируем как ошибку
    if (errorMessage === "Download cancelled by user") {
      console.log("[v0] ⚠️ Загрузка отменена пользователем")
      throw error
    }
    
    // Не логируем как error - система автоматически повторит попытку
    // Просто сохраняем статус failed в БД для отслеживания
    console.log("[v0] ⚠️ Временная ошибка загрузки (будет повтор):", errorMessage)

    await updateDownloadProgress({
      episodeId,
      progress: 0,
      status: "failed",
      error: errorMessage,
    })

    throw error
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}
