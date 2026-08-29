'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Carousel({ children, itemWidth = 320, gap = 24, autoScroll = true }: { children: React.ReactNode, itemWidth?: number, gap?: number, autoScroll?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 1)
    }
  }, [])

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [checkScroll])

  // Auto-scroll logic
  useEffect(() => {
    if (!autoScroll || isHovered) return

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
        
        // If we reached the end, loop back to start
        if (Math.ceil(scrollLeft) >= scrollWidth - clientWidth - 1) {
           scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
        } else {
           // On mobile, the item width might be different (e.g. 85vw).
           // We can just scroll by the visible width or a fixed amount.
           const scrollAmount = window.innerWidth < 768 ? window.innerWidth * 0.85 + gap : itemWidth + gap
           scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [autoScroll, isHovered, itemWidth, gap])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = window.innerWidth < 768 ? window.innerWidth * 0.85 + gap : itemWidth + gap
      const actualScroll = direction === 'left' ? -scrollAmount : scrollAmount
      scrollRef.current.scrollBy({ left: actualScroll, behavior: 'smooth' })
    }
  }

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Desktop Arrows */}
      <button 
        onClick={() => scroll('left')}
        className={`absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-[#E31E24] hover:border-[#E31E24] transition-all hidden md:flex ${!canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      <button 
        onClick={() => scroll('right')}
        className={`absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-[#E31E24] hover:border-[#E31E24] transition-all hidden md:flex ${!canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <ChevronRight className="w-7 h-7" />
      </button>

      {/* Scroll Container */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 pt-2 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ scrollBehavior: 'smooth' }}
      >
        {children}
      </div>
    </div>
  )
}
