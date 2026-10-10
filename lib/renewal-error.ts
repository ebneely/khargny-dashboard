import { AdminApiError } from './api/admin-client';

const messages: Record<string, [string, string]> = {
  INVALID_PAID_ON: ['Choose a payment date no later than today in Cairo.', 'اختر تاريخ دفع لا يتجاوز اليوم بتوقيت القاهرة.'],
  INVALID_REASON: ['Enter a reason of at most 2000 characters.', 'أدخل سبباً لا يتجاوز ٢٠٠٠ حرف.'],
  INVALID_PROOF_FILE: ['Use a JPEG, PNG or WebP image of at most 5 MB.', 'استخدم صورة JPEG أو PNG أو WebP لا تتجاوز ٥ ميجابايت.'],
  PRIVATE_PROOF_STORAGE_UNAVAILABLE: ['Private proof storage is not available yet. No public image is used.', 'تخزين الإثباتات الخاص غير متاح بعد. لن تُستخدم صورة عامة.'],
  PROOF_NOT_FOUND: ['No proof picture is stored for this request.', 'لا توجد صورة إثبات محفوظة لهذا الطلب.'],
  PROOF_REQUIRED: ['Non-cash requests require a private proof. Record cash only here.', 'الطلبات غير النقدية تحتاج إثباتاً خاصاً. سجل الدفع النقدي فقط هنا.'],
  PROOF_MISSING: ['Non-cash confirmation needs a private proof.', 'تأكيد الدفع غير النقدي يحتاج إثباتاً خاصاً.'],
  NOT_SUBMITTED: ['This request is no longer waiting. Refresh the queue.', 'لم يعد هذا الطلب بانتظار المراجعة. حدّث القائمة.'],
  RENEWAL_CLOSED: ['This request is already closed. Refresh the queue.', 'أُغلق هذا الطلب بالفعل. حدّث القائمة.'],
  RENEWAL_ALREADY_OPEN: ['An open request already exists for this period.', 'يوجد طلب مفتوح لهذه الفترة بالفعل.'],
  PERIOD_RENEWED: ['This period was already renewed. Use its next period.', 'جُددت هذه الفترة بالفعل. استخدم الفترة التالية.'],
  STALE_PLAN: ['The preview changed. Refresh and preview the remaining requests again.', 'تغيرت بيانات المعاينة. حدّثها وعاين الطلبات المتبقية مرة أخرى.'],
  PLAN_INACTIVE: ['The plan is not active.', 'الخطة غير نشطة.'],
  NO_PRICE: ['The selected length has no catalogue price.', 'لا يوجد سعر في الدليل للمدة المختارة.'],
  AMOUNT_MISMATCH: ['The claimed amount does not match the catalogue price.', 'المبلغ المذكور لا يطابق سعر الدليل.'],
  NOT_FOUND: ['The request was not found.', 'لم يُعثر على الطلب.'],
  GRACE_OVERRIDE_REQUIRED: ['Another extension requires a super admin and a reason.', 'التمديد مرة أخرى يحتاج المسؤول الأعلى وسبباً.'],
  REMINDER_RATE_LIMIT: ['This reminder was already sent today in Cairo. Try another day.', 'أُرسل هذا النوع من التذكير اليوم بتوقيت القاهرة. حاول في يوم آخر.'],
  INVALID_PHONE: ['Correct the international contact number before sending a reminder.', 'صحح رقم التواصل الدولي قبل إرسال التذكير.'],
  INVALID_AMOUNT: ['Enter an exact non-negative amount with at most two decimal places.', 'أدخل مبلغاً غير سالب بمنزلتين عشريتين كحد أقصى.'],
};

export function renewalError(error: unknown, lang: 'en' | 'ar') {
  const code = error instanceof AdminApiError ? error.code : error instanceof Error ? error.message : String(error);
  return messages[code]?.[lang === 'ar' ? 1 : 0] ?? (lang === 'ar' ? 'تعذر إكمال الطلب. حدّث البيانات ثم حاول مرة أخرى.' : 'Could not complete the request. Refresh and try again.');
}
