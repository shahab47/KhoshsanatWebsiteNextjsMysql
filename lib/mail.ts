// lib/mail.ts
import nodemailer from 'nodemailer';
import db from '@/lib/db';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  senderId?: number | null;
  customerId?: number | null;
  replyTo?: string;
}

/**
 * دریافت تنظیمات SMTP از جدول Setting دیتابیس با فال‌بک به process.env
 */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            'smtp_host',
            'smtp_port',
            'smtp_secure',
            'smtp_user',
            'smtp_pass',
            'smtp_from_email',
            'smtp_from_name',
          ],
        },
      },
    });

    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    const host = configMap.smtp_host || process.env.SMTP_HOST || 'mail.khoshsanat.ir';
    const port = parseInt(configMap.smtp_port || process.env.SMTP_PORT || '465', 10);
    const secure = configMap.smtp_secure !== undefined
      ? configMap.smtp_secure === 'true' || configMap.smtp_secure === '1'
      : (process.env.SMTP_SECURE === 'true' || port === 465);
    const user = configMap.smtp_user || process.env.SMTP_USER || '';
    const pass = configMap.smtp_pass || process.env.SMTP_PASS || '';
    const fromEmail = configMap.smtp_from_email || process.env.SMTP_FROM_EMAIL || 'info@khoshsanat.ir';
    const fromName = configMap.smtp_from_name || process.env.SMTP_FROM_NAME || 'خوش‌صنعت پایدار';

    return { host, port, secure, user, pass, fromEmail, fromName };
  } catch (error) {
    console.error('Error reading SMTP settings from DB, using fallback:', error);
    return {
      host: process.env.SMTP_HOST || 'mail.khoshsanat.ir',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465', 10) === 465,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'info@khoshsanat.ir',
      fromName: process.env.SMTP_FROM_NAME || 'خوش‌صنعت پایدار',
    };
  }
}

/**
 * ذخیره یا به‌روزرسانی تنظیمات SMTP در جدول Setting
 */
export async function saveSmtpConfig(config: Partial<SmtpConfig>): Promise<void> {
  const updates: { key: string; value: string }[] = [];

  if (config.host !== undefined) updates.push({ key: 'smtp_host', value: config.host });
  if (config.port !== undefined) updates.push({ key: 'smtp_port', value: String(config.port) });
  if (config.secure !== undefined) updates.push({ key: 'smtp_secure', value: String(config.secure) });
  if (config.user !== undefined) updates.push({ key: 'smtp_user', value: config.user });
  if (config.pass !== undefined && config.pass !== '') updates.push({ key: 'smtp_pass', value: config.pass });
  if (config.fromEmail !== undefined) updates.push({ key: 'smtp_from_email', value: config.fromEmail });
  if (config.fromName !== undefined) updates.push({ key: 'smtp_from_name', value: config.fromName });

  for (const item of updates) {
    await db.setting.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: { key: item.key, value: item.value },
    });
  }
}

/**
 * ساخت آبجکت Transporter مربوط به nodemailer
 */
