"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import type { Anime } from "@/lib/api"

interface FavoritesContextType {
  favorites: Anime[]
  isFavorite: (slug: string) => boolean
  toggleFavorite: (anime: Anime) => Promise<void>
  loading: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [favorites, setFavorites] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [synced, setSynced] = useState(false)

  // Загрузка избранного при монтировании (из localStorage или сервера)
  useEffect(() => {
    const loadFavorites = async () => {
      if (status === "loading") return

      if (session?.user) {
        // Если пользователь залогинен - загружаем с сервера
        try {
          const response = await fetch("/api/favorites")
          if (response.ok) {
            const { favorites: serverFavorites } = await response.json()
            
            // Конвертируем формат из БД в формат Anime
            const converted = serverFavorites.map((fav: any) => ({
              id: fav.anime_id,
              slug_url: fav.anime_slug,
              name: fav.anime_name,
              image_url: fav.anime_image,
            }))
            
            setFavorites(converted)
            // Сохраняем в localStorage для оффлайн доступа
            localStorage.setItem("favorites", JSON.stringify(converted))
            setSynced(true)
          }
        } catch (error) {
          console.error("Error loading favorites from server:", error)
          // Fallback на localStorage
          const stored = localStorage.getItem("favorites")
          if (stored) {
            setFavorites(JSON.parse(stored))
          }
        }
      } else {
        // Если не залогинен - используем localStorage
        const stored = localStorage.getItem("favorites")
        if (stored) {
          setFavorites(JSON.parse(stored))
        }
        setSynced(false)
      }

      setLoading(false)
    }

    loadFavorites()
  }, [session, status])

  // Синхронизация localStorage при изменении избранного (для незалогиненных)
  useEffect(() => {
    if (!loading && !session) {
      localStorage.setItem("favorites", JSON.stringify(favorites))
    }
  }, [favorites, loading, session])

  const isFavorite = useCallback(
    (slug: string) => {
      return favorites.some((fav) => fav.slug_url === slug)
    },
    [favorites]
  )

  const toggleFavorite = useCallback(
    async (anime: Anime) => {
      const isCurrentlyFavorite = isFavorite(anime.slug_url)

      // Оптимистичное обновление UI
      setFavorites((prev) => {
        if (isCurrentlyFavorite) {
          return prev.filter((fav) => fav.slug_url !== anime.slug_url)
        } else {
          return [...prev, anime]
        }
      })

      // Если пользователь залогинен - синхронизируем с сервером
      if (session?.user) {
        try {
          if (isCurrentlyFavorite) {
            // Удаляем
            await fetch(`/api/favorites?anime_slug=${anime.slug_url}`, {
              method: "DELETE",
            })
          } else {
            // Добавляем
            await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                anime_id: anime.id,
                anime_slug: anime.slug_url,
                anime_name: anime.rus_name || anime.name,
                anime_image: anime.image_url,
              }),
            })
          }
        } catch (error) {
          console.error("Error syncing favorite:", error)
          // Откатываем изменения при ошибке
          setFavorites((prev) => {
            if (isCurrentlyFavorite) {
              return [...prev, anime]
            } else {
              return prev.filter((fav) => fav.slug_url !== anime.slug_url)
            }
          })
        }
      } else {
        // Для незалогиненных - просто сохраняем в localStorage
        const newFavorites = isCurrentlyFavorite
          ? favorites.filter((fav) => fav.slug_url !== anime.slug_url)
          : [...favorites, anime]
        localStorage.setItem("favorites", JSON.stringify(newFavorites))
      }
    },
    [favorites, isFavorite, session]
  )

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider")
  }
  return context
}
