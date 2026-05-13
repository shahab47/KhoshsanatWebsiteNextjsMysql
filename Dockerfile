FROM node:22-slim

# نصب وابستگی‌های سیستمی برای Prisma و کامپایل ابزارها
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libc6 build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# کپی فایل‌های مدیریت پکیج
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# استفاده از ci برای نصب دقیق نسخه‌های موجود در lock-file (حفظ ورژن Prisma)
RUN npm ci

RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install --os=linux --cpu=x64 --libc=glibc \
    sharp@0.32.6 \
    lightningcss-linux-x64-gnu \
    @next/swc-linux-x64-gnu && \
    npm config set registry https://registry.npmjs.org/

# تولید کلاینت Prisma
RUN npx prisma generate

# کپی کل سورس کد
COPY . .

# تنظیمات زمان بیلد (Prerendering)
ENV DATABASE_URL="mysql://root:@host.docker.internal:3306/ks_database"
ENV NEXT_TELEMETRY_DISABLED=1

# بیلد پروژه (خروجی standalone تولید می‌شود)
RUN npm run build

# کپی فایل‌های استاتیک به پوشه standalone برای سرویس‌دهی صحیح
RUN cp -r public .next/standalone/ && \
    cp -r .next/static .next/standalone/.next/

EXPOSE 3000

# اجرای مایگریشن دیتابیس و سپس اجرای سرور بهینه شده standalone
CMD ["sh", "-c", "npx prisma db push && cd .next/standalone && node server.js"]