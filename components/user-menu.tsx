"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogIn, LogOut, User } from "lucide-react"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
    )
  }

  if (!session) {
    return (
      <Button
        onClick={() => signIn("google")}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <LogIn size={16} />
        Войти
      </Button>
    )
  }

  const userInitials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || "User"} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground">{session.user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut size={16} className="mr-2" />
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