export function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
    auth: config.user && config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
    tls: {
      rejectUnauthorized: false, // جلوگیری از خطای گواهی‌های خودامضا در هاست‌های داخلی
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * قالب HTML راست‌چین و مدرن با استایل خوش‌صنعت
 */
export function generateEmailTemplate(options: {
  title: string;
  content: string;
  senderName?: string;
  senderEmail?: string;
  buttonText?: string;
  buttonUrl?: string;
}): string {
  const { title, content, senderName, senderEmail, buttonText, buttonUrl } = options;

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
      background-color: #f3f4f6;
      margin: 0;
      padding: 20px;
      direction: rtl;
      text-align: right;
      color: #1f2937;
    }
    .email-container {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 30px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 800;
      color: #60a5fa;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .content {
      padding: 32px 28px;
      line-height: 1.8;
      font-size: 15px;
      color: #334155;
    }
    .content h2 {
      color: #0f172a;
      font-size: 18px;
      margin-top: 0;
      margin-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .button-container {
      text-align: center;
      margin: 28px 0;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: bold;
      padding: 12px 28px;
      border-radius: 10px;
      font-size: 14px;
    }
    .signature {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
      font-size: 13px;
      color: #64748b;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>خوش‌صنعت پایدار</h1>
      <p>طراحی و ساخت ماشین‌آلات و تجهیزات صنعتی پیشرفته</p>
    </div>
    
    <div class="content">
      <h2>${title}</h2>
      <div>
        ${content.replace(/\n/g, '<br/>')}
      </div>

      ${buttonText && buttonUrl ? `
        <div class="button-container">
          <a href="${buttonUrl}" class="button" target="_blank">${buttonText}</a>
        </div>
      ` : ''}

      <div class="signature">
        <strong>ارسال شده توسط:</strong> ${senderName || 'مدیریت خوش‌صنعت'}<br/>
        ${senderEmail ? `<span>ایمیل فرستنده: ${senderEmail}</span><br/>` : ''}
        <span>وب‌سایت رسمی: <a href="https://khoshsanat.ir" style="color:#2563eb;">khoshsanat.ir</a></span>
      </div>
    </div>

    <div class="footer">
      <p>این پیام به صورت رسمی از طرف سامانه اتوماسیون خوش‌صنعت پایدار ارسال شده است.</p>
      <p>© ${new Date().getFullYear()} خوش‌صنعت پایدار - تمامی حقوق محفوظ است.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * تست اتصال به سرور SMTP و ارسال یک ایمیل تستی
 */
export async function testSmtpConnection(
  testRecipient: string,
  customConfig?: Partial<SmtpConfig>
): Promise<{ success: boolean; message: string }> {
  try {
    const baseConfig = await getSmtpConfig();
    const config: SmtpConfig = { ...baseConfig, ...customConfig };

    if (!config.host) {
      return { success: false, message: 'آدرس سرور SMTP (Host) وارد نشده است.' };
    }

    const transporter = createTransporter(config);

    // بررسی اولیه اتصال
    await transporter.verify();

    // ارسال ایمیل تستی
    const testHtml = generateEmailTemplate({
      title: 'تست موفقیت‌آمیز سرور ایمیل سازمانی ✅',
      content: `این یک ایمیل آزمایشی جهت بررسی صحت تنظیمات و اتصال موفق به سرور SMTP خوش‌صنعت پایدار است.<br/><br/>
      <strong>مشخصات سرور:</strong><br/>
      • سرور: ${config.host}<br/>
      • پورت: ${config.port}<br/>
      • رمزنگاری: ${config.secure ? 'SSL/TLS' : 'STARTTLS / None'}<br/>
      • فرستنده: ${config.fromName} &lt;${config.fromEmail}&gt;<br/>
      • زمان ارسال: ${new Date().toLocaleString('fa-IR')}`,
      senderName: config.fromName,
      senderEmail: config.fromEmail,
      buttonText: 'مشاهده وب‌سایت خوش‌صنعت',
      buttonUrl: 'https://khoshsanat.ir',
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: testRecipient,
      subject: 'تست ارتباط با سرور ایمیل | خوش‌صنعت پایدار',
      html: testHtml,
    });

    return {
      success: true,
      message: `اتصال با موفقیت برقرار شد و ایمیل تستی به ${testRecipient} ارسال گردید.`,
    };
  } catch (error: any) {
    console.error('SMTP Connection/Test Error:', error);
    let errorDetail = error?.message || 'خطای نامشخص در اتصال به سرور SMTP';
    if (error?.code === 'EAUTH') {
      errorDetail = 'نام کاربری یا رمز عبور سرور SMTP نادرست است (EAUTH).';
    } else if (error?.code === 'ESOCKET' || error?.code === 'ETIMEDOUT') {
      errorDetail = 'زمان اتصال به سرور به پایان رسید یا پورت سرور مسدود است (ETIMEDOUT/ESOCKET).';
    } else if (error?.code === 'ECONNREFUSED') {
      errorDetail = 'اتصال توسط سرور مقصد رد شد (ECONNREFUSED). لطفاً هاست و پورت را چک کنید.';
    }
    return { success: false, message: errorDetail };
  }
}

/**
 * ارسال ایمیل نهایی همراه با ثبت لاگ در جدول EmailLog
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getSmtpConfig();
  const recipientStr = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const senderEmail = options.fromEmail || config.fromEmail;
  const senderName = options.fromName || config.fromName;

  // اگر محتوای خام ارسال شده بود، داخل تمپلیت قرار گیرد
  const finalHtml = options.html && options.html.includes('<html')
    ? options.html
    : generateEmailTemplate({
        title: options.subject,
        content: options.html || options.text || '',
        senderName,
        senderEmail,
      });

  try {
    const transporter = createTransporter(config);

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text || (options.html ? options.html.replace(/<[^>]*>?/gm, '') : ''),
      html: finalHtml,
      replyTo: options.replyTo || senderEmail,
    });

    // ثبت در تاریخچه لاگ‌ها با وضعیت SENT
    await db.emailLog.create({
      data: {
        senderId: options.senderId || null,
        senderEmail: senderEmail,
        senderName: senderName,
        recipient: recipientStr,
        subject: options.subject,
        body: options.html || options.text || '',
        status: 'SENT',
        customerId: options.customerId || null,
      },
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending email:', error);
    const errorMsg = error?.message || 'خطا در ارسال ایمیل';

    // ثبت در لاگ با وضعیت FAILED
    try {
      await db.emailLog.create({
        data: {
          senderId: options.senderId || null,
          senderEmail: senderEmail,
          senderName: senderName,
          recipient: recipientStr,
          subject: options.subject,
          body: options.html || options.text || '',
          status: 'FAILED',
          errorMessage: errorMsg,
          customerId: options.customerId || null,
        },
      });
    } catch (logErr) {
      console.error('Error saving failed email log:', logErr);
    }

    return { success: false, error: errorMsg };
  }
}
