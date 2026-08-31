// components/projects/ProjectDetailGallery.tsx
'use client';

import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProjectDetailGalleryProps {
  title: string;
  mainImageUrl: string;
  images: { url: string; name: string }[];
}

export default function ProjectDetailGallery({
  title,
  mainImageUrl,
  images,
}: ProjectDetailGalleryProps) {
  const [activeImage, setActiveImage] = useState<string>(mainImageUrl);

  return (
    <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-l border-gray-100 bg-gray-50/30">
      <div className="aspect-video lg:aspect-square rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shadow-sm mb-6 flex items-center justify-center">
        {activeImage ? (
          <img
            src={activeImage}
            alt={`تصویر پروژه ${title}`}
            className="w-full h-full object-contain p-2 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ImageIcon size={48} />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(img.url)}
              title={img.name}
              className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                activeImage === img.url
                  ? 'border-blue-500 shadow-md scale-105'
                  : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300'
              }`}
              aria-label={`تصویر ${index + 1} پروژه`}
            >
              <img src={img.url} className="w-full h-full object-cover" alt={img.name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
