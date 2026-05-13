// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/jalaali-date-time-picker/**/*.{js,ts,jsx,tsx}", // <-- اضافه کردن این خط
  ],
  // ...
  theme: {
    extend: {
      colors: {
        ks: {
          blue: '#366ca3',   // رنگ آبی لوگوی شما
          dark: '#1a1d21',   // رنگ پس‌زمینه تیره و صنعتی
          gray: '#24272c',   // رنگ کارت‌ها
        }
      }
    },
  },
}