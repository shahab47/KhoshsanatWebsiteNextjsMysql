'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, ChevronLeft, ChevronRight, Search, Package } from 'lucide-react';

// ==========================================
// 1. تعریف اینترفیس‌های تایپ‌اسکریپت
// ==========================================
interface Subcategory {
  id: number;
  title: string;
  categoryId: number;
}

interface Category {
  id: number;
  title: string;
  slug: string;
  catalogUrl: string | null;
  subcategories: Subcategory[];
}

interface Product {
  id: number;
  title: string;
  slug: string;
  shortDesc: string | null;
  description: string;
  imageUrl: string;
  subcategoryId: number;
}

export default function ProductsPage() {
  // ==========================================
  // 2. State ها
  // ==========================================
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyCatalog, setCompanyCatalog] = useState<string | null>(null);
  
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSlidePage, setCurrentSlidePage] = useState<number>(0);

  // رفرنس برای اسلایدر دسکتاپ
  const sliderRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 3. دریافت اطلاعات از API
  // ==========================================
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const catsRes = await fetch('/api/categories');
        const catsData = await catsRes.json();
        if (Array.isArray(catsData)) setCategories(catsData);

        const prodsRes = await fetch('/api/products');
        const prodsData = await prodsRes.json();
        if (Array.isArray(prodsData)) setProducts(prodsData);

        const catCatalogRes = await fetch('/api/products?action=company-catalog');
        const catCatalogData = await catCatalogRes.json();
        if (catCatalogData?.url) setCompanyCatalog(catCatalogData.url);

      } catch (error) {
        console.error("خطا در دریافت اطلاعات دیتابیس:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // با تغییر دسته‌بندی، اسکرول اسلایدر را به ابتدا برگردان
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      setCurrentSlidePage(0);
    }
  }, [activeCategoryId]);

  // ==========================================
  // 4. منطق فیلتر و جستجو
  // ==========================================
  const activeCategoryData = activeCategoryId !== 'all' 
    ? categories.find(c => c.id === activeCategoryId) 
    : null;

  const validSubcategoryIds = activeCategoryData 
    ? activeCategoryData.subcategories.map(sub => sub.id)
    : [];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategoryId === 'all' || validSubcategoryIds.includes(product.subcategoryId);
    return matchesSearch && matchesCategory;
  });

  // ==========================================
  // 5. توابع اسلایدر دسکتاپ و نقاط (Dots)
  // ==========================================
  const scrollSlider = (direction: 'right' | 'left') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    // با استفاده از قدر مطلق (چون در حالت RTL ممکن است اعداد منفی باشند)
    const absScroll = Math.abs(scrollLeft);
    const page = Math.round(absScroll / clientWidth);
    setCurrentSlidePage(page);
  };

  const scrollToPage = (pageIndex: number) => {
    if (sliderRef.current) {
      const { clientWidth } = sliderRef.current;
      const isRTL = getComputedStyle(sliderRef.current).direction === 'rtl';
      const scrollPos = pageIndex * clientWidth * (isRTL ? -1 : 1);
      sliderRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  };

  // محاسبه تعداد نقاط راهنما (با فرض نمایش حدود 4 محصول در هر نمای دسکتاپ)
  const totalDots = Math.ceil(filteredProducts.length / 4);

  // استخراج تمام دسته‌بندی‌هایی که کاتالوگ دارند
  const categoriesWithCatalogs = categories.filter(c => c.catalogUrl !== null);

  // ==========================================
  // 6. رابط کاربری (UI)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20 font-[Vazir,'vazirmatn',sans-serif]" dir="rtl">
      
      {/* 1. Breadcrumb (نوار مسیر) */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronLeft size={16} />
          <span className="text-gray-800 font-bold">محصولات ما</span>
        </div>
      </div>

      {/* هدر صفحه */}
      <div className="pt-16 pb-8 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 font-[Yekan,'B_Yekan',sans-serif] tracking-tight">
          محصولات ما
        </h1>
        <p className="text-lg text-gray-600 font-medium max-w-2xl mx-auto">
          اتصالات مدرن، سازه‌های ماندگار؛ تجربه‌ای از کیفیت و دوام در محصولات خوش‌صنعت
        </p>

        {/* بخش دانلود تمامی کاتالوگ‌ها */}
        {(companyCatalog || categoriesWithCatalogs.length > 0) && (
          <div className="flex flex-wrap justify-center items-center gap-3 mt-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* کاتالوگ شرکت */}
            {companyCatalog && (
              <a 
                href={companyCatalog} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-800 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:border-blue-600 hover:text-blue-600 transition-all duration-300"
              >
                <Download size={16} className="text-blue-500" />
                کاتالوگ جامع شرکت
              </a>
            )}

            {/* کاتالوگ‌های دسته‌بندی‌ها */}
            {categoriesWithCatalogs.map(cat => (
              <a 
                key={cat.id}
                href={cat.catalogUrl!} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:shadow-md hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                <Download size={16} />
                کاتالوگ {cat.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* نوار جستجو و تب‌های دسته‌بندی */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-10">
        
        {/* جستجو (وسط‌چین شده) */}
        <div className="mb-8 max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="جستجوی محصول در این دسته..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-full py-3.5 px-6 pr-12 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all text-gray-700 font-medium"
          />
          <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* منوی دسته‌بندی */}
        <div className="flex justify-start md:justify-center overflow-x-auto overflow-y-hidden whitespace-nowrap gap-6 pb-2 custom-scrollbar border-b border-gray-200">
          <button
            onClick={() => setActiveCategoryId('all')}
            className={`pb-4 text-[16px] transition-all duration-300 relative ${
              activeCategoryId === 'all' ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium hover:text-gray-800'
            }`}
          >
            همه محصولات
            {activeCategoryId === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full"></span>
            )}
          </button>
          
          {categories.map(category => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                className={`pb-4 text-[16px] transition-all duration-300 relative ${
                  isActive ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium hover:text-gray-800'
                }`}
              >
                {category.title}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 rounded-t-full"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* بخش اصلی نمایش محصولات */}
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {loading ? (
          /* اسکلتون لودینگ */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-[8px] p-4 flex flex-col h-[360px] md:h-[460px] shadow-sm border border-gray-100 animate-pulse">
                <div className="w-full h-[150px] md:h-[200px] bg-gray-200 rounded-lg mb-4"></div>
                <div className="w-3/4 h-5 bg-gray-200 rounded mb-2"></div>
                <div className="w-full h-4 bg-gray-200 rounded mb-1"></div>
                <div className="w-full h-4 bg-gray-200 rounded mb-1"></div>
                <div className="w-2/3 h-4 bg-gray-200 rounded mt-auto"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          
          /* کانتینر محصولات (دارای دکمه‌های مجزا در دو طرف) */
          <div className="flex items-center gap-4 relative">
            
            {/* دکمه راست (عقب در RTL) - بیرون از اسلایدر */}
            <button 
              onClick={() => scrollSlider('right')}
              className="hidden md:flex flex-shrink-0 w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all duration-300"
            >
              <ChevronRight size={24} />
            </button>

            <div 
              ref={sliderRef}
              onScroll={handleScroll}
              className="grid grid-cols-2 gap-4 md:flex md:flex-row md:overflow-x-auto overflow-y-hidden md:snap-x md:gap-6 py-4 -my-4 px-2 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-in fade-in duration-700"
            >
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="md:min-w-[280px] md:max-w-[280px] md:snap-center h-[360px] md:h-[460px] bg-white rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)] transition-all duration-300 overflow-hidden flex flex-col cursor-pointer border border-transparent hover:border-blue-100"
                >
                  {/* تصویر */}
                  <div className="w-full h-[150px] md:h-[200px] overflow-hidden relative bg-gray-100 border-b border-gray-50 flex-shrink-0">
                    <img 
                      src={product.imageUrl} 
                      alt={product.title} 
                      className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-[1.05]"
                    />
                  </div>

                  {/* محتوای کارت */}
                  <div className="p-3 md:p-5 flex flex-col flex-grow">
                    <h3 className="font-[Yekan,'B_Yekan',sans-serif] font-bold text-[14px] md:text-[18px] text-[#1F2937] md:mt-[4px] line-clamp-2 leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-[12px] md:text-[14px] text-[#6B7280] mt-[6px] md:mt-[10px] line-clamp-4 leading-relaxed">
                      {product.shortDesc || product.description?.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                    </p>
                    
                    {/* دکمه اطلاعات بیشتر */}
                    <div className="mt-auto pt-[12px] md:pt-[16px]">
                      <a 
                        href={`/products/${product.slug}`}
                        className="inline-flex w-full md:w-auto justify-center items-center gap-1 border border-blue-600 text-blue-600 px-3 md:px-5 py-1.5 md:py-2.5 rounded-full text-[12px] md:text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors duration-300"
                      >
                        اطلاعات بیشتر
                        <ChevronLeft size={16} className="rtl:rotate-0 ltr:rotate-180" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* دکمه چپ (جلو در RTL) - بیرون از اسلایدر */}
            <button 
              onClick={() => scrollSlider('left')}
              className="hidden md:flex flex-shrink-0 w-12 h-12 bg-white rounded-full shadow-md border border-gray-200 items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all duration-300"
            >
              <ChevronLeft size={24} />
            </button>

          </div>
        ) : (
          /* حالت خالی (بدون محصول) */
          <div className="text-center py-20 md:py-32 bg-white rounded-2xl shadow-sm border border-gray-100 mx-4 md:mx-0">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <Package size={32} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-700 font-[Yekan,'B_Yekan',sans-serif]">محصولی یافت نشد!</h3>
            <p className="text-sm md:text-base text-gray-500 mt-2 px-4">
              هیچ محصولی با مشخصات مورد نظر شما در این بخش وجود ندارد.
            </p>
          </div>
        )}

        {/* نقاط صفحه‌بندی (Dots Indicator) - فقط در حالت دسکتاپ نمایش داده می‌شود */}
        {!loading && filteredProducts.length > 0 && totalDots > 1 && (
          <div className="hidden md:flex justify-center items-center gap-3 mt-8 mb-4">
            {Array.from({ length: totalDots }).map((_, index) => {
              const isActive = currentSlidePage === index;
              return (
                <button
                  key={index}
                  onClick={() => scrollToPage(index)}
                  className={`rounded-full transition-all duration-300 ${
                    isActive 
                      ? 'w-[10px] h-[10px] bg-blue-600 ring-4 ring-blue-100' 
                      : 'w-[8px] h-[8px] bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`اسلاید ${index + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}