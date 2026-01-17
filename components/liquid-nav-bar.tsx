"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Heart, Download } from "lucide-react"
import { LiquidGlass } from "./ui/liquid-glass-filter"
import { UserMenu } from "./user-menu"

const ITEMS = [
  { path: "/", icon: Home, label: "Главная" },
  { path: "/favorites", icon: Heart, label: "Избранное" },
  { path: "/downloads", icon: Download, label: "Загрузки" },
]

export function LiquidNavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [activeRect, setActiveRect] = useState<{width: number, height: number, left: number, top: number} | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Find active index
  useEffect(() => {
    const idx = ITEMS.findIndex(item =>
      item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
    )
    if (idx !== -1) {
      setActiveIndex(idx)
    } else {
       // If undefined path (like /profile?), set to last item (UserMenu slot)
       setActiveIndex(3)
    }
  }, [pathname])

  const updateActiveRect = () => {
    if (!containerRef.current) return
    const nodes = containerRef.current.querySelectorAll('.nav-item')
    if (nodes[activeIndex]) {
      const rect = (nodes[activeIndex] as HTMLElement).getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      setActiveRect({
        width: rect.width,
        height: rect.height,
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top
      })
    }
  }

  useEffect(() => {
    updateActiveRect()
    const t = setTimeout(updateActiveRect, 100)
    window.addEventListener('resize', updateActiveRect)
    return () => {
      window.removeEventListener('resize', updateActiveRect)
      clearTimeout(t)
    }
  }, [activeIndex])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return

    // Check if the target is interactive (button, link)
    // We want to allow clicking items directly.
    // If the user clicks a button, let the button handle it.
    // UNLESS they start dragging?
    // Browsers handle this by: if you move enough, it's a drag/scroll.
    // But we are implementing custom drag.

    // Strategy:
    // 1. If target is inside UserMenu (which we can identify by class or structure), do not capture pointer immediately?
    // UserMenu renders a button.
    const target = e.target as HTMLElement
    const isUserMenu = target.closest('.user-menu-container')

    if (isUserMenu) {
      // If clicking user menu, don't capture pointer. Let click pass.
      // But what if they want to drag FROM the user menu?
      // The requirement "drag pop up glass" implies dragging the glass.
      // If the glass is over the user menu, and I drag the glass...
      // The glass has pointer-events: none.
      // So I am clicking the user menu button.
      // If I want to drag, I need to capture.

      // Let's compromise:
      // If dragging starts, we cancel the click?
      // Or: We capture pointer ONLY if clicking "empty space" or if we detect movement?
      // Detecting movement requires global listeners if not captured.

      // Simpler: Just rely on clicking items to navigate, and only enable drag if pressing on the "bar" background?
      // But user said "integrate into buttons... drag it".

      // Solution:
      // Capture pointer.
      // Track start position.
      // In pointerUp:
      //   If distance < threshold (e.g. 5px), treat as CLICK.
      //   If click: manually trigger the action of the item under cursor?
      //   For UserMenu, we can find the button and `.click()` it?
      // This emulates native behavior while keeping control.
    }

    setIsDragging(true)
    containerRef.current.setPointerCapture(e.pointerId)

    const rect = containerRef.current.getBoundingClientRect()
    setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })

    // Store initial pos for click detection
    containerRef.current.dataset.startX = e.clientX.toString()
    containerRef.current.dataset.startY = e.clientY.toString()
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setDragPos({ x, y })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return
    setIsDragging(false)
    containerRef.current.releasePointerCapture(e.pointerId)

    const startX = parseFloat(containerRef.current.dataset.startX || "0")
    const startY = parseFloat(containerRef.current.dataset.startY || "0")
    const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2))

    // If it was a click (short distance)
    if (dist < 5) {
      // It's a click.
      // We need to trigger the underlying element if we prevented default?
      // Pointer capture swallows mouse events for children?
      // "implicit pointer capture" implies target receives events.
      // "setPointerCapture" redirects all events to container.
      // So the child button will NOT receive 'click'.

      // We must manually trigger the action.
      // Find what was under the pointer?
      // Or just look at what index we are at?

      // Hit testing
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const nodes = containerRef.current.querySelectorAll('.nav-item')

      // Find closest item is good, but for click we want exact hit.
      // Or we can rely on `e.target` from `pointerDown`? No, we need where we released.
      // `document.elementFromPoint`?

      // Let's use the closest logic which we already have.
      // But for UserMenu, we need to click the actual trigger button to open the menu.
      // Because UserMenu state is internal (Radix UI).

      const targetElement = document.elementFromPoint(e.clientX, e.clientY)
      if (targetElement) {
        // If it's inside a button, click it.
        const btn = targetElement.closest('button')
        if (btn) {
            btn.click()
            return // Don't do router push logic if we clicked a button
        }
        // If it's inside a link (the other items), click it.
        const link = targetElement.closest('a')
        if (link) {
            link.click()
            return
        }
      }
      // If we clicked background, do nothing or closest?
      // Fallback to closest logic below.
    }

    // Drag Logic (Drop)
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left

    const nodes = containerRef.current.querySelectorAll('.nav-item')
    let closestIndex = activeIndex
    let minDist = Infinity

    nodes.forEach((node, idx) => {
      const nodeRect = (node as HTMLElement).getBoundingClientRect()
      const nodeCenterX = (nodeRect.left - rect.left) + nodeRect.width / 2
      const dist = Math.abs(x - nodeCenterX)
      if (dist < minDist) {
        minDist = dist
        closestIndex = idx
      }
    })

    if (closestIndex !== activeIndex) {
      if (closestIndex < ITEMS.length) {
        router.push(ITEMS[closestIndex].path)
      } else {
        // UserMenu slot.
        // If dragged here, what happens?
        // Just move the glass cursor.
        setActiveIndex(closestIndex)
        // Optionally open menu? No, that's annoying.
      }
    }
  }

  const glassX = isDragging ? dragPos.x : (activeRect ? activeRect.left + activeRect.width / 2 : 0)
  const glassY = isDragging ? dragPos.y : (activeRect ? activeRect.top + activeRect.height / 2 : 0)
  const glassSize = 60

  return (
    <nav
      ref={containerRef}
      className="relative flex items-center justify-between bg-black/5 dark:bg-white/5 backdrop-blur-sm rounded-full p-2 gap-2 touch-none select-none border border-white/10 shadow-inner"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="tablist"
      aria-label="Main Navigation"
    >
      {/* Semantic Links */}
      {ITEMS.map((item, idx) => {
        const isActive = idx === activeIndex
        return (
          <Link
            key={item.path}
            href={item.path}
            role="tab"
            aria-selected={isActive}
            className={`nav-item flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 z-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            draggable={false}
          >
            <item.icon size={24} />
            <span className="sr-only">{item.label}</span>
          </Link>
        )
      })}

      {/* User Menu Slot */}
      <div
        className={`nav-item user-menu-container flex items-center justify-center min-w-[3rem] h-12 rounded-full z-0 ${activeIndex === 3 ? 'text-primary' : ''}`}
        role="tab"
        aria-selected={activeIndex === 3}
      >
        <div className="pointer-events-auto">
          <UserMenu />
        </div>
      </div>

      {/* Liquid Glass Cursor */}
      <div
        className="absolute pointer-events-none transition-all duration-75 ease-out z-10 rounded-full border border-white/20 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
        style={{
          left: glassX - glassSize / 2,
          top: glassY - glassSize / 2,
          width: glassSize,
          height: glassSize,
          opacity: activeRect ? 1 : 0,
          transform: isDragging ? 'scale(1.15)' : 'scale(1)',
        }}
        aria-hidden="true"
      >
        <LiquidGlass
          id="cursor-glass"
          shape="circle"
          scale={20}
          specularScale={20}
          specularConstant={1.8}
          className="w-full h-full rounded-full"
          blur={2}
        />
      </div>
    </nav>
  )
}
