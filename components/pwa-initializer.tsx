"use client"

import { useServiceWorker } from "@/hooks/use-service-worker"

export function PWAInitializer() {
  useServiceWorker()
  return null
}
