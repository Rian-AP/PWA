"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { searchAnime, type Anime } from "@/lib/api"
import Link from "next/link"
import Image from "next/image"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
    }
  }, [isOpen])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        setLoading(true)
        searchAnime(query.trim(), 12)
          .then(setResults)
          .finally(() => setLoading(false))
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50">
        <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Поиск аниме..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded-md transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="p-8 text-center text-muted-foreground">
                Поиск...
              </div>
            )}

            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Ничего не найдено
              </div>
            )}

            {!loading && query.trim().length < 2 && (
              <div className="p-8 text-center text-muted-foreground">
                Введите минимум 2 символа для поиска
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="p-2">
                {results.map((anime) => (
                  <Link
                    key={anime.slug_url}
                    href={`/anime/${anime.slug_url}`}
                    onClick={onClose}
                    className="flex gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-secondary">
                      <Image
                        src={
                          anime.thumbnail_url || 
                          anime.image_url || 
                          "/placeholder.svg"
                        }
                        alt={anime.rus_name || anime.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground line-clamp-1">
                        {anime.rus_name || anime.name}
                      </h3>
                      {anime.eng_name && anime.eng_name !== anime.name && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {anime.eng_name}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {anime.rating && <span>⭐ {anime.rating.toFixed(1)}</span>}
                        {anime.year && <span>{anime.year}</span>}
                        {anime.type && <span>{anime.type}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
