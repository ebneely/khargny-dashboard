// Spec 002 Phase 4: the six-item navigation, Inbox, the Numbers window switch and Collections.
export const inboxCopy: Record<string, string> = {
  // Navigation tabs
  'Inbox': 'الوارد', 'Collections': 'المجموعات', 'Cities and areas': 'المدن والمناطق', 'Subscribers': 'المشتركون', 'Ads': 'الإعلانات',
  'Trips': 'الرحلات', 'Places engagement': 'تفاعل الأماكن', 'Search overview': 'ملخص البحث', 'Keyword searches': 'بحث الكلمات',
  'General': 'عام', 'Connection keys': 'مفاتيح الربط', 'Website footer': 'تذييل الموقع',
  'Inbox pages': 'صفحات الوارد', 'Places pages': 'صفحات الأماكن', 'Money pages': 'صفحات الفلوس', 'Marketplace pages': 'صفحات السوق',
  'Numbers pages': 'صفحات الأرقام', 'Settings pages': 'صفحات الإعدادات',
  // Window switch
  'Numbers window': 'فترة الأرقام', 'Live now': 'مباشر الآن', '24 h': '24 ساعة',
  // Western digits everywhere (owner rule); replaces the older Arabic-digit wording.
  '7 days': '7 أيام', '30 days': '30 يوماً',
  // Inbox
  'Everything waiting on a person, oldest first. We answer within 48 hours.': 'كل ما ينتظر ردّ شخص، الأقدم أولاً. نرد خلال 48 ساعة.',
  'Inbox lists': 'قوائم الوارد', 'Corrections': 'التصحيحات', 'Reports': 'البلاغات', 'Places without hours': 'أماكن بلا مواعيد',
  'Owner requests': 'طلبات الملاك', 'Photo submissions': 'صور الملاك', 'Lister documents': 'مستندات المنظّمين', 'Trip reports': 'بلاغات الرحلات',
  'This list is not on the server yet. It fills in here as soon as the backend sends it.': 'هذه القائمة غير موجودة على الخادم بعد. ستظهر هنا فور أن يرسلها الخادم.',
  'This list is switched off on this server.': 'هذه القائمة متوقفة على هذا الخادم.',
  'Could not load this list.': 'تعذر تحميل هذه القائمة.',
  'No corrections are waiting.': 'لا توجد تصحيحات منتظرة.', 'No reports are waiting.': 'لا توجد بلاغات منتظرة.',
  'Every live place has its opening hours.': 'كل الأماكن المنشورة لها مواعيد.', 'No owner requests are waiting.': 'لا توجد طلبات ملاك منتظرة.',
  'Open the photo': 'فتح الصورة', 'Place': 'مكان', 'Now': 'الآن', 'Suggested': 'المقترح',
  'Hours': 'المواعيد', 'Location': 'الموقع', 'Phone': 'الهاتف', 'Closed for good': 'مغلق نهائياً', 'Photos': 'الصور', 'Prices': 'الأسعار', 'Name': 'الاسم', 'Something else': 'شيء آخر',
  'Was there': 'كان هناك', 'Works there': 'يعمل هناك', 'Saw it online': 'رآه على الإنترنت',
  'Apply': 'تطبيق', 'Reject': 'رفض', 'Decline': 'رفض الطلب',
  'Apply this correction?': 'تطبيق هذا التصحيح؟', 'The suggested value replaces the place’s value and is live on the website at once.': 'تحل القيمة المقترحة محل قيمة المكان وتظهر على الموقع فوراً.',
  'Reject this correction?': 'رفض هذا التصحيح؟', 'The person who sent it sees your reply.': 'يرى المرسل ردك.', 'Reply (one line)': 'الرد (سطر واحد)',
  'Applied. Live on the website now.': 'طُبّق. ظاهر على الموقع الآن.', 'Rejected. Your reply was sent.': 'رُفض. أُرسل ردك.',
  'Someone already decided this correction.': 'قرر أحدهم في هذا التصحيح بالفعل.',
  'Something broke': 'شيء لا يعمل', 'Wrong information': 'معلومة خاطئة', 'Slow': 'بطء', 'Saved places': 'الأماكن المحفوظة', 'An idea': 'فكرة',
  'Add hours': 'إضافة المواعيد',
  'Change the category': 'تغيير التصنيف', 'Move the pin': 'نقل الدبوس', 'Change the city': 'تغيير المدينة', 'Open the place': 'فتح المكان',
  'Mark this request done?': 'تعليم الطلب كمنجز؟', 'Decline this request?': 'رفض هذا الطلب؟', 'The owner sees your reply in the portal.': 'يرى المالك ردك في البوابة.',
  'Reply sent to the owner.': 'أُرسل الرد إلى المالك.',
  "Owners' photos are reviewed on each subscriber's Account tab, beside the owner's photo permissions.": 'تُراجع صور الملاك في تبويب الحساب لكل مشترك، بجانب صلاحيات الصور.',
  'Open subscribers': 'فتح المشتركين',
  'ID and license papers sent by trip listers wait in the Marketplace.': 'تنتظر بطاقات ورخص منظّمي الرحلات في السوق.', 'Review documents': 'مراجعة المستندات',
  'Customer reports about trips are closed in the Marketplace.': 'تُغلق بلاغات العملاء عن الرحلات في السوق.', 'Open trip reports': 'فتح بلاغات الرحلات',
  // Collections
  'Collections by 5argny': 'مجموعات خرجني', 'New collection': 'مجموعة جديدة', 'Create collection': 'إنشاء المجموعة',
  'Each collection is a row on the website home, in this order. Drag a collection or use Move up and Move down. Changes are live at once.': 'كل مجموعة صف في الصفحة الرئيسية للموقع بهذا الترتيب. اسحب مجموعة أو استخدم تحريك لأعلى ولأسفل. التغييرات تظهر فوراً.',
  'Lists of places made by the team. Each has a title in Arabic and English, its places in order, and a cover from its first places’ photos.': 'قوائم أماكن يصنعها الفريق. لكل منها عنوان بالعربية والإنجليزية وأماكنها بالترتيب وغلاف من صور أول أماكنها.',
};
