FROM node:22-slim

RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates libc6 build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

RUN npm install --os=linux --cpu=x64 --libc=glibc \
    sharp@0.32.6 \
    lightningcss-linux-x64-gnu \
    @next/swc-linux-x64-gnu

RUN npx prisma generate

COPY . .

# =============================================
# تنظیمات داینامیک متصل به فایل .env
# =============================================
# ۱. دریافت مقادیر از docker-compose در زمان Build
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ADMINER_URL
ARG DATABASE_URL

# ۲. تبدیل مقادیر دریافت شده به متغیرهای محیطی برای Next.js
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADMINER_URL=$NEXT_PUBLIC_ADMINER_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# کپی فایل‌های استاتیک برای خروجی Standalone
RUN cp -r public .next/standalone/ && \
    cp -r .next/static .next/standalone/.next/

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && cd .next/standalone && node server.js"]