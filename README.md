# حجز غرف مبنى الخدمات

نظام حجز مواعيد غرف لمبنى خدمات كنسي — Next.js + Supabase  
الحجز بالساعة من الجمعة للخميس (11 ص – 9 م)، مع موافقة الإدارة، ومواعيد ثابتة مسبقة، وتنبيهات Telegram / Email / WhatsApp.

## المميزات

- أماكن ديناميكية (كنائس + فصول + قاعة السطح + KG)
- جدول أسبوع RTL للابتوب، وعرض يوم للموبايل
- طلبات حجز تحتاج موافقة، مع كود متابعة
- منع التعارض (موعد ثابت / حجز / وقت مقفول) على مستوى قاعدة البيانات
- مواعيد ثابتة من الجدول الكنسي + علامة «يحتاج مراجعة» للأوقات الناقصة
- اجتماع الخدام الشهري: قفل كل الأماكن من 7 م بضغطة من لوحة التحكم
- تنبيهات: Telegram (أزرار موافقة/رفض) + Resend Email + Evolution WhatsApp
- ألوان Solid فقط (Radix Colors) — بدون gradients

## التشغيل المحلي

### 1) المتطلبات

- Node.js 20+
- مشروع [Supabase](https://supabase.com) مجاني

### 2) تثبيت الحزم

```bash
npm install
cp .env.example .env.local
```

املأ قيم Supabase في `.env.local`.

### 3) قاعدة البيانات

من لوحة Supabase → SQL Editor:

1. نفّذ محتوى [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
2. نفّذ محتوى [`supabase/seed.sql`](supabase/seed.sql)

### 4) إنشاء مستخدم أدمن

Authentication → Users → Add user  
أدخل إيميل وباسورد، ثم ادخل من `/admin/login`.

### 5) تشغيل المشروع

```bash
npm run dev
```

- صفحة الحجز: [http://localhost:3000/book](http://localhost:3000/book)
- لوحة التحكم: [http://localhost:3000/admin](http://localhost:3000/admin)

## النشر على Vercel

1. ارفع المشروع على GitHub واربطه بـ Vercel
2. أضف نفس متغيرات `.env.example` في Project Settings → Environment Variables
3. تأكد من `NEXT_PUBLIC_APP_URL` = رابط الإنتاج
4. بعد النشر، اضبط Telegram webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR_DOMAIN/api/telegram"
```

### Keepalive لـ Supabase المجاني

`vercel.json` يشغّل `/api/keepalive` يومياً حتى لا يدخل المشروع في وضع الإيقاف.  
ضع `CRON_SECRET` في البيئة؛ Vercel يرسله تلقائياً كـ `Authorization: Bearer ...` على خطط Pro. على الخطة المجانية يمكنك استدعاء الرابط يدوياً أو من خدمة cron خارجية.

## متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | نعم | رابط المشروع |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | نعم | المفتاح العام |
| `SUPABASE_SERVICE_ROLE_KEY` | نعم* | لأزرار تيليجرام والعمليات المميزة |
| `NEXT_PUBLIC_APP_URL` | نعم | رابط الموقع |
| `TELEGRAM_BOT_TOKEN` | لا | بوت التنبيهات |
| `TELEGRAM_ADMIN_CHAT_ID` | لا | Chat ID الأدمن |
| `RESEND_API_KEY` / `ADMIN_EMAIL` | لا | تنبيه إيميل |
| `EVOLUTION_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` / `ADMIN_WHATSAPP` | لا | واتساب |
| `CRON_SECRET` | لا | حماية keepalive |

\* مطلوب لتفعيل موافقة/رفض تيليجرام من الأزرار. لوحة التحكم تعمل بجلسة الأدمن بدونها.

## هيكل مهم

```
src/app/book              صفحة الحجز العامة
src/app/r/[code]          متابعة الطلب
src/app/admin             لوحة التحكم
src/lib/availability.ts   دمج المشغولية
src/lib/notify/           Telegram / Email / WhatsApp
supabase/migrations       الجداول والـ RLS والـ RPC
supabase/seed.sql         الأماكن + الجدول الافتراضي
```

## ملاحظات

- الأسبوع يبدأ الجمعة وينتهي الخميس
- الحجز بالساعات الكاملة فقط
- المواعيد ذات `needs_review = true` تظهر للأدمن للمراجعة
- بعد كل خدمة: إغلاق التكييف والمراوح (مذكور في الملاحظات الهامة بالواجهة)
