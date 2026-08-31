// components/education/ArticleDetailGallery.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ArticleDetailGalleryProps {
  articleTitle: string;
  activeImageUrl: string;
  images: { url: string; name: string }[];
}

export default function ArticleDetailGallery({
  articleTitle,
  activeImageUrl,
  images,
}: ArticleDetailGalleryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  return (
    <>
      {/* تصویر شاخص بالای مقاله */}
      <div className="w-full bg-gray-100 flex items-center justify-center overflow-hidden">
        {activeImageUrl ? (
          <button
            onClick={() => {
              const idx = images.findIndex((img) => img.url === activeImageUrl);
              openGallery(idx !== -1 ? idx : 0);
            }}
            className="w-full cursor-pointer"
            aria-label="بزرگنمایی تصویر مقاله"
          >
            <img
              src={activeImageUrl}
              alt={`تصویر شاخص مقاله ${articleTitle}`}
              className="w-full object-cover max-h-[500px]"
            />
          </button>
        ) : (
          <div className="text-gray-400 flex flex-col items-center gap-2 p-10">
            <ImageIcon size={48} />
            <span className="text-sm">تصویری موجود نیست</span>
          </div>
        )}
      </div>

      {/* گالری تصاویر کوچک در ستون کناری */}
      {images.length > 1 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-r-4 border-blue-500 pr-3">
            <ImageIcon className="text-blue-600" size={20} />
            تصاویر و نقشه‌های ضمیمه
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => openGallery(idx)}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-md group cursor-pointer"
                aria-label={`مشاهده تصویر ${idx + 1}`}
              >
                <img
                  src={img.url}
                  alt={img.name || `تصویر ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal گالری بزرگنمایی */}
      {isModalOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
          <button
            onClick={closeGallery}
            className="absolute top-4 left-4 z-10 p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white cursor-pointer"
            aria-label="بستن گالری"
          >
            <X size={28} />
          </button>
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white disabled:opacity-50 cursor-pointer"
            disabled={images.length <= 1}
            aria-label="تصویر قبلی"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white disabled:opacity-50 cursor-pointer"
            disabled={images.length <= 1}
            aria-label="تصویر بعدی"
          >
            <ChevronRight size={32} />
          </button>
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img
              src={images[currentImageIndex].url}
              alt={images[currentImageIndex].name || articleTitle}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
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
