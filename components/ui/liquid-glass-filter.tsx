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
  blur?: number
  shape?: "rect" | "circle" | "pill"
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
  blur = 0,
  shape = "rect"
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

      if (shape === "circle" || shape === "pill") {
        // Pixel-by-pixel generation for Lens effect
        const imgData = ctx.createImageData(width, height)
        const data = imgData.data
        const cx = width / 2
        const cy = height / 2
        // Radius: for circle use min dim / 2. For pill, handle flat parts.
        // Simplifying to radial lens for now (stretched if pill)

        // For pill: we have a center rectangle and two semi-circles.
        // Distance function needs to handle this.
        // Simple approach: normalize coordinates to -1..1 range for "Squircle" or just simple radial stretch.

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Normalized coords -1 to 1
            const nx = (x - cx) / (width / 2)
            const ny = (y - cy) / (height / 2)

            // Distance from center
            let r = Math.sqrt(nx * nx + ny * ny)

            // If shape is circle/pill, we might want to cap r at 1.
            // Actually, for a pill (stadium), this radial stretch distorts the middle.
            // Better: use true distance to nearest edge?
            // "Lens" usually implies spherical cap.
            // Let's stick to simple spherical cap mapped to the bounding box.

            let h = 0
            let dx = 0
            let dy = 0

            if (r < 1.0) {
              // Height function: sqrt(1 - r^2)
              h = Math.sqrt(1 - r * r)

              // Normal vector (slope)
              // Slope is derivative. d/dr sqrt(1-r^2) = -r / sqrt(1-r^2)
              // Vector direction is (nx, ny).
              // So dx ~ nx * slope, dy ~ ny * slope.
              // To keep it simple and stable (avoid infinity at edge):
              // Just use (-nx, -ny) scaled.
              // Actually, normal x component is related to surface slope in x.
              // Surface z = sqrt(1 - x^2 - y^2) (scaled)
              // dz/dx = -x / z.
              // This goes to infinity at edge (z=0).
              // Let's use a softer profile or clamp.
              // Or just linear: h = 1 - r. dz/dx = -x/r.

              // Using spherical profile but clamping slope to stay in 8-bit range.
              // Let's map normal directly:
              // Surface normal vector N = (x, y, z).
              // We want to encode N.x and N.y.
              // For a hemisphere x^2 + y^2 + z^2 = 1.
              // Normal at (x, y) is just (x, y, z) itself (if center is 0,0,0).
              // So dx = nx, dy = ny.
              // Wait, if light comes from top, normal determines reflection.
              // Refraction depends on surface angle.
              // If we use (nx, ny) as displacement map:
              // At right edge (nx=1), displacement is max to the right?
              // Actually, if surface is convex, ray entering at right edge bends... where?
              // Snell's law: n1 sin(theta1) = n2 sin(theta2).
              // If entering glass (n=1.5), bends towards normal.
              // Normal at right edge points Right. Ray is vertical (Z). Angle is 90 deg?
              // Let's stick to the article's "Displacement Vector Field".
              // For convex, rays are bent towards center (focusing) or away?
              // Convex lens focuses light. Rays bend INWARD.
              // So at right edge (x>0), ray should shift Left (negative x).
              // So displacement X should be negative.
              // So if nx > 0, Red channel should be < 128.
              // So R = 128 - nx * 127.

              dx = -nx
              dy = -ny

              // Map to 0-255
              // R: 128 + dx * 127
              const R = 128 + dx * 127
              const G = 128 + dy * 127
              const B = 128 // Unused
              const A = h * 255 // Height for specular

              const idx = (y * width + x) * 4
              data[idx] = R
              data[idx + 1] = G
              data[idx + 2] = B
              data[idx + 3] = A
            } else {
              // Outside
              const idx = (y * width + x) * 4
              data[idx] = 128
              data[idx + 1] = 128
              data[idx + 2] = 0
              data[idx + 3] = 0
            }
          }
        }
        ctx.putImageData(imgData, 0, 0)

      } else {
        // RECT (Bezel) - original code
        ctx.fillStyle = "rgba(128, 128, 0, 1.0)"
        ctx.fillRect(0, 0, width, height)

        const drawBezel = () => {
          // Left
          const gL = ctx.createLinearGradient(0, 0, bezelWidth, 0)
          gL.addColorStop(0, "rgba(255, 128, 0, 0.0)")
          gL.addColorStop(1, "rgba(128, 128, 0, 1.0)")
          ctx.fillStyle = gL
          ctx.fillRect(0, bezelWidth, bezelWidth, height - 2 * bezelWidth)

          // Right
          const gR = ctx.createLinearGradient(width - bezelWidth, 0, width, 0)
          gR.addColorStop(0, "rgba(128, 128, 0, 1.0)")
          gR.addColorStop(1, "rgba(0, 128, 0, 0.0)")
          ctx.fillStyle = gR
          ctx.fillRect(width - bezelWidth, bezelWidth, bezelWidth, height - 2 * bezelWidth)

          // Top
          const gT = ctx.createLinearGradient(0, 0, 0, bezelWidth)
          gT.addColorStop(0, "rgba(128, 255, 0, 0.0)")
          gT.addColorStop(1, "rgba(128, 128, 0, 1.0)")
          ctx.fillStyle = gT
          ctx.fillRect(bezelWidth, 0, width - 2 * bezelWidth, bezelWidth)

          // Bottom
          const gB = ctx.createLinearGradient(0, height - bezelWidth, 0, height)
          gB.addColorStop(0, "rgba(128, 128, 0, 1.0)")
          gB.addColorStop(1, "rgba(128, 0, 0, 0.0)")
          ctx.fillStyle = gB
          ctx.fillRect(bezelWidth, height - bezelWidth, width - 2 * bezelWidth, bezelWidth)

          // Corners (Simplified linear)
          const gTL = ctx.createLinearGradient(0, 0, bezelWidth, bezelWidth)
          gTL.addColorStop(0, "rgba(255, 255, 0, 0.0)")
          gTL.addColorStop(1, "rgba(128, 128, 0, 1.0)")
          ctx.fillStyle = gTL
          ctx.fillRect(0, 0, bezelWidth, bezelWidth)

          const gTR = ctx.createLinearGradient(width, 0, width - bezelWidth, bezelWidth)
          gTR.addColorStop(0, "rgba(0, 255, 0, 0.0)")
          gTR.addColorStop(1, "rgba(128, 128, 0, 1.0)")
          ctx.fillStyle = gTR
          ctx.fillRect(width - bezelWidth, 0, bezelWidth, bezelWidth)

          const gBL = ctx.createLinearGradient(0, height, bezelWidth, height - bezelWidth)
          gBL.addColorStop(0, "rgba(255, 0, 0, 0.0)")
          gBL.addColorStop(1, "rgba(128, 128, 0, 1.0)")
          ctx.fillStyle = gBL
          ctx.fillRect(0, height - bezelWidth, bezelWidth, bezelWidth)

          const gBR = ctx.createLinearGradient(width, height, width - bezelWidth, height - bezelWidth)
          gBR.addColorStop(0, "rgba(0, 0, 0, 0.0)")
          gBR.addColorStop(1, "rgba(128, 128, 0, 1.0)")
          ctx.fillStyle = gBR
          ctx.fillRect(width - bezelWidth, height - bezelWidth, bezelWidth, bezelWidth)
        }
        drawBezel()
      }

      setDataUrl(canvas.toDataURL())
      setReady(true)
    }

    const observer = new ResizeObserver(updateMap)
    observer.observe(container)
    setTimeout(updateMap, 0)

    return () => observer.disconnect()
  }, [bezelWidth, shape])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...style,
        backdropFilter: ready ? `url(#${id}) ${blur > 0 ? `blur(${blur}px)` : ''}` : undefined,
        WebkitBackdropFilter: ready ? `url(#${id}) ${blur > 0 ? `blur(${blur}px)` : ''}` : `blur(${blur > 0 ? blur : 10}px)`,
      }}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
             <feImage href={dataUrl} result="map" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />
             <feDisplacementMap
               in="SourceGraphic"
               in2="map"
               scale={scale}
               xChannelSelector="R"
               yChannelSelector="G"
               result="refracted"
             />
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
             <feComposite in="specular" in2="refracted" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="final" />
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  )
}
