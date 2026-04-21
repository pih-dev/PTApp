// ─── Translations ───
// All UI strings in English and Arabic.
// English is the source of truth — Arabic keys must match English keys.

const T = {
  en: {
    // App
    personalTrainer: 'Personal Trainer',
    syncing: 'Syncing...',

    // Tabs
    home: 'Home',
    clients: 'Clients',
    schedule: 'Schedule',
    sessions: 'Sessions',

    // Dashboard
    overview: '📊 Overview',
    statClients: 'Clients',
    statToday: 'Today',
    statWeek: 'This Week',
    todaySessions: "Today's Sessions",
    upcomingSessions: 'Upcoming Sessions',
    today: 'Today',
    compact: 'Compact',
    expanded: 'Expanded',
    noSessionsToday: 'No sessions today',
    noUpcoming: 'No upcoming sessions',
    bookSession: '+ Book Session',
    bookFirst: '+ Book First Session',

    // Common actions
    complete: '✅ Complete',
    remind: 'Remind',
    edit: 'Edit',
    editSession: 'Edit Session',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    cancelSession: 'Cancel Session',
    keepSession: 'Keep Session',
    countNoShow: 'Count (No-show / Late cancel)',
    forgive: 'Forgive (Legitimate cancel)',
    restore: '↩ Restore',
    delete: 'Delete',
    done: 'Done',
    skip: 'Skip',
    add: 'Add',

    // Form labels
    client: 'Client',
    clientPlural: 'Clients',
    sessionType: 'Session Type',
    date: 'Date',
    time: 'Time',
    duration: 'Duration',
    min: 'min',
    fullName: 'Full Name',
    nickname: 'Nickname',
    nickLabel: '(used in WhatsApp)',
    phone: 'Phone',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    birthdate: 'Birthdate',
    notes: 'Notes',
    notesOpt: 'Notes (optional)',
    notesPlaceholder: 'Notes...',

    // Schedule
    sessionsCount: 'Sessions',
    book: '+ Book',
    addClientFirst: 'Add a client first before booking sessions',
    noSessionsDay: 'No sessions on this day',
    prev: '← Prev',
    next: 'Next →',
    bookSessionBtn: 'Book Session',
    sessionBooked: 'Session Booked! 🎉',
    sendConfirmWA: 'Send Confirmation via WhatsApp',

    // Sessions tab
    allSessions: '📋 All Sessions',
    active: 'Active',
    all: 'All',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noSessionsFound: 'No sessions found',

    // Clients
    myClients: '👥 My Clients',
    searchPlaceholder: 'Search by name or phone...',
    noClients: 'No clients yet',
    tapAdd: 'Tap "Add" to register your first client',
    noMatch: 'No clients match',
    sessionWord: 'sessions',
    noSessionsMonth: 'No sessions this month',
    editClient: 'Edit Client',
    newClient: 'New Client',
    addClient: 'Add Client',

    // General
    general: 'General',
    backupTitle: '💾 Clients/Sessions Backup',
    backup: 'Backup',
    cloudBackup: 'Cloud Backup',
    restoreBtn: 'Restore',
    cloudRestore: 'Cloud Restore',
    restoreNote: 'Restore merges data — adds missing records without replacing existing ones.',
    merge: 'Merge',
    todoTitle: '📝 To Do',
    noItems: 'No items yet',
    addSomething: 'Add something...',
    waTitle: '💬 WhatsApp Messages',
    waPlaceholders: 'Placeholders:',
    bookingMsg: 'Booking Message',
    reminderMsg: 'Reminder Message',
    resetDefaults: 'Reset to Defaults',
    docsTitle: '📖 Documentation',
    appInstructions: 'App Instructions',
    whatChanged: 'What Changed (Changelog)',
    templatesReset: 'Templates reset to defaults. Reopen General to see the change.',

    // Select placeholders
    selectClient: 'Select a client...',

    // Date/time connector
    at: 'at',

    // Delete confirmation
    deleteClient: 'Delete Client',
    deleteConfirmMsg: 'Delete this client and all their sessions?',
    confirmDelete: 'Delete',

    // Token setup
    tokenSubtitle: 'Enter your sync token to connect to the cloud',
    tokenPlaceholder: 'Paste your sync token here',
    tokenConnect: 'Connect',
    tokenConnecting: 'Connecting...',
    tokenInvalid: 'Invalid token — check and try again',
    tokenFailed: 'Connection failed — check your internet',

    // Billing period
    periodStart: 'Period Start',
    periodLength: 'Period Length',
    periodDefault: 'Default (calendar month)',
    periodOptional: 'optional — defaults to 1st of month',

    // Session count override (v2.8) — lets PT correct auto count per period
    countAuto: 'Auto',
    overridePlaceholder: '±',
    overrideHelpTitle: 'Manual count override',
    overrideHelpBody: 'Type a whole number (like 10) to set the count directly for this period.\nType +1 or -1 (or any +N / -N) to adjust the automatic count.\nLeave empty to use the automatic count.\nThe override clears when the next billing period starts.',
    overrideClear: 'Clear override',

    // Sync status
    syncSynced: 'Synced',
    syncSyncing: 'Syncing...',
    syncFailed: 'Sync failed — tap to retry',
    syncOffline: 'Offline — changes saved locally',

    // Notifications (replacing native alert/confirm)
    invalidBackup: 'Invalid backup file',
    backupReadError: 'Could not read backup file',
    docLoadError: 'Could not load document. Check your connection.',
    restoredInfo: 'Restored: +{clients} client(s), +{sessions} session(s)',

    // v2.9 keys
    periodLengthValue: 'Length',
    periodLengthUnit: 'Unit',
    unitDay: 'Day',
    unitWeek: 'Week',
    unitMonth: 'Month',
    contractSize: 'Contract size',
    contractOptional: '(blank = no contract)',
    contractPlaceholder: 'e.g. 10',
    packageNumber: 'Package',
    session: 'Session',
    renewContract: 'Renew',
    renewalDue: 'Renewal due',
    dueForRenewal: 'Due for renewal',
    confirmRenewal: 'Confirm renewal',
    newPeriodStart: 'New period start',
    renewalNotesOptional: 'Notes (optional)',
    renewalNotesPlaceholder: 'e.g. paid $500 cash',
    packageLimitHit: 'Package limit hit',
    willAutoRenew: 'booking this session will auto-renew',
  },
  ar: {
    // App
    personalTrainer: 'مدرّب شخصي',
    syncing: 'جاري المزامنة...',

    // Tabs
    home: 'الرئيسية',
    clients: 'العملاء',
    schedule: 'الجدول',
    sessions: 'الجلسات',

    // Dashboard
    overview: '📊 نظرة عامة',
    statClients: 'العملاء',
    statToday: 'اليوم',
    statWeek: 'هذا الأسبوع',
    todaySessions: 'جلسات اليوم',
    upcomingSessions: 'الجلسات القادمة',
    today: 'اليوم',
    compact: 'مختصر',
    expanded: 'مفصّل',
    noSessionsToday: 'لا جلسات اليوم',
    noUpcoming: 'لا جلسات قادمة',
    bookSession: '+ حجز جلسة',
    bookFirst: '+ حجز أول جلسة',

    // Common actions
    complete: '✅ إتمام',
    remind: 'تذكير',
    edit: 'تعديل',
    editSession: 'تعديل الجلسة',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    cancelSession: 'إلغاء الجلسة',
    keepSession: 'إبقاء الجلسة',
    countNoShow: 'احتساب (غياب / إلغاء متأخر)',
    forgive: 'إعفاء (إلغاء مبرّر)',
    restore: '↩ استعادة',
    delete: 'حذف',
    done: 'تم',
    skip: 'تخطي',
    add: 'إضافة',

    // Form labels
    client: 'العميل',
    clientPlural: 'العملاء',
    sessionType: 'نوع الجلسة',
    date: 'التاريخ',
    time: 'الوقت',
    duration: 'المدة',
    min: 'د',
    fullName: 'الاسم الكامل',
    nickname: 'الاسم المختصر',
    nickLabel: '(يُستخدم في واتساب)',
    phone: 'الهاتف',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    birthdate: 'تاريخ الميلاد',
    notes: 'ملاحظات',
    notesOpt: 'ملاحظات (اختياري)',
    notesPlaceholder: 'ملاحظات...',

    // Schedule
    sessionsCount: 'الجلسات',
    book: '+ حجز',
    addClientFirst: 'أضف عميلاً أولاً قبل حجز الجلسات',
    noSessionsDay: 'لا جلسات في هذا اليوم',
    prev: 'السابق ←',
    next: '→ التالي',
    bookSessionBtn: 'حجز جلسة',
    sessionBooked: 'تمّ الحجز! 🎉',
    sendConfirmWA: 'إرسال تأكيد عبر واتساب',

    // Sessions tab
    allSessions: '📋 كل الجلسات',
    active: 'نشطة',
    all: 'الكل',
    scheduled: 'مجدولة',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    noSessionsFound: 'لا جلسات',

    // Clients
    myClients: '👥 عملائي',
    searchPlaceholder: 'البحث بالاسم أو الهاتف...',
    noClients: 'لا عملاء بعد',
    tapAdd: 'اضغط "إضافة" لتسجيل أول عميل',
    noMatch: 'لا نتائج لـ',
    sessionWord: 'جلسات',
    noSessionsMonth: 'لا جلسات هذا الشهر',
    editClient: 'تعديل العميل',
    newClient: 'عميل جديد',
    addClient: 'إضافة عميل',

    // General
    general: 'عام',
    backupTitle: '💾 نسخ احتياطي',
    backup: 'نسخ',
    cloudBackup: 'نسخ سحابي',
    restoreBtn: 'استعادة',
    cloudRestore: 'استعادة سحابية',
    restoreNote: 'الاستعادة تدمج البيانات — تضيف السجلات المفقودة دون استبدال الموجودة.',
    merge: 'دمج',
    todoTitle: '📝 المهام',
    noItems: 'لا عناصر بعد',
    addSomething: 'أضف شيئاً...',
    waTitle: '💬 رسائل واتساب',
    waPlaceholders: 'المتغيّرات:',
    bookingMsg: 'رسالة الحجز',
    reminderMsg: 'رسالة التذكير',
    resetDefaults: 'إعادة للأصل',
    docsTitle: '📖 الوثائق',
    appInstructions: 'تعليمات التطبيق',
    whatChanged: 'ما الجديد (سجل التغييرات)',
    templatesReset: 'تمّت إعادة القوالب للأصل. أعد فتح عام لرؤية التغيير.',

    // Select placeholders
    selectClient: 'اختر عميلاً...',

    // Date/time connector
    at: 'الساعة',

    // Delete confirmation
    deleteClient: 'حذف العميل',
    deleteConfirmMsg: 'حذف هذا العميل وجميع جلساته؟',
    confirmDelete: 'حذف',

    // Token setup
    tokenSubtitle: 'أدخل رمز المزامنة للاتصال بالسحابة',
    tokenPlaceholder: 'الصق رمز المزامنة هنا',
    tokenConnect: 'اتصال',
    tokenConnecting: 'جارٍ الاتصال...',
    tokenInvalid: 'رمز غير صالح — تحقق وحاول مرة أخرى',
    tokenFailed: 'فشل الاتصال — تحقق من الإنترنت',

    // Billing period
    periodStart: 'بداية الفترة',
    periodLength: 'مدة الفترة',
    periodDefault: 'افتراضي (شهر تقويمي)',
    periodOptional: 'اختياري — الافتراضي أول الشهر',

    // Session count override (v2.8)
    countAuto: 'تلقائي',
    overridePlaceholder: '±',
    overrideHelpTitle: 'تعديل يدوي للعدد',
    overrideHelpBody: 'اكتب رقمًا صحيحًا (مثل 10) لتحديد العدد مباشرة لهذه الفترة.\nاكتب +1 أو -1 (أو أي +N / -N) لتعديل العدد التلقائي.\nاتركه فارغًا لاستخدام العدد التلقائي.\nيتم مسح التعديل اليدوي تلقائيًا عند بدء فترة جديدة.',
    overrideClear: 'مسح التعديل',

    // Sync status
    syncSynced: 'متزامن',
    syncSyncing: 'جارٍ المزامنة...',
    syncFailed: 'فشل المزامنة — انقر للمحاولة',
    syncOffline: 'غير متصل — التغييرات محفوظة محلياً',

    // Notifications
    invalidBackup: 'ملف نسخ احتياطي غير صالح',
    backupReadError: 'تعذّر قراءة ملف النسخ الاحتياطي',
    docLoadError: 'تعذّر تحميل المستند. تحقق من اتصالك.',
    restoredInfo: 'تمت الاستعادة: +{clients} عميل، +{sessions} جلسة',

    // v2.9 keys (Arabic)
    periodLengthValue: 'المدة',
    periodLengthUnit: 'الوحدة',
    unitDay: 'يوم',
    unitWeek: 'أسبوع',
    unitMonth: 'شهر',
    contractSize: 'عدد الجلسات المتعاقد عليها',
    contractOptional: '(فارغ = بدون عقد)',
    contractPlaceholder: 'مثلاً 10',
    packageNumber: 'الباقة',
    session: 'الجلسة',
    renewContract: 'تجديد',
    renewalDue: 'مطلوب تجديد',
    dueForRenewal: 'مطلوب تجديدها',
    confirmRenewal: 'تأكيد التجديد',
    newPeriodStart: 'تاريخ بدء الفترة الجديدة',
    renewalNotesOptional: 'ملاحظات (اختياري)',
    renewalNotesPlaceholder: 'مثلاً دفع ٥٠٠$ نقداً',
    packageLimitHit: 'تم الوصول إلى حد الباقة',
    willAutoRenew: 'حجز هذه الجلسة سيجدد الباقة تلقائياً',
  },
};

// Get a translated string — falls back to English, then to the key itself
export const t = (lang, key) => (T[lang] && T[lang][key]) || T.en[key] || key;

// Date locale for the current language
export const dateLocale = (lang) => lang === 'ar' ? 'ar-LB' : 'en-US';
