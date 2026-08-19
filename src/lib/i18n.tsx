"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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
    loginExisting: "I already have an account",
    feature1Title: "AI-Powered Generation",
    feature1Desc:
      "Generate complete, pedagogically-sound lesson plans in seconds using Google Gemini AI. Aligned with DepEd standards.",
    feature2Title: "DepEd-Compliant Format",
    feature2Desc:
      "Output follows official DLL/DLP structure with proper sections, COI/RPMS tags, and standard formatting.",
    feature3Title: "Free & Private",
    feature3Desc:
      "Zero cost. Your data stays private with secure authentication and row-level security. No student PII stored.",
    landingFooter: "DepEd Auto-DLP/DLL Generator v1.0 — Built for Filipino Educators",

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
    aiStatusTitle: "Trying AI providers in order:",
    aiStatusTrying: "Working...",
    aiStatusFailed: "Failed",
    aiStatusReady: "Ready",
    generationComplete: "Generation Complete",
    generationCompleteDesc: "Preparing your lesson plan...",
    generationFailed: "Generation Failed",
    generationFailedDesc: "The AI providers were unable to generate a plan. Please try again.",
    attempt: "Attempt",
    leaveConfirmTitle: "Leave generated plan?",
    leaveConfirmMessage: "Your generated lesson plan has not been saved yet. Are you sure you want to leave?",
    stay: "Stay",
    leave: "Leave",

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
    verifyAnswers: "Verify Answers",
    forgotPasswordDesc: "Enter your email address and we'll show your security questions so you can reset your password.",
    rememberPassword: "Remember your password?",
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
    loginExisting: "May account na ako",
    feature1Title: "Pagbuo gamit ang AI",
    feature1Desc:
      "Lumikha ng kumpleto at de-kalidad na lesson plan sa ilang segundo gamit ang Google Gemini AI. Naaayon sa mga pamantayan ng DepEd.",
    feature2Title: "Format na Tugma sa DepEd",
    feature2Desc:
      "Ang output ay sumusunod sa opisyal na istruktura ng DLL/DLP na may tamang mga seksyon, COI/RPMS tags, at standard na format.",
    feature3Title: "Libre at Pribado",
    feature3Desc:
      "Walang bayad. Ligtas ang iyong datos na may secure na authentication at row-level security. Walang nakaimbak na PII ng estudyante.",
    landingFooter: "DepEd Auto-DLP/DLL Generator v1.0 — Ginawa para sa mga Pilipinong Guro",

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
    aiStatusTitle: "Sinusubukan ang AI providers sa pagkakasunod-sunod:",
    aiStatusTrying: "Gumagawa...",
    aiStatusFailed: "Bigo",
    aiStatusReady: "Handa",
    generationComplete: "Kumpleto ang Paggawa",
    generationCompleteDesc: "Inihahanda ang iyong lesson plan...",
    generationFailed: "Nabigo ang Paggawa",
    generationFailedDesc: "Hindi nakagawa ang mga AI provider ng plan. Subukan muli.",
    attempt: "Pagtangka",
    leaveConfirmTitle: "Umalis sa nabuong plan?",
    leaveConfirmMessage: "Ang iyong nabuong lesson plan ay hindi pa na-save. Sigurado ka bang gusto mong umalis?",
    stay: "Manatili",
    leave: "Umalis",

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
    verifyAnswers: "I-verify ang mga Sagot",
    forgotPasswordDesc: "Ilagay ang iyong email address at ipapakita namin ang iyong mga security question para ma-reset mo ang iyong password.",
    rememberPassword: "Naalala mo ang iyong password?",
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
  const [language, setLanguage] = useState<Language>(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("language") : null;
    return saved === "en" || saved === "fil" ? saved : "en";
  });

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
