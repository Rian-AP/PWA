"use client"

import type { Anime } from "@/lib/api"
import { AnimeCard } from "./anime-card"

export function AnimeGrid({ animes, loading }: { animes: Anime[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-[5/7] bg-secondary rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!animes.length) {
    return (
      <div className="col-span-full flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Ничего не найдено</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {animes.map((anime) => (
        <AnimeCard key={anime.slug_url} anime={anime} />
      ))}
    </div>
  )
}
