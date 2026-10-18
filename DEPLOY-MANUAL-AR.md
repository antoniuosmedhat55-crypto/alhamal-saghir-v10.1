# دليل النشر اليدوي — الحمل الصغير V10.6.1

## أولًا: طريقة المعاينة عبر GitHub وVercel

1. غيّر مستودع GitHub antoniuosmedhat55-crypto/alhamal-saghir-v10.1 إلى Private من Settings → General → Danger Zone → Change repository visibility → Make private. السبب أن تاريخ Git القديم ما زال عامًا ويحتوي النسخ القديمة المكشوفة.
2. تأكد في Vercel أن المشروع القائم alhamal-saghir-v10.6.0-source مرتبط بالمستودع الصحيح.
3. فرع المرحلة الأولى هو phase1-security-mobile. بعد رفع الكود إليه يجب أن ينشئ Vercel نشر Preview. لا ترفع إلى main ولا تنشر Production خلال هذه الخطوة.
4. أبقِ قيم SUPABASE_URL وV9_STATE_URL وV9_STATE_SECRET وSESSION_SECRET وALHAMAL_RETIRED_PASSWORD_SHA256 داخل إعدادات Vercel كمتغيرات خادم سرية. لا تضع القيم داخل الملفات أو GitHub.
5. لا تختبر عملية حفظ بيانات من Preview قبل التأكد من وجهة قاعدة البيانات؛ بيئات Vercel الحالية تستخدم نفس متغيرات Supabase.

## ثانيًا: النشر من جهاز Windows

1. افتح المستودع في GitHub واختر الفرع phase1-security-mobile.
2. اختر Code → Download ZIP، ثم فك الضغط في مجلد جديد.
3. تأكد من وجوض��q�^