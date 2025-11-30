"use client"

import { Header } from "@/components/header"
import { AnimeGrid } from "@/components/anime-grid"
import { useFavorites } from "@/contexts/favorites-context"

export default function FavoritesPage() {
  const { favorites } = useFavorites()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 md:px-6 max-w-7xl mx-auto py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Избранное</h1>

        {favorites.length > 0 ? (
          <AnimeGrid animes={favorites} />
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">У вас нет избранного аниме</p>
              <p className="text-muted-foreground text-sm mt-2">
                Добавьте аниме в избранное, чтобы оно появилось здесь
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
