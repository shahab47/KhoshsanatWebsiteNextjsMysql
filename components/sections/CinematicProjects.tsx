'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  ArrowLeft,
  Building,
  Layers,
  Crosshair,
  ExternalLink,
  ChevronRight,
  Maximize2
} from 'lucide-react';

export interface Project {
  id: number;
  title: string;
  slug: string;
  category?: string;
  location?: string;
  content?: string;
  imageUrl: string;
  isActive: boolean;
}

interface CinematicProjectsProps {
  initialProjects?: Project[];
}

export default function CinematicProjects({ initialProjects }: CinematicProjectsProps = {}) {
  const shouldReduceMotion = useReducedMotion();
  const activeInitial = (initialProjects || []).filter((p) => p.isActive !== false);

  const [projects, setProjects] = useState<Project[]>(() => activeInitial);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number>(0);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => !initialProjects || initialProjects.length === 0);

  useEffect(() => {
    if (initialProjects && initialProjects.length > 0) return;

    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[] | { error?: string }) => {
        if ('error' in data && data.error) throw new Error(data.error);
        const active = (data as Project[]).filter((p) => p.isActive !== false);
        setProjects(active);
      })
      .catch((err) => console.warn('خطا در دریافت پروژه‌ها:', err))
      .finally(() => setLoading(false));
  }, [initialProjects]);

  if (loading && projects.length === 0) {
    return (
      <section className="py-20 bg-[#F5F7FA] text-center" dir="rtl">
        <p className="text-[#6C6C6E] font-mono text-sm animate-pulse">در حال بارگذاری ویترین پروژه‌ها...</p>
      </section>
    );
  }

  if (projects.length === 0) return null;

  const currentProject = projects[selectedProjectIndex] || projects[0];

  return (
    <section className="py-20 md:py-28 bg-[#F5F7FA] border-t border-gray-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* سربرگ بخش پروژه‌ها */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-2 uppercase" dir="ltr">
              <span className="w-2 h-0.5 bg-[#2563EB]" />
              ARCHITECTURAL PORTFOLIO // SCALE & INTEGRATION
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D3644] tracking-tight">
              ویترین پروژه‌ها؛ از مقیاس سازه تا دقت اتصال
            </h2>
            <p className="text-sm md:text-base text-[#6C6C6E] mt-2 max-w-2xl">
              نگاهی به برج‌ها و ساختمان‌های تجاری شاخص که اتصالات سازه‌ای، براکت‌های کرتین‌وال و پوسته‌های فلزی نمای آن‌ها توسط مهندسی خوش‌صنعت ساخته شده است.
            </p>
          </div>

          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] hover:text-[#1d4ed8] group self-start md:self-auto py-2"
          >
            <span>مشاهده همه پروژه‌ها</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* نمایش اصلی تعاملی پروژه‌ها: استیج تصویر بزرگ + مشخصات مهندسی */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          
          {/* کارت تصویر بزرگ پروژه فعال (با انیمیشن فوکوس معماری) */}
          <div className="lg:col-span-8 relative rounded-3xl overflow-hidden bg-[#2D3644] border border-gray-300 shadow-sm aspect-video sm:aspect-[16/10] group">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentProject.id}
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="relative w-full h-full"
              >
                <Image
                  src={currentProject.imageUrl || '/images/cinematic/scene-08-project.jpg'}
                  alt={currentProject.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />

                {/* گرادیان سایه برای خوانایی متن */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* نشانگر ردیاب مهندسی روی تصویر */}
                <div className="absolute top-6 left-6 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-mono" dir="ltr">
                  <Crosshair size={13} className="text-[#2563EB]" />
                  <span>FACADE SCOPE: CURTAIN WALL & STEEL BRACKETS</span>
                </div>

                {/* اطلاعات متنی روی تصویر اصلی */}
                <div className="absolute bottom-6 sm:bottom-8 inset-x-6 sm:inset-x-8 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#60a5fa] mb-2 uppercase" dir="ltr">
                      <span>{currentProject.category || 'COMMERCIAL ARCHITECTURE'}</span>
                      {currentProject.location && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {currentProject.location}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-sm">
                      {currentProject.title}
                    </h3>
                  </div>

                  <Link
                    href={`/projects/${currentProject.slug || currentProject.id}`}
                    className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md self-start sm:self-auto shrink-0"
                  >
                    <span>جزئیات مهندسی</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ستون کناری: لیست گزینش پروژه‌ها و جزئیات شاپ‌دراوینگ */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="text-xs font-mono text-[#6C6C6E] uppercase tracking-wider mb-1" dir="ltr">
              SELECT ARCHITECTURAL PROJECT //
            </div>

            <div className="space-y-3">
              {projects.slice(0, 4).map((p, idx) => {
                const isSelected = idx === selectedProjectIndex;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectIndex(idx)}
                    className={`w-full text-right p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-white border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                        : 'bg-white/70 hover:bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                        <Image
                          src={p.imageUrl || '/images/cinematic/scene-08-project.jpg'}
                          alt={p.title}
                          fill
                          sizes="60px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-[#2563EB]' : 'text-[#2D3644]'}`}>
                          {p.title}
                        </h4>
                        <p className="text-xs text-[#6C6C6E] truncate mt-0.5">
                          {p.category || 'پروژه شاخص معماری'}
                        </p>
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'text-[#2563EB] bg-[#2563EB]/10' : 'text-gray-400'}`}>
                      <ChevronRight size={16} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* کارت مشخصات فنی اتصال پروژه فعال */}
            <div className="mt-4 p-5 rounded-2xl bg-[#2D3644] text-white border border-white/10 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-mono text-[#60a5fa] mb-3" dir="ltr">
                <Layers size={14} />
                <span>CONNECTION BLUEPRINT SCOPE</span>
              </div>
              <div className="text-xs text-gray-300 leading-relaxed">
                {currentProject.content ? (
                  <p className="line-clamp-3">{currentProject.content.replace(/<[^>]*>?/gm, '')}</p>
                ) : (
                  <p>تولید براکت‌های اتصال فولادی مولیون به اسکلت اصلی، مقاطع فولادی گالوانیزه ضدخوردگی و مونتاژ طبق نقشه‌های شاپ‌دراوینگ مهندسی نما.</p>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
