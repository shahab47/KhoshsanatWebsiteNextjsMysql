'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Variants, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, MapPin, Eye, RotateCw } from 'lucide-react';

interface Project {
  id: number;
  title: string;
  slug: string;
  category?: string;
  location?: string;
  content?: string;
  imageUrl: string;
  isActive: boolean;
}

interface SlotData {
  project: Project;
  key: string;
  duration: number;
}

const INTERVAL_TIME = 4500;
const TOTAL_SLOTS = 3; 
const CYCLE_TIME = INTERVAL_TIME * TOTAL_SLOTS;

interface ProjectsShowcaseProps {
  initialProjects?: Project[];
}

function buildInitialProjectSlots(activeProjects: Project[]): SlotData[] {
  if (activeProjects.length === 0) return [];
  return Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
    project: activeProjects[i % activeProjects.length],
    key: `slot-${i}-init`,
    duration: (i + 1) * INTERVAL_TIME,
  }));
}

export default function ProjectsShowcase({ initialProjects }: ProjectsShowcaseProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const activeInitial = (initialProjects || []).filter((p) => p.isActive !== false);
  const [projects, setProjects] = useState<Project[]>(() => activeInitial);
  const [slots, setSlots] = useState<SlotData[]>(() => buildInitialProjectSlots(activeInitial));
  const [loading, setLoading] = useState<boolean>(() => !initialProjects || initialProjects.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const toggleFlip = useCallback((index: number) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const cardVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: shouldReduceMotion ? 0.1 : 0.8, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: shouldReduceMotion ? 0.1 : 0.8, ease: 'easeIn' } },
  };

  const slotsRef = useRef<SlotData[]>(buildInitialProjectSlots(activeInitial));
  const projectsRef = useRef<Project[]>(activeInitial);
  const nextProjectRef = useRef(activeInitial.length > 0 ? TOTAL_SLOTS % activeInitial.length : 0);
  
  const slotTimers = useRef(
    Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
      remaining: (i + 1) * INTERVAL_TIME,
      isPaused: false,
    }))
  );

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) return;

    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[]) => {
        if ((data as any).error) throw new Error((data as any).error);
        const activeProjects = data.filter((p) => p.isActive !== false);
        setProjects(activeProjects);

        if (activeProjects.length > 0) {
          const initialSlots = buildInitialProjectSlots(activeProjects);
          setSlots(initialSlots);
          nextProjectRef.current = TOTAL_SLOTS % activeProjects.length;

          slotTimers.current = Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
            remaining: (i + 1) * INTERVAL_TIME,
            isPaused: false,
          }));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [initialProjects]);

  useEffect(() => {
    if (projects.length === 0 || shouldReduceMotion) return;

    let frameId: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      let hasUpdates = false;
      const newSlots = [...slotsRef.current];

      slotTimers.current.forEach((timer, index) => {
        if (!timer.isPaused) {
          timer.remaining -= deltaTime;
          
          if (timer.remaining <= 0) {
            const currentProjectIndex = nextProjectRef.current;
            newSlots[index] = {
              project: projectsRef.current[currentProjectIndex],
              key: `slot-${index}-${Date.now()}`,
              duration: CYCLE_TIME, 
            };
            
            nextProjectRef.current = (currentProjectIndex + 1) % projectsRef.current.length;
            timer.remaining += CYCLE_TIME;
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        setSlots(newSlots);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [projects.length, shouldReduceMotion]);

  if (loading) return <p className="text-center py-20 text-gray-400 animate-pulse">در حال دریافت پروژه‌ها...</p>;
  if (error) return <p className="text-center text-red-500 py-20">خطا: {error}</p>;
  if (projects.length === 0) return <p className="text-center py-20 text-gray-400">پروژه‌ای یافت نشد.</p>;

  return (
    <section dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            پروژه‌های شاخص مهندسی
          </h2>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            افتخار مشارکت در ساخت بزرگ‌ترین سازه‌ها و صنایع کشور
          </p>
        </div>
        <Link 
          href="/projects" 
          className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-xl hover:bg-ks-blue-500 hover:border-ks-blue-500 transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-ks-blue-500/50"
        >
          مشاهده آرشیو پروژه‌ها
          <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
        {slots.map((slot, index) => {
          const isFlipped = !!flippedCards[index];

          return (
            <div 
              key={`container-${index}`} 
              className="relative w-full h-[450px] lg:h-[520px] rounded-2xl overflow-hidden bg-ks-dark-900 border border-white/10 shadow-lg group/card"
              onPointerEnter={() => { slotTimers.current[index].isPaused = true; }}
              onPointerLeave={() => { slotTimers.current[index].isPaused = false; }}
            >
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={slot.key}
                  variants={cardVariants}
                  initial="hidden" animate="show" exit="exit"
                  className="absolute inset-0"
                >
                  
                  <div className="absolute inset-0 [perspective:2000px]">
                    
                    <div className={`relative w-full h-full rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] ${
                      isFlipped ? '[transform:rotateY(180deg)]' : 'group-hover/card:md:[transform:rotateY(180deg)]'
                    }`}>
                      
                      {/* روی کارت (Front) */}
                      <div className="absolute inset-0 [backface-visibility:hidden] bg-ks-dark-900 rounded-2xl overflow-hidden">
                        <img
                          src={slot.project.imageUrl}
                          alt={slot.project.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/80 pointer-events-none"></div>

                        <div className="absolute top-6 inset-x-0 flex flex-col items-center px-4 text-center z-10 pointer-events-none">
                          <span className="text-xs md:text-sm font-bold text-white/90 bg-ks-blue-500/80 px-3 py-1 rounded-full mb-3 tracking-wide">
                            {slot.project.category || 'پروژه'}
                          </span>
                          <h3 className="text-xl md:text-2xl font-bold text-white leading-snug drop-shadow-md">
                            {slot.project.title}
                          </h3>
                        </div>

                        <div className="absolute bottom-10 inset-x-0 flex items-center justify-between px-6 z-10">
                          {slot.project.location ? (
                            <div className="flex items-center gap-1.5 text-gray-200 text-sm">
                              <MapPin size={16} className="text-ks-blue-400 shrink-0" />
                              <span className="font-medium">{slot.project.location}</span>
                            </div>
                          ) : <div />}

                          {/* دکمه چرخش کارت برای موبایل */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFlip(index);
                            }}
                            aria-label="مشاهده مشخصات پروژه"
                            className="md:hidden inline-flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors"
                          >
                            <RotateCw size={14} />
                            <span>مشخصات</span>
                          </button>
                        </div>
                      </div>

                      {/* پشت کارت (Back) */}
                      <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-ks-dark-950 rounded-2xl overflow-hidden border border-white/10">
                        
                        <img
                          src={slot.project.imageUrl}
                          alt={slot.project.title}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover opacity-20"
                        />
                        
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none"></div>

                        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col items-center justify-center text-center z-20">
                          <h3 className="text-xl font-bold text-ks-blue-400 mb-3">
                            {slot.project.title}
                          </h3>
                          
                          <p className="text-sm text-gray-300 font-light leading-relaxed line-clamp-5 mb-6">
                            {slot.project.content?.replace(/<[^>]*>?/gm, '') || 'توضیحات تکمیلی پروژه در دسترس نیست.'}
                          </p>

                          <div className="flex items-center gap-3">
                            <Link 
                              href={`/projects/${slot.project.slug}`}
                              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-ks-blue-500 hover:bg-ks-blue-600 rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-ks-blue-500/50"
                            >
                              <Eye size={16} />
                              مشاهده صفحه پروژه
                            </Link>

                            <button
                              type="button"
                              onClick={() => toggleFlip(index)}
                              aria-label="برگشت به تصویر"
                              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                              <RotateCw size={16} />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Progress Bar */}
                  {!shouldReduceMotion && (
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 pointer-events-none z-30">
                      <div className="w-full h-[2px] bg-white/20 relative overflow-hidden rounded-full">
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-ks-blue-500 [animation-play-state:running] group-hover/card:[animation-play-state:paused]"
                          style={{
                            animationName: 'progressFill',
                            animationDuration: `${slot.duration}ms`,
                            animationTimingFunction: 'linear',
                            animationFillMode: 'forwards',
                          }}
                        />
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
              
            </div>
          );
        })}
      </div>
    </section>
  );
}