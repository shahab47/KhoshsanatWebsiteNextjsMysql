'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Flame,
  Crosshair,
  ShieldCheck,
  Compass,
  Layers,
  ArrowLeft,
  FileCheck2,
  Cpu
} from 'lucide-react';

interface Capability {
  id: string;
  code: string;
  title: string;
  englishTitle: string;
  description: string;
  specs: string[];
  icon: React.ReactNode;
}

const CAPABILITIES: Capability[] = [
  {
    id: 'welding',
    code: 'CAP-01',
    title: 'جوشکاری تخصصی سازه‌ای MIG / TIG',
    englishTitle: 'MIG / TIG STRUCTURAL WELDING',
    description: 'اجرای خطوط جوش صلب و آب‌بند بر روی براکت‌ها و مقاطع فولادی با گاز محافظ استاندارد و نفوذ کامل در ریشه اتصال.',
    specs: ['تست چشمی VT و مایعات نافذ PT', 'بدون تخلخل و با گرده‌جوش یکنواخت', 'الکترود و سیم‌جوش‌های گرید استاندارد'],
    icon: <Flame size={24} className="text-[#2563EB]" />,
  },
  {
    id: 'laser-cutting',
    code: 'CAP-02',
    title: 'برش لیزر صنعتی CNC',
    englishTitle: 'HIGH-POWER CNC FIBER LASER',
    description: 'برش شیت‌های فولادی ساختمانی از ضخامت‌های کم تا ورق‌های ضخیم ۲۵ میلی‌متر با تلرانس ابعادی زیر ۰.۱ میلی‌متر بدون اعوجاج حرارتی.',
    specs: ['دقت برش خطی ±0.1mm', 'سوراخ‌کاری و شیارهای لوبیایی منظم', 'لبه‌های کاملاً صیقلی بدون پلیسه'],
    icon: <Cpu size={24} className="text-[#2563EB]" />,
  },
  {
    id: 'curtain-wall',
    code: 'CAP-03',
    title: 'براکت‌ها و اتصالات کرتین‌وال',
    englishTitle: 'CURTAIN WALL BRACKET SYSTEMS',
    description: 'تولید انواع براکت‌های نگهدارنده مولیون، اسپیگات، اسپایدر و فیکس‌پوینت‌های استنلس استیل برای نماهای مدرن شیشه‌ای و خشک.',
    specs: ['امکان رگلاژ سه‌بعدی در کارگاه پروژه', 'مهاربندی ایمن در برابر بارهای جانبی باد', 'پوشش‌های گالوانیزه گرم و زینک ریچ'],
    icon: <Layers size={24} className="text-[#2563EB]" />,
  },
  {
    id: 'press-brake',
    code: 'CAP-04',
    title: 'خم‌کاری CNC پرس برک',
    englishTitle: 'CNC HYDRAULIC PRESS BRAKE',
    description: 'فرم‌دهی و خم‌کاری دقیق ورق‌های ضخیم با تناژ بالا و بدون ترک‌خوردگی در خط خم با محاسبه دقیق K-Factor ورق.',
    specs: ['دقت تکرارپذیری زاویه خم ±0.5 درجه', 'فرم‌دهی مقاطع ناودانی و نبشی خاص', 'طول خم‌کاری صنعتی پیوسته'],
    icon: <Crosshair size={24} className="text-[#2563EB]" />,
  },
  {
    id: 'structural',
    code: 'CAP-05',
    title: 'ساخت سازه و اسکلت فلزی',
    englishTitle: 'STRUCTURAL STEEL FABRICATION',
    description: 'ساخت اسکلت‌های سبک و سنگین ساختمانی، فریم‌های زیرسازی نما و سازه‌های نگهدارنده تاسیسات صنعتی طبق آیین‌نامه‌های معتبر.',
    specs: ['تطابق ابعادی با اسکلت بتنی و فلزی', 'سوراخ‌کاری فابریک با فواصل دقیق بولت', 'مونتاژ کارگاهی کنترل‌شده'],
    icon: <Compass size={24} className="text-[#2563EB]" />,
  },
  {
    id: 'engineering',
    code: 'CAP-06',
    title: 'شاپ‌دراوینگ و مهندسی نما',
    englishTitle: 'SHOP DRAWING & DETAIL DESIGN',
    description: 'بررسی نقشه‌های معماری، بهینه‌سازی دیتیل اتصالات جهت سهولت تولید و کاهش پرت آهن‌آلات و تهیه نقشه‌های ساخت دقیق کارگاهی.',
    specs: ['مدل‌سازی سه‌بعدی CAD / Tekla', 'محاسبه بارهای ثقلی و لرزه‌ای نما', 'چک‌لیست کنترل ابعادی پیش از ساخت'],
    icon: <FileCheck2 size={24} className="text-[#2563EB]" />,
  },
];

export default function TechnicalCapabilities() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-20 md:py-28 bg-[#F5F7FA] border-t border-gray-200" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* سربرگ بخش توانمندی‌های مهندسی */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-2 uppercase" dir="ltr">
              <span className="w-2 h-0.5 bg-[#2563EB]" />
              MANUFACTURING CAPABILITIES // PRECISION METALWORK
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D3644] tracking-tight">
              توانمندی‌های مهندسی و خط تولید
            </h2>
            <p className="text-sm md:text-base text-[#6C6C6E] mt-2 max-w-2xl">
              تجهیزات مدرن تولیدی همراه با تجربه مهندسی خوش‌صنعت، تضمین‌کننده کیفیت و ثبات ابعادی در تیراژهای انبوه پروژه‌های ساختمانی است.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] hover:text-[#1d4ed8] group self-start md:self-auto py-2"
          >
            <span>استعلام ظرفیت تولید</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>

        {/* کارت‌های توانمندی‌های فنی ۶ گانه */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((cap, idx) => (
            <motion.div
              key={cap.id}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : idx * 0.07 }}
              className="bg-white p-7 rounded-2xl border border-gray-200 hover:border-[#2563EB]/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* نوار کد فنی بالای کارت */}
                <div className="flex items-center justify-between mb-5">
                  <div className="p-3 rounded-xl bg-[#F5F7FA] border border-gray-100">
                    {cap.icon}
                  </div>
                  <span className="text-[11px] font-mono text-[#6C6C6E] tracking-wider" dir="ltr">
                    {cap.code}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-[#2563EB] uppercase mb-1" dir="ltr">
                  {cap.englishTitle}
                </div>
                <h3 className="text-lg font-bold text-[#2D3644] mb-3">
                  {cap.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6C6C6E] leading-relaxed mb-6">
                  {cap.description}
                </p>
              </div>

              {/* چک‌لیست مشخصات فنی */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                {cap.specs.map((spec, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2 text-xs text-[#2D3644]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
