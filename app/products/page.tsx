'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Search, Package, LayoutGrid, Filter, ArrowRight, ChevronRight, Download, FileText, Building2, FolderTree } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// کامپوننت داخلی با تمام منطق
function ProductsStoreContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  const subcategoryIdParam = searchParams.get('subcategory');

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [companyCatalogUrl, setCompanyCatalogUrl] = useState<string | null>(null);

  // دریافت کاتالوگ عمومی شرکت
  useEffect(() => {
    const fetchCompanyCatalog = async () => {
      try {
        const res = await fetch('/api/company-catalog');
        if (res.ok) {
          const data = await res.json();
          setCompanyCatalogUrl(data.url);
        }
      } catch (error) {
        console.error('Error fetching company catalog:', error);
      }
    };
    fetchCompanyCatalog();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories')
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();
        setProducts(prodData.filter((p: any) => p.isActive));
        setCategories(catData.filter((c: any) => c.isActive));
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    if (subcategoryIdParam) {
      const subId = parseInt(subcategoryIdParam, 10);
      const category = categories.find(c => c.subcategories?.some((sub: any) => sub.id === subId));
      if (category) {
        setSelectedCategory(category.id);
        setSelectedSubcategory(subId);
      }
    } 
    else if (categorySlug) {
      const matchedCategory = categories.find(c => c.slug === categorySlug);
      if (matchedCategory) {
        setSelectedCategory(matchedCategory.id);
        setSelectedSubcategory(null);
      }
    }
  }, [categories, categorySlug, subcategoryIdParam]);

  // پیدا کردن دسته‌بندی انتخاب شده (برای کاتالوگ)
  const selectedCategoryData = selectedCategory
    ? categories.find(c => c.id === selectedCategory)
    : null;

  const filteredProducts = products.filter(product => {
    let match = true;
    if (searchQuery && !product.title.toLowerCase().includes(searchQuery.toLowerCase())) match = false;
    if (selectedSubcategory) {
      if (product.subcategoryId !== selectedSubcategory) match = false;
    } else if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      const subIds = category?.subcategories?.map((s: any) => s.id) || [];
      if (!subIds.includes(product.subcategoryId)) match = false;
    }
    return match;
  });

  const selectedCategoryTitle = selectedCategory
    ? categories.find(c => c.id === selectedCategory)?.title
    : null;
  const selectedSubcategoryTitle = selectedSubcategory
    ? categories
        .find(c => c.id === selectedCategory)
        ?.subcategories?.find((s: any) => s.id === selectedSubcategory)?.title
    : null;

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronRight size={16} />
          <a href="/products" className="hover:text-blue-600 transition">محصولات</a>
          {selectedCategoryTitle && (
            <>
              <ChevronRight size={16} />
              <span className="text-gray-800 font-bold">{selectedCategoryTitle}</span>
            </>
          )}
          {selectedSubcategoryTitle && (
            <>
              <ChevronRight size={16} />
              <span className="text-gray-800 font-bold">{selectedSubcategoryTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* محتوای اصلی */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* سایدبار */}
          <div className="w-full lg:w-1/4 space-y-6">
            {/* جستجو */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Search size={18} className="text-blue-600" />
                جستجوی محصول
              </h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="نام محصول را وارد کنید..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition text-sm text-gray-900 placeholder-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* کاتالوگ‌ها (شرکت + دسته‌بندی) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Download size={18} className="text-blue-600" />
                دانلود کاتالوگ‌ها
              </h3>
              
              {/* کاتالوگ شرکت (همیشه نمایش داده می‌شود در صورت وجود) */}
              {companyCatalogUrl && (
                <a
                  href={companyCatalogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition group"
                >
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-blue-600" />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">کاتالوگ جامع شرکت</span>
                  </div>
                  <Download size={16} className="text-blue-500" />
                </a>
              )}

              {/* کاتالوگ دسته‌بندی انتخاب شده */}
              {selectedCategoryData?.catalogUrl && (
                <a
                  href={selectedCategoryData.catalogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition group"
                >
                  <div className="flex items-center gap-2">
                    <FolderTree size={18} className="text-indigo-600" />
                    <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700">
                      کاتالوگ دسته {selectedCategoryData.title}
                    </span>
                  </div>
                  <Download size={16} className="text-indigo-500" />
                </a>
              )}

              {/* اگر هیچ کاتالوگی وجود نداشت */}
              {!companyCatalogUrl && !selectedCategoryData?.catalogUrl && (
                <p className="text-xs text-gray-400 text-center py-2">هیچ کاتالوگی برای دانلود موجود نیست.</p>
              )}
            </div>

            {/* دسته‌بندی‌ها */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Filter size={18} className="text-blue-600" />
                دسته‌بندی‌ها
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                  className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${!selectedCategory ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  همه محصولات
                </button>
                {categories.map(category => (
                  <div key={category.id} className="space-y-1">
                    <button 
                      onClick={() => { setSelectedCategory(category.id); setSelectedSubcategory(null); }}
                      className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex justify-between items-center ${selectedCategory === category.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {category.title}
                    </button>
                    {selectedCategory === category.id && category.subcategories && (
                      <div className="pr-4 border-r-2 border-blue-100 mr-4 space-y-1 mt-1">
                        {category.subcategories.map((sub: any) => (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubcategory(sub.id)}
                            className={`w-full text-right px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${selectedSubcategory === sub.id ? 'text-blue-700 bg-blue-50/50' : 'text-gray-500 hover:text-gray-800'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedSubcategory === sub.id ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
                            {sub.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* گالری محصولات (بدون دکمه دانلود برای محصولات تکی) */}
          <div className="w-full lg:w-3/4">
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-600">
                <LayoutGrid size={20} />
                <span className="font-bold">نمایش محصولات</span>
              </div>
              <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredProducts.length} محصول یافت شد
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-blue-500">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-gray-600">در حال دریافت محصولات...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="relative group w-full h-[360px] rounded-2xl bg-gray-100 border-2 border-gray-300 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-blue-500 overflow-hidden"
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <div className="absolute bottom-20 left-0 right-0 p-3 text-center text-white z-10">
                      <h3 className="text-lg font-bold line-clamp-1">{product.title}</h3>
                      <p className="text-sm text-gray-100 line-clamp-2 mt-1">{product.shortDesc || product.description}</p>
                    </div>
                    <a
                      href={`/products/${product.slug}`}
                      className="absolute left-1/2 -translate-x-1/2 bottom-2 opacity-0 group-hover:opacity-100 group-hover:bottom-8 transition-all duration-300 w-4/5 bg-blue-600 text-white text-center py-2 rounded-full text-sm font-bold shadow-md z-20"
                    >
                      اطلاعات بیشتر
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-32 text-center">
                <Package size={64} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-xl font-bold text-gray-600">محصولی یافت نشد!</h3>
                <p className="text-gray-400 mt-2">با فیلترهای اعمال شده، هیچ محصولی در سیستم وجود ندارد.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory(null); setSelectedSubcategory(null); }}
                  className="mt-6 text-blue-600 font-bold hover:underline flex items-center gap-2 mx-auto"
                >
                  حذف فیلترها و نمایش همه
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// کامپوننت اصلی که با Suspense صادر می‌شود
export default function ProductsStorePage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
          <div className="flex flex-col items-center text-blue-500">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-gray-600">در حال بارگذاری فروشگاه...</p>
          </div>
        </div>
      }
    >
      <ProductsStoreContent />
    </Suspense>
  );
}