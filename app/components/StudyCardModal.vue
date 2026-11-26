<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  CAT_AFFINITY_MAX_LEVEL,
  COZY_THEMES,
  type CozyThemeId,
  type MascotAccessoryId,
  type ThemeName,
  getLocalTodayDate,
  useTwilightStorage,
} from '~/composables/useTwilightStorage'

const {
  theme,
  isDarkTheme,
  activeCozyTheme,
  userName,
  habits,
  todayFocusSessions,
  todayFocusSeconds,
  dailyStreak,
  catAffinityLevel,
  equippedAccessory,
  isStudyCardModalOpen,
} = useTwilightStorage()

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

const previewDataUrl = ref<string>('')
const isRendering = ref<boolean>(false)

const completedHabitsToday = computed(() =>
  habits.value.filter(h => h.completed).slice(0, 5),
)

const formattedFocusTime = computed<string>(() => {
  const sec = Math.max(0, todayFocusSeconds.value)
  const totalMins = Math.round(sec / 60)
  if (totalMins <= 0) return '0 menit'
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours > 0 && mins > 0) return `${hours}j ${mins}m`
  if (hours > 0) return `${hours} jam`
  return `${mins} menit`
})

const formattedDateLong = computed<string>(() => {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
  } catch {
    return getLocalTodayDate()
  }
})

const activeThemeName = computed<string>(() => {
  if (activeCozyTheme.value !== 'classic') {
    const found = COZY_THEMES.find(t => t.id === activeCozyTheme.value)
    return found ? `${found.icon} ${found.name}` : 'Twilight Klasik'
  }
  if (theme.value === 'sakura') {
    return isDarkTheme.value ? '🌙 Dark Velvet Berry' : '🍓 Pastel Berry'
  }
  if (theme.value === 'ocean') {
    return isDarkTheme.value ? '🌙 Midnight Abyss' : '🌊 Ocean Night'
  }
  return isDarkTheme.value ? '🌙 Deep Plum Twilight' : '💜 Twilight Klasik'
})

interface CardThemePalette {
  bgStops: [string, string, string]
  accent: string
  accentSoft: string
  cardFill: string
  cardStroke: string
  titleColor: string
  subColor: string
}

