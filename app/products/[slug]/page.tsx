'use client';
// مسیر فایل: src/app/projects/[slug]/page.tsx

import React, { useState, useEffect, use } from 'react';
import { ChevronRight, MapPin, LayoutGrid, ArrowLeft, FolderOpen, FileText, Download, Image as ImageIcon } from 'lucide-react';

export default function SingleProjectPage({ params }: { params: Promise<{ slug?: string, id?: string }> }) {
  const resolvedParams = use(params);
  const identifier = resolvedParams.slug || resolvedParams.id;

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  
  const [images, setImages] = useState<{url: string, name: string}[]>([]);
  const [files, setFiles] = useState<{url: string, name: string}[]>([]);

  useEffect(() => {
    const fetchProject = async () => {
      if (!identifier) return;
      
      try {
        const res = await fetch('/api/projects');
        const allProjects = await res.json();
        
        const decodedIdentifier = decodeURIComponent(identifier);
        const found = allProjects.find((p: any) => 
          (p.slug === decodedIdentifier || p.id.toString() === decodedIdentifier) && p.isActive
        );
        
        if (found) {
          setProject(found);
          setActiveImage(found.imageUrl || '');
          
          let allAttachments: any[] = [];
          
          // ۱. بررسی و پارس گالری تصاویر
          if (found.gallery) {
            if (typeof found.gallery === 'string') {
              try { allAttachments = JSON.parse(found.gallery); } catch(e){ allAttachments = [found.gallery]; }
            } else if (Array.isArray(found.gallery)) {
              allAttachments = found.gallery;
            }
          }

          // ۲. بررسی و پارس فایل‌های ضمیمه
          if (found.files) {
            if (typeof found.files === 'string') {
              try { allAttachments = [...allAttachments, ...JSON.parse(found.files)]; } catch(e){ allAttachments = [...allAttachments, found.files]; }
            } else if (Array.isArray(found.files)) {
              allAttachments = [...allAttachments, ...found.files];
            }
          }

          const parsedImages: {url: string, name: string}[] = [];
          const parsedFiles: {url: string, name: string}[] = [];

          // تصویر اصلی پروژه
          if (found.imageUrl) {
            parsedImages.push({ url: found.imageUrl, name: 'تصویر اصلی' });
          }

          // تفکیک هوشمند فایل‌ها از تصاویر براساس پسوند
          allAttachments.forEach(item => {
            const url = typeof item === 'string' ? item : (item?.url || item?.path || '');
            const name = typeof item === 'string' 
              ? decodeURIComponent(url.split('/').pop() || 'فایل') 
              : (item?.name || item?.title || decodeURIComponent(url.split('/').pop() || 'فایل'));

            if (!url) return;

            // تشخیص فرمت عکس
            const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);

            if (isImg) {
              if (!parsedImages.find(img => img.url === url)) parsedImages.push({url, name});
            } else {
              if (!parsedFiles.find(f => f.url === url)) parsedFiles.push({url, name});
            }
          });

          setImages(parsedImages);
          setFiles(parsedFiles);
        }
      } catch (err) {
        console.error("خطا در دریافت پروژه:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [identifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center px-6 text-center">
        <LayoutGrid size={80} className="text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-4">پروژه مورد نظر یافت نشد!</h1>
        <p className="text-gray-500 mb-8 max-w-md">احتمالاً این پروژه حذف شده یا آدرس را اشتباه وارد کرده‌اید.</p>
        <a href="/projects" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
          بازگشت به لیست پروژه‌ها
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-20" dir="rtl">
      
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
          <a href="/" className="hover:text-blue-600 transition">خانه</a>
          <ChevronRight size={16} />
          <a href="/projects" className="hover:text-blue-600 transition">پروژه‌ها</a>
          <ChevronRight size={16} />
          <span className="text-gray-800 font-bold truncate max-w-[200px] sm:max-w-md">{project.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-2">
            
            {/* ستون راست: گالری تصاویر */}
            <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-l border-gray-100 bg-gray-50/30">
              <div className="aspect-video lg:aspect-square rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shadow-sm mb-6 flex items-center justify-center relative">
                {activeImage ? (
                  <img 
                    src={activeImage} 
                    alt={project.title} 
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      // اگر عکس در مینیو نبود، این کامپوننت جایگزین ارور XML می‌شود
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.fallback-ui');
                        if (fallback) fallback.classList.remove('hidden');
                      }
                    }}
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <ImageIcon size={48} />
                    <span className="text-sm">تصویری موجود نیست</span>
                  </div>
                )}
                
                {/* باکس فالبک برای تصویر خراب */}
                <div className="fallback-ui hidden text-center p-4 text-gray-400 flex flex-col items-center gap-2">
                  <ImageIcon size={48} className="text-gray-300" />
                  <span className="text-sm font-medium">فایل تصویر در سرور یافت نشد (404)</span>
                </div>
              </div>
              
              {/* ریزتصاویر زیر تصویر اصلی */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <button 
                      key={index} 
                      onClick={() => setActiveImage(img.url)}
                      title={img.name}
                      className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImage === img.url 
                          ? 'border-blue-500 shadow-md scale-105' 
                          : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
                      }`}
                    >
                      <img src={img.url} className="w-full h-full object-cover" alt={img.name} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ستون چپ: اطلاعات و محتوای پروژه */}
            <div className="p-6 md:p-8 flex flex-col">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {project.category && (
                  <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100">
                    <FolderOpen size={16} />
                    {project.category}
                  </span>
                )}
                {project.location && (
                  <span className="flex items-center gap-1.5 text-gray-600 text-sm font-medium bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200">
                    <MapPin size={16} className="text-gray-400" />
                    {project.location}
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-6 leading-tight">
                {project.title}
              </h1>

              {/* محتوای متنی */}
              {project.content && (
                <div 
                  className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-strong:text-gray-800 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl prose-img:shadow-md mb-8"
                  dangerouslySetInnerHTML={{ __html: project.content }}
                />
              )}

              {/* بخش دانلود فایل‌های غیر تصویری مینیو */}
              {files.length > 0 && (
                <div className="mt-6 mb-8 border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    فایل‌های ضمیمه پروژه
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-white p-2 rounded-lg text-blue-600 shrink-0 shadow-sm">
                            <FileText size={18} />
                          </div>
                          <span className="font-medium text-gray-700 text-sm truncate w-full" dir="ltr" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <a
                          href={file.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition shrink-0 mr-2"
                        >
                          <Download size={16} />
                          دانلود
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-8 border-t border-gray-100">
                <a 
                  href="/#contact" 
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                >
                  شروع پروژه‌ای مشابه با ما <ArrowLeft size={20} />
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}