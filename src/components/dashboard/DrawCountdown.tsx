'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

type Props = {
  targetDate: string
  label?: string
}

export default function DrawCountdown({ targetDate, label = 'Next Draw Lock' }: Props) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false })

  useEffect(() => {
    function calculateTime() {
      const difference = new Date(targetDate).getTime() - new Date().getTime()
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
        <Clock size={13} /> Entries Locked — Awaiting Draw Results
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-center min-w-[32px]">
          <span className="text-xs font-black text-white">{timeLeft.days}</span>
          <span className="block text-[9px] text-neutral-500 uppercase">d</span>
        </div>
        <span className="text-neutral-500 text-xs font-bold">:</span>
        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-center min-w-[32px]">
          <span className="text-xs font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="block text-[9px] text-neutral-500 uppercase">h</span>
        </div>
        <span className="text-neutral-500 text-xs font-bold">:</span>
        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-center min-w-[32px]">
          <span className="text-xs font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="block text-[9px] text-neutral-500 uppercase">m</span>
        </div>
        <span className="text-neutral-500 text-xs font-bold">:</span>
        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 text-center min-w-[32px]">
          <span className="text-xs font-black text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="block text-[9px] text-neutral-500 uppercase">s</span>
        </div>
      </div>
    </div>
  )
}
