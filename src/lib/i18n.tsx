"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Language = "en" | "fil";

const translations = {
  en: {
    // Navigation
    dashboard: "Dashboard",
    generate: "Generate Plan",
    history: "History",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up",

    // Landing
    heroTitle: "DepEd Auto-DLP/DLL Generator",
    heroSubtitle: "Automated Daily Lesson Log & Detailed Lesson Plan Generator for Filipino Educators",
    heroTagline: "Free, AI-powered, DepEd-compliant",
    getStarted: "Get Started",
    alreadyHaveAccount: "Already have an account?",

    // Form
    gradeLevel: "Grade Level",
    learningArea: "Learning Area",
    quarter: "Quarter",
    week: "Week",
    subjectDescription: "Subject Description",
    curriculumType: "Curriculum Type",
    k12: "K-12 MELCs",
    matatag: "MATATAG",
    learningCompetencies: "Learning Competencies / Codes",
    teachingMethod: "Teaching Method",
    customMethod: "Custom Teaching Method",
    coiTags: "Classroom Observable Indicators (COI/RPMS)",
    coiTagsPlaceholder: "e.g., CO1, CO2, RPMS Indicator 1.1",
    generatePlan: "Generate Plan",
    generating: "Generating...",

    // Sections
    objectives: "I. Objectives (Layunin)",
    content: "II. Content (Nilalaman)",
    learningResources: "III. Learning Resources (Kagamitang Panturo)",
    procedures: "IV. Procedures (Pamamaraan)",
    remarks: "V. Remarks & Reflection (Mga Tala at Pagninilay)",
    balikAral: "Balik-Aral",
    paghahabi: "Paghahabi",
    pagtatalakay: "Pagtatalakay",
    development: "Development",
    abstraction: "Abstraction",
    application: "Application",
    evaluation: "Evaluation",

    // Actions
    downloadDocx: "Download .docx",
    savePlan: "Save to Dashboard",
    viewPlan: "View",
    editPlan: "Edit",
    deletePlan: "Delete",
    cancel: "Cancel",
    confirm: "Confirm",
    saved: "Plan saved successfully!",
    deleted: "Plan deleted successfully!",

    // Auth
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    confirmPassword: "Confirm Password",
    accountDetails: "Account Details",
    securityQuestions: "Security Questions",
    continue: "Continue",
    back: "Back",
    forgotPasswordDesc: "Enter your email address and we'll send you a link to reset your password.",
    sendResetLink: "Send Reset Link",
    rememberPassword: "Remember your password?",
    checkEmail: "Check your email",
    resetEmailSent: "We sent a password reset link to",
    resetEmailInstructions: "Click the link in the email to reset your password. The link will expire in 1 hour.",
    backToLogin: "Back to Login",
    validatingResetLink: "Validating your reset link...",
    resetPassword: "Reset Password",
    resetPasswordDesc: "Enter your new password below.",
    newPassword: "New Password",
    passwordReset: "Password Reset",
    passwordResetSuccess: "Your password has been successfully reset. You can now log in with your new password.",

    // Misc
    loading: "Loading...",
    noPlans: "No lesson plans yet",
    createFirst: "Create your first lesson plan to get started",
    totalPlans: "Total Plans",
    recentPlans: "Recent Plans",
  },
  fil: {
    // Navigation
    dashboard: "Dashboard",
    generate: "Lumikha ng Plan",
    history: "Kasaysayan",
    logout: "Mag-logout",
    login: "Mag-login",
    signup: "Mag-signup",

    // Landing
    heroTitle: "DepEd Auto-DLP/DLL Generator",
    heroSubtitle: "Awtomatikong Tagalikha ng Daily Lesson Log at Detailed Lesson Plan para sa mga Pilipinong Guro",
    heroTagline: "Libre, AI-powered, compliant sa DepEd",
    getStarted: "Magsimula",
    alreadyHaveAccount: "May account ka na?",

    // Form
    gradeLevel: "Baitang",
    learningArea: "Lugar ng Pagkatuto",
    quarter: "Quarter",
    week: "Linggo",
    subjectDescription: "Deskripsyon ng Paksa",
    curriculumType: "Uri ng Kurikulum",
    k12: "K-12 MELCs",
    matatag: "MATATAG",
    learningCompetencies: "Mga Kasanayan sa Pagkatuto / Code",
    teachingMethod: "Paraan ng Pagtuturo",
    customMethod: "Sariling Paraan ng Pagtuturo",
    coiTags: "Classroom Observable Indicators (COI/RPMS)",
    coiTagsPlaceholder: "hal., CO1, CO2, RPMS Indicator 1.1",
    generatePlan: "Lumikha ng Plan",
    generating: "Ginagawa...",

    // Sections
    objectives: "I. Layunin",
    content: "II. Nilalaman",
    learningResources: "III. Kagamitang Panturo",
    procedures: "IV. Pamamaraan",
    remarks: "V. Mga Tala at Pagninilay",
    balikAral: "Balik-Aral",
    paghahabi: "Paghahabi",
    pagtatalakay: "Pagtatalakay",
    development: "Pagpapaunlad",
    abstraction: "Abstraksyon",
    application: "Aplikasyon",
    evaluation: "Ebalwasyon",

    // Actions
    downloadDocx: "I-download ang .docx",
    savePlan: "I-save sa Dashboard",
    viewPlan: "Tingnan",
    editPlan: "I-edit",
    deletePlan: "Tanggalin",
    cancel: "Kanselahin",
    confirm: "Kumpirmahin",
    saved: "Matagumpay na nai-save ang plan!",
    deleted: "Matagumpay na nai-delete ang plan!",

    // Auth
    email: "Email",
    password: "Password",
    fullName: "Buong Pangalan",
    forgotPassword: "Nakalimutan ang password?",
    noAccount: "Wala pang account?",
    confirmPassword: "Kumpirmahin ang Password",
    accountDetails: "Mga Detalye ng Account",
    securityQuestions: "Mga Security Question",
    continue: "Magpatuloy",
    back: "Bumalik",
    forgotPasswordDesc: "Ilagay ang iyong email address at padadalhan ka namin ng link para i-reset ang iyong password.",
    sendResetLink: "Ipadala ang Reset Link",
    rememberPassword: "Naalala mo ang iyong password?",
    checkEmail: "Tingnan ang iyong email",
    resetEmailSent: "Nagpadala kami ng password reset link sa",
    resetEmailInstructions: "I-click ang link sa email para i-reset ang iyong password. Mag-e-expire ang link sa 1 oras.",
    backToLogin: "Bumalik sa Login",
    validatingResetLink: "Vine-validate ang iyong reset link...",
    resetPassword: "I-reset ang Password",
    resetPasswordDesc: "Ilagay ang iyong bagong password sa ibaba.",
    newPassword: "Bagong Password",
    passwordReset: "Na-reset na ang Password",
    passwordResetSuccess: "Matagumpay na na-reset ang iyong password. Maaari ka nang mag-login gamit ang iyong bagong password.",

    // Misc
    loading: "Naglo-load...",
    noPlans: "Wala pang lesson plans",
    createFirst: "Lumikha ng iyong unang lesson plan para magsimula",
    totalPlans: "Kabuuang Plan",
    recentPlans: "Mga Kamakailang Plan",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && (saved === "en" || saved === "fil")) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key];
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
