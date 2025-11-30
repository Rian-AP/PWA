"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { AnimeGrid } from "@/components/anime-grid"
import { searchAnime } from "@/lib/api"
import { Search } from "lucide-react"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    const data = await searchAnime(query, 40)
    setResults(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 md:px-6 max-w-7xl mx-auto py-12">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-6">Поиск аниме</h1>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Введите название аниме..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Поиск
            </button>
          </form>
        </div>

        {searched && <AnimeGrid animes={results} loading={loading} />}

        {!searched && (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground text-lg">Введите название для поиска</p>
          </div>
        )}
      </main>
    </div>
  )
}
