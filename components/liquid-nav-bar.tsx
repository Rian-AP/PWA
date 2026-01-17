"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Heart, Download } from "lucide-react"
import { LiquidGlass } from "./ui/liquid-glass-filter"
import { UserMenu } from "./user-menu"
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion"

const ITEMS = [
  { path: "/", icon: Home, label: "Главная" },
  { path: "/favorites", icon: Heart, label: "Избранное" },
  { path: "/downloads", icon: Download, label: "Загрузки" },
]

export function LiquidNavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeIndex, setActiveIndex] = useState(0)

  // Motion Values
  const x = useMotionValue(0)
  const pressed = useMotionValue(0) // 0 to 1

  // Springs
  const springX = useSpring(x, { damping: 25, stiffness: 120 })
  const springPressed = useSpring(pressed, { damping: 20, stiffness: 300 })

  // Derived values
  const scale = useTransform(springPressed, [0, 1], [1, 1.15])
  const boxShadow = useTransform(springPressed, (v) => {
    // Interpolate between rest and pressed shadows
    // User snippet: "0 4px 22px rgba(0,0,0,0.1)" (rest)
    // Pressed: + insets
    // We'll create a smooth transition or just simple string interp if formats match.
    // Simpler: Just use logic inside style prop or use specific values.

    // Rest: Outer glow/shadow
    // Pressed: Stronger outer + Inset (concave feel?) or popped up?
    // User said "pop up glass".
    // Snippet had: "0 4px 22px ... inset ..."

    const isPressed = v > 0.5
    return isPressed
        ? "0 4px 20px rgba(255,255,255,0.2), inset 0 0 10px rgba(255,255,255,0.1)"
        : "0 4px 10px rgba(0,0,0,0.2), inset 0 0 0 rgba(0,0,0,0)"
  })

  // Track active rect for base position
  const [activeRect, setActiveRect] = useState<{width: number, height: number, left: number, top: number} | null>(null)

  // We need to track dragging state in JS for logic, not just motion value
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const idx = ITEMS.findIndex(item =>
      item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
    )
    if (idx !== -1) {
      setActiveIndex(idx)
    } else {
       setActiveIndex(3)
    }
  }, [pathname])

  const updateActiveRect = () => {
    if (!containerRef.current) return
    const nodes = containerRef.current.querySelectorAll('.nav-item')
    if (nodes[activeIndex]) {
      const rect = (nodes[activeIndex] as HTMLElement).getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      const left = rect.left - containerRect.left
      const center = left + rect.width / 2

      setActiveRect({
        width: rect.width,
        height: rect.height,
        left: left,
        top: rect.top - containerRect.top
      })

      if (!isDraggingRef.current) {
        x.set(center)
      }
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

    // Capture
    containerRef.current.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    pressed.set(1)

    const rect = containerRef.current.getBoundingClientRect()
    x.set(e.clientX - rect.left)

    containerRef.current.dataset.startX = e.clientX.toString()
    containerRef.current.dataset.startY = e.clientY.toString()
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    x.set(e.clientX - rect.left)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    isDraggingRef.current = false
    pressed.set(0)
    containerRef.current.releasePointerCapture(e.pointerId)

    const startX = parseFloat(containerRef.current.dataset.startX || "0")
    const startY = parseFloat(containerRef.current.dataset.startY || "0")
    const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2))

    // Click Handling
    if (dist < 5) {
      const targetElement = document.elementFromPoint(e.clientX, e.clientY)
      if (targetElement) {
        const btn = targetElement.closest('button')
        if (btn) {
            btn.click()
            return
        }
        const link = targetElement.closest('a')
        if (link) {
            link.click()
            return
        }
      }
    }

    // Drop / Snap Logic
    const rect = containerRef.current.getBoundingClientRect()
    const currentX = e.clientX - rect.left

    const nodes = containerRef.current.querySelectorAll('.nav-item')
    let closestIndex = activeIndex
    let minDist = Infinity

    nodes.forEach((node, idx) => {
      const nodeRect = (node as HTMLElement).getBoundingClientRect()
      const nodeCenterX = (nodeRect.left - rect.left) + nodeRect.width / 2
      const dist = Math.abs(currentX - nodeCenterX)
      if (dist < minDist) {
        minDist = dist
        closestIndex = idx
      }
    })

    if (closestIndex !== activeIndex) {
      if (closestIndex < ITEMS.length) {
        router.push(ITEMS[closestIndex].path)
      } else {
        setActiveIndex(closestIndex)
      }
    } else {
        if (activeRect) {
            const center = activeRect.left + activeRect.width / 2
            x.set(center)
        }
    }
  }

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

      <div
        className={`nav-item user-menu-container flex items-center justify-center min-w-[3rem] h-12 rounded-full z-0 ${activeIndex === 3 ? 'text-primary' : ''}`}
        role="tab"
        aria-selected={activeIndex === 3}
      >
        <div className="pointer-events-auto">
          <UserMenu />
        </div>
      </div>

      <motion.div
        className="absolute pointer-events-none z-10 rounded-full border border-white/20 bg-white/5"
        style={{
          width: glassSize,
          height: glassSize,
          top: "50%",
          y: "-50%",
          x: useTransform(springX, (val) => val - glassSize / 2),
          scale: scale,
          boxShadow: boxShadow,
          opacity: activeRect ? 1 : 0,
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
      </motion.div>
    </nav>
  )
}
