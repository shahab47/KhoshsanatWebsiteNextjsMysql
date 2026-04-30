# استفاده از نسخه سبک لینوکس و سازگار با پریزما
FROM node:20-bullseye-slim

# نصب OpenSSL و گواهی‌های لازم برای اتصال دیتابیس و پریزما (بسیار مهم برای لینوکس)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# تعیین پوشه کاری داخل کانتینر
WORKDIR /app

# کپی کردن "فقط" فایل‌های تنظیمات در ابتدا (برای استفاده از خاصیت کش داکر)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 🟢 دور زدن تحریم‌ها و فیلترینگ برای دانلود سریع 🟢
# تغییر مسیر دانلود پکیج‌های نود جی‌اس و موتورهای پریزما به سرور میرور چین
RUN npm config set registry https://registry.npmmirror.com/
ENV PRISMA_ENGINES_MIRROR="https://npmmirror.com/mirrors/prisma"

# نصب تمیز پکیج‌ها کاملاً از صفر (clean install) تا با محیط لینوکس سازگار شوند
RUN npm ci || npm install

# ساخت کلاینت پریزما (مخصوص سیستم‌عامل لینوکس داکر)
RUN npx prisma generate

# حالا کپی کردن بقیه فایل‌های پروژه (بدون node_modules و .next که در ویندوز ساخته شده‌اند)
COPY . .

# غیرفعال کردن تلمتری Next.js برای بیلد سریع‌تر
ENV NEXT_TELEMETRY_DISABLED=1

# بیلد نهایی پروژه (تولید کدهای سازگار با لینوکس)
RUN npm run build

# تنظیم پورت
EXPOSE 3000

# اجرای پروژه در حالت پروداکشن
CMD ["npm", "start"]