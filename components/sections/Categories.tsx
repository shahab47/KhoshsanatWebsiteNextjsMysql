'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Zap, TreePine, Factory } from 'lucide-react';

type Category = {
  id: number;
  title: string;
  icon: React.ReactNode;
  subCategories: string[];
  image: string;
};

const categoriesData: Category[] = [
  {
    id: 1,
    title: "ساختمانی",
    icon: <Building2 size={24} />,
    subCategories: [
      "براکت‌های ساختمانی (کرتین وال، سرامیک خشک، درب اتوماتیک)",
      "پروفیل",
      "لوور و نمای خشک",
      "هندریل (اسپیگات، فیکس پوینت)",
      "اسپایدر (بعد از تکمیل هندریل)"
    ],
    image: "/images/construction.jpg",
  },
  {
    id: 2,
    title: "برق و مخابرات",
    icon: <Zap size={24} />,
    subCategories: [
      "تابلو برق IP55 (داخل و بیرون کار)",
      "پایه آنتن",
      "دکل مخابراتی",
      "رک سرور"
    ],
    image: "/images/electrical.jpg",
  },
  {
    id: 3,
    title: "شهرسازی",
    icon: <TreePine size={24} />,
    subCategories: [
      "میز و صندلی فضای باز (پارک، باغ ویلا)",
      "روشنایی (چراغ فضای سبز، چراغ اتوبانی)",
      "سطل زباله (کوچک و بزرگ اختصاصی)"
    ],
    image: "/images/urban.jpg",
  },
  {
    id: 4,
    title: "ماشین‌سازی",
    icon: <Factory size={24} />,
    subCategories: [
      "قاب پک",
      "بالابر",
      "خرک شیشه",
      "(امکان اجاره دستگاه‌ها)"
    ],
    image: "/images/machinery.jpg",
  }
];

export default function CategoryGrid() {
  const [largeIndex, setLargeIndex] = useState(0);
  const largeCategory = categoriesData[largeIndex];
  const smallCategories = categoriesData.filter((_, i) => i !== largeIndex);

  return (
    <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 dark:text-white mb-4">
          دسته‌بندی محصولات
        </h2>
        <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full mb-12"></div>

        {/* کانتینر اصلی با گرید دو ستونی (۲/۳ + ۱/۳) */}
        <div className="relative rounded-2xl shadow-2xl overflow-hidden">
          {/* تصویر پس‌زمینه (برای کل کانتینر) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={largeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${largeCategory.image})` }}
            />
          </AnimatePresence>

          {/* لایه تیره عمومی برای خوانایی متن سمت چپ */}
          <div className="absolute inset-0 bg-black/40" />

          {/* گرید اصلی با دو ستون - محتوا روی لایه تیره قرار می‌گیرد */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[550px]">
            {/* ستون سمت چپ - ۲/۳ عرض (2 از 3 ستون) */}
            <div className="md:col-span-2 flex items-end p-6 md:p-8 text-white">
              <motion.div
                key={largeIndex}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-blue-600/80 p-2 rounded-full">
                    {largeCategory.icon}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">{largeCategory.title}</h3>
                </div>

                <div className="mt-4">
                  <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    زیرمجموعه‌ها
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm md:text-base">
                    {largeCategory.subCategories.map((sub, idx) => (
                      <motion.li
                        key={idx}
                        whileHover={{ x: 5, color: "#93c5fd" }}
                        transition={{ type: "spring", stiffness: 400 }}
                        className="flex items-start gap-2 cursor-default"
                      >
                        <span className="text-blue-400">•</span>
                        <span>{sub}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-6 text-blue-300 hover:text-white text-sm font-medium transition"
                >
                  مشاهده همه محصولات این دسته →
                </motion.button>
              </motion.div>
            </div>

            {/* ستون سمت راست - ۱/۳ عرض (1 از 3 ستون) با افکت بلور و شفافیت */}
            <div className="md:col-span-1 bg-black/30 backdrop-blur-md border-l border-white/20 p-4 flex flex-col gap-4">
              {smallCategories.map((cat) => (
                <motion.div
                  key={cat.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLargeIndex(cat.id - 1)}
                  className="cursor-pointer"
                >
                  <SmallCard category={cat} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// کارت کوچک با شفافیت بالا و حالت شیشه‌ای
function SmallCard({ category }: { category: Category }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 transition-all hover:bg-white/20 border border-white/20">
      <div className="p-2 bg-blue-600/60 rounded-full text-white">
        {category.icon}
      </div>
      <div>
        <h3 className="font-bold text-white text-sm md:text-base">
          {category.title}
        </h3>
        <p className="text-xs text-white/70">
          {category.subCategories.length} زیرمجموعه
        </p>
      </div>
    </div>
  );
}