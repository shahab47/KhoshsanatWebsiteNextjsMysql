// components/education/EducationListInteractive.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, Calendar, Search, ChevronLeft } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  author: string | null;
  readTime: number | null;
  imageUrl: string;
  createdAt: string | Date;
}

interface EducationListInteractiveProps {
  initialArticles: Article[];
}

export default function EducationListInteractive({
  initialArticles,
}: EducationListInteractiveProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = initialArticles.filter((article) => {
    const isTitleMatch = article.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const isCategoryMatch = article.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const isExcerptMatch = article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    return isTitleMatch || isCategoryMatch || isExcerptMatch;
  });

  return (
    <div className="w-full">
      {/* باکس جستجو */}
      <div className="max-w-xl mx-auto -mt-6 mb-12 relative px-4">
        <Search className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="search"
          aria-label="جستجو در مقالات"
          placeholder="جستجو در مقالات (مثلاً: فولاد، سازه، CNC، اتصالات...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pr-14 pl-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400 shadow-sm font-medium"
        />
      </div>

      {/* لیست مقالات */}
      <div className="max-w-7xl mx-auto px-6">
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300"
              >
                {/* تصویر مقاله */}
                <Link
                  href={`/education/${encodeURIComponent(article.slug)}`}
                  className="relative aspect-video overflow-hidden bg-gray-100 block"
                >
                  <img
                    src={article.imageUrl}
                    alt={`تصویر مقاله ${article.title}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    {article.category || 'عمومی'}
                  </div>
                </Link>

                {/* محتوای کارت */}
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    <Link href={`/education/${encodeURIComponent(article.slug)}`}>
                      {article.title}
                    </Link>
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1 line-clamp-3">
                    {article.excerpt || 'بدون چکیده...'}
                  </p>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-600" />
                        <span>{new Date(article.createdAt).toLocaleDateString('fa-IR')}</span>
                      </div>
                      {article.readTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-blue-600" />
                          <span>{article.readTime} دقیقه</span>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/education/${encodeURIComponent(article.slug)}`}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      aria-label="مطالعه مقاله"
                    >
                      <ChevronLeft size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <BookOpen size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">مقاله‌ای یافت نشد!</h2>
            <p className="text-gray-500">با عبارت جستجو شده، مقاله‌ای در پایگاه دانش وجود ندارد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
