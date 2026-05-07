'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export interface Slide {
  id: number;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  titleColor?: string | null;
  titleFontSize?: string | null;
  subtitleColor?: string | null;
  subtitleFontSize?: string | null;
}

export interface SliderSettings {
  heightDesktop: string;
  heightMobile: string;
  overlayColor: string;
  overlayOpacity: number;
}

interface HeroSliderProps {
  slides: Slide[];
  settings: SliderSettings;
}

export default function HeroSlider({ slides, settings }: HeroSliderProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // تشخیص موبایل
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // چرخش خودکار
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [slides]);

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex];
  const overlayStyle = {
    backgroundColor: settings.overlayColor,
    opacity: settings.overlayOpacity,
  };
  const sectionHeight = isMobile ? settings.heightMobile : settings.heightDesktop;

  return (
    <>
      <style jsx>{`
        @keyframes softScale {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-soft-scale {
          animation: softScale 1s ease-out;
          will-change: transform;
        }
        .animate-text {
          animation: fadeSlideUp 0.6s ease-out forwards;
          will-change: transform, opacity;
        }
      `}</style>

      <section
        className="relative flex items-center justify-center overflow-hidden"
        style={{ height: sectionHeight }}
      >
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 z-10" style={overlayStyle}></div>
          {slides.map((slide, idx) => (
            <img
              key={slide.id}
              src={slide.imageUrl}
              alt={slide.title || 'اسلاید'}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                idx === currentSlideIndex ? 'opacity-100 animate-soft-scale' : 'opacity-0'
              }`}
            />
          ))}
        </div>

        {(currentSlide.title || currentSlide.subtitle) && (
          <div
            key={currentSlideIndex}
            className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-20 text-right max-w-lg animate-text"
          >
            {currentSlide.title && (
              <h1
                className="font-thin mb-2 leading-tight"
                style={{
                  color: currentSlide.titleColor || '#ffffff',
                  fontSize: currentSlide.titleFontSize || '3rem',
                  textShadow: '0 0 6px rgba(255,255,255,0.4)',
                }}
              >
                {currentSlide.title}
              </h1>
            )}
            {currentSlide.subtitle && (
              <p
                className="font-extralight"
                style={{
                  color: currentSlide.subtitleColor || '#ffffff',
                  fontSize: currentSlide.subtitleFontSize || '1.25rem',
                  textShadow: '0 0 4px rgba(255,255,255,0.3)',
                }}
              >
                {currentSlide.subtitle}
              </p>
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 z-20">
          <Link
            href="#catalog"
            className="flex items-center justify-center gap-1 bg-transparent border border-white text-white rounded-full px-3 py-1.5 md:px-4 md:py-2 font-medium text-sm md:text-base transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 group"
          >
            مشاهده کاتالوگ محصولات
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
}