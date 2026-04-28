import React from 'react';
import { MapPin, Building2, ArrowUpLeft } from 'lucide-react';

// تعریف ساختار داده‌های پروژه‌ها برای تایپ‌اسکریپت
interface ProjectItem {
  id: number;
  title: string;
  category: string;
  location: string;
  image: string;
}

const projects: ProjectItem[] = [
  {
    id: 1,
    title: "سازه فولادی برج تجاری",
    category: "برج و مجتمع تجاری",
    location: "تهران، منطقه ۲",
    image: "/proj-1.jpg" // این عکس‌ها را باید در پوشه public قرار دهید
  },
  {
    id: 2,
    title: "مجموعه ورزشی چندمنظوره",
    category: "سوله‌های دهانه عریض",
    location: "اصفهان",
    image: "/proj-2.jpg"
  },
  {
    id: 3,
    title: "پارکینگ طبقاتی تمام‌فلزی",
    category: "زیرساخت شهری",
    location: "مشهد",
    image: "/proj-3.jpg"
  },
  {
    id: 4,
    title: "اسکلت پتروشیمی و پایپ‌رک",
    category: "صنعتی و پالایشگاهی",
    location: "عسلویه",
    image: "/proj-4.jpg"
  }
];

export default function Projects() {
  return (
    <section id="projects" className="py-24 px-6 bg-ks-dark">
      <div className="max-w-7xl mx-auto">
        
        {/* بخش تیتر اصلی */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">پروژه‌های نمونه ما</h2>
            <p className="text-gray-400 max-w-xl">
              نگاهی به برخی از موفق‌ترین سازه‌های فولادی اجرا شده توسط تیم مهندسی KS. 
              از ایده‌پردازی و نقشه تا نصب نهایی.
            </p>
          </div>
          {/* دکمه مشاهده همه */}
          <button className="flex items-center gap-2 text-ks-blue hover:text-white font-bold transition-colors border border-ks-blue hover:bg-ks-blue px-6 py-2.5 rounded-md">
            مشاهده آرشیو کامل
            <ArrowUpLeft size={18} />
          </button>
        </div>

        {/* گرید تصاویر پروژه‌ها */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="relative group overflow-hidden rounded-xl bg-gray-800 aspect-[4/3] cursor-pointer"
            >
              {/* تصویر پروژه */}
              <img 
                src={project.image} 
                alt={project.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* لایه تاریک‌کننده که با هاور ظاهر می‌شود */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1114]/90 via-[#0f1114]/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* اطلاعات پروژه (متن روی عکس) */}
              <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                
                <div className="flex items-center gap-2 text-ks-blue font-bold text-sm mb-2">
                  <Building2 size={16} />
                  <span>{project.category}</span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  {project.title}
                </h3>
                
                <div className="flex items-center gap-2 text-gray-300 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  <MapPin size={16} />
                  <span>{project.location}</span>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}