"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Slider = () => {
    // 🔴 مشکل never[] در اینجا با اضافه کردن <any[]> حل شد
    const [slides, setSlides] = useState<any[]>([]);
    const [originalLength, setOriginalLength] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // تشخیص سایز صفحه برای ریسپانسیو کردن
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // واکشی داده‌ها
    useEffect(() => {
        const fetchSlides = async () => {
            try {
                // 🔴 مشکل فاجعه‌بار localhost در سرور با تبدیل به مسیر نسبی حل شد
                const response = await fetch('/api/slider?type=PRODUCT');
                const data = await response.json();
                
                if (data && data.length > 0) {
                    setOriginalLength(data.length);
                    
                    let safeData = [...data];
                    while (safeData.length < 5) {
                        safeData = [...safeData, ...data];
                    }
                    setSlides(safeData);
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching slider data:", error);
                setIsLoading(false);
            }
        };
        fetchSlides();
    }, []);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

    if (isLoading || slides.length === 0) {
        return (
            <section className="w-full bg-white py-16 md:py-[10vh]">
                <div className="h-[720px] w-full flex items-center justify-center text-gray-800">در حال بارگذاری...</div>
            </section>
        );
    }

    // 🔴 مشکل type برای index حل شد
    const getRelativePosition = (index: number) => {
        const total = slides.length;
        let diff = index - currentIndex;
        if (diff > total / 2) diff -= total;
        else if (diff < -total / 2) diff += total;
        return diff;
    };

    return (
        // این سکشن والد اضافه شده تا بک‌گراند سفید و فاصله‌های بالا و پایین رو مدیریت کنه
        <section className="w-full bg-white py-16 md:py-[10vh]">
            {/* کانتینر اصلی اسلایدر */}
            <div className="relative w-full h-[500px] md:h-[720px] overflow-hidden flex items-center justify-center">
                
                {/* لایه زیرین: عکس‌ها */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    {slides.map((slide, index) => {
                        const relative = getRelativePosition(index);
                        const isCenter = relative === 0;
                        
                        const widthPos = isMobile ? '100%' : '60%';
                        
                        let leftPos = isMobile ? '0%' : '20%'; 
                        if (relative === -1) leftPos = isMobile ? '-100%' : '-41%'; 
                        else if (relative === 1) leftPos = isMobile ? '100%' : '81%'; 
                        else if (relative < -1) leftPos = isMobile ? '-200%' : '-102%'; 
                        else if (relative > 1) leftPos = isMobile ? '200%' : '142%'; 

                        const isVisible = Math.abs(relative) <= 1;

                        return (
                            <motion.div
                                key={index} 
                                initial={false}
                                animate={{
                                    left: leftPos,
                                    width: widthPos,
                                    opacity: isVisible ? 1 : 0
                                }}
                                transition={{ 
                                    duration: 0.6, 
                                    ease: [0.25, 1, 0.5, 1] 
                                }}
                                className="absolute h-full rounded-none shadow-none bg-white overflow-hidden"
                                style={{
                                    zIndex: isCenter ? 20 : isVisible ? 10 : 0,
                                }}
                            >
                                <motion.div 
                                    className="absolute inset-0 w-full h-full"
                                    animate={{
                                        scale: isCenter ? 1.08 : 1 
                                    }}
                                    transition={{
                                        duration: isCenter ? 5 : 0.6, 
                                        ease: "easeOut"
                                    }}
                                    style={{
                                        backgroundImage: `url(${slide?.imageUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                />
                            </motion.div>
                        );
                    })}
                </div>

                {/* لایه رویی کاملاً ثابت: دکمه‌ها، نویگیتور و متن‌ها */}
                <div className={`absolute z-30 h-full flex flex-col justify-between py-12 px-4 md:px-6 pointer-events-none transition-all duration-300 ${
                    isMobile ? 'w-full left-0' : 'w-[60%] left-[20%]'
                }`}>
                    
                    <div className="absolute top-[10%] left-0 w-full flex flex-col items-center justify-start text-center px-8 md:px-16 z-40">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`text-${currentIndex}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex flex-col items-center gap-3 md:gap-4"
                            >
                                {slides[currentIndex]?.title && (
                                    <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-medium tracking-wide drop-shadow-lg">
                                        {slides[currentIndex].title}
                                    </h2>
                                )}
                                
                                {slides[currentIndex]?.subtitle && (
                                    <p className="text-white text-base md:text-xl lg:text-2xl font-extralight tracking-wider drop-shadow-md">
                                        {slides[currentIndex].subtitle}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* دکمه چپ */}
                    <button 
                        onClick={prevSlide}
                        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white hover:text-white pointer-events-auto drop-shadow-md p-2 md:p-3 rounded-full hover:bg-black/50 transition-all duration-300 flex items-center justify-center z-40"
                    >
                        <ChevronLeft className="w-8 h-8 md:w-11 md:h-11 stroke-[1.5px]" />
                    </button>
                    
                    {/* دکمه راست */}
                    <button 
                        onClick={nextSlide}
                        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white hover:text-white pointer-events-auto drop-shadow-md p-2 md:p-3 rounded-full hover:bg-black/50 transition-all duration-300 flex items-center justify-center z-40"
                    >
                        <ChevronRight className="w-8 h-8 md:w-11 md:h-11 stroke-[1.5px]" />
                    </button>

                    {/* نویگیتور خط تیره */}
                    <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto drop-shadow-sm z-40">
                        {Array.from({ length: originalLength }).map((_, i) => {
                            const isActive = (currentIndex % originalLength) === i;
                            return (
                                <div 
                                    key={i}
                                    className={`h-[2px] rounded-none transition-all duration-300 ${
                                        isMobile ? 'w-6' : 'w-8'
                                    } ${isActive ? 'bg-white' : 'bg-white/40'}`}
                                />
                            );
                        })}
                    </div>

                </div>
                
            </div>
        </section>
    );
};

export default Slider;