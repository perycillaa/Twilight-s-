<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useTwilightStorage } from '~/composables/useTwilightStorage'

// Pantau pemicu selebrasi 100% & pengaturan kualitas grafik (DPR, FPS & jumlah partikel)
const { celebrationCount, graphicsConfig } = useTwilightStorage()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isAnimating = ref(false)
let rafId: number | null = null

interface ConfettiPiece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  vRot: number
  color: string
  shape: 'star' | 'heart' | 'circle'
  opacity: number
}

const PASTEL_COLORS = ['#f9a8d4', '#fbcfe8', '#c4b5fd', '#fde68a', '#7dd3fc', '#fda4af']

/** Menggambar bentuk bintang 5 sisi di canvas */
function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    const innerAngle = outerAngle + Math.PI / 5
    if (i === 0) {
      ctx.moveTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r)
    } else {
      ctx.lineTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r)
    }
    ctx.lineTo(Math.cos(innerAngle) * (r * 0.48), Math.sin(innerAngle) * (r * 0.48))
  }
  ctx.closePath()
  ctx.fill()
}

/** Menggambar bentuk hati kawaii di canvas */
function drawHeart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.35)
  ctx.bezierCurveTo(-s, -s * 0.35, -s * 0.55, -s * 1.05, 0, -s * 0.45)
  ctx.bezierCurveTo(s * 0.55, -s * 1.05, s, -s * 0.35, 0, s * 0.35)
  ctx.closePath()
  ctx.fill()
}

/** Jalankan hujan confetti bintang dan hati pastel di seluruh layar */
function launchConfetti() {
  if (!import.meta.client) return
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rawDpr = window.devicePixelRatio || 1
  const cappedDpr = Math.max(1, Math.min(rawDpr, graphicsConfig.value.maxDpr))
  const logicalW = window.innerWidth
  const logicalH = window.innerHeight
  canvas.width = Math.round(logicalW * cappedDpr)
  canvas.height = Math.round(logicalH * cappedDpr)
  ctx.setTransform(cappedDpr, 0, 0, cappedDpr, 0, 0)
  isAnimating.value = true

  if (rafId) cancelAnimationFrame(rafId)

  // Jumlah partikel mengikuti kualitas grafik (Ringan: 28, Sedang: 45, Tinggi: 90)
  const pieceCount =
    graphicsConfig.value.particleScale <= 0
      ? 28
      : Math.max(30, Math.round(90 * graphicsConfig.value.particleScale))

  const pieces: ConfettiPiece[] = Array.from({ length: pieceCount }, () => ({
    x: Math.random() * logicalW,
    y: -20 - Math.random() * 240,
    vx: (Math.random() - 0.5) * 3.2,
    vy: 2.2 + Math.random() * 3.4,
    size: 7 + Math.random() * 7,
    rotation: Math.random() * Math.PI * 2,
    vRot: (Math.random() - 0.5) * 0.12,
    color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)] ?? '#f9a8d4',
    shape: Math.random() < 0.45 ? 'star' : Math.random() < 0.85 ? 'heart' : 'circle',
    opacity: 1,
  }))

  const startTime = performance.now()
  let lastRenderAt = 0
  const durationMs = 4600
  const minFrameMs = 1000 / Math.max(24, graphicsConfig.value.targetFps)

  const renderFrame = (now: number) => {
    const elapsed = now - startTime
    if (lastRenderAt > 0 && now - lastRenderAt < minFrameMs * 0.9 && elapsed < durationMs) {
      rafId = requestAnimationFrame(renderFrame)
      return
    }
    const stepScale = lastRenderAt > 0 ? Math.min(2.4, (now - lastRenderAt) / 16.67) : 1
    lastRenderAt = now

    ctx.clearRect(0, 0, logicalW, logicalH)

    let activeCount = 0

    for (const p of pieces) {
      p.x += (p.vx + Math.sin(elapsed * 0.004 + p.rotation) * 0.6) * stepScale
      p.y += p.vy * stepScale
      p.vy += 0.035 * stepScale // Gravitasi halus
      p.rotation += p.vRot * stepScale

      if (elapsed > durationMs * 0.65) {
        p.opacity = Math.max(0, 1 - (elapsed - durationMs * 0.65) / (durationMs * 0.35))
      }

      if (p.y < logicalH + 30 && p.opacity > 0.02) {
        activeCount += 1
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color

        if (p.shape === 'star') {
          drawStar(ctx, p.size)
        } else if (p.shape === 'heart') {
          drawHeart(ctx, p.size)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
    }

    if (activeCount > 0 && elapsed < durationMs) {
      rafId = requestAnimationFrame(renderFrame)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      isAnimating.value = false
      rafId = null
    }
  }

  rafId = requestAnimationFrame(renderFrame)
}

// Picu confetti setiap kali seluruh target hari ini mencapai 100%
watch(celebrationCount, (count) => {
  if (count > 0) {
    launchConfetti()
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <!-- Canvas layar penuh untuk hujan confetti bintang & hati pastel (tidak menghalangi klik) -->
  <canvas
    ref="canvasRef"
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-50 h-full w-full"
    :class="isAnimating ? 'opacity-100' : 'opacity-0'"
  />
</template>
