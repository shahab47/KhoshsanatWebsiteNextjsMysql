'use client';
// مسیر فایل: src/app/education/[slug]/page.tsx

import React, { useState, useEffect, use } from 'react';
import { 
  Calendar, Clock, ChevronRight, User, Share2, 
  Bookmark, FolderOpen, LayoutGrid, FileText, 
  Download, Image as ImageIcon, X, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';

export default function ArticleDetailPage({ params }: { params: Promise<{ slug?: string; id?: string }> }) {
  const resolvedParams = use(params);
  const identifier = resolvedParams.slug || resolvedParams.id;

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [files, setFiles] = useState<{ url: string; name: string }[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!identifier) return;
      try {
        const res = await fetch('/api/education');
        if (!res.ok) throw new Error(`پاسخ شبکه ناموفق بود. وضعیت: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const decodedIdentifier = decodeURIComponent(identifier);
          const found = data.find((a: any) => {
            const isSlugMatch = a.slug === identifier || a.slug === decodedIdentifier || encodeURIComponent(a.slug) === identifier;
            const isIdMatch = a.id.toString() === identifier || a.id.toString() === decodedIdentifier;
            return (isSlugMatch || isIdMatch) && a.isActive;
          });
          if (found) {
            setArticle(found);
            setActiveImage(found.imageUrl || '');
            let allAttachments: any[] = [];
            if (found.media) {
              if (typeof found.media === 'string') {
                try { allAttachments = JSON.parse(found.media); } catch(e) { allAttachments = [found.media]; }
              } else if (Array.isArray(found.media)) {
                allAttachments = found.media;
              }
            }
            const parsedImages: { url: string; name: string }[] = [];
            const parsedFiles: { url: string; name: string }[] = [];
            if (found.imageUrl && found.imageUrl.trim()) {
              parsedImages.push({ url: found.imageUrl, name: 'تصویر اصلی مقاله' });
            }
            allAttachments.forEach((item: any) => {
              let url = '';
              if (typeof item === 'string') url = item;
              else if (item && typeof item === 'object') {
                url = item.imageUrl || item.url || item.path || item.src || '';
                if (!url) {
                  const possibleKey = Object.keys(item).find(k => typeof item[k] === 'string' && (item[k].startsWith('http') || item[k].startsWith('/')));
                  if (possibleKey) url = item[possibleKey];
                }
              }
              if (!url) return;
              const name = typeof item === 'string' ? decodeURIComponent(url.split('/').pop() || 'فایل') : (item.name || item.title || decodeURIComponent(url.split('/').pop() || 'فایل'));
              const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
              if (isImg) {
                if (!parsedImages.some(img => img.url === url)) parsedImages.push({ url, name });
              } else {
                if (!parsedFiles.some(f => f.url === url)) parsedFiles.push({ url, name });
              }
            });
            setImages(parsedImages);
            setFiles(parsedFiles);
          }
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchArticle();
  }, [identifier]);

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };
  const closeGallery = () => setIsModalOpen(false);
  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, images.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center px-6 text-center">
        <LayoutGrid size={80} className="text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">مقاله‌ای یافت نشد!</h1>
        <p className="text-gray-500 mb-8 max-w-md">مقاله مورد نظر وجود ندارد یا دسترسی به آن محدود شده است.</p>
        <a href="/education" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
          بازگشت به آکادمی
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#f1f5f9]" dir="rtl">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
              <a href="/" className="hover:text-blue-600 transition">خانه</a>
              <ChevronRight size={16} />
              <a href="/education" className="hover:text-blue-600 transition">آکادمی و مقالات</a>
              <ChevronRight size={16} />
              <span className="text-gray-800 font-bold truncate max-w-[200px] md:max-w-md">{article.title}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><Share2 size={18} /></button>
              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><Bookmark size={18} /></button>
            </div>
          </div>
        </div>

        {/* تصویر اصلی */}
        <div className="w-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {activeImage ? (
            <button 
              onClick={() => {
                const idx = images.findIndex(img => img.url === activeImage);
                openGallery(idx !== -1 ? idx : 0);
              }}
              className="w-full cursor-pointer"
            >
              <img 
                src={activeImage} 
                alt={article.title} 
                className="w-full object-cover max-h-[500px]"
                onError={(e) => {
                  console.error(`❌ بارگذاری تصویر اصلی شکست خورد: "${activeImage}"`);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </button>
          ) : (
            <div className="text-gray-400 flex flex-col items-center gap-2 p-10">
              <ImageIcon size={48} />
              <span className="text-sm">تصویری موجود نیست</span>
            </div>
          )}
        </div>

        {/* محتوای اصلی دو ستون */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 md:p-8">
              
              {/* ستون چپ: گالری و فایل‌ها */}
              <div className="lg:col-span-1 space-y-8">
                {images.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
                      <ImageIcon className="text-blue-600" size={20} />
                      گالری تصاویر
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => openGallery(idx)}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-md group"
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {files.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
                      <FileText className="text-blue-600" size={20} />
                      فایل‌های ضمیمه
                    </h3>
                    <div className="space-y-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                              <FileText size={18} />
                            </div>
                            <span className="font-medium text-gray-700 text-sm truncate" dir="ltr" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <a
                            href={file.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shrink-0 mr-2 shadow-sm"
                          >
                            <Download size={14} />
                            دانلود
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ستون راست: دسته‌بندی + نویسنده/تاریخ در یک ردیف، سپس عنوان وسط‌چین، سپس متن */}
              <div className="lg:col-span-2">
                {/* ردیف اول: دسته‌بندی، نویسنده، تاریخ، زمان مطالعه (همه در یک خط) */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 mb-6">
                  <span className="inline-flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    <FolderOpen size={12} />
                    {article.category || 'عمومی'}
                  </span>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-600" />
                    <span>نویسنده: <strong className="text-gray-800">{article.author || 'مدیریت سایت'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-600" />
                    <span>{new Date(article.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                  {article.readTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-600" />
                      <span>{article.readTime} دقیقه</span>
                    </div>
                  )}
                </div>

                {/* عنوان مقاله (وسط‌چین) */}
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 text-center leading-tight mb-6">
                  {article.title}
                </h1>

                {/* خط جداکننده */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* متن مقاله */}
                <div className="prose prose-gray max-w-none text-gray-700 leading-loose prose-headings:text-gray-800 prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl prose-img:shadow-md">
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                </div>
              </div>
            </div>

            {/* دکمه بازگشت */}
            <div className="p-6 md:p-8 border-t border-gray-100 text-center">
              <a href="/education" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold transition">
                <ChevronRight size={16} />
                بازگشت به لیست مقالات
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal گالری */}
      {isModalOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
          <button onClick={closeGallery} className="absolute top-4 left-4 z-10 p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white"><X size={28} /></button>
          <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white disabled:opacity-50" disabled={images.length <= 1}><ChevronLeft size={32} /></button>
          <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white disabled:opacity-50" disabled={images.length <= 1}><ChevronRightIcon size={32} /></button>
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img src={images[currentImageIndex].url} alt={images[currentImageIndex].name} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}