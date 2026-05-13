'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';

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

const cardVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.8, ease: 'easeIn' } },
};

export default function ProjectsShowcase() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // نگه داشتن مقادیر برای استفاده درون موتور زمان‌سنج مستقل
  const slotsRef = useRef<SlotData[]>([]);
  const projectsRef = useRef<Project[]>([]);
  const nextProjectRef = useRef(0);
  
  // آرایه‌ای برای مدیریت زمان باقی‌مانده و وضعیت توقفِ تک‌تکِ کارت‌ها به صورت جداگانه
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
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[]) => {
        if ((data as any).error) throw new Error((data as any).error);
        const activeProjects = data.filter((p) => p.isActive !== false);
        setProjects(activeProjects);

        if (activeProjects.length > 0) {
          const initialSlots = Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
            project: activeProjects[i % activeProjects.length],
            key: `slot-${i}-init`,
            duration: (i + 1) * INTERVAL_TIME, 
          }));
          setSlots(initialSlots);
          nextProjectRef.current = TOTAL_SLOTS % activeProjects.length;

          // همگام‌سازی تایمرها با کارت‌های اولیه
          slotTimers.current = Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
            remaining: (i + 1) * INTERVAL_TIME,
            isPaused: false,
          }));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // موتور زمان‌سنج هوشمند با قابلیت توقف مستقل
  useEffect(() => {
    if (projects.length === 0) return;

    let frameId: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      let hasUpdates = false;
      const newSlots = [...slotsRef.current];

      // بررسی تک تک کارت‌ها
      slotTimers.current.forEach((timer, index) => {
        // فقط اگر این کارت خاص متوقف نشده بود، زمانش را جلو ببر
        if (!timer.isPaused) {
          timer.remaining -= deltaTime;
          
          // اگر زمان این کارت تمام شد
          if (timer.remaining <= 0) {
            const currentProjectIndex = nextProjectRef.current;
            newSlots[index] = {
              project: projectsRef.current[currentProjectIndex],
              key: `slot-${index}-${Date.now()}`,
              duration: CYCLE_TIME, 
            };
            
            // مشخص کردن پروژه بعدی برای صف (هر کارتی که زودتر زمانش تمام شود این را می‌گیرد)
            nextProjectRef.current = (currentProjectIndex + 1) % projectsRef.current.length;
            timer.remaining += CYCLE_TIME;
            hasUpdates = true;
          }
        }
      });

      // فقط اگر تغییری در کارت‌ها رخ داده بود، استیت را آپدیت کن
      if (hasUpdates) {
        setSlots(newSlots);
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [projects.length]);

  if (loading) return <p className="text-center py-20 text-gray-500 animate-pulse">در حال دریافت پروژه‌ها...</p>;
  if (error) return <p className="text-center text-red-500 py-20">خطا: {error}</p>;
  if (projects.length === 0) return <p className="text-center py-20 text-gray-500">پروژه‌ای یافت نشد.</p>;

  return (
    <section dir="rtl" className="container mx-auto px-4 py-16">
      
      {/* تعریف انیمیشن نوار پیشرفت */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progressFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}} />

      <div className="flex justify-end mb-6">
        <Link 
          href="/projects" 
          className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-2xl hover:bg-[#2563EB] hover:border-[#2563EB] hover:text-white transition-all duration-300 shadow-sm"
        >
          مشاهده آرشیو پروژه‌ها
          <svg className="w-4 h-4 rtl:rotate-180 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
        {slots.map((slot, index) => (
          <div 
            key={`container-${index}`} 
            className="relative w-full h-[450px] lg:h-[550px] rounded-2xl overflow-hidden shadow-xl bg-transparent group/card"
            // استفاده از Pointer Events تا هم در موبایل (لمس) و هم در دسکتاپ دقیق کار کند
            onPointerEnter={() => { slotTimers.current[index].isPaused = true; }}
            onPointerLeave={() => { slotTimers.current[index].isPaused = false; }}
          >
            
            <AnimatePresence>
              <motion.div
                key={slot.key}
                variants={cardVariants}
                initial="hidden" animate="show" exit="exit"
                className="absolute inset-0"
              >
                
                <div className="absolute inset-0 [perspective:2000px]">
                  
                  {/* انیمیشن چرخش کارت */}
                  <div className="relative w-full h-full rounded-2xl transition-transform duration-700 [transform-style:preserve-3d] group-hover/card:[transform:rotateY(180deg)]">
                    
                    {/* ========== روی کارت (Front) ========== */}
                    <div className="absolute inset-0 [backface-visibility:hidden] bg-gray-900 rounded-2xl overflow-hidden shadow-lg border border-white/5">
                      <img
                        src={slot.project.imageUrl}
                        alt={slot.project.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/70 pointer-events-none"></div>

                      <div className="absolute top-10 inset-x-0 flex flex-col items-center px-4 text-center z-10 pointer-events-none">
                        <span className="text-sm font-bold text-white/90 drop-shadow-md mb-3 tracking-wide">
                          {slot.project.category || 'پروژه'}
                        </span>
                        <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg leading-snug">
                          {slot.project.title}
                        </h3>
                      </div>

                      <div className="absolute bottom-12 inset-x-0 flex justify-center z-10 pointer-events-none">
                        {slot.project.location && (
                          <div className="flex items-center gap-2 text-gray-200 drop-shadow-md">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium">{slot.project.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ========== پشت کارت (Back) ========== */}
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gray-950 rounded-2xl overflow-hidden shadow-lg border border-white/5">
                      
                      <img
                        src={slot.project.imageUrl}
                        alt={slot.project.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                      />
                      
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none"></div>

                      <div className="absolute inset-0 p-8 flex flex-col items-center justify-center text-center z-20">
                        <h3 className="text-xl font-bold text-[#2563EB] mb-4">
                          {slot.project.title}
                        </h3>
                        
                        <p className="text-sm md:text-base text-gray-200 font-light leading-relaxed line-clamp-6 mb-8 drop-shadow-sm">
                          {slot.project.content?.replace(/<[^>]*>?/gm, '') || 'توضیحات تکمیلی پروژه در دسترس نیست.'}
                        </p>

                        <Link 
                          href={`/projects/${slot.project.slug}`}
                          className="px-6 py-2.5 text-sm font-semibold text-white bg-transparent border-2 border-white/40 rounded-full hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-white/5 transition-all duration-300"
                        >
                          مشاهده صفحه پروژه
                        </Link>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Progress Bar با قابلیت توقف اتوماتیک با استفاده از CSS */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 pointer-events-none z-30">
                  <div className="w-full h-[2px] bg-white/20 relative overflow-hidden rounded-full drop-shadow-md">
                    <div
                      // استفاده از کلاس‌های Tailwind برای متوقف کردن نوار فقط وقتی موس روی همین کارت است
                      className="absolute left-0 top-0 bottom-0 bg-[#2563EB] [animation-play-state:running] group-hover/card:[animation-play-state:paused]"
                      style={{
                        animationName: 'progressFill',
                        animationDuration: `${slot.duration}ms`,
                        animationTimingFunction: 'linear',
                        animationFillMode: 'forwards',
                      }}
                    />
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
            
          </div>
        ))}
      </div>
    </section>
  );
}