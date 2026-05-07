FROM node:24-slim

# نصب پیش‌نیازهای سیستمی (پکیج‌های libc6 و ساختار برای ماژول‌های باینری ضروری هستند)
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libc6 build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# کپی فایل‌های مدیریت پکیج
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# نصب اصولی وابستگی‌ها به همراه ماژول‌های اختیاری
# (بدون force و بدون پاک کردن فایل lock تا بیلد سریع و پایدار باشد)
RUN npm install --include=optional

# نصب دستی باینری‌های مخصوص لینوکس برای جلوگیری از خطای Turbopack و رفع مشکل Sharp
RUN npm install --os=linux --cpu=x64 lightningcss-linux-x64-gnu @next/swc-linux-x64-gnu sharp

# تولید کلاینت دیتابیس
RUN npx prisma generate

# کپی بقیه فایل‌های پروژه
COPY . .

# تنظیمات محیطی و اجرای بیلد
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm start"]