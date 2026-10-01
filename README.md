# حجز غرف مبنى الخدمات

نظام حجز مواعيد غرف لمبنى خدمات كنسي — Next.js + Supabase  
الحجز بالساعة من الجمعة للخميس (11 ص – 9 م)، **للخدام المسجّلين فقط**، مع موافقة الإدارة، ومواعيد ثابتة مسبقة، وتنبيهات Email / WhatsApp / Push.

## المميزات

- حجز مقفول بحسابات خدام (أدمن / خادم) من لوحة التحكم
- أماكن ديناميكية (كنائس + فصول + قاعة السطح + KG)
- جدول أسبوع RTL للابتوب، وعرض يوم للموبايل
- طلبات حجز تحتاج موافقة، مع كود متابعة وصفحة «طلباتي»
- منع التعارض (موعد ثابت / حجز / وقت مقفول) على مستوى قاعدة البيانات
- مواعيد ثابتة من الجدول الكنسي + علامة «يحتاج مراجعة» للأوقات الناقصة
- اجتماع الخدام الشهري: قفل كل الأماكن من 7 م بضغطة من لوحة التحكم
- تنبيهات: Email SMTP + Evolution WhatsApp + OneSignal Push (أندرويد)
- ألوان Solid فقط (Radix Colors) — بدون gradients

## تطبيق أندرويد

غلاف Capacitor يفتح موقع الإنتاج مع إشعارات OneSignal. التفاصيل في [`docs/MOBILE.md`](docs/MOBILE.md).

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

من لوحة Supabase → SQL Editor بالترتيب:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
2. [`supabase/migrations/0002_soft_delete_sort.sql`](supabase/migrations/0002_soft_delete_sort.sql)
3. [`supabase/migrations/0003_profiles_roles.sql`](supabase/migrations/0003_profiles_roles.sql)
4. [`supabase/seed.sql`](supabase/seed.sql)

### 4) إنشاء مستخدم أدمن

Authentication → Users → Add user (مثلاً `admin@beshoy.local`)  
ثم تأكد أن صفّه موجود في جدول `profiles` بدور `admin` (الـ migration 0003 يعمل ذلك للإيميل المذكور).  
الدخول من [`/login`](http://localhost:3000/login).

### 5) تشغيل المشروع

```bash
npm run dev
```

- تسجيل الدخول: [http://localhost:3000/login](http://localhost:3000/login)
- صفحة الحجز (بعد الدخول): [http://localhost:3000/book](http://localhost:3000/book)
- لوحة التحكم (أدمن): [http://localhost:3000/admin](http://localhost:3000/admin)
- إدارة الخدام: [http://localhost:3000/admin/servants](http://localhost:3000/admin/servants)

## النشر على Vercel

1. ارفع المشروع على GitHub واربطه بـ Vercel
2. أضف نفس متغيرات `.env.example` في Project Settings → Environment Variables
3. تأكد من `NEXT_PUBLIC_APP_URL` = رابط الإنتاج

### Keepalive لـ Supabase المجاني

`vercel.json` يشغّل `/api/keepalive` يومياً حتى لا يدخل المشروع في وضع الإيقاف.  
ضع `CRON_SECRET` في البيئة؛ Vercel يرسله تلقائياً كـ `Authorization: Bearer ...` على خطط Pro. على الخطة المجانية يمكنك استدعاء الرابط يدوياً أو من خدمة cron خارجية.

## متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | نعم | رابط المشروع |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | نعم | المفتاح العام |
| `SUPABASE_SERVICE_ROLE_KEY` | نعم* | العمليات المميزة من السيرفر |
| `NEXT_PUBLIC_APP_URL` | نعم | رابط الموقع |
| `RESEND_API_KEY` / `ADMIN_EMAIL` | لا | تنبيه إيميل |
| `EVOLUTION_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE` / `ADMIN_WHATSAPP` | لا | واتساب |
| `CRON_SECRET` | لا | حماية keepalive |

\* مطلوب لبعض العمليات الإدارية على السيرفر (إشعارات، إعدادات حساسة). لوحة التحكم تعمل بجلسة الأدمن بدونها في أغلب الحالات.

## هيكل مهم

```
src/app/book              صفحة الحجز العامة
src/app/r/[code]          متابعة الطلب
src/app/admin             لوحة التحكم
src/lib/availability.ts   دمج المشغولية
src/lib/notify/           Email / WhatsApp / Push
supabase/migrations       الجداول والـ RLS والـ RPC
supabase/seed.sql         الأماكن + الجدول الافتراضي
```

## ملاحظات

- الأسبوع يبدأ الجمعة وينتهي الخميس
- الحجز بالساعات الكاملة فقط
- المواعيد ذات `needs_review = true` تظهر للأدمن للمراجعة
- بعد كل خدمة: إغلاق التكييف والمراوح (مذكور في الملاحظات الهامة بالواجهة)
