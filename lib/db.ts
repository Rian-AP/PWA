"use client"

/**
 * IndexedDB database for storing downloaded episodes and anime metadata
 */

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

interface DownloadProgress {
  episodeId: number
  progress: number
  status: "pending" | "downloading" | "completed" | "failed"
  error?: string
}

const DB_NAME = "AnimeLibDB"
const STORE_NAME_EPISODES = "downloaded_episodes"
const STORE_NAME_PROGRESS = "download_progress"
const DB_VERSION = 3

let db: IDBDatabase | null = null

export async function clearDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[v0] Удаление базы данных...")
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => {
      console.log("[v0] ✅ База данных удалена")
      db = null
      resolve()
    }
    request.onerror = () => {
      console.error("[v0] ❌ Ошибка при удалении БД:", request.error)
      reject(request.error)
    }
    request.onblocked = () => {
      console.warn("[v0] ⚠️ Удаление БД заблокировано. Закройте все вкладки с этим сайтом.")
    }
  })
}

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    console.log("[v0] Открытие базы данных, версия:", DB_VERSION)
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error("[v0] ❌ Ошибка открытия БД:", request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      db = request.result
      console.log("[v0] ✅ База данных открыта успешно")
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      console.log("[v0] Обновление схемы БД с версии", event.oldVersion, "до", event.newVersion)
      const db = (event.target as IDBOpenDBRequest).result

      // Удаляем старые store если они существуют
      if (db.objectStoreNames.contains(STORE_NAME_EPISODES)) {
        console.log("[v0] Удаление старого store:", STORE_NAME_EPISODES)
        db.deleteObjectStore(STORE_NAME_EPISODES)
      }
      if (db.objectStoreNames.contains(STORE_NAME_PROGRESS)) {
        console.log("[v0] Удаление старого store:", STORE_NAME_PROGRESS)
        db.deleteObjectStore(STORE_NAME_PROGRESS)
      }

      // Создаем новые store
      console.log("[v0] Создание store:", STORE_NAME_EPISODES)
      db.createObjectStore(STORE_NAME_EPISODES, { keyPath: "id", autoIncrement: true })
      
      console.log("[v0] Создание store:", STORE_NAME_PROGRESS)
      db.createObjectStore(STORE_NAME_PROGRESS, { keyPath: "episodeId" })
      
      console.log("[v0] ✅ Схема БД обновлена")
    }
  })
}

export async function saveDownloadedEpisode(episode: DownloadedEpisode): Promise<number> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME_EPISODES], "readwrite")
    const store = transaction.objectStore(STORE_NAME_EPISODES)
    const request = store.add(episode)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as number)
  })
}

export async function getDownloadedEpisodes(): Promise<DownloadedEpisode[]> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME_EPISODES], "readonly")
    const store = transaction.objectStore(STORE_NAME_EPISODES)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as DownloadedEpisode[])
  })
}

export async function getDownloadedEpisodesByAnime(animeId: number): Promise<DownloadedEpisode[]> {
  const database = await initDB()
  const allEpisodes = await getDownloadedEpisodes()
  return allEpisodes.filter((ep) => ep.animeId === animeId)
}

export async function deleteDownloadedEpisode(id: number): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME_EPISODES], "readwrite")
    const store = transaction.objectStore(STORE_NAME_EPISODES)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getDownloadProgress(episodeId: number): Promise<DownloadProgress | null> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME_PROGRESS], "readonly")
    const store = transaction.objectStore(STORE_NAME_PROGRESS)
    const request = store.get(episodeId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as DownloadProgress | null)
  })
}

export async function updateDownloadProgress(progress: DownloadProgress): Promise<void> {
  console.log("[v0] updateDownloadProgress вызван с данными:", progress)
  console.log("[v0] episodeId тип:", typeof progress.episodeId, "значение:", progress.episodeId)
  
  try {
    const database = await initDB()
    return new Promise((resolve, reject) => {
      try {
        const transaction = database.transaction([STORE_NAME_PROGRESS], "readwrite")
        const store = transaction.objectStore(STORE_NAME_PROGRESS)
        
        console.log("[v0] Попытка put объекта в store...")
        const request = store.put(progress)

        request.onerror = () => {
          console.error("[v0] ❌ Ошибка при put:", request.error)
          reject(request.error)
        }
        request.onsuccess = () => {
          console.log("[v0] ✅ put успешен")
          resolve()
        }
      } catch (transactionError) {
        console.error("[v0] ❌ Ошибка транзакции (возможно устаревшая БД):", transactionError)
        // Автоочистка при ошибке схемы
        console.log("[v0] 🔄 Попытка очистить устаревшую БД...")
        clearDB().then(() => {
          console.log("[v0] ✅ БД очищена, перезагрузите страницу")
          reject(new Error("Database schema outdated, cleared. Please reload."))
        }).catch(reject)
      }
    })
  } catch (error) {
    console.error("[v0] ❌ Критическая ошибка БД:", error)
    throw error
  }
}

export async function deleteDownloadProgress(episodeId: number): Promise<void> {
  const database = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME_PROGRESS], "readwrite")
    const store = transaction.objectStore(STORE_NAME_PROGRESS)
    const request = store.delete(episodeId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
