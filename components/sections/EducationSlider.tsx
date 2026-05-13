'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  author?: string;
  readTime?: number;
  imageUrl: string;
  media?: any[];
  isActive: boolean;
}

interface SlotData {
  article: Article;
  key: string;
  duration: number;
}

const INTERVAL_TIME = 4500;
const TOTAL_SLOTS = 4;
const CYCLE_TIME = INTERVAL_TIME * TOTAL_SLOTS;

const cardVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.8, ease: 'easeIn' } },
};

export default function EducationShowcase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nextSlotRef = useRef(0);
  const nextArticleRef = useRef(0);

  useEffect(() => {
    fetch('/api/education')
      .then((res) => res.json())
      .then((data: Article[]) => {
        if ((data as any).error) throw new Error((data as any).error);
        const activeArticles = data.filter((a) => a.isActive);
        setArticles(activeArticles);

        if (activeArticles.length > 0) {
          const initialSlots = Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
            article: activeArticles[i % activeArticles.length],
            key: `slot-${i}-init`,
            duration: (i + 1) * INTERVAL_TIME, 
          }));
          setSlots(initialSlots);
          nextArticleRef.current = TOTAL_SLOTS % activeArticles.length;
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (articles.length === 0) return;
    const interval = setInterval(() => {
      const currentSlotIndex = nextSlotRef.current;
      const currentArticleIndex = nextArticleRef.current;

      setSlots((prevSlots) => {
        const newSlots = [...prevSlots];
        newSlots[currentSlotIndex] = {
          article: articles[currentArticleIndex],
          key: `slot-${currentSlotIndex}-${Date.now()}`,
          duration: CYCLE_TIME, 
        };
        return newSlots;
      });

      nextSlotRef.current = (currentSlotIndex + 1) % TOTAL_SLOTS;
      nextArticleRef.current = (currentArticleIndex + 1) % articles.length;
    }, INTERVAL_TIME);

    return () => clearInterval(interval);
  }, [articles]);

  if (loading) return <p className="text-center py-20 text-gray-500 animate-pulse">در حال دریافت مقالات...</p>;
  if (error) return <p className="text-center text-red-500 py-20">خطا: {error}</p>;
  if (articles.length === 0) return <p className="text-center py-20 text-gray-500">مقاله‌ای یافت نشد.</p>;

  return (
    <section dir="rtl" className="container mx-auto px-4 py-16">
      
      <div className="flex justify-end mb-6">
        <Link 
          href="/education" 
          className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 bg-transparent border border-gray-300 dark:border-gray-600 rounded-2xl hover:bg-[#2563EB] hover:border-[#2563EB] hover:text-white transition-all duration-300 shadow-sm"
        >
          مشاهده آرشیو مقالات
          <svg className="w-4 h-4 rtl:rotate-180 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {slots.map((slot, index) => (
          <div key={`container-${index}`} className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-gray-950 shadow-lg group">
            <AnimatePresence>
              <motion.div
                key={slot.key}
                variants={cardVariants}
                initial="hidden" animate="show" exit="exit"
                className="absolute inset-0"
              >
                <Link href={`/education/${slot.article.slug}`} className="block w-full h-full relative">
                  
                  <img
                    src={slot.article.imageUrl}
                    alt={slot.article.title}
                    className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                  />
                  
                  {/* گرادیانت اصلاح شده: پایین کاملاً مشکی، وسط محو شونده، بالا شفاف */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none transition-opacity duration-300"></div>

                  <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
                    <span className="text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {slot.article.category || 'عمومی'}
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col z-10">
                    <h3 className="text-xl md:text-2xl font-bold text-white line-clamp-2 mb-2 group-hover:text-[#2563EB] transition-colors duration-300">
                      {slot.article.title}
                    </h3>
                    
                    {slot.article.excerpt && (
                      <p className="text-sm text-gray-200 line-clamp-2 mb-4 font-light leading-relaxed drop-shadow-md">
                        {slot.article.excerpt}
                      </p>
                    )}
                    
                    <div className="w-full h-[2px] bg-white/30 mb-4 relative overflow-hidden rounded-full drop-shadow-md">
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-[#2563EB]"
                        initial={{ width: '0%' }} animate={{ width: '100%' }}
                        transition={{ duration: slot.duration / 1000, ease: 'linear' }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{slot.article.author || 'تیم فنی'}</span>
                      </div>
                      {slot.article.readTime && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{slot.article.readTime} دقیقه مطالعه</span>
                        </div>
                      )}
                    </div>
                  </div>

                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}