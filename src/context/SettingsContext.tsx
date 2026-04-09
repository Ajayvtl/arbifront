"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/lib/api";

interface SettingsContextType {
    settings: {
        site_name: string;
        brand_name: string;
        logo: string;
        contact_email: string;
        contact_phone: string;
        contact_address: string;
        currency: string;
        language: string;
    };
    loading: boolean;
    refreshSettings: () => void;
    formatCurrency: (amount: number) => string;
    t: (key: string) => string;
    setResult: (key: string, value: any) => void;
}

const translations: any = {
    en: {
        dashboard: "Dashboard",
        orders: "Orders",
        logistics: "Logistics",
        patients: "Patients",
        staff: "Staff",
        settings: "Settings",
        finance: "Finance",
        logout: "Sign Out",
        main_menu: "Main Menu",
        overview: "Overview",
        phlebotomists: "Phlebotomists",
        support: "Support",
        admin: "Admin",
        lab_catalog: "Lab Catalog",
        categories: "Categories",
        subcategories: "Subcategories",
        services_tests: "Services (Tests)",
        packages: "Packages",
        coupons: "Coupons",
        roles: "Roles",
        app_settings: "App Settings",
        referrals: "Referrals",
        notifications: "Notifications",
        locations: "Locations",
        gallery: "Gallery",
        website: "Website",
        website_categories: "Website Categories",
        general: "General",
        departments: "Departments",
        add_new: "Add New",
        edit: "Edit",
        delete: "Delete",
        search: "Search",
        id: "ID",
        name: "Name",
        email: "Email",
        phone: "Phone",
        status: "Status",
        actions: "Actions",
        total_invoiced: "Total Invoiced",
        received: "Received",
        pending: "Pending",
        amount: "Amount",
        date: "Date",
        welcome_back: "Welcome back",
        total_revenue: "Total Revenue",
        pending_orders: "Pending Orders",
        completed_tests: "Completed Tests",
        active_staff: "Active Staff",
        recent_orders: "Recent Orders",
        view_all: "View All",
        customer: "Customer",
        order_id: "Order ID",
        no_data: "No data available",
        patient_management: "Patient Management",
        manage_patients_desc: "Manage registered patients",
        add_patient: "Add Patient",
        joined_date: "Joined",
        no_patients: "No patients found",
        active: "Active",
        inactive: "Inactive",
        no_phone: "No phone"
    },
    hi: {
        dashboard: "डैशबोर्ड",
        orders: "आर्डर",
        logistics: "लॉजिस्टिक्स",
        patients: "रोगी",
        staff: "कर्मचारी",
        settings: "सेटिंग्स",
        finance: "वित्त",
        logout: "साइन आउट",
        main_menu: "मुख्य मेनू",
        overview: "अवलोकन",
        phlebotomists: "फ্লেबोटोमिस्ट",
        support: "समर्थन",
        admin: "एडमिन",
        lab_catalog: "लैब कैटलॉग",
        categories: "श्रेणियाँ",
        subcategories: "उपश्रेणियाँ",
        services_tests: "सेवाएँ (परीक्षण)",
        packages: "पैकेज",
        coupons: "कूपन",
        roles: "भूमिकाएं",
        app_settings: "ऐप सेटिंग्स",
        referrals: "रेफरल",
        notifications: "सूचनाएं",
        locations: "स्थान",
        gallery: "गैलरी",
        website: "वेबसाइट",
        website_categories: "वेबसाइट श्रेणियाँ",
        general: "सामान्य",
        departments: "विभाग",
        add_new: "नया जोड़ें",
        edit: "संपादित करें",
        delete: "हटाएं",
        search: "खोजें",
        id: "आईडी",
        name: "नाम",
        email: "ईमेल",
        phone: "फ़ोन",
        status: "स्थिति",
        actions: "क्रियाएं",
        total_invoiced: "कुल चालान",
        received: "प्राप्त",
        pending: "लंबित",
        amount: "राशि",
        date: "तारीख",
        welcome_back: "वापसी पर स्वागत है",
        total_revenue: "कुल राजस्व",
        pending_orders: "लंबित आदेश",
        completed_tests: "पूर्ण परीक्षण",
        active_staff: "सक्रिय कर्मचारी",
        recent_orders: "हाल के आदेश",
        view_all: "सभी देखें",
        customer: "ग्राहक",
        order_id: "आर्डर आईडी",
        no_data: "कोई डेटा उपलब्ध नहीं",
        patient_management: "रोगी प्रबंधन",
        manage_patients_desc: "पंजीकृत रोगियों का प्रबंधन करें",
        add_patient: "रोगी जोड़ें",
        joined_date: "शामिल",
        no_patients: "कोई रोगी नहीं मिला",
        active: "सक्रिय",
        inactive: "निष्क्रिय",
        no_phone: "कोई फोन नहीं"
    },
    gu: { // Gujarati
        dashboard: "ડેશબોર્ડ",
        orders: "ઓર્ડર",
        logistics: "લોજિસ્ટિક્સ",
        patients: "દર્દીઓ",
        staff: "સ્ટાફ",
        settings: "સેટિંગ્સ",
        finance: "નાણાં",
        logout: "સાઇન આઉટ",
        main_menu: "મુખ્ય મેનુ",
        overview: "અવલોકન",
        phlebotomists: "ફ્લેબોટોમિસ્ટ",
        support: "આધાર",
        admin: "એડમિન",
        lab_catalog: "લેબ કેટલોગ",
        categories: "શ્રેણીઓ",
        subcategories: "ઉપશ્રેણીઓ",
        services_tests: "સેવાઓ (પરીક્ષણો)",
        packages: "પેકેજો",
        coupons: "કૂપન્સ",
        roles: "ભૂમિકાઓ",
        app_settings: "એપ્લિકેશન સેટિંગ્સ",
        referrals: "રેફરલ્સ",
        notifications: "સૂચનાઓ",
        locations: "સ્થાનો",
        gallery: "ગેલરી",
        website: "વેબસાઇટ",
        website_categories: "વેબસાઇટ શ્રેણીઓ",
        general: "સામાન્ય",
        departments: "વિભાગો",
        add_new: "નવું ઉમેરો",
        edit: "ફેરફાર કરો",
        delete: "કાઢી નાખો",
        search: "શોધો",
        id: "આઈડી",
        name: "નામ",
        email: "ઇમેઇલ",
        phone: "ફોન",
        status: "સ્થિતિ",
        actions: "ક્રિયાઓ",
        total_invoiced: "કુલ ભરતિયું",
        received: "મેળવેલ",
        pending: "બાકી",
        amount: "રકમ",
        date: "તારીખ",
        welcome_back: "સ્વાગત છે",
        total_revenue: "કુલ આવક",
        pending_orders: "બાકી ઓર્ડર",
        completed_tests: "પૂર્ણ પરીક્ષણો",
        active_staff: "સક્રિય સ્ટાફ",
        recent_orders: "તાજેતરના ઓર્ડર",
        view_all: "બધા જુઓ",
        customer: "ગ્રાહક",
        order_id: "ઓર્ડર આઈડી",
        no_data: "કોઈ ડેટા ઉપલબ્ધ નથી",
        patient_management: "દર્દી સંચાલન",
        manage_patients_desc: "નોંધાયેલા દર્દીઓનું સંચાલન કરો",
        add_patient: "દર્દી ઉમેરો",
        joined_date: "જોડાયા",
        no_patients: "કોઈ દર્દી મળ્યા નથી",
        active: "સક્રિય",
        inactive: "નિષ્ક્રિય",
        no_phone: "કોઈ ફોન નથી"
    },
    mr: { // Marathi
        dashboard: "डॅशबोर्ड",
        orders: "ऑर्डर",
        logistics: "लॉजिस्टिक्स",
        patients: "रुग्ण",
        staff: "कर्मचारी",
        settings: "सेटिंग्ज",
        finance: "वित्त",
        logout: "बाहेर पडा",
        main_menu: "मुख्य मेनू",
        overview: "आढावा",
        phlebotomists: "फ्लेबोटोमिस्ट",
        support: "आधार",
        admin: "ॲडमिन",
        lab_catalog: "लॅब कॅटलॉग",
        categories: "श्रेण्या",
        subcategories: "उपश्रेण्या",
        services_tests: "सेवा (चाचण्या)",
        packages: "पॅकेजेस",
        coupons: "कूपन",
        roles: "भूमिका",
        app_settings: "ॲप सेटिंग्ज",
        referrals: "रेफरल्स",
        notifications: "सूचना",
        locations: "स्थाने",
        gallery: "गॅलरी",
        website: "संकेतस्थळ",
        website_categories: "संकेतस्थळ श्रेणी",
        general: "सामान्य",
        departments: "विभाग",
        add_new: "नवीन जोडा",
        edit: "संपादित करा",
        delete: "काढून टाका",
        search: "शोधा",
        id: "आयडी",
        name: "नाव",
        email: "ईमेल",
        phone: "फोन",
        status: "स्थिती",
        actions: "कृती",
        total_invoiced: "एकूण बीजक",
        received: "प्राप्त",
        pending: "प्रलंबित",
        amount: "रक्कम",
        date: "तारीख",
        welcome_back: "परत स्वागत आहे",
        total_revenue: "एकूण महसूल",
        pending_orders: "प्रलंबित ऑर्डर",
        completed_tests: "पूर्ण चाचण्या",
        active_staff: "सक्रिय कर्मचारी",
        recent_orders: "अलीकडील ऑर्डर",
        view_all: "सर्व पहा",
        customer: "ग्राहक",
        order_id: "ऑर्डर आयडी",
        no_data: "कोणताही डेटा उपलब्ध नाही",
        patient_management: "रुग्ण व्यवस्थापन",
        manage_patients_desc: "नोंदणीकृत रुग्णांचे व्यवस्थापन करा",
        add_patient: "रुग्ण जोडा",
        joined_date: "सामील",
        no_patients: "कोणतेही रुग्ण सापडले नाहीत",
        active: "सक्रिय",
        inactive: "निष्क्रिय",
        no_phone: "फोन नाही"
    },
    bn: { // Bengali
        dashboard: "ড্যাশবোর্ড",
        orders: "অর্ডার",
        logistics: "লজিস্টিকস",
        patients: "রোগী",
        staff: "স্টাফ",
        settings: "সেটিংস",
        finance: "অর্থ",
        logout: "সাইন আউট",
        main_menu: "প্রধান মেনু",
        overview: "ওভারভিউ",
        phlebotomists: "ফ্লেবোটোমিস্ট",
        support: "সমর্থন",
        admin: "অ্যাডমিন",
        lab_catalog: "ল্যাব ক্যাটালগ",
        categories: "বিভাগ",
        subcategories: "উপবিভাগ",
        services_tests: "সেবা (পরীক্ষা)",
        packages: "প্যাকেজ",
        coupons: "কুপন",
        roles: "ভূমিকা",
        app_settings: "অ্যাপ সেটিংস",
        referrals: "রেফারেল",
        notifications: "বিজ্ঞপ্তি",
        locations: "অবস্থান",
        gallery: "গ্যালারি",
        website: "ওয়েবসাইট",
        website_categories: "ওয়েবসাইট বিভাগ",
        general: "সাধারণ",
        departments: "বিভাগ",
        add_new: "নতুন যোগ করুন",
        edit: "সম্পাদনা",
        delete: "মুছুন",
        search: "অনুসন্ধান",
        id: "আইডি",
        name: "নাম",
        email: "ইমেল",
        phone: "ফোন",
        status: "অবস্থা",
        actions: "কর্ম",
        total_invoiced: "মোট চালান",
        received: "গৃহীত",
        pending: "অমীমাংসিত",
        amount: "পরিমাণ",
        date: "তারিখ",
        welcome_back: "স্বাগতম",
        total_revenue: "মোট আয়",
        pending_orders: "অমীমাংসিত অর্ডার",
        completed_tests: "সম্পন্ন পরীক্ষা",
        active_staff: "সক্রিয় স্টাফ",
        recent_orders: "সাম্প্রতিক অর্ডার",
        view_all: "সব দেখুন",
        customer: "গ্রাহক",
        order_id: "অর্ডার আইডি",
        no_data: "কোন তথ্য নেই",
        patient_management: "রোগী ব্যবস্থাপনা",
        manage_patients_desc: "নিবন্ধিত রোগীদের পরিচালনা করুন",
        add_patient: "রোগী যোগ করুন",
        joined_date: "যোগদান",
        no_patients: "কোন রোগী পাওয়া যায়নি",
        active: "সক্রিয়",
        inactive: "নিষ্ক্রিয়",
        no_phone: "কোন ফোন নেই"
    },
    ar: { // Arabic
        dashboard: "لوحة القيادة",
        orders: "الطلبات",
        logistics: "الخدمات اللوجستية",
        patients: "المرضى",
        staff: "الموظفين",
        settings: "الإعدادات",
        finance: "المالية",
        logout: "تسجيل خروج",
        main_menu: "القائمة الرئيسية",
        overview: "نظرة عامة",
        phlebotomists: "فاصد الدم",
        support: "الدعم",
        admin: "مشرف",
        lab_catalog: "دليل المختبر",
        categories: "التصنيفات",
        subcategories: "التصنيفات الفرعية",
        services_tests: "الخدمات (الاختبارات)",
        packages: "الحزم",
        coupons: "كوبونات",
        roles: "أدوار",
        app_settings: "إعدادات التطبيق",
        referrals: "الإحالات",
        notifications: "إشعارات",
        locations: "مواقع",
        gallery: "معرض",
        website: "موقع الكتروني",
        website_categories: "فئات الموقع",
        general: "عام",
        departments: "الإدارات",
        add_new: "إضافة جديد",
        edit: "تعديل",
        delete: "حذف",
        search: "بحث",
        id: "المعرف",
        name: "الاسم",
        email: "البريد الإلكتروني",
        phone: "الهاتف",
        status: "الحالة",
        actions: "الإجراءات",
        total_invoiced: "إجمالي الفواتير",
        received: "تم الاستلام",
        pending: "قيد الانتظار",
        amount: "المبلغ",
        date: "التاريخ",
        welcome_back: "مرحبًا بعودتك",
        total_revenue: "إجمالي الإيرادات",
        pending_orders: "الطلبات المعلقة",
        completed_tests: "الاختبارات المكتملة",
        active_staff: "الموظفين النشطين",
        recent_orders: "الطلبات الأخيرة",
        view_all: "عرض الكل",
        customer: "العميل",
        order_id: "رقم الطلب",
        no_data: "لا توجد بيانات متاحة",
        patient_management: "إدارة المرضى",
        manage_patients_desc: "إدارة المرضى المسجلين",
        add_patient: "أضف مريض",
        joined_date: "انضم",
        no_patients: "لم يتم العثور على مرضى",
        active: "نشط",
        inactive: "غير نشط",
        no_phone: "لا يوجد هاتف"
    }
};

