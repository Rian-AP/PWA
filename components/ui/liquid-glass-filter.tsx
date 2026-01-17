"use client"

import React, { useEffect, useRef, useState } from "react"

interface LiquidGlassProps {
  id?: string
  bezelWidth?: number
  scale?: number
  specularScale?: number
  specularConstant?: number
  specularExponent?: number
  lightX?: number
  lightY?: number
  lightZ?: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function LiquidGlass({
  id = "liquid-glass-filter",
  bezelWidth = 15,
  scale = 20,
  specularScale = 5,
  specularConstant = 1.2,
  specularExponent = 30,
  lightX = -5000,
  lightY = -10000,
  lightZ = 10000,
  children,
  className,
  style,
}: LiquidGlassProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dataUrl, setDataUrl] = useState<string>("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateMap = () => {
      const { width, height } = container.getBoundingClientRect()
      if (width === 0 || height === 0) return

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear
      ctx.clearRect(0, 0, width, height)

      // Base: Height=0 (Alpha=0), Normal=Neutral (R=128, G=128)
      // Actually, for the center "plateau", we want Height=1 (Alpha=255), Normal=Neutral.

      // We'll construct the height map and normal map together.
      // But canvas compositing makes it tricky to do both R/G gradients and Alpha gradients simultaneously in one pass if they overlap.
      // Strategy:
      // 1. Fill everything with "plateau" (R=128, G=128, A=255)
      // 2. "Cut" the edges by drawing the bezel gradients.

      // Fill center
      ctx.fillStyle = "rgba(128, 128, 0, 1.0)"
      ctx.fillRect(0, 0, width, height)

      // GlobalCompositeOperation 'source-over' is default.
      // We want to replace pixels at the edges.

      // We need to handle corners.
      // Let's iterate: Top, Bottom, Left, Right edges.
      // For corners, we can clip or use radial gradients.
      // Simple approach: Draw 4 linear gradients for sides, then 4 radial for corners.

      // Helper to draw
      const drawBezel = () => {
        // Left
        const gL = ctx.createLinearGradient(0, 0, bezelWidth, 0)
        gL.addColorStop(0, "rgba(255, 128, 0, 0.0)") // Edge: Max displacement (R=255), Height=0
        gL.addColorStop(1, "rgba(128, 128, 0, 1.0)") // Center: No displacement, Height=1
        ctx.fillStyle = gL
        ctx.fillRect(0, bezelWidth, bezelWidth, height - 2 * bezelWidth)

        // Right
        const gR = ctx.createLinearGradient(width - bezelWidth, 0, width, 0)
        gR.addColorStop(0, "rgba(128, 128, 0, 1.0)")
        gR.addColorStop(1, "rgba(0, 128, 0, 0.0)") // R=0
        ctx.fillStyle = gR
        ctx.fillRect(width - bezelWidth, bezelWidth, bezelWidth, height - 2 * bezelWidth)

        // Top
        const gT = ctx.createLinearGradient(0, 0, 0, bezelWidth)
        gT.addColorStop(0, "rgba(128, 255, 0, 0.0)") // G=255
        gT.addColorStop(1, "rgba(128, 128, 0, 1.0)")
        ctx.fillStyle = gT
        ctx.fillRect(bezelWidth, 0, width - 2 * bezelWidth, bezelWidth)

        // Bottom
        const gB = ctx.createLinearGradient(0, height - bezelWidth, 0, height)
        gB.addColorStop(0, "rgba(128, 128, 0, 1.0)")
        gB.addColorStop(1, "rgba(128, 0, 0, 0.0)") // G=0
        ctx.fillStyle = gB
        ctx.fillRect(bezelWidth, height - bezelWidth, width - 2 * bezelWidth, bezelWidth)

        // Corners - Radial
        // Top-Left
        // Center of gradient should be at (bezelWidth, bezelWidth)?
        // We want a radial gradient that goes from (bezelWidth, bezelWidth) outwards.
        // At radius 0: R=128, G=128, A=1.
        // At radius bezelWidth: Displacement vector points to center.
        // Vector at angle theta: (cos theta, sin theta).
        // It's hard to do accurate vector rotation with just a radial gradient (which interpolates colors).
        // However, a simple approximation is often enough.
        // Or we can just leave corners "square-ish" by overlapping linear gradients? Overlap creates mess.

        // Let's try to just use linear gradients for corners too, rotating the context?
        // Or just accept the linear overlap (simple bevel).
        // Let's try drawing the corners as simple squares with radial gradient for Height,
        // but for Normal/Displacement it's incorrect (it would just be gray if we don't calculate).

        // Better approximation for corners:
        // Just fill them with average or 45 degree gradient?

        // Top-Left Corner:
        // Gradient from (0,0) to (bezelWidth, bezelWidth) ?
        // Direction is diagonal.
        const gTL = ctx.createLinearGradient(0, 0, bezelWidth, bezelWidth)
        gTL.addColorStop(0, "rgba(255, 255, 0, 0.0)") // R=255, G=255 (Pull from bottom-right)
        gTL.addColorStop(1, "rgba(128, 128, 0, 1.0)")
        ctx.fillStyle = gTL
        ctx.fillRect(0, 0, bezelWidth, bezelWidth)

        // Top-Right
        const gTR = ctx.createLinearGradient(width, 0, width - bezelWidth, bezelWidth)
        gTR.addColorStop(0, "rgba(0, 255, 0, 0.0)") // R=0, G=255
        gTR.addColorStop(1, "rgba(128, 128, 0, 1.0)")
        ctx.fillStyle = gTR
        ctx.fillRect(width - bezelWidth, 0, bezelWidth, bezelWidth)

        // Bottom-Left
        const gBL = ctx.createLinearGradient(0, height, bezelWidth, height - bezelWidth)
        gBL.addColorStop(0, "rgba(255, 0, 0, 0.0)") // R=255, G=0
        gBL.addColorStop(1, "rgba(128, 128, 0, 1.0)")
        ctx.fillStyle = gBL
        ctx.fillRect(0, height - bezelWidth, bezelWidth, bezelWidth)

        // Bottom-Right
        const gBR = ctx.createLinearGradient(width, height, width - bezelWidth, height - bezelWidth)
        gBR.addColorStop(0, "rgba(0, 0, 0, 0.0)") // R=0, G=0
        gBR.addColorStop(1, "rgba(128, 128, 0, 1.0)")
        ctx.fillStyle = gBR
        ctx.fillRect(width - bezelWidth, height - bezelWidth, bezelWidth, bezelWidth)
      }

      drawBezel()

      setDataUrl(canvas.toDataURL())
      setReady(true)
    }

