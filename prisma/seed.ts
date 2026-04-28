import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // categories
  const categories = [
    { title: 'ساختمانی', slug: 'construction', icon: 'Building2', order: 1 },
    { title: 'برق و مخابرات', slug: 'electrical', icon: 'Zap', order: 2 },
    { title: 'شهرسازی', slug: 'urban', icon: 'TreePine', order: 3 },
    { title: 'ماشین‌سازی', slug: 'machinery', icon: 'Factory', order: 4 },
  ]
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }

  // subcategories for 'ساختمانی'
  const construction = await prisma.category.findUnique({ where: { slug: 'construction' } })
  if (construction) {
    const subcats = [
      { title: 'براکت‌های ساختمانی', description: 'کرتین وال، سرامیک خشک، درب اتوماتیک' },
      { title: 'پروفیل', description: 'پروفیل‌های صنعتی و ساختمانی' },
      { title: 'لوور و نمای خشک', description: 'لوور آلومینیومی، نمای خشک مدرن' },
      { title: 'هندریل', description: 'اسپیگات، فیکس پوینت و ...' },
      { title: 'اسپایدر', description: 'اتصالات شیشه‌ای (بعد از هندریل)' },
    ]
    for (let i = 0; i < subcats.length; i++) {
      await prisma.subcategory.upsert({
        where: { id: -1 }, // dummy, we use create
        update: {},
        create: {
          title: subcats[i].title,
          description: subcats[i].description,
          categoryId: construction.id,
          order: i,
        },
      })
    }
  }
  // ... add similar for other categories (you can expand)
}
main()