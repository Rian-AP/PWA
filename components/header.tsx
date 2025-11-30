"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tv, Search, Heart, Home, Download } from "lucide-react"
import { useState } from "react"
import { SearchModal } from "./search-modal"
import { UserMenu } from "./user-menu"

export function Header() {
  const pathname = usePathname()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/")

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4 px-4 py-3 md:px-6 max-w-7xl mx-auto">
        {/* Лого */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary flex-shrink-0">
          <Tv size={24} />
          <span className="hidden sm:inline">AnimeLib</span>
        </Link>

        {/* Поиск */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex-1 max-w-2xl"
        >
          <div className="relative w-full h-10 flex items-center px-4 rounded-full border border-border bg-card hover:border-muted-foreground/50 transition-colors cursor-pointer">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <span className="text-sm text-muted-foreground">Поиск аниме...</span>
          </div>
        </button>

        {/* Search Modal */}
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {/* Навигация */}
        <nav className="flex items-center gap-1 md:gap-4 flex-shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-1 p-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/") && pathname !== "/search" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Home size={20} />
            <span className="hidden lg:inline">Главная</span>
          </Link>

          <Link
            href="/favorites"
            className={`flex items-center gap-1 p-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/favorites") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Heart size={20} />
            <span className="hidden lg:inline">Избранное</span>
          </Link>

          <Link
            href="/downloads"
            className={`flex items-center gap-1 p-2 rounded-lg text-sm font-medium transition-colors ${
              isActive("/downloads") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Download size={20} />
            <span className="hidden lg:inline">Загрузки</span>
          </Link>

          {/* User Menu */}
          <UserMenu />
        </nav>
      </div>
    </header>
  )
}