    const observer = new ResizeObserver(updateMap)
    observer.observe(container)
    // Initial call
    // Need to wait for mount?
    setTimeout(updateMap, 0)

    return () => observer.disconnect()
  }, [bezelWidth])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        backdropFilter: ready ? `url(#${id})` : undefined,
        // Fallback for Safari/Firefox if they don't support SVG filter in backdrop
        WebkitBackdropFilter: ready ? `url(#${id})` : "blur(10px)",
      }}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
             {/* Load the displacement/height map */}
             <feImage href={dataUrl} result="map" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />

             {/* Refraction: Displacement Map */}
             {/* Use R and G for displacement */}
             <feDisplacementMap
               in="SourceGraphic"
               in2="map"
               scale={scale}
               xChannelSelector="R"
               yChannelSelector="G"
               result="refracted"
             />

             {/* Specular Highlight */}
             {/* Use Alpha channel of map as height map */}
             <feSpecularLighting
               in="map"
               surfaceScale={specularScale}
               specularConstant={specularConstant}
               specularExponent={specularExponent}
               lightingColor="#ffffff"
               result="specular"
             >
                <fePointLight x={lightX} y={lightY} z={lightZ} />
             </feSpecularLighting>

             {/* Composite Specular over Refracted */}
             {/* Using 'screen' or 'add' logic. feComposite arithmetic k1=0 k2=1 k3=1 k4=0 => I1 + I2 */}
             <feComposite in="specular" in2="refracted" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="final" />
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  )
}
