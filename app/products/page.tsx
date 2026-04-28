'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Package, LayoutGrid, Filter, ArrowRight } from 'lucide-react';

export default function ProductsStorePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // استیت‌های فیلتر
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);

  // دریافت اطلاعات از دیتابیس
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories')
        ]);
        const prodData = await prodRes.json();
        const catData = await catRes.json();
        
        // فقط محصولاتی که isActive آنها true است را در سایت نشان بده
        setProducts(prodData.filter((p: any) => p.isActive));
        setCategories(catData.filter((c: any) => c.isActive));
      } catch (err) {
        console.error("خطا در دریافت اطلاعات", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // منطق فیلترینگ محصولات
  const filteredProducts = products.filter(product => {
    let match = true;
    
    // جستجو در نام محصول
    if (searchQuery && !product.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      match = false;
    }
    
    // فیلتر زیرمجموعه
    if (selectedSubcategory) {
      if (product.subcategoryId !== selectedSubcategory) match = false;
    } 
    // فیلتر دسته اصلی
    else if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      const subIds = category?.subcategories?.map((s: any) => s.id) || [];
      if (!subIds.includes(product.subcategoryId)) match = false;
    }

    return match;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      
      {/* هدر اختصاصی صفحه محصولات */}
      <div className="bg-ks-dark text-white py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">محصولات خوش‌صنعت</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            طراحی، ساخت و تولید انواع تجهیزات صنعتی با بالاترین استانداردهای مهندسی
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* سایدبار (بخش فیلترها) */}
          <div className="w-full lg:w-1/4 space-y-6">
            
            {/* باکس جستجو */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Search size={18} className="text-blue-600" />
                جستجوی محصول
              </h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="نام محصول را وارد کنید..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* باکس دسته‌بندی‌ها */}
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
                    
                    {/* زیرمجموعه‌ها (فقط در صورت انتخاب دسته اصلی نمایش داده می‌شوند) */}
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

          {/* محتوای اصلی (لیست محصولات) */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <a href={`/products/${product.slug}`} key={product.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">
                    {/* تصویر محصول */}
                    <div className="aspect-square relative overflow-hidden bg-gray-50">
                      <img 
                        src={product.imageUrl} 
                        alt={product.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    
                    {/* اطلاعات محصول */}
                    <div className="p-5 flex-1 flex flex-col">
                      <h2 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">{product.title}</h2>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                        {product.shortDesc || product.description}
                      </p>
                      
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">مشاهده جزئیات</span>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ChevronLeft size={18} />
                        </div>
                      </div>
                    </div>
                  </a>
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