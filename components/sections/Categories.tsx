'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Zap, TreePine, Factory, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ======================== types ========================
type SubcategoryFromAPI = {
  id: number;
  title: string;
  description: string | null;
  categoryId: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategoryFromAPI = {
  id: number;
  title: string;
  slug: string;
  icon: 'Building2' | 'Zap' | 'TreePine' | 'Factory';
  imageUrl: string;
  imageSize: number;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

function getIconComponent(iconName: string, size = 24) {
  const Icon = iconMap[iconName as keyof typeof iconMap];
  if (!Icon) return <Building2 size={size} />;
  return <Icon size={size} />;
}

// ======================== transform API data ========================
function transformCategory(raw: CategoryFromAPI): Category {
  const subcategories = raw.subcategories.map((sub) => ({
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
    image: raw.imageUrl,
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

// ======================== Main Component ========================
export default function CategoryGrid() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [largeIndex, setLargeIndex] = useState(0); // شاخص دسته بزرگ

  useEffect(() => {
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
  }, []);

  const navigateToCategory = (slug: string) => {
    router.push(`/products?category=${slug}`);
  };

  const navigateToSubcategory = (categorySlug: string, subcategoryId: number) => {
    router.push(`/products?category=${categorySlug}&subcategory=${subcategoryId}`);
  };

  if (loading) {
    return (
      <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">در حال بارگذاری دسته‌بندی‌ها...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-xl">
            {error}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-300">هیچ دسته‌بندی فعالی یافت نشد.</p>
        </div>
      </section>
    );
  }

  const largeCategory = categories[largeIndex];
  const smallCategories = categories.filter((_, i) => i !== largeIndex);

  return (
    <section className="py-16 px-4 md:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-2xl shadow-2xl overflow-hidden">
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

          <div className="absolute inset-0 bg-black/40" />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-0 min-h-[550px]">
            {/* ستون سمت چپ - دسته بزرگ */}
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
                    {largeCategory.subcategories.map((sub) => (
                      <motion.li
                        key={sub.id}
                        whileHover={{ x: 5, color: "#93c5fd" }}
                        transition={{ type: "spring", stiffness: 400 }}
                        className="flex items-start gap-2 cursor-pointer"
                        onClick={() => navigateToSubcategory(largeCategory.slug, sub.id)}
                      >
                        <span className="text-blue-400">•</span>
                        <span>{sub.displayText}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateToCategory(largeCategory.slug)}
                  className="mt-6 text-blue-300 hover:text-white text-sm font-medium transition"
                >
                  مشاهده همه محصولات این دسته →
                </motion.button>
              </motion.div>
            </div>

            {/* ستون سمت راست - سایر دسته‌ها (قابل کلیک برای بزرگ شدن) */}
            <div className="md:col-span-1 bg-black/30 backdrop-blur-md border-l border-white/20 p-4 flex flex-col gap-4">
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
                <div className="text-white/60 text-center py-8 text-sm">
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