'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, Variants, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  author?: string;
  readTime?: number;
  imageUrl: string;
  media?: unknown[];
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

interface EducationShowcaseProps {
  initialArticles?: Article[];
}

function buildInitialSlots(activeArticles: Article[]): SlotData[] {
  if (activeArticles.length === 0) return [];
  return Array.from({ length: TOTAL_SLOTS }).map((_, i) => ({
    article: activeArticles[i % activeArticles.length],
    key: `slot-${i}-init`,
    duration: (i + 1) * INTERVAL_TIME,
  }));
}

export default function EducationShowcase({ initialArticles }: EducationShowcaseProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const activeInitial = (initialArticles || []).filter((a) => a.isActive !== false);
  const [articles, setArticles] = useState<Article[]>(() => activeInitial);
  const [slots, setSlots] = useState<SlotData[]>(() => buildInitialSlots(activeInitial));
  const [loading, setLoading] = useState<boolean>(() => !initialArticles || initialArticles.length === 0);
  const [error, setError] = useState<string | null>(null);

  const nextSlotRef = useRef(0);
  const nextArticleRef = useRef(activeInitial.length > 0 ? TOTAL_SLOTS % activeInitial.length : 0);

  const cardVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: shouldReduceMotion ? 0.1 : 0.8, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: shouldReduceMotion ? 0.1 : 0.8, ease: 'easeIn' } },
  };

  useEffect(() => {
    if (initialArticles && initialArticles.length > 0) return;

    fetch('/api/education')
      .then((res) => res.json())
      .then((data: Article[] | { error?: string }) => {
        if ('error' in data && data.error) throw new Error(data.error);
        const activeArticles = (data as Article[]).filter((a) => a.isActive);
        setArticles(activeArticles);

        if (activeArticles.length > 0) {
          setSlots(buildInitialSlots(activeArticles));
          nextArticleRef.current = TOTAL_SLOTS % activeArticles.length;
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [initialArticles]);

  useEffect(() => {
    if (articles.length === 0 || shouldReduceMotion) return;
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
  }, [articles, shouldReduceMotion]);

  if (loading) return <p className="text-center py-20 text-gray-400 animate-pulse">در حال دریافت مقالات...</p>;
  if (error) return <p className="text-center text-red-500 py-20">خطا: {error}</p>;
  if (articles.length === 0) return <p className="text-center py-20 text-gray-400">مقاله‌ای یافت نشد.</p>;

  return (
    <section className="w-full py-20 md:py-28 bg-[#F5F7FA] border-t border-gray-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* سربرگ بخش دانش‌نامه */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-2 uppercase" dir="ltr">
              <span className="w-2 h-0.5 bg-[#2563EB]" />
              TECHNICAL KNOWLEDGE BASE // INSIGHTS
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D3644] tracking-tight">
              دانش‌نامه و آموزش‌های تخصصی
            </h2>
            <p className="text-sm md:text-base text-[#6C6C6E] mt-2 max-w-2xl">
              تازه‌ترین مقالات مهندسی، استانداردها و تکنولوژی‌های روز ساخت، اتصالات کرتین‌وال و فلزکاری صنعتی
            </p>
          </div>
          <Link 
            href="/education" 
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] hover:text-[#1d4ed8] group self-start md:self-auto py-2"
          >
            <span>مشاهده آرشیو مقالات</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* شبکه نمایش مقالات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {slots.map((slot, index) => (
            <div key={`container-${index}`} className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#2D3644] border border-gray-300 shadow-sm group">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slot.key}
                  variants={cardVariants}
                  initial="hidden" animate="show" exit="exit"
                  className="absolute inset-0"
                >
                  <Link href={`/education/${slot.article.slug}`} className="block w-full h-full relative focus:outline-none focus:ring-2 focus:ring-[#2563EB] rounded-2xl">
                    
                    <Image
                      src={slot.article.imageUrl}
                      alt={slot.article.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transform group-hover:scale-105 transition-transform duration-[1.2s] ease-out"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none transition-opacity duration-300"></div>

                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-20">
                      <span className="text-xs sm:text-sm font-bold text-white bg-[#2563EB]/90 px-3 py-1 rounded-full backdrop-blur-sm shadow-xs">
                        {slot.article.category || 'آموزش فنی'}
                      </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col z-10">
                      <h3 className="text-xl md:text-2xl font-bold text-white line-clamp-2 mb-2 group-hover:text-[#60a5fa] transition-colors duration-300">
                        {slot.article.title}
                      </h3>
                      
                      {slot.article.excerpt && (
                        <p className="text-sm text-gray-300 line-clamp-2 mb-4 font-light leading-relaxed">
                          {slot.article.excerpt}
                        </p>
                      )}
                      
                      {!shouldReduceMotion && (
                        <div className="w-full h-[2px] bg-white/20 mb-4 relative overflow-hidden rounded-full">
                          <motion.div
                            className="absolute left-0 top-0 bottom-0 bg-[#2563EB]"
                            initial={{ width: '0%' }} animate={{ width: '100%' }}
                            transition={{ duration: slot.duration / 1000, ease: 'linear' }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                          <span>{slot.article.author || 'تیم مهندسی خوش‌صنعت'}</span>
                        </div>
                        {slot.article.readTime && (
                          <div className="flex items-center gap-1.5">
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

      </div>
    </section>
  );
}