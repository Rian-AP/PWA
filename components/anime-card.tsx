"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import type { Anime } from "@/lib/api"
import { Heart } from "lucide-react"
import { useFavorites } from "@/contexts/favorites-context"

export function AnimeCard({ anime }: { anime: Anime }) {
  const { isFavorite, toggleFavorite } = useFavorites()

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(anime)
  }

  return (
    <Link href={`/anime/${anime.slug_url}`} className="block group">
      <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-muted-foreground/50 transition-colors h-full flex flex-col">
        {/* Постер */}
        <div className="relative w-full aspect-[5/7] bg-secondary flex-shrink-0">
          <Image
            src={anime.image_url || "/placeholder.svg?height=280&width=200&query=anime-poster"}
            alt={anime.rus_name || anime.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover"
          />
          
          {/* Кнопка избранного */}
          <button
            onClick={handleToggle}
            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
          >
            <Heart size={16} className={isFavorite(anime.slug_url) ? "fill-red-500 text-red-500" : "text-white"} />
          </button>
        </div>

        {/* Информация */}
        <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
          <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {anime.rus_name || anime.name}
          </h3>
          {anime.rating && typeof anime.rating === "number" && (
            <div className="text-xs text-muted-foreground">⭐ {anime.rating.toFixed(1)}</div>
          )}
        </div>
      </div>
    </Link>
  )
}
