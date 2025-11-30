"use client"
import useSWR from "swr"
import { Header } from "@/components/header"
import { AnimeGrid } from "@/components/anime-grid"
import { getPopularAnime } from "@/lib/api"

const fetcher = (fn: () => Promise<any>) => fn()

export default function Home() {
  const { data: popular = [], isLoading: popularLoading } = useSWR("popular", () => getPopularAnime(20))

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="flex-1">
        <div className="w-full bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="px-4 md:px-6 max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Добро пожаловать в AnimeLib</h1>
            <p className="text-muted-foreground text-lg md:text-xl">
              Просмотрите популярное аниме и откройте для себя новые серии
            </p>
          </div>
        </div>

        <div className="px-4 md:px-6 max-w-7xl mx-auto py-12">
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Популярное</h2>
            <AnimeGrid animes={popular} loading={popularLoading} />
          </section>
        </div>
      </main>
    </div>
  )
}