function getCardPalette(cozy: CozyThemeId, base: ThemeName): CardThemePalette {
  if (cozy === 'midnight-rain') {
    return {
      bgStops: ['#070b22', '#10183d', '#1a224d'],
      accent: '#93c5fd',
      accentSoft: '#fde68a',
      cardFill: 'rgba(255, 255, 255, 0.09)',
      cardStroke: 'rgba(147, 197, 253, 0.35)',
      titleColor: '#e0f2fe',
      subColor: '#bfdbfe',
    }
  }
  if (cozy === 'autumn-cafe') {
    return {
      bgStops: ['#28150d', '#4a2617', '#7c3d1e'],
      accent: '#fbbf24',
      accentSoft: '#fdba74',
      cardFill: 'rgba(255, 247, 237, 0.1)',
      cardStroke: 'rgba(253, 186, 116, 0.38)',
      titleColor: '#fef3c7',
      subColor: '#fed7aa',
    }
  }
  if (cozy === 'sakura-lantern') {
    return {
      bgStops: ['#240e38', '#4b174d', '#7a2356'],
      accent: '#f9a8d4',
      accentSoft: '#fde68a',
      cardFill: 'rgba(255, 241, 248, 0.11)',
      cardStroke: 'rgba(249, 168, 212, 0.42)',
      titleColor: '#fce7f3',
      subColor: '#fbcfe8',
    }
  }
  if (cozy === 'matcha-garden') {
    return {
      bgStops: isDarkTheme.value
        ? ['#0d1712', '#111e18', '#15241d']
        : ['#16261e', '#1d3228', '#253d31'],
      accent: '#4ade80',
      accentSoft: '#bbf7d0',
      cardFill: isDarkTheme.value ? 'rgba(15, 29, 22, 0.92)' : 'rgba(28, 48, 38, 0.88)',
      cardStroke: 'rgba(167, 243, 208, 0.34)',
      titleColor: '#bbf7d0',
      subColor: '#a7f3d0',
    }
  }
  if (cozy === 'biolum-ocean') {
    return {
      bgStops: isDarkTheme.value
        ? ['#01090d', '#03171f', '#062630']
        : ['#020f14', '#062833', '#0a3d4c'],
      accent: '#2dd4bf',
      accentSoft: '#38bdf8',
      cardFill: 'rgba(4, 29, 38, 0.86)',
      cardStroke: 'rgba(45, 212, 191, 0.36)',
      titleColor: '#5eead4',
      subColor: '#99f6e4',
    }
  }
  if (cozy === 'honey-library') {
    return {
      bgStops: ['#241710', '#311f14', '#3d2618'],
      accent: '#fbbf24',
      accentSoft: '#fde68a',
      cardFill: 'rgba(255, 251, 235, 0.09)',
      cardStroke: 'rgba(251, 191, 36, 0.4)',
      titleColor: '#fef3c7',
      subColor: '#fde68a',
    }
  }
  if (cozy === 'pastel-cloudland') {
    return {
      bgStops: ['#27294a', '#35345c', '#433e6e'],
      accent: '#f9a8d4',
      accentSoft: '#c4b5fd',
      cardFill: 'rgba(255, 255, 255, 0.1)',
      cardStroke: 'rgba(249, 168, 212, 0.42)',
      titleColor: '#fdf2f8',
      subColor: '#e9d5ff',
    }
  }
  if (cozy === 'winter-frost') {
    return {
      bgStops: ['#152536', '#1d334a', '#26415e'],
      accent: '#bae6fd',
      accentSoft: '#e0f2fe',
      cardFill: 'rgba(240, 249, 255, 0.1)',
      cardStroke: 'rgba(186, 230, 253, 0.42)',
      titleColor: '#f0f9ff',
      subColor: '#bae6fd',
    }
  }
  if (cozy === 'neon-night-city') {
    return {
      bgStops: ['#090514', '#110824', '#170b2e'],
      accent: '#00f5d4',
      accentSoft: '#ff2a85',
      cardFill: 'rgba(15, 8, 32, 0.72)',
      cardStroke: 'rgba(0, 245, 212, 0.55)',
      titleColor: '#00f5d4',
      subColor: '#ff77b7',
    }
  }
  if (cozy === 'astral-palace') {
    return {
      bgStops: ['#04071a', '#0b1336', '#1b1042'],
      accent: '#fde047',
      accentSoft: '#6ee7b7',
      cardFill: 'rgba(255, 255, 255, 0.09)',
      cardStroke: 'rgba(253, 224, 71, 0.48)',
      titleColor: '#fef9c3',
      subColor: '#a7f3d0',
    }
  }
  if (base === 'sakura') {
    return {
      bgStops: isDarkTheme.value
        ? ['#1a0d16', '#22101c', '#2b1422']
        : ['#5a2248', '#8f3d67', '#c26d75'],
      accent: '#fda4af',
      accentSoft: '#fed7aa',
      cardFill: isDarkTheme.value ? 'rgba(36, 18, 29, 0.85)' : 'rgba(255, 255, 255, 0.11)',
      cardStroke: 'rgba(253, 164, 175, 0.4)',
      titleColor: '#ffe4e6',
      subColor: '#fecdd3',
    }
  }
  if (base === 'ocean') {
    return {
      bgStops: isDarkTheme.value
        ? ['#09111e', '#0d1729', '#101e33']
        : ['#13243a', '#182f4d', '#1e3a5f'],
      accent: '#7dd3fc',
      accentSoft: '#38bdf8',
      cardFill: isDarkTheme.value ? 'rgba(15, 28, 48, 0.88)' : 'rgba(255, 255, 255, 0.1)',
      cardStroke: 'rgba(125, 211, 252, 0.35)',
      titleColor: '#7dd3fc',
      subColor: '#bae6fd',
    }
  }
  return {
    bgStops: isDarkTheme.value
      ? ['#120b1e', '#170e27', '#1d1230']
      : ['#1e1b4b', '#261647', '#311042'],
    accent: '#f9a8d4',
    accentSoft: '#c4b5fd',
    cardFill: isDarkTheme.value ? 'rgba(26, 17, 43, 0.85)' : 'rgba(255, 255, 255, 0.1)',
    cardStroke: 'rgba(249, 168, 212, 0.36)',
    titleColor: '#fbcfe8',
    subColor: '#e9d5ff',
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawFourPointStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  fill: string,
  alpha = 0.9,
) {
  const innerR = outerR * 0.32
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (Math.PI / 4) * i - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawThemeDecorations(
  ctx: CanvasRenderingContext2D,
  cozy: CozyThemeId,
  palette: CardThemePalette,
) {
  // Bintang kecil berkedip di seluruh latar
  for (let i = 0; i < 42; i++) {
    const sx = ((i * 197 + 63) % (CARD_WIDTH - 80)) + 40
    const sy = ((i * 269 + 45) % (CARD_HEIGHT - 120)) + 40
    const sr = (i % 3) + 1.4
    ctx.save()
    ctx.globalAlpha = cozy === 'autumn-cafe' ? 0.32 : 0.65
    ctx.fillStyle = i % 4 === 0 ? palette.accent : '#ffffff'
    ctx.beginPath()
    ctx.arc(sx, sy, sr, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Bintang 4-sisi besar dekoratif
  drawFourPointStar(ctx, 130, 150, 18, palette.accent, 0.85)
  drawFourPointStar(ctx, 940, 210, 22, palette.accentSoft, 0.9)
  drawFourPointStar(ctx, 110, 560, 14, '#ffffff', 0.7)
  drawFourPointStar(ctx, 965, 620, 16, palette.accent, 0.8)
  drawFourPointStar(ctx, 155, 1210, 16, palette.accentSoft, 0.75)
  drawFourPointStar(ctx, 920, 1225, 18, palette.accent, 0.8)

  if (cozy === 'astral-palace') {
    // Gelombang Aurora Borealis
    const aurora1 = ctx.createLinearGradient(0, 60, CARD_WIDTH, 420)
    aurora1.addColorStop(0, 'rgba(52, 211, 153, 0.25)')
    aurora1.addColorStop(0.5, 'rgba(34, 211, 238, 0.22)')
    aurora1.addColorStop(1, 'rgba(192, 132, 252, 0.26)')
    ctx.save()
    ctx.fillStyle = aurora1
    ctx.beginPath()
    ctx.moveTo(0, 180)
    ctx.bezierCurveTo(280, 40, 680, 320, CARD_WIDTH, 140)
    ctx.lineTo(CARD_WIDTH, 340)
    ctx.bezierCurveTo(720, 470, 320, 220, 0, 360)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Bulan sabit perak di pojok kanan atas
    ctx.save()
    ctx.fillStyle = '#f1f5f9'
    ctx.shadowColor = 'rgba(226, 232, 240, 0.8)'
    ctx.shadowBlur = 32
    ctx.beginPath()
    ctx.arc(930, 130, 44, 0.35, Math.PI * 1.65)
    ctx.arc(950, 122, 36, Math.PI * 1.55, 0.45, true)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Bintang jatuh emas
    ctx.save()
    const tail = ctx.createLinearGradient(760, 280, 960, 180)
    tail.addColorStop(0, '#fef08a')
    tail.addColorStop(1, 'rgba(254, 240, 138, 0)')
    ctx.strokeStyle = tail
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(760, 280)
    ctx.lineTo(960, 180)
    ctx.stroke()
    drawFourPointStar(ctx, 760, 280, 12, '#fef08a', 0.95)
    ctx.restore()
  } else if (cozy === 'midnight-rain') {
    // Rintik hujan miring halus
    ctx.save()
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    for (let i = 0; i < 36; i++) {
      const rx = ((i * 97) % (CARD_WIDTH + 100)) - 20
      const ry = (i * 173) % CARD_HEIGHT
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx - 14, ry + 54)
      ctx.stroke()
    }
    ctx.restore()

    // Lampu kota bokeh blur emas & biru
    const bokehSpots = [
      { x: 110, y: 1190, r: 62, c: 'rgba(253, 224, 71, 0.22)' },
      { x: 260, y: 1255, r: 44, c: 'rgba(125, 211, 252, 0.22)' },
      { x: 820, y: 1210, r: 58, c: 'rgba(251, 191, 36, 0.2)' },
      { x: 960, y: 1150, r: 48, c: 'rgba(96, 165, 250, 0.22)' },
    ]
    for (const b of bokehSpots) {
      ctx.save()
      const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, b.r)
      g.addColorStop(0, b.c)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (cozy === 'autumn-cafe') {
    // Daun musim gugur oranye & emas
    const leafPositions = [
      { x: 120, y: 230, rot: -0.4, c: '#fb923c' },
      { x: 940, y: 310, rot: 0.5, c: '#fbbf24' },
      { x: 95, y: 780, rot: 0.3, c: '#f59e0b' },
      { x: 975, y: 920, rot: -0.6, c: '#fdba74' },
      { x: 165, y: 1140, rot: 0.8, c: '#fb923c' },
    ]
    for (const leaf of leafPositions) {
      ctx.save()
      ctx.translate(leaf.x, leaf.y)
      ctx.rotate(leaf.rot)
      ctx.fillStyle = leaf.c
      ctx.globalAlpha = 0.78
      ctx.beginPath()
      ctx.ellipse(0, 0, 14, 24, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (cozy === 'sakura-lantern') {
    // Lentera kertas emas bercahaya
    const lanterns = [
      { x: 115, y: 250, s: 1 },
      { x: 950, y: 280, s: 1.1 },
      { x: 110, y: 980, s: 0.85 },
      { x: 960, y: 1050, s: 0.9 },
    ]
    for (const l of lanterns) {
      ctx.save()
      ctx.translate(l.x, l.y)
      ctx.scale(l.s, l.s)
      const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 46)
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.5)')
      glow.addColorStop(1, 'rgba(253, 224, 71, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(0, 0, 46, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fbbf24'
      drawRoundedRect(ctx, -16, -22, 32, 42, 12)
      ctx.fill()
      ctx.fillStyle = '#fffbeb'
      ctx.beginPath()
      ctx.arc(0, 8, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (cozy === 'neon-night-city') {
    // Siluet gedung pencakar langit (City Skyline) dengan jendela neon Cyan & Magenta di bagian bawah
    ctx.save()
    const buildings = [
      { x: 0, w: 96, h: 210 },
      { x: 90, w: 80, h: 290 },
      { x: 165, w: 105, h: 190 },
      { x: 265, w: 74, h: 330 },
      { x: 334, w: 112, h: 240 },
      { x: 440, w: 90, h: 270 },
      { x: 525, w: 86, h: 350 },
      { x: 606, w: 104, h: 225 },
      { x: 705, w: 82, h: 310 },
      { x: 782, w: 110, h: 255 },
      { x: 888, w: 92, h: 295 },
      { x: 976, w: 108, h: 220 },
    ]
    for (const b of buildings) {
      const topY = CARD_HEIGHT - b.h
      ctx.fillStyle = 'rgba(7, 3, 18, 0.92)'
      ctx.fillRect(b.x, topY, b.w, b.h)
      ctx.strokeStyle = b.x % 2 === 0 ? 'rgba(0, 245, 212, 0.35)' : 'rgba(255, 42, 133, 0.35)'
      ctx.lineWidth = 2
      ctx.strokeRect(b.x, topY, b.w, b.h)
      for (let wy = topY + 20; wy < CARD_HEIGHT - 24; wy += 28) {
        for (let wx = b.x + 14; wx < b.x + b.w - 18; wx += 22) {
          if ((wx + wy) % 3 !== 0) continue
          ctx.fillStyle = (wx + wy) % 2 === 0 ? 'rgba(0, 245, 212, 0.65)' : 'rgba(255, 42, 133, 0.65)'
          ctx.fillRect(wx, wy, 10, 14)
        }
      }
    }
    // Gerimis cahaya neon Cyan & Magenta
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    for (let i = 0; i < 32; i++) {
      const rx = ((i * 113) % (CARD_WIDTH + 60)) - 10
      const ry = (i * 151) % (CARD_HEIGHT - 220)
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(0, 245, 212, 0.35)' : 'rgba(255, 42, 133, 0.35)'
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx - 10, ry + 48)
      ctx.stroke()
    }
    ctx.restore()
  } else if (cozy === 'matcha-garden') {
    // Gelombang uap hangat tipis secangkir matcha di latar Kartu Progres PNG
    ctx.save()
    const steamColumns = [150, 340, 560, 760, 930]
    for (let i = 0; i < steamColumns.length; i++) {
      const sx = steamColumns[i]!
      const steamGrad = ctx.createLinearGradient(sx, CARD_HEIGHT - 120, sx, 380)
      steamGrad.addColorStop(0, 'rgba(236, 253, 245, 0)')
      steamGrad.addColorStop(0.35, 'rgba(236, 253, 245, 0.1)')
      steamGrad.addColorStop(0.7, 'rgba(209, 250, 229, 0.08)')
      steamGrad.addColorStop(1, 'rgba(236, 253, 245, 0)')
      ctx.strokeStyle = steamGrad
      ctx.lineWidth = 22
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(sx, CARD_HEIGHT - 120)
      ctx.bezierCurveTo(sx - 38, CARD_HEIGHT - 360, sx + 42, 660, sx - 18, 380)
      ctx.stroke()
    }
    ctx.restore()

    const teaLeaves = [
      { x: 110, y: 240, rot: -0.5, c: '#86efac' },
      { x: 945, y: 320, rot: 0.4, c: '#4ade80' },
      { x: 120, y: 820, rot: 0.7, c: '#bbf7d0' },
      { x: 955, y: 980, rot: -0.4, c: '#86efac' },
    ]
    for (const leaf of teaLeaves) {
      ctx.save()
      ctx.translate(leaf.x, leaf.y)
      ctx.rotate(leaf.rot)
      ctx.fillStyle = leaf.c
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.ellipse(0, 0, 12, 22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (cozy === 'biolum-ocean') {
    const bubbles = [
      { x: 125, y: 310, r: 22 },
      { x: 930, y: 260, r: 28 },
      { x: 140, y: 960, r: 18 },
      { x: 910, y: 1080, r: 26 },
      { x: 840, y: 420, r: 14 },
    ]
    for (const b of bubbles) {
      ctx.save()
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)'
      ctx.fillStyle = 'rgba(103, 232, 249, 0.16)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  } else if (cozy === 'honey-library') {
    for (let i = 0; i < 24; i++) {
      const mx = ((i * 157 + 45) % (CARD_WIDTH - 90)) + 45
      const my = ((i * 211 + 80) % (CARD_HEIGHT - 160)) + 80
      ctx.save()
      ctx.fillStyle = 'rgba(253, 224, 71, 0.42)'
      ctx.beginPath()
      ctx.arc(mx, my, (i % 4) + 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else if (cozy === 'winter-frost') {
    for (let i = 0; i < 36; i++) {
      const fx = ((i * 139 + 30) % (CARD_WIDTH - 60)) + 30
      const fy = ((i * 181 + 40) % (CARD_HEIGHT - 100)) + 40
      ctx.save()
      ctx.fillStyle = 'rgba(224, 242, 254, 0.72)'
      ctx.beginPath()
      ctx.arc(fx, fy, (i % 4) + 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else {
    // Bulan sabit hangat untuk tema klasik
    ctx.save()
    ctx.fillStyle = '#fef08a'
    ctx.shadowColor = 'rgba(254, 240, 138, 0.65)'
    ctx.shadowBlur = 24
    ctx.beginPath()
    ctx.arc(935, 135, 36, 0.35, Math.PI * 1.65)
    ctx.arc(952, 128, 30, Math.PI * 1.55, 0.45, true)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

/** Gambar aksesori kepala kucing (Pita Pink, Topi Penyihir, atau Mahkota Bintang) di Canvas */
function drawCatAccessory(
  ctx: CanvasRenderingContext2D,
  accessory: MascotAccessoryId,
  cx: number,
  topY: number,
  scale: number,
) {
  if (accessory === 'none') return
  ctx.save()
  ctx.translate(cx, topY)
  ctx.scale(scale, scale)

  if (accessory === 'star-crown') {
    ctx.fillStyle = '#fde68a'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-34, 8)
    ctx.lineTo(-26, -24)
    ctx.lineTo(0, -6)
    ctx.lineTo(26, -24)
    ctx.lineTo(34, 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.arc(0, -26, 6.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#c4b5fd'
    ctx.beginPath()
    ctx.arc(-26, -24, 4.5, 0, Math.PI * 2)
    ctx.arc(26, -24, 4.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (accessory === 'starlight-crown') {
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.ellipse(0, -22, 48, 13, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(0, -22, 44, 11, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#fef08a'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-36, 8)
    ctx.lineTo(-28, -22)
    ctx.lineTo(-12, -8)
    ctx.lineTo(0, -34)
    ctx.lineTo(12, -8)
    ctx.lineTo(28, -22)
    ctx.lineTo(36, 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#67e8f9'
    ctx.beginPath()
    ctx.arc(0, -36, 6.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e879f9'
    ctx.beginPath()
    ctx.arc(0, -10, 5.4, 0, Math.PI * 2)
    ctx.fill()
  } else if (accessory === 'witch-hat') {
    ctx.fillStyle = '#4c1d95'
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(0, 8, 48, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#5b21b6'
    ctx.beginPath()
    ctx.moveTo(-34, 6)
    ctx.lineTo(-6, -48)
    ctx.quadraticCurveTo(6, -56, 18, -38)
    ctx.lineTo(34, 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = '#f9a8d4'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(-30, 0)
    ctx.quadraticCurveTo(0, 9, 30, 0)
    ctx.stroke()

    drawFourPointStar(ctx, 0, 2, 10, '#fde68a', 1)
  } else if (accessory === 'pink-bow') {
    ctx.translate(-38, 16)
    ctx.rotate(-0.35)
    ctx.fillStyle = '#f472b6'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(-18, 0, 18, 11, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.ellipse(18, 0, 18, 11, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#fdf2f8'
    ctx.beginPath()
    ctx.arc(0, 0, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (accessory === 'leaf-sprout') {
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 14)
    ctx.quadraticCurveTo(-2, -10, 1, -24)
    ctx.stroke()

    ctx.fillStyle = '#4ade80'
    ctx.strokeStyle = '#dcfce7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(-14, -18, 14, 7.5, -0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.ellipse(14, -22, 14, 7.5, 0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (accessory === 'open-book') {
    ctx.fillStyle = '#5b21b6'
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(-36, 4)
    ctx.quadraticCurveTo(-18, -16, 0, -2)
    ctx.quadraticCurveTo(18, -16, 36, 4)
    ctx.lineTo(32, 13)
    ctx.quadraticCurveTo(16, -2, 0, 10)
    ctx.quadraticCurveTo(-16, -2, -32, 13)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#fffbeb'
    ctx.beginPath()
    ctx.moveTo(-31, 3)
    ctx.quadraticCurveTo(-16, -15, 0, -3)
    ctx.lineTo(0, 6)
    ctx.quadraticCurveTo(-15, -4, -28, 9)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(31, 3)
    ctx.quadraticCurveTo(16, -15, 0, -3)
    ctx.lineTo(0, 6)
    ctx.quadraticCurveTo(15, -4, 28, 9)
    ctx.closePath()
    ctx.fill()
  } else if (accessory === 'beret-hat') {
    ctx.rotate(-0.16)
    ctx.fillStyle = '#ddd6fe'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.ellipse(0, 0, 42, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-38, 6)
    ctx.quadraticCurveTo(0, 18, 38, 6)
    ctx.stroke()
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-2, -16)
    ctx.quadraticCurveTo(2, -26, 9, -22)
    ctx.stroke()
  } else if (accessory === 'star-halo') {
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.42)'
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.ellipse(0, -24, 38, 10, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 4.5
    ctx.beginPath()
    ctx.ellipse(0, -24, 36, 9, 0, 0, Math.PI * 2)
    ctx.stroke()
    drawFourPointStar(ctx, -40, -24, 8, '#fef08a', 0.95)
    drawFourPointStar(ctx, 40, -26, 7, '#fbcfe8', 0.95)
  }

  ctx.restore()
}

/** Gambar aksesoris khusus belakang (Sayap Malaikat), wajah (Kacamata Bulat / Headphone Lo-Fi), & leher (Syal / Kalung) di Canvas */
function drawCatBackWings(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save()
  ctx.scale(scale, scale)
  ctx.fillStyle = '#fffdf7'
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  // Sayap kiri
  ctx.beginPath()
  ctx.moveTo(-48, 42)
  ctx.bezierCurveTo(-110, 22, -142, -24, -132, -56)
  ctx.bezierCurveTo(-104, -46, -80, -26, -62, -4)
  ctx.bezierCurveTo(-98, -14, -128, -4, -132, 24)
  ctx.bezierCurveTo(-106, 30, -80, 32, -56, 40)
  ctx.bezierCurveTo(-88, 46, -110, 58, -114, 78)
  ctx.bezierCurveTo(-84, 80, -60, 68, -44, 54)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Sayap kanan
  ctx.beginPath()
  ctx.moveTo(48, 42)
  ctx.bezierCurveTo(110, 22, 142, -24, 132, -56)
  ctx.bezierCurveTo(104, -46, 80, -26, 62, -4)
  ctx.bezierCurveTo(98, -14, 128, -4, 132, 24)
  ctx.bezierCurveTo(106, 30, 80, 32, 56, 40)
  ctx.bezierCurveTo(88, 46, 110, 58, 114, 78)
  ctx.bezierCurveTo(84, 80, 60, 68, 44, 54)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  drawFourPointStar(ctx, -116, -70, 12, '#fef08a', 0.95)
  drawFourPointStar(ctx, 116, -70, 12, '#fef08a', 0.95)
  ctx.restore()
}

function drawCatFaceAndNeckAccessory(
  ctx: CanvasRenderingContext2D,
  accessory: MascotAccessoryId,
  isMini: boolean,
) {
  ctx.save()
  if (accessory === 'round-glasses') {
    const eyeX = isMini ? 20 : 28
    const eyeY = isMini ? -14 : -8
    const r = isMini ? 14 : 21
    ctx.strokeStyle = '#f59e0b'
    ctx.fillStyle = 'rgba(255, 251, 235, 0.22)'
    ctx.lineWidth = isMini ? 3 : 4
    ctx.beginPath()
    ctx.arc(-eyeX, eyeY, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(eyeX, eyeY, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-eyeX + r, eyeY)
    ctx.lineTo(eyeX - r, eyeY)
    ctx.stroke()
  } else if (accessory === 'lofi-headphones' && isMini) {
    ctx.strokeStyle = '#c084fc'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, -14, 56, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = '#9333ea'
    drawRoundedRect(ctx, -64, -28, 18, 36, 9)
    ctx.fill()
    drawRoundedRect(ctx, 46, -28, 18, 36, 9)
    ctx.fill()
    ctx.fillStyle = '#67e8f9'
    ctx.beginPath()
    ctx.arc(-55, -10, 4.5, 0, Math.PI * 2)
    ctx.arc(55, -10, 4.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (accessory === 'knit-scarf') {
    const ny = isMini ? 18 : 54
    const nx = isMini ? 34 : 52
    ctx.strokeStyle = '#fb7185'
    ctx.lineWidth = isMini ? 12 : 18
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-nx, ny)
    ctx.quadraticCurveTo(0, ny + (isMini ? 18 : 26), nx, ny)
    ctx.stroke()
    ctx.fillStyle = '#f43f5e'
    drawRoundedRect(ctx, isMini ? 12 : 20, ny + 4, isMini ? 15 : 22, isMini ? 28 : 40, 6)
    ctx.fill()
  } else if (accessory === 'soulmate-collar') {
    const ny = isMini ? 17 : 54
    const nx = isMini ? 30 : 46
    ctx.strokeStyle = '#ec4899'
    ctx.lineWidth = isMini ? 9 : 14
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-nx, ny)
    ctx.quadraticCurveTo(0, ny + (isMini ? 16 : 24), nx, ny)
    ctx.stroke()
    ctx.fillStyle = '#f9a8d4'
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(0, ny + (isMini ? 14 : 22), isMini ? 8 : 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    drawFourPointStar(ctx, 0, ny + (isMini ? 14 : 22), isMini ? 5 : 8, '#fef08a', 1)
  }
  ctx.restore()
}

/** Gambar Kucing Putih Utama (berheadphone pastel) + Kucing Mini Abu-abu berdampingan dengan aksesori aktif */
function drawBothCats(
  ctx: CanvasRenderingContext2D,
  accessory: MascotAccessoryId,
) {
  // Aura lembut di belakang kedua kucing
  const aura = ctx.createRadialGradient(540, 415, 20, 540, 415, 240)
  aura.addColorStop(0, 'rgba(249, 168, 212, 0.34)')
  aura.addColorStop(0.65, 'rgba(192, 132, 252, 0.14)')
  aura.addColorStop(1, 'rgba(192, 132, 252, 0)')
  ctx.fillStyle = aura
  ctx.beginPath()
  ctx.arc(540, 415, 240, 0, Math.PI * 2)
  ctx.fill()

  // --- 1. KUCING PUTIH UTAMA (Kiri-Tengah: cx = 445, cy = 415) ---
  ctx.save()
  ctx.translate(445, 425)

  // Sayap Malaikat di belakang kucing putih (jika dipakai)
  if (accessory === 'angel-wings') {
    drawCatBackWings(ctx, 0.92)
  }

  // Band headphone atas
  ctx.strokeStyle = accessory === 'lofi-headphones' ? '#c084fc' : '#f9a8d4'
  ctx.lineWidth = 18
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, -10, 96, Math.PI, 0)
  ctx.stroke()

  // Tubuh kucing putih
  ctx.fillStyle = '#f5ecff'
  ctx.beginPath()
  ctx.ellipse(0, 86, 62, 46, 0, 0, Math.PI * 2)
  ctx.fill()

  // Syal pastel + lonceng emas
  ctx.strokeStyle = '#c4b5fd'
  ctx.lineWidth = 14
  ctx.beginPath()
  ctx.moveTo(-44, 54)
  ctx.quadraticCurveTo(0, 76, 44, 54)
  ctx.stroke()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(0, 68, 8, 0, Math.PI * 2)
  ctx.fill()

  // Telinga kiri & kanan
  ctx.fillStyle = '#fff7fb'
  ctx.strokeStyle = '#e9d5ff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-66, -34)
  ctx.lineTo(-78, -94)
  ctx.lineTo(-24, -62)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.moveTo(-62, -42)
  ctx.lineTo(-70, -80)
  ctx.lineTo(-34, -58)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fff7fb'
  ctx.beginPath()
  ctx.moveTo(66, -34)
  ctx.lineTo(78, -94)
  ctx.lineTo(24, -62)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.moveTo(62, -42)
  ctx.lineTo(70, -80)
  ctx.lineTo(34, -58)
  ctx.closePath()
  ctx.fill()

  // Kepala bulat kucing putih
  ctx.fillStyle = '#fff7fb'
  ctx.beginPath()
  ctx.ellipse(0, -6, 82, 70, 0, 0, Math.PI * 2)
  ctx.fill()

  // Earcup headphone kiri & kanan
  ctx.fillStyle = '#c084fc'
  drawRoundedRect(ctx, -108, -36, 32, 62, 16)
  ctx.fill()
  ctx.fillStyle = '#f9a8d4'
  drawRoundedRect(ctx, -100, -28, 20, 46, 10)
  ctx.fill()

  ctx.fillStyle = '#c084fc'
  drawRoundedRect(ctx, 76, -36, 32, 62, 16)
  ctx.fill()
  ctx.fillStyle = '#f9a8d4'
  drawRoundedRect(ctx, 80, -28, 20, 46, 10)
  ctx.fill()

  // Mata ceria (^ ^) & pipi merona
  ctx.strokeStyle = '#3b215c'
  ctx.lineWidth = 5.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-42, -6)
  ctx.quadraticCurveTo(-28, -24, -14, -6)
  ctx.moveTo(14, -6)
  ctx.quadraticCurveTo(28, -24, 42, -6)
  ctx.stroke()

  ctx.fillStyle = 'rgba(249, 168, 212, 0.85)'
  ctx.beginPath()
  ctx.ellipse(-50, 12, 14, 8, 0, 0, Math.PI * 2)
  ctx.ellipse(50, 12, 14, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hidung & mulut ω
  ctx.fillStyle = '#f472b6'
  ctx.beginPath()
  ctx.moveTo(-5, 4)
  ctx.lineTo(5, 4)
  ctx.lineTo(0, 10)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#3b215c'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-14, 16)
  ctx.quadraticCurveTo(-7, 25, 0, 15)
  ctx.quadraticCurveTo(7, 25, 14, 16)
  ctx.stroke()

  // Aksesori wajah, leher & kepala Kucing Putih
  drawCatFaceAndNeckAccessory(ctx, accessory, false)
  drawCatAccessory(ctx, accessory, 0, -86, 1.35)
  ctx.restore()

  // --- 2. KUCING MINI ABU-ABU (Kanan-Tengah: cx = 675, cy = 468) ---
  ctx.save()
  ctx.translate(675, 474)

  // Sayap Malaikat di belakang kucing mini (jika dipakai)
  if (accessory === 'angel-wings') {
    drawCatBackWings(ctx, 0.56)
  }

  // Ekor melengkung lucu
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 14
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(42, 34)
  ctx.bezierCurveTo(78, 30, 82, -8, 58, -16)
  ctx.stroke()

  // Badan abu-abu krem + perut krem
  ctx.fillStyle = '#e7e5e4'
  ctx.beginPath()
  ctx.ellipse(0, 36, 48, 36, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.ellipse(0, 42, 28, 22, 0, 0, Math.PI * 2)
  ctx.fill()

  // Kalung pita pink + lonceng emas
  ctx.strokeStyle = '#f9a8d4'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(-28, 16)
  ctx.quadraticCurveTo(0, 30, 28, 16)
  ctx.stroke()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(0, 25, 5.5, 0, Math.PI * 2)
  ctx.fill()

  // Telinga abu-abu lembut
  ctx.fillStyle = '#cbd5e1'
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(-42, -22)
  ctx.lineTo(-49, -64)
  ctx.lineTo(-14, -44)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.moveTo(-38, -28)
  ctx.lineTo(-43, -54)
  ctx.lineTo(-22, -40)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(42, -22)
  ctx.lineTo(49, -64)
  ctx.lineTo(14, -44)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.moveTo(38, -28)
  ctx.lineTo(43, -54)
  ctx.lineTo(22, -40)
  ctx.closePath()
  ctx.fill()

  // Kepala bulat kucing mini
  ctx.fillStyle = '#e7e5e4'
  ctx.beginPath()
  ctx.ellipse(0, -14, 52, 42, 0, 0, Math.PI * 2)
  ctx.fill()

  // Corak dahi
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 4.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -54)
  ctx.lineTo(0, -40)
  ctx.moveTo(-12, -52)
  ctx.lineTo(-9, -40)
  ctx.moveTo(12, -52)
  ctx.lineTo(9, -40)
  ctx.stroke()

  // Mata tersenyum nyaman (˘ ◡ ˘) & pipi merona
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.moveTo(-29, -14)
  ctx.quadraticCurveTo(-20, -4, -11, -14)
  ctx.moveTo(11, -14)
  ctx.quadraticCurveTo(20, -4, 29, -14)
  ctx.stroke()

  ctx.fillStyle = 'rgba(249, 168, 212, 0.9)'
  ctx.beginPath()
  ctx.ellipse(-33, -2, 9, 5.5, 0, 0, Math.PI * 2)
  ctx.ellipse(33, -2, 9, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hidung & senyum kecil
  ctx.fillStyle = '#f472b6'
  ctx.beginPath()
  ctx.moveTo(-4, -6)
  ctx.lineTo(4, -6)
  ctx.lineTo(0, -1)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(-9, 4)
  ctx.quadraticCurveTo(0, 12, 9, 4)
  ctx.stroke()

  // Aksesori wajah, leher & kepala Kucing Mini (sinkron 100%!)
  drawCatFaceAndNeckAccessory(ctx, accessory, true)
  drawCatAccessory(ctx, accessory, 0, -58, 0.88)
  ctx.restore()
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 3 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

/** Render seluruh kartu progres 1080 × 1350 px ke Canvas 2D dan simpan sebagai Data URL */
async function renderStudyCard() {
  if (!import.meta.client) return
  isRendering.value = true

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const canvas = document.createElement('canvas')
    canvas.width = CARD_WIDTH
    canvas.height = CARD_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cozy = activeCozyTheme.value
    const palette = getCardPalette(cozy, theme.value)

    // 1. Latar Belakang Gradasi Mengikuti Tema Aktif
    const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT)
    bgGrad.addColorStop(0, palette.bgStops[0])
    bgGrad.addColorStop(0.52, palette.bgStops[1])
    bgGrad.addColorStop(1, palette.bgStops[2])
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    // 2. Dekorasi Tema Aktif (Aurora / Hujan & Bokeh / Daun / Lentera / Bintang)
    drawThemeDecorations(ctx, cozy, palette)

    // 3. Bingkai Luar Kartu Estetik
    ctx.save()
    drawRoundedRect(ctx, 44, 44, CARD_WIDTH - 88, CARD_HEIGHT - 88, 48)
    ctx.strokeStyle = palette.cardStroke
    ctx.lineWidth = cozy === 'astral-palace' || cozy === 'neon-night-city' ? 4 : 2.5
    if (cozy === 'astral-palace') {
      ctx.shadowColor = 'rgba(253, 224, 71, 0.45)'
      ctx.shadowBlur = 24
    } else if (cozy === 'neon-night-city') {
      ctx.shadowColor = 'rgba(0, 245, 212, 0.65)'
      ctx.shadowBlur = 26
    }
    ctx.stroke()
    ctx.restore()

    // 4. Header: Judul "Twilight's — Study & Focus Log" + Tanggal Hari Ini
    ctx.textAlign = 'center'
    ctx.fillStyle = palette.titleColor
    ctx.font = '700 66px "Fredoka", "Quicksand", system-ui, sans-serif'
    ctx.save()
    ctx.shadowColor = palette.accent
    ctx.shadowBlur = 22
    ctx.fillText("Twilight's", CARD_WIDTH / 2, 146)
    ctx.restore()

    ctx.fillStyle = palette.subColor
    ctx.font = '700 26px "Quicksand", system-ui, sans-serif'
    ctx.fillText('✦  STUDY & FOCUS LOG  ✦', CARD_WIDTH / 2, 194)

    // Kapsul Tanggal + Nama Tema
    drawRoundedRect(ctx, 220, 218, 640, 48, 24)
    ctx.fillStyle = palette.cardFill
    ctx.fill()
    ctx.strokeStyle = palette.cardStroke
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#fdf2f8'
    ctx.font = '600 22px "Quicksand", system-ui, sans-serif'
    ctx.fillText(`${formattedDateLong.value}  •  ${activeThemeName.value}`, CARD_WIDTH / 2, 249)

    // 5. Ilustrasi Kedua Maskot Kucing Lengkap dengan Aksesori Aktif
    drawBothCats(ctx, equippedAccessory.value)

    // 6. Grid 4 Statistik Hari Ini
    const stats = [
      { label: 'WAKTU FOKUS', value: formattedFocusTime.value, icon: '⏱️' },
      { label: 'SESI SELESAI', value: `${todayFocusSessions.value} Sesi`, icon: '🎯' },
      { label: 'STREAK HARI INI', value: `${dailyStreak.value} Hari`, icon: '🔥' },
      {
        label: 'KASIH SAYANG',
        value:
          catAffinityLevel.value >= CAT_AFFINITY_MAX_LEVEL
            ? '👑 Celestial MAX'
            : `Lv. ${catAffinityLevel.value}`,
        icon: '💖',
      },
    ]

    const gridStartX = 94
    const gridY = 602
    const boxW = 430
    const boxH = 122
    const gapX = 32
    const gapY = 24

    stats.forEach((stat, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const bx = gridStartX + col * (boxW + gapX)
      const by = gridY + row * (boxH + gapY)

      drawRoundedRect(ctx, bx, by, boxW, boxH, 28)
      ctx.fillStyle = palette.cardFill
      ctx.fill()
      ctx.strokeStyle = palette.cardStroke
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.textAlign = 'left'
      ctx.fillStyle = palette.subColor
      ctx.font = '700 18px "Quicksand", system-ui, sans-serif'
      ctx.fillText(`${stat.icon}  ${stat.label}`, bx + 28, by + 44)

      ctx.fillStyle = '#ffffff'
      ctx.font =
        stat.value.length > 12
          ? '700 31px "Fredoka", "Quicksand", system-ui, sans-serif'
          : '700 38px "Fredoka", "Quicksand", system-ui, sans-serif'
      ctx.fillText(stat.value, bx + 28, by + 94)
    })

    // 7. Daftar Maksimal 5 Target Daily Habit Tracker Tercapai Hari Ini
    const listX = 94
    const listY = 892
    const listW = CARD_WIDTH - 188
    const listH = 310

    drawRoundedRect(ctx, listX, listY, listW, listH, 32)
    ctx.fillStyle = palette.cardFill
    ctx.fill()
    ctx.strokeStyle = palette.cardStroke
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = palette.accent
    ctx.font = '700 23px "Fredoka", "Quicksand", system-ui, sans-serif'
    ctx.fillText('✓  TARGET TERCAPAI HARI INI', listX + 34, listY + 48)

    if (completedHabitsToday.value.length > 0) {
      completedHabitsToday.value.forEach((habit, idx) => {
        const rowY = listY + 95 + idx * 44
        // Lingkaran centang pastel
        ctx.fillStyle = palette.accent
        ctx.beginPath()
        ctx.arc(listX + 46, rowY - 8, 12, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#1e1b4b'
        ctx.font = '800 16px "Quicksand", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('✓', listX + 46, rowY - 2)

        ctx.textAlign = 'left'
        ctx.fillStyle = '#fdf2f8'
        ctx.font = '600 23px "Quicksand", system-ui, sans-serif'
        const label = truncateText(ctx, habit.title, listW - 110)
        ctx.fillText(label, listX + 74, rowY)
      })
    } else {
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(253, 242, 248, 0.78)'
      ctx.font = '600 24px "Quicksand", system-ui, sans-serif'
      ctx.fillText(
        'Siap menaklukkan target pertamamu hari ini ✨',
        CARD_WIDTH / 2,
        listY + 172,
      )
    }

    // 8. Footer Penutup Manis
    ctx.textAlign = 'center'
    ctx.fillStyle = palette.titleColor
    ctx.font = '700 28px "Fredoka", "Quicksand", system-ui, sans-serif'
    ctx.fillText("Step by step with Twilight's ✨", CARD_WIDTH / 2, 1254)

    ctx.fillStyle = 'rgba(233, 213, 255, 0.75)'
    ctx.font = '600 20px "Quicksand", system-ui, sans-serif'
    ctx.fillText(`Catatanku • ${userName.value}`, CARD_WIDTH / 2, 1288)

    previewDataUrl.value = canvas.toDataURL('image/png')
  } finally {
    isRendering.value = false
  }
}

function downloadStudyCardPng() {
  if (!previewDataUrl.value || !import.meta.client) return
  const link = document.createElement('a')
  link.href = previewDataUrl.value
  link.download = `twilights-study-card-${getLocalTodayDate()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function closeModal() {
  isStudyCardModalOpen.value = false
}

watch(isStudyCardModalOpen, async (open) => {
  if (open) {
    await nextTick()
    void renderStudyCard()
  }
})
</script>

<template>
  <!-- Modal Pratinjau & Unduh Kartu Progres Harian (1080 × 1350 px PNG) -->
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isStudyCardModalOpen"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau Kartu Progres Harian Twilight's"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d071c]/80 p-4 backdrop-blur-md"
      @click.self="closeModal"
    >
      <div
        class="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-pink-300/45 bg-gradient-to-br from-[#231340]/98 via-[#2d184f]/98 to-[#1c1033]/98 shadow-2xl shadow-pink-500/20"
      >
        <!-- Header Modal -->
        <div class="flex items-center justify-between gap-2 border-b border-white/15 px-5 py-3.5">
          <div class="flex items-center gap-2">
            <span class="text-xl">📸</span>
            <div>
              <h2 class="font-display text-base font-bold text-pink-100">
                Kartu Progres Hari Ini
              </h2>
              <p class="text-[11px] font-medium text-purple-200/80">
                Siap dibagikan • Rasio 4:5 (1080 × 1350 px PNG)
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup pratinjau kartu progres"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-pink-100 transition hover:bg-pink-400 hover:text-[#1e1b4b]"
            @click="closeModal"
          >
            ✕
          </button>
        </div>

        <!-- Pratinjau Kartu Gambar -->
        <div class="flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-4">
          <div
            v-if="isRendering || !previewDataUrl"
            class="flex aspect-[4/5] w-full max-w-[330px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/30 text-xs font-semibold text-pink-100"
          >
            <span class="h-6 w-6 animate-spin rounded-full border-2 border-pink-300 border-t-transparent" />
            <span>Menggambar kartu progresmu... ✨</span>
          </div>

          <img
            v-else
            :src="previewDataUrl"
            alt="Pratinjau Kartu Progres Belajar Hari Ini Twilight's"
            class="max-h-[60vh] w-auto rounded-2xl border border-white/25 shadow-2xl shadow-black/50"
          >
        </div>

        <!-- Footer Tombol Unduh PNG & Tutup -->
        <div class="flex items-center justify-between gap-2 border-t border-white/15 px-5 py-3.5">
          <button
            type="button"
            class="btn-bouncy cursor-pointer rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-purple-100 hover:bg-white/20"
            @click="closeModal"
          >
            Tutup
          </button>

          <button
            type="button"
            :disabled="!previewDataUrl || isRendering"
            class="btn-bouncy inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f9a8d4] via-[#e879f9] to-[#c084fc] px-5 py-2 text-xs font-bold text-[#2a103d] shadow-lg shadow-pink-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            @click="downloadStudyCardPng"
          >
            <span>⬇️</span>
            <span>Unduh PNG</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
