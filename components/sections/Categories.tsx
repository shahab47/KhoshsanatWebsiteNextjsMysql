'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Zap, TreePine, Factory, Loader2 } from 'lucide-react';
import Link from 'next/link';

// ======================== types ========================
export type SubcategoryFromAPI = {
  id: number;
  title: string;
  description: string | null;
  categoryId: number;
  order: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type CategoryFromAPI = {
  id: number;
  title: string;
  slug: string;
  icon?: string | null;
  imageUrl?: string | null;
  imageSize?: number | null;
  order: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  subcategories: SubcategoryFromAPI[];
};

type Subcategory = {
  id: number;
  title: string;
  displayText: string; // title + (description)
};

type Category = {
  id: number;
  title: string;
  slug: string;
  icon: React.ReactNode;
  subcategories: Subcategory[];
  image: string;
};

// ======================== mapping icon names ========================
const iconMap = {
  Building2: Building2,
  Zap: Zap,
  TreePine: TreePine,
  Factory: Factory,
};

function getIconComponent(iconName?: string | null, size = 24) {
  if (!iconName) return <Building2 size={size} />;
  const Icon = iconMap[iconName as keyof typeof iconMap];
  if (!Icon) return <Building2 size={size} />;
  return <Icon size={size} />;
}

// ======================== transform API data ========================
function transformCategory(raw: CategoryFromAPI): Category {
  const subcategories = (raw.subcategories || []).map((sub) => ({
    id: sub.id,
    title: sub.title,
    displayText: sub.description ? `${sub.title} (${sub.description})` : sub.title,
  }));

  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    icon: getIconComponent(raw.icon, 24),
    subcategories,
    image: raw.imageUrl || '/placeholder.jpg',
  };
}

// ======================== Small Card Component ========================
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
          {category.subcategories.length} زیرمجموعه
        </p>
      </div>
    </div>
  );
}

interface CategoryGridProps {
  initialCategories?: CategoryFromAPI[];
}

// ======================== Main Component ========================
export default function CategoryGrid({ initialCategories }: CategoryGridProps = {}) {
  const [categories, setCategories] = useState<Category[]>(() =>
    initialCategories && initialCategories.length > 0
      ? initialCategories.filter((c) => c.isActive !== false).map(transformCategory)
      : []
  );
  const [loading, setLoading] = useState<boolean>(() => !initialCategories || initialCategories.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [largeIndex, setLargeIndex] = useState(0); // شاخص دسته بزرگ

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) return;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error(`خطا در دریافت داده‌ها: ${res.status}`);
        const rawData: CategoryFromAPI[] = await res.json();
        const activeCategories = rawData.filter((cat) => cat.isActive);
        const transformed = activeCategories.map(transformCategory);
        setCategories(transformed);
        setLargeIndex(0);
      } catch (err) {
        console.error(err);
        setError('امکان بارگذاری دسته‌بندی‌ها وجود ندارد.');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [initialCategories]);

  if (loading) {
    return (
      <section className="py-16 px-4 md:px-8 bg-ks-dark">
        <div className="max-w-7xl mx-auto text-center">
          <Loader2 className="w-12 h-12 animate-spin text-ks-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">در حال بارگذاری دسته‌بندی‌ها...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4 md:px-8 bg-ks-dark">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-red-950/40 border border-red-800 text-red-300 p-4 rounded-xl max-w-md mx-auto">
            {error}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-16 px-4 md:px-8 bg-ks-dark">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">هیچ دسته‌بندی فعالی یافت نشد.</p>
        </div>
      </section>
    );
  }

  const largeCategory = categories[largeIndex] || categories[0];
  const smallCategories = categories.filter((_, i) => i !== largeIndex);

  return (
    <section className="py-16 px-4 md:px-8 bg-ks-dark" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-2xl shadow-xl overflow-hidden border border-white/10">
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

          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[520px]">
            {/* ستون سمت راست - دسته بزرگ */}
            <div className="md:col-span-2 flex items-end p-6 md:p-8 text-white">
              <motion.div
                key={largeIndex}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-ks-blue-500 p-2.5 rounded-xl shadow-md">
                    {largeCategory.icon}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white">{largeCategory.title}</h3>
                </div>

                <div className="mt-6">
                  <h4 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                    زیرمجموعه‌ها و قطعات
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm md:text-base">
                    {largeCategory.subcategories.map((sub) => (
                      <motion.li
                        key={sub.id}
                        whileHover={{ x: -4, color: "#60a5fa" }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Link
                          href={`/products?category=${encodeURIComponent(largeCategory.slug)}&subcategory=${sub.id}`}
                          className="flex items-start gap-2 text-gray-200 hover:text-ks-blue-400 transition-colors"
                        >
                          <span className="text-ks-blue-400">•</span>
                          <span>{sub.displayText}</span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/products?category=${encodeURIComponent(largeCategory.slug)}`}
                  className="inline-flex items-center gap-2 mt-8 text-ks-blue-300 hover:text-white text-sm font-bold bg-white/10 hover:bg-ks-blue-500 px-4 py-2 rounded-xl transition-all border border-white/10"
                >
                  مشاهده همه محصولات این دسته
                  <span>←</span>
                </Link>
              </motion.div>
            </div>

            {/* ستون کناری - سایر دسته‌ها */}
            <div className="md:col-span-1 bg-ks-dark-950/70 backdrop-blur-md border-r border-white/10 p-4 flex flex-col gap-3">
              {smallCategories.length > 0 ? (
                smallCategories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLargeIndex(categories.findIndex(c => c.id === cat.id))}
                    className="cursor-pointer"
                  >
                    <SmallCard category={cat} />
                  </motion.div>
                ))
              ) : (
                <div className="text-gray-400 text-center py-8 text-sm">
                  دسته‌بندی دیگری وجود ندارد
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}