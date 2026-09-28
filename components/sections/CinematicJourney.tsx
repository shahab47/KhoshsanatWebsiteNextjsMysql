'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Building2,
  Maximize2,
  FileCode2,
  Flame,
  Layers,
  Sparkles,
  CheckCircle2,
  Expand,
  ArrowLeft,
  ArrowRight,
  Eye,
  Crosshair
} from 'lucide-react';

interface SceneData {
  id: number;
  stageNumber: string;
  technicalLabel: string;
  subLabel: string;
  persianHeadline: string;
  persianDescription: string;
  technicalSpecs: { label: string; value: string }[];
  imageSrc: string;
  alt: string;
  theme: 'day' | 'industrial' | 'night';
  narrativeStep: string;
}

const SCENES: SceneData[] = [
  {
    id: 1,
    stageNumber: '01',
    technicalLabel: 'THE FACADE',
    subLabel: 'CURTAIN WALL SYSTEMS',
    persianHeadline: 'ساخت، از جزئیات آغاز می‌شود.',
    persianDescription: 'پشت شیشه‌ها و هندسه باشکوه هر نمای مدرن شهری، شبکه‌ای یکپارچه از مقاطع آلومینیومی و اتصالات پنهان فولادی قرار دارد که بار باد، زلزله و وزن مدول‌ها را مهار می‌کنند.',
    technicalSpecs: [
      { label: 'FACADE TYPE', value: 'Unitized & Stick Curtain Wall' },
      { label: 'STRUCTURAL SCALE', value: 'Commercial High-Rise' },
      { label: 'ANCHOR DEPTH', value: '150mm Concrete Slab Embed' },
    ],
    imageSrc: '/images/cinematic/scene-01-facade.jpg',
    alt: 'نمای شیشه‌ای کرتین وال با نمایش مفصل اتصال گوشه و براکت سازه‌ای',
    theme: 'day',
    narrativeStep: 'BUILDING → FACADE',
  },
  {
    id: 2,
    stageNumber: '02',
    technicalLabel: 'THE DETAIL',
    subLabel: 'CUSTOM SUPPORT BRACKET // HFB-LH',
    persianHeadline: 'اتصال مهندسی‌شده؛ ستون فقرات نما',
    persianDescription: 'براکت‌های سفارشی سری HFB خوش‌صنعت با سوراخ‌های لوبیایی (Slotted) و لچکی‌های تقویتی، امکان رگلاژ سه‌بعدی میلی‌متری مولیون را در تراز اسکلت بتنی و فلزی فراهم می‌آورند.',
    technicalSpecs: [
      { label: 'MODEL CODES', value: 'HFB-LH / HFB-AP / HFB-MT' },
      { label: 'MATERIAL', value: 'Structural Steel S275 / S355' },
      { label: 'TOLERANCE', value: '3-Axis Adjustment ±15mm' },
    ],
    imageSrc: '/images/cinematic/scene-02-bracket.jpg',
    alt: 'براکت سازه‌ای سفارشی اتصالات کرتین‌وال با لچکی و شیار رگلاژ',
    theme: 'industrial',
    narrativeStep: 'FACADE → MULLION → BRACKET',
  },
  {
    id: 3,
    stageNumber: '03',
    technicalLabel: 'ENGINEERING',
    subLabel: 'SHOP DRAWING & DETAIL DEVELOPMENT',
    persianHeadline: 'از نقشه شاپ‌دراوینگ تا واقعیت ساخت',
    persianDescription: 'محاسبه بارهای ثقلی و جانبی، طراحی هندسه اتصالات و استخراج نقشه‌های اجرایی شاپ‌دراوینگ با مدل‌سازی دقیق سه‌بعدی و تلرانس‌های میلی‌متری پیش از ورود به خط تولید انجام می‌گیرد.',
    technicalSpecs: [
      { label: 'DRAFTING STD', value: 'CAD / BIM LOD 400' },
      { label: 'DIMENSIONAL TOL', value: '±0.5 mm Linear' },
      { label: 'SECTION VERIF', value: 'M16 A325 Anchor Bolts' },
    ],
    imageSrc: '/images/cinematic/scene-03-blueprint.jpg',
    alt: 'نقشه شاپ دراوینگ مهندسی مقاطع اتصال براکت و مولیون کرتین وال',
    theme: 'day',
    narrativeStep: 'DESIGN → SHOP DRAWING',
  },
  {
    id: 4,
    stageNumber: '04',
    technicalLabel: 'PRECISION FABRICATION',
    subLabel: 'CNC LASER CUTTING & MACHINING',
    persianHeadline: 'ساخت دقیق، بر اساس جزئیات مهندسی',
    persianDescription: 'برش شیت‌های فولادی سنگین با فایبر لیزر صنعتی CNC، دستیابی به لبه‌های برش بدون پلیسه، دقت بی‌نقص در قطر سوراخ‌ها و شیارهای لوبیایی را بدون تغییر در ساختار متالورژیکی ورق تضمین می‌کند.',
    technicalSpecs: [
      { label: 'PROCESS', value: 'High-Power CNC Fiber Laser' },
      { label: 'THICKNESS RANGE', value: 'Steel Plate 4mm to 25mm' },
      { label: 'KERF ACCURACY', value: '±0.1 mm Kerf Precision' },
    ],
    imageSrc: '/images/cinematic/scene-04-fabrication.jpg',
    alt: 'برش لیزری صنعتی ورق فولادی براکت با دستگاه CNC مدرن',
    theme: 'industrial',
    narrativeStep: 'RAW STEEL → CNC LASER',
  },
  {
    id: 5,
    stageNumber: '05',
    technicalLabel: 'COMPONENT ASSEMBLY',
    subLabel: 'MECHANICAL FIT & JIG ALIGNMENT',
    persianHeadline: 'هر قطعه، بخشی از یک اتصال دقیق است',
    persianDescription: 'پلیت پایه، لچکی‌های زاویه‌ای تقویت‌کننده و بازوهای نگهدارنده روی فیکسچرهای ماشین‌کاری‌شده در تقارن کامل مونتاژ شده و با پیچ‌های مقاومت بالا جهت جوشکاری آماده‌سازی می‌شوند.',
    technicalSpecs: [
      { label: 'COMPONENTS', value: 'Baseplate + Stiffeners + Hardware' },
      { label: 'ASSEMBLY JIG', value: 'Dedicated Calibration Fixture' },
      { label: 'FIT TOLERANCE', value: 'Mechanical Class Grade A' },
    ],
    imageSrc: '/images/cinematic/scene-05-assembly.jpg',
    alt: 'مونتاژ قطعات برش خورده براکت مهندسی روی میز کار صنعتی',
    theme: 'industrial',
    narrativeStep: 'SUB-PARTS → ASSEMBLY',
  },
  {
    id: 6,
    stageNumber: '06',
    technicalLabel: 'MIG / TIG / LASER WELDING',
    subLabel: 'STRUCTURAL FUSION UNDER SHIELDING GAS',
    persianHeadline: 'اتصال، نقطه آغاز است',
    persianDescription: 'جوشکاری حرفه‌ای سازه‌ای با گاز محافظ CO2/آرگون توسط اپراتورهای باتجربه؛ نفوذ کامل حوضچه مذاب در ریشه جوش، بدون تخلخل و با گرده‌جوش‌های یکنواخت برای تحمل بالاترین تنش‌های برشی و خمشی نما.',
    technicalSpecs: [
      { label: 'PROCESS', value: 'MIG (GMAW) & TIG (GTAW)' },
      { label: 'GAS MIXTURE', value: 'Ar 82% + CO2 18% Shield' },
      { label: 'WELD THROAT', value: '5mm to 8mm Continuous Fillet' },
    ],
    imageSrc: '/images/cinematic/scene-06-welding.jpg',
    alt: 'جوشکاری دقیق تخصصی تیگ روی درز براکت فلزی در کارگاه صنعتی',
    theme: 'night',
    narrativeStep: 'WELD POOL → STRUCTURAL BOND',
  },
  {
    id: 7,
    stageNumber: '07',
    technicalLabel: 'QUALITY CONTROL',
    subLabel: 'DIMENSIONAL CHECK & WELD VERIFICATION',
    persianHeadline: 'کنترل کیفیت، پیش از تحویل به کارگاه پروژه',
    persianDescription: 'سنجش ابعادی با کولیس‌های دیجیتال دقیق، بررسی ضخامت پوشش ضدخوردگی گالوانیزه/رنگ اپوکسی، و آزمون چشمی و مغناطیسی جوش، سلامت تک‌تک براکت‌ها را پیش از خروج از کارخانه تایید می‌کند.',
    technicalSpecs: [
      { label: 'INSPECTION METHOD', value: 'Digital Caliper & Visual Test (VT)' },
      { label: 'GEOMETRIC AUDIT', value: '100% Critical Hole Spacing' },
      { label: 'BATCH RELEASE', value: 'Dimensional Conformance Certificate' },
    ],
    imageSrc: '/images/cinematic/scene-07-quality.jpg',
    alt: 'مهندس کنترل کیفیت در حال اندازه گیری ابعاد براکت با کولیس دیجیتال',
    theme: 'industrial',
    narrativeStep: 'INSPECTION → DISPATCH',
  },
  {
    id: 8,
    stageNumber: '08',
    technicalLabel: 'FROM DETAIL TO FACADE',
    subLabel: 'ARCHITECTURAL INTEGRATION & SCALE',
    persianHeadline: 'از یک اتصال کوچک تا یک نمای کامل',
    persianDescription: 'هزاران براکت فولادی ساخته‌شده در کارگاه خوش‌صنعت، در هماهنگی کامل روی طبقات آسمان‌خراش نصب شده و نمایی صلب، ایمن و چشم‌نواز را در برابر سخت‌ترین شرایط جوی برپا می‌دارند.',
    technicalSpecs: [
      { label: 'SYSTEM COHESION', value: 'End-to-End Precision' },
      { label: 'FINAL DESTINATION', value: 'Architectural Commercial Tower' },
      { label: 'BRAND PROMISE', value: 'Precision In Every Connection' },
    ],
    imageSrc: '/images/cinematic/scene-08-project.jpg',
    alt: 'برج مدرن با نمای کرتین وال تمام قد و اتصالات یکپارچه مهندسی',
    theme: 'day',
    narrativeStep: 'DETAIL → ARCHITECTURAL FACADE',
  },
];

export default function CinematicJourney() {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const currentScene = SCENES[activeSceneIndex];

  const handleNext = () => {
    setActiveSceneIndex((prev) => (prev < SCENES.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setActiveSceneIndex((prev) => (prev > 0 ? prev - 1 : SCENES.length - 1));
  };

  // تعیین استایل کانتینر با توجه به تم صحنه (روز، صنعتی، شب)
  const getContainerBg = (theme: 'day' | 'industrial' | 'night') => {
    switch (theme) {
      case 'night':
        return 'bg-[#11151B] text-white';
      case 'industrial':
        return 'bg-[#2D3644] text-white';
      case 'day':
      default:
        return 'bg-[#F5F7FA] text-[#2D3644]';
    }
  };

  const isDarkScene = currentScene.theme === 'night' || currentScene.theme === 'industrial';

  return (
    <section
      id="narrative-journey"
      className={`relative py-20 md:py-28 transition-colors duration-700 overflow-hidden ${getContainerBg(currentScene.theme)}`}
      dir="rtl"
    >
      {/* گرید مهندسی پس‌زمینه هماهنگ با تم روز/شب */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          isDarkScene ? 'engineering-grid-dark opacity-30' : 'engineering-grid-light opacity-50'
        }`}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        
        {/* سربرگ بخش روایی */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b pb-8 border-current/10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-[#2563EB] mb-2 uppercase" dir="ltr">
              <span className="w-2 h-0.5 bg-[#2563EB]" />
              THE CINEMATIC NARRATIVE // FROM DETAIL TO FACADE
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              مسیر خلق؛ از جزئی‌ترین اتصال تا چشم‌نوازترین نما
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto" dir="ltr">
            <span className="text-xs font-mono opacity-60">
              STAGE {currentScene.stageNumber} OF {SCENES.length.toString().padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1.5 mr-3">
              <button
                onClick={handlePrev}
                aria-label="صحنه قبلی"
                className={`p-2.5 rounded-lg border transition-all ${
                  isDarkScene
                    ? 'border-white/15 hover:bg-white/10 text-white'
                    : 'border-black/10 hover:bg-black/5 text-[#2D3644]'
                }`}
              >
                <ArrowRight size={18} />
              </button>
              <button
                onClick={handleNext}
                aria-label="صحنه بعدی"
                className={`p-2.5 rounded-lg border transition-all ${
                  isDarkScene
                    ? 'border-white/15 hover:bg-white/10 text-white'
                    : 'border-black/10 hover:bg-black/5 text-[#2D3644]'
                }`}
              >
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* نوار ناوبری مرحله‌های روایی (Timeline Indicators) */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-12" dir="ltr">
          {SCENES.map((scene, idx) => {
            const isActive = idx === activeSceneIndex;
            return (
              <button
                key={scene.id}
                onClick={() => setActiveSceneIndex(idx)}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all relative ${
                  isActive
                    ? 'border-[#2563EB] bg-[#2563EB]/10 shadow-xs'
                    : isDarkScene
                    ? 'border-white/10 hover:border-white/30 bg-white/5'
                    : 'border-gray-200 hover:border-gray-400 bg-white'
                }`}
              >
                <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#2563EB]' : 'opacity-60'}`}>
                  {scene.stageNumber}
                </span>
                <span className={`text-[11px] font-semibold truncate ${isActive ? 'text-[#2563EB]' : 'opacity-80'}`}>
                  {scene.technicalLabel}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeSceneIndicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[#2563EB] rounded-b-xl"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* کارت نمایش صحنه فعال (نمایش سینمایی دو ستونه) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -15 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`rounded-3xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-sm ${
              isDarkScene
                ? 'bg-white/[0.03] border-white/10'
                : 'bg-white border-gray-200'
            }`}
          >
            {/* ستون متن و مشخصات فنی */}
            <div className="lg:col-span-5 p-8 sm:p-10 md:p-12 flex flex-col justify-between order-2 lg:order-1">
              <div>
                {/* نشانگر مرحله اتصال */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#2563EB]/10 text-[#2563EB] text-xs font-mono font-bold uppercase tracking-wider mb-6" dir="ltr">
                  <Crosshair size={13} />
                  <span>STEP {currentScene.stageNumber}: {currentScene.narrativeStep}</span>
                </div>

                {/* برچسب فنی انگلیسی */}
                <div className="text-xs font-mono tracking-widest text-[#6C6C6E] uppercase mb-1" dir="ltr">
                  {currentScene.technicalLabel}
                </div>
                <div className="text-xs font-mono text-[#2563EB] mb-4 uppercase" dir="ltr">
                  // {currentScene.subLabel}
                </div>

                {/* تیتر فارسی صحنه */}
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  {currentScene.persianHeadline}
                </h3>

                {/* شرح روایی */}
                <p className={`text-sm sm:text-base leading-relaxed mb-8 ${isDarkScene ? 'text-gray-300' : 'text-[#6C6C6E]'}`}>
                  {currentScene.persianDescription}
                </p>
              </div>

              {/* جدول مشخصات فنی و تلرانس‌ها */}
              <div className="border-t pt-6 border-current/10">
                <div className="text-[11px] font-mono tracking-wider opacity-60 uppercase mb-3" dir="ltr">
                  ENGINEERING SPECIFICATIONS
                </div>
                <div className="space-y-2.5">
                  {currentScene.technicalSpecs.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between text-xs font-mono border-b border-current/5 pb-2"
                      dir="ltr"
                    >
                      <span className="opacity-60">{spec.label}</span>
                      <span className="font-bold text-[#2563EB]">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ستون تصویر سینمایی صحنه */}
            <div className="lg:col-span-7 relative min-h-[360px] sm:min-h-[460px] lg:min-h-full overflow-hidden order-1 lg:order-2 group">
              <Image
                src={currentScene.imageSrc}
                alt={currentScene.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-105 will-change-transform"
              />

              {/* فیلتر گرادیان ظریف روی لبه‌ها */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/30" />

              {/* نشانگر نام صحنه روی تصویر */}
              <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono" dir="ltr">
                SCENE {currentScene.stageNumber} // {currentScene.technicalLabel}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* پاورقی بخش روایی با شعار سازمانی */}
        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono opacity-70">
          <div className="flex items-center gap-2" dir="ltr">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            <span>PRECISION IN EVERY CONNECTION</span>
          </div>
          <div className="text-right">
            <span>دقت در هر اتصال — از ورق فولادی تا آسمان‌خراش</span>
          </div>
        </div>

      </div>
    </section>
  );
}
