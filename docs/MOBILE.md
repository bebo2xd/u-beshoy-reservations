# تطبيق أندرويد (Capacitor + OneSignal)

الغلاف الأصلي يفتح موقع الإنتاج داخل WebView، والإشعارات تشتغل عبر OneSignal/FCM.

- **Package:** `xd.church.reservations.app`
- **URL:** قيمة `NEXT_PUBLIC_APP_URL` (افتراضيًا `https://u-beshoy-reservations.vercel.app`)

## 1) Firebase (FCM)

1. أنشئ مشروع Firebase (أو استخدم موجود).
2. أضف تطبيق Android بالـ package `xd.church.reservations.app`.
3. نزّل `google-services.json` وضعه في:

```
android/app/google-services.json
```

الملف متجاهل من Git عمدًا.

## 2) OneSignal

1. أنشئ تطبيق OneSignal من نوع Google Android.
2. اربط نفس Firebase / FCM.
3. انسخ:
   - **OneSignal App ID** → `NEXT_PUBLIC_ONESIGNAL_APP_ID` (Vercel + محلي)
   - **REST API Key** → `ONESIGNAL_REST_API_KEY` (سرّ سيرفر فقط)
4. External User Id = معرف المستخدم في Supabase (`profiles.id`).

## 3) بناء الـ APK

```bash
npm run cap:sync
npm run android:apk
```

المخرج:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

أو افتح Android Studio:

```bash
npm run cap:open:android
```

ثم **Build → Build APK(s)**.

## 4) سلوك الإشعارات

| الحدث | المستلم | Deep link |
|---|---|---|
| طلب جديد | كل أدمن نشط | `/admin?booking={id}` |
| موافقة/رفض | `created_by` | `/r/{tracking_code}` |

التفعيل/الإيقاف من **الإعدادات → تفضيلات الإشعارات**:

- طلب جديد → إشعار Push (أدمن)
- موافقة/رفض → إشعار Push لمقدم الطلب

## 5) ملاحظات

- بعد تغيير `capacitor.config.ts` أو إضافة plugins: `npm run cap:sync`
- الإشعارات لن تصل بدون `google-services.json` + مفاتيح OneSignal على Vercel
- Release APK يحتاج keystore لاحقًا (`android:apk:release`)