const currencies: any = {
    INR: { symbol: '₹', locale: 'en-IN' },
    USD: { symbol: '$', locale: 'en-US' },
    EUR: { symbol: '€', locale: 'de-DE' },
    AED: { symbol: 'AED', locale: 'ar-AE' }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState({
        site_name: 'Company Platform',
        brand_name: 'Company DApp',
        logo: '',
        contact_email: '',
        contact_phone: '',
        contact_address: '',
        currency: 'INR',
        language: 'en'
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings/public');
            if (response.data && response.data.data) {
                const data = response.data.data;
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    logo: data.logo ? (data.logo.startsWith('http') ? data.logo : `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:5000'}${data.logo}`) : prev.logo,
                    // Ensure defaults if API returns null/undefined
                    currency: data.currency || prev.currency,
                    language: data.language || prev.language
                }));
            }
        } catch (error) {
            console.warn("Failed to load global settings", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Helper to update settings locally (and optionally save to API if we added an endpoint for that)
    const setResult = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        // Ideally we would also POST to API here to persist preference
    };

    const formatCurrency = (amount: number) => {
        const curr = currencies[settings.currency] || currencies['INR'];
        return new Intl.NumberFormat(curr.locale, {
            style: 'currency',
            currency: settings.currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    const t = (key: string) => {
        const lang = translations[settings.language] || translations['en'];
        return lang[key] || key;
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, formatCurrency, t, setResult }}>
            {children}
            {/* Simple RTL handler */}
            <style jsx global>{`
                :root {
                    direction: ${settings.language === 'ar' ? 'rtl' : 'ltr'};
                }
                body {
                    direction: ${settings.language === 'ar' ? 'rtl' : 'ltr'};
                }
            `}</style>
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
