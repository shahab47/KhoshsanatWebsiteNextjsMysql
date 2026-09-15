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
            className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-20 text-right max-w-xl animate-text px-4"
          >
            {currentSlide.title && (
              <h1
                className="font-bold mb-3 leading-tight tracking-tight drop-shadow-lg"
                style={{
                  color: currentSlide.titleColor || '#ffffff',
                  fontSize: currentSlide.titleFontSize || 'clamp(1.75rem, 4vw, 3rem)',
                  textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                }}
              >
                {currentSlide.title}
              </h1>
            )}
            {currentSlide.subtitle && (
              <p
                className="font-normal leading-relaxed drop-shadow-md text-gray-100"
                style={{
                  color: currentSlide.subtitleColor || '#f3f4f6',
                  fontSize: currentSlide.subtitleFontSize || 'clamp(0.95rem, 2vw, 1.25rem)',
                  textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                }}
              >
                {currentSlide.subtitle}
              </p>
            )}
          </div>
        )}

        <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 z-20">
          <Link
            href="/products"
            className="flex items-center justify-center gap-2 bg-ks-blue-500/90 hover:bg-ks-blue-600 text-white rounded-xl px-4 py-2.5 md:px-6 md:py-3 font-bold text-sm md:text-base transition-all shadow-lg backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-ks-blue-500 group"
          >
            مشاهده محصولات و خدمات
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
}