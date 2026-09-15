import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { HERMES_SYSTEM_PROMPT } from '@/lib/agent/prompts';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'پیام کاربر الزامی است.' }, { status: 400 });
    }

    // اتصال به درگاه 9router محلی (پورت 20131)
    const routerBaseUrl = process.env.ROUTER9_URL || 'http://127.0.0.1:20131/v1';
    const apiKey = process.env.ROUTER9_KEY || 'sk-9router-local-gateway-key';

    let rawContent = '';
    try {
      const inferenceResponse = await fetch(`${routerBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [
            { role: 'system', content: HERMES_SYSTEM_PROMPT },
            ...conversationHistory,
            { role: 'user', content: message },
          ],
          temperature: 0.1,
        }),
      });

      if (!inferenceResponse.ok) {
        throw new Error(`خطای درگاه 9router: ${inferenceResponse.statusText}`);
      }

      const completion = await inferenceResponse.json();
      rawContent = completion.choices[0]?.message?.content || '';
    } catch (networkErr: any) {
      return NextResponse.json({
        reply: `ارتباط با درگاه هوش مصنوعی برقرار نشد (${networkErr.message}). لطفاً بررسی کنید که فایل start_9router.bat در حال اجرا باشد.`,
      });
    }

    // استخراج فراخوانی ابزار <tool_call>
    const toolCallMatch = rawContent.match(/<tool_call>([\s\S]*?)<\/tool_call>/);

    if (toolCallMatch) {
      try {
        const parsedTool = JSON.parse(toolCallMatch[1].trim());

        // ۱. ابزار ثبت باسکول و حواله بارگیری
        if (parsedTool.name === 'registerScaleWeightAndDelivery') {
          const { customerName, productName, grossWeightKg, tareWeightKg, itemCount } =
            parsedTool.arguments;
          const netWeight = Number(grossWeightKg) - Number(tareWeightKg);

          const customer = await db.customer.findFirst({
            where: {
              OR: [
                { name: { contains: customerName } },
                { company: { contains: customerName } },
              ],
            },
          });

          if (!customer) {
            return NextResponse.json({
              reply: `مشتری یا پروژه با عنوان "${customerName}" در پایگاه داده شناسایی نشد. لطفاً نام دقیق‌تر را بیان فرمایید.`,
            });
          }

          return NextResponse.json({
            requiresConfirmation: true,
            actionType: 'DELIVERY_CONFIRMATION',
            payload: {
              customerId: customer.id,
              customerName: customer.company || customer.name,
              productName,
              grossWeightKg,
              tareWeightKg,
              netWeightKg: netWeight,
              itemCount,
            },
            reply: `اطلاعات بارنامه آماده تایید است: بار قطعه "${productName}" برای مشتری "${customer.company || customer.name}".\n- وزن ناخالص: ${grossWeightKg} کیلوگرم\n- وزن خالی (تارا): ${tareWeightKg} کیلوگرم\n- وزن خالص بار: ${netWeight} کیلوگرم${itemCount ? `\n- تعداد قطعات: ${itemCount} عدد` : ''}\n\nآیا دستور خروج و ثبت سند باسکول صادر شود؟`,
          });
        }

        // ۲. ابزار ثبت مصرف مصالح و ضایعات
        if (parsedTool.name === 'recordMaterialConsumption') {
          const { orderNumber, materialCode, quantity, scrapQuantity } = parsedTool.arguments;

          const order = await db.productionOrder.findUnique({
            where: { orderNumber },
          });

          if (!order) {
            return NextResponse.json({
              reply: `دستور کار با شماره "${orderNumber}" یافت نشد. لطفاً شماره سفارش صحیح را اعلام فرمایید.`,
            });
          }

          return NextResponse.json({
            requiresConfirmation: true,
            actionType: 'MATERIAL_CONSUMPTION_CONFIRMATION',
            payload: {
              productionOrderId: order.id,
              orderNumber,
              materialCode,
              quantity,
              scrapQuantity: scrapQuantity || 0,
            },
            reply: `ثبت مصرف مواد برای دستور کار "${orderNumber}":\n- متریال: ${materialCode}\n- مقدار مصرف: ${quantity}\n- ضایعات پرت/قراضه: ${scrapQuantity || 0}\n\nآیا تایید می‌فرمایید تا حواله خروج از انبار و سند بهای تمام‌شده ثبت گردد؟`,
          });
        }

        // ۳. ابزار استعلام موجودی انبار
        if (parsedTool.name === 'queryStockLevel') {
          const { productNameOrCode } = parsedTool.arguments;

          const product = await db.product.findFirst({
            where: {
              OR: [
                { title: { contains: productNameOrCode } },
                { code: { contains: productNameOrCode } },
              ],
            },
            include: {
              stockTxns: true,
            },
          });

          if (!product) {
            return NextResponse.json({
              reply: `کالایی با عنوان یا کد "${productNameOrCode}" یافت نشد.`,
            });
          }

          let totalStock = 0;
          for (const txn of product.stockTxns) {
            const isIncoming =
              txn.type === 'PURCHASE_RECEIPT' ||
              txn.type === 'PRODUCTION_RECEIPT' ||
              txn.type === 'SCRAP_TRANSFER';
            totalStock += isIncoming ? Number(txn.quantity) : -Number(txn.quantity);
          }

          return NextResponse.json({
            reply: `موجودی کل قطعه/متریال "${product.title}" (کد: ${product.code || 'بدون کد'}) برابر است با: ${totalStock} ${product.unit || 'واحد'}.`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          reply: 'در ساختار دستور ارسالی به ابزار خطایی رخ داد. لطفاً مجدداً شفاف‌تر بیان فرمایید.',
        });
      }
    }

    // پاسخ متنی معمولی
    return NextResponse.json({ reply: rawContent });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return NextResponse.json(
      { error: 'خطای داخلی در پردازش گفتگوی هوشمند.', details: error.message },
      { status: 500 }
    );
  }
}
