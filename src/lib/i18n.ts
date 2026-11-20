import { useEffect, useState } from "react";

export type AppLanguage = "en" | "hi" | "pa";

const LANG_STORAGE_KEY = "rabata_lang_v1";
const LANG_EVENT = "rabata-lang-change";

export const LANGUAGE_OPTIONS: Array<{ code: AppLanguage; label: string; nativeName: string }> = [
  { code: "en", label: "EN", nativeName: "English" },
  { code: "hi", label: "हिं", nativeName: "हिंदी" },
  { code: "pa", label: "ਪੰ", nativeName: "ਪੰਜਾਬੀ" },
];

export function getSavedLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (raw === "hi" || raw === "pa" || raw === "en") return raw;
  } catch {
    // ignore storage errors
  }
  return "en";
}

export function setAppLanguage(next: AppLanguage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent<AppLanguage>(LANG_EVENT, { detail: next }));
}

export function useLanguage(): {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  t: TranslationBundle;
} {
  const [lang, setLangState] = useState<AppLanguage>("en");

  useEffect(() => {
    const initial = getSavedLanguage();
    if (initial !== "en") setLangState(initial);

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<AppLanguage>).detail;
      if (detail === "en" || detail === "hi" || detail === "pa") {
        setLangState(detail);
      } else {
        setLangState(getSavedLanguage());
      }
    };
    window.addEventListener(LANG_EVENT, onChange);
    return () => window.removeEventListener(LANG_EVENT, onChange);
  }, []);

  return {
    lang,
    setLang: (next: AppLanguage) => {
      setLangState(next);
      setAppLanguage(next);
    },
    t: TRANSLATIONS[lang],
  };
}

export interface TranslationBundle {
  tagline: string;
  brandSub: string;
  nav: {
    home: string;
    about: string;
    learn: string;
    students: string;
    impact: string;
    funds: string;
    community: string;
    contact: string;
    getInvolved: string;
    memberPortal: string;
    adminConsole: string;
    skills: string;
  };
  registrationPage: {
    eyebrow: string;
    title: string;
    description: string;
    asideHeadingLine1: string;
    asideHeadingLine2: string;
    asideBody1: string;
    asideBody2: string;
    asideBody3: string;
  };
  enquiryForm: {
    languageBanner: string;
    contactHeading: string;
    studentHeading: string;
    volunteerHeading: string;
    studentNameLabel: string;
    yourNameLabel: string;
    studentNamePlaceholder: string;
    yourNamePlaceholder: string;
    guardianEmailLabel: string;
    emailLabel: string;
    classStudentLabel: string;
    classVolunteerLabel: string;
    selectClassOption: string;
    subjectsLabel: string;
    subjectsPlaceholder: string;
    languageStudentLabel: string;
    languageVolunteerLabel: string;
    formatLabel: string;
    qualificationsLabel: string;
    qualificationsPlaceholder: string;
    experienceLabel: string;
    experiencePlaceholder: string;
    availabilityLabel: string;
    availabilityPlaceholder: string;
    messageVolunteerLabel: string;
    messageStudentLabel: string;
    messageContactLabel: string;
    messageContactPlaceholder: string;
    messageOtherPlaceholder: string;
    consentStudent: string;
    consentOther: string;
    consentPolicyPrefix: string;
    consentPolicyLink: string;
    sending: string;
    submitContact: string;
    submitStudent: string;
    submitVolunteer: string;
    finePrint: string;
    successMessage: string;
    errorFallback: string;
  };
}

export const TRANSLATIONS: Record<AppLanguage, TranslationBundle> = {
  en: {
    tagline: "Connecting Education with Opportunity.",
    brandSub: "Learn. Empower. Rise.",
    nav: {
      home: "Home",
      about: "About Us",
      learn: "Learn with Rabata",
      students: "Student Profiles",
      impact: "Our Impact",
      funds: "Fund Transparency",
      community: "Community",
      contact: "Contact",
      getInvolved: "Get Involved",
      memberPortal: "Member Portal",
      adminConsole: "Admin Console",
      skills: "Skills & Careers",
    },
    registrationPage: {
      eyebrow: "Every learner belongs",
      title: "Your learning journey starts here.",
      description:
        "Free educational support, a friendly community and someone who believes in your potential.",
      asideHeadingLine1: "A little support.",
      asideHeadingLine2: "New possibilities.",
      asideBody1:
        "Tell us which subjects you need help with and how you prefer to learn. Tammana will contact your parent or guardian to discuss suitable support and availability.",
      asideBody2:
        "For children under 18, this form must be completed by a parent or legal guardian. Adult learners may register themselves.",
      asideBody3:
        "Only a first name and guardian contact are needed. Please do not send a child’s personal phone number, home address or identity documents.",
    },
    enquiryForm: {
      languageBanner: "Choose language:",
      contactHeading: "Send us a message",
      studentHeading: "Student registration",
      volunteerHeading: "Volunteer teacher registration",
      studentNameLabel: "Student’s first name",
      yourNameLabel: "Your name",
      studentNamePlaceholder: "Student’s first name",
      yourNamePlaceholder: "Full name",
      guardianEmailLabel: "Parent / guardian email",
      emailLabel: "Email address",
      classStudentLabel: "Class",
      classVolunteerLabel: "Classes you can teach",
      selectClassOption: "Select class",
      subjectsLabel: "Subjects",
      subjectsPlaceholder: "e.g. English, Science",
      languageStudentLabel: "Preferred language",
      languageVolunteerLabel: "Teaching languages",
      formatLabel: "Preferred format",
      qualificationsLabel: "Qualifications",
      qualificationsPlaceholder: "Education and relevant qualifications",
      experienceLabel: "Teaching experience",
      experiencePlaceholder: "New volunteers are welcome",
      availabilityLabel: "Availability",
      availabilityPlaceholder: "Days and hours you can offer",
      messageVolunteerLabel: "Why would you like to volunteer?",
      messageStudentLabel: "What support would help the student?",
      messageContactLabel: "Your message",
      messageContactPlaceholder: "Tell us how you’d like to connect…",
      messageOtherPlaceholder: "Share a little about the support or experience you have in mind…",
      consentStudent:
        "I am the student’s parent or legal guardian, or an adult learner, and consent to Rabata contacting me about learning support.",
      consentOther: "I agree to Rabata using this information to respond to my enquiry.",
      consentPolicyPrefix: "I have read the",
      consentPolicyLink: "privacy and safeguarding policy",
      sending: "Sending…",
      submitContact: "Send message",
      submitStudent: "Submit registration",
      submitVolunteer: "Apply to volunteer",
      finePrint:
        "Please do not include identity documents, financial details or sensitive information. Submitting a form does not confirm a class placement.",
      successMessage:
        "Thank you. Your information has been securely received by Rabata. We’ll reply using the contact email you provided.",
      errorFallback: "We couldn’t save your message. Please try again, or use our email link.",
    },
  },
  hi: {
    tagline: "शिक्षा को अवसर से जोड़ने की पहल।",
    brandSub: "सीखें। सशक्त बनें। आगे बढ़ें।",
    nav: {
      home: "मुख्य पृष्ठ",
      about: "हमारे बारे में",
      learn: "सीखें (लेक्चर)",
      students: "छात्र प्रोफ़ाइल",
      impact: "हमारा प्रभाव",
      funds: "फंड पारदर्शिता",
      community: "समुदाय",
      contact: "संपर्क करें",
      getInvolved: "सहयोग करें",
      memberPortal: "मेंबर पोर्टल",
      adminConsole: "एडमिन कंसोल",
      skills: "कौशल और करियर",
    },
    registrationPage: {
      eyebrow: "हर विद्यार्थी का अधिकार",
      title: "आपकी सीखने की यात्रा यहाँ से शुरू होती है।",
      description: "निःशुल्क शैक्षणिक सहायता, सहयोगी समुदाय और सही मार्गदर्शन।",
      asideHeadingLine1: "थोड़ा सा सहयोग।",
      asideHeadingLine2: "नई संभावनाएँ।",
      asideBody1:
        "हमें बताएं कि विद्यार्थी को किन विषयों में मदद चाहिए और वह कैसे सीखना चाहता है। तमन्ना जल्द ही माता-पिता या अभिभावक से संपर्क करेंगी।",
      asideBody2:
        "18 वर्ष से कम उम्र के बच्चों के लिए यह फॉर्म माता-पिता या कानूनी अभिभावक द्वारा भरा जाना आवश्यक है। वयस्क विद्यार्थी स्वयं पंजीकरण कर सकते हैं।",
      asideBody3:
        "केवल पहला नाम और अभिभावक का संपर्क ईमेल पर्याप्त है। कृपया बच्चे का व्यक्तिगत फ़ोन नंबर, घर का पता या पहचान पत्र न भेजें।",
    },
    enquiryForm: {
      languageBanner: "अपनी भाषा चुनें:",
      contactHeading: "हमें संदेश भेजें",
      studentHeading: "निःशुल्क छात्र पंजीकरण",
      volunteerHeading: "स्वयंसेवक शिक्षक पंजीकरण",
      studentNameLabel: "विद्यार्थी का पहला नाम",
      yourNameLabel: "आपका पूरा नाम",
      studentNamePlaceholder: "विद्यार्थी का पहला नाम लिखें",
      yourNamePlaceholder: "अपना पूरा नाम लिखें",
      guardianEmailLabel: "माता-पिता / अभिभावक का ईमेल",
      emailLabel: "ईमेल पता",
      classStudentLabel: "कक्षा",
      classVolunteerLabel: "आप कौन सी कक्षाएं पढ़ा सकते हैं",
      selectClassOption: "कक्षा चुनें",
      subjectsLabel: "विषय",
      subjectsPlaceholder: "जैसे: अंग्रेज़ी, विज्ञान, गणित",
      languageStudentLabel: "सीखने की पसंदीदा भाषा",
      languageVolunteerLabel: "पढ़ाने की भाषाएं",
      formatLabel: "पढ़ाई का माध्यम",
      qualificationsLabel: "शैक्षणिक योग्यता",
      qualificationsPlaceholder: "आपकी शिक्षा और योग्यता",
      experienceLabel: "शिक्षण अनुभव",
      experiencePlaceholder: "नए स्वयंसेवकों का भी स्वागत है",
      availabilityLabel: "उपलब्ध समय",
      availabilityPlaceholder: "सप्ताह के दिन और समय",
      messageVolunteerLabel: "आप स्वयंसेवा क्यों करना चाहते हैं?",
      messageStudentLabel: "विद्यार्थी को किस प्रकार की मदद चाहिए?",
      messageContactLabel: "आपका संदेश",
      messageContactPlaceholder: "बताएं कि आप हमसे कैसे जुड़ना चाहते हैं…",
      messageOtherPlaceholder: "सहायता या विषय के बारे में थोड़ा विस्तार से लिखें…",
      consentStudent:
        "मैं विद्यार्थी का माता-पिता / अभिभावक (या वयस्क शिक्षार्थी) हूँ और पढ़ाई सहायता हेतु संपर्क करने की सहमति देता/देती हूँ।",
      consentOther: "मैं सहमत हूँ कि राबता मेरी पूछताछ का उत्तर देने के लिए इस जानकारी का उपयोग करे।",
      consentPolicyPrefix: "मैंने पढ़ ली है:",
      consentPolicyLink: "गोपनीयता एवं बाल सुरक्षा नीति",
      sending: "भेजा जा रहा है…",
      submitContact: "संदेश भेजें",
      submitStudent: "पंजीकरण सबमिट करें",
      submitVolunteer: "शिक्षक के रूप में आवेदन करें",
      finePrint:
        "कृपया कोई पहचान पत्र, बैंक विवरण या संवेदनशील जानकारी न भरें। फॉर्म भरने से कक्षा सीट की पुष्टि स्वतः नहीं होती।",
      successMessage:
        "धन्यवाद! आपकी जानकारी राबता को सुरक्षित रूप से प्राप्त हो गई है। हम आपके दिए गए ईमेल पर संपर्क करेंगे।",
      errorFallback: "संदेश सहेजा नहीं जा सका। कृपया पुनः प्रयास करें या हमें ईमेल करें।",
    },
  },
  pa: {
    tagline: "ਸਿੱਖਿਆ ਨੂੰ ਮੌਕਿਆਂ ਨਾਲ ਜੋੜਨ ਦੀ ਪਹਿਲ।",
    brandSub: "ਸਿੱਖੋ। ਮਜ਼ਬੂਤ ਬਣੋ। ਅੱਗੇ ਵਧੋ।",
    nav: {
      home: "ਮੁੱਖ ਪੰਨਾ",
      about: "ਸਾਡੇ ਬਾਰੇ",
      learn: "ਸਿੱਖੋ (ਲੈਕਚਰ)",
      students: "ਵਿਦਿਆਰਥੀ ਪ੍ਰੋਫ਼ਾਈਲ",
      impact: "ਸਾਡਾ ਪ੍ਰਭਾਵ",
      funds: "ਫੰਡ ਪਾਰਦਰਸ਼ਤਾ",
      community: "ਭਾਈਚਾਰਾ",
      contact: "ਸੰਪਰਕ",
      getInvolved: "ਸ਼ਾਮਲ ਹੋਵੋ",
      memberPortal: "ਮੈਂਬਰ ਪੋਰਟਲ",
      adminConsole: "ਐਡਮਿਨ ਕੰਸੋਲ",
      skills: "ਹੁਨਰ ਅਤੇ ਕਰੀਅਰ",
    },
    registrationPage: {
      eyebrow: "ਹਰ ਵਿਦਿਆਰਥੀ ਦਾ ਹੱਕ",
      title: "ਤੁਹਾਡੀ ਸਿੱਖਣ ਦੀ ਯਾਤਰਾ ਇੱਥੋਂ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ।",
      description: "ਮੁਫ਼ਤ ਵਿਦਿਅਕ ਸਹਾਇਤਾ, ਦੋਸਤਾਨਾ ਮਾਹੌਲ ਅਤੇ ਸਹੀ ਮਾਰਗਦਰਸ਼ਨ।",
      asideHeadingLine1: "ਥੋੜ੍ਹਾ ਜਿਹਾ ਸਹਿਯੋਗ।",
      asideHeadingLine2: "ਨਵੀਆਂ ਸੰਭਾਵਨਾਵਾਂ।",
      asideBody1:
        "ਸਾਨੂੰ ਦੱਸੋ ਕਿ ਵਿਦਿਆਰਥੀ ਨੂੰ ਕਿਹੜੇ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਚਾਹੀਦੀ ਹੈ। ਤਮੰਨਾ ਜਲਦੀ ਹੀ ਮਾਤਾ-ਪਿਤਾ ਜਾਂ ਸਰਪ੍ਰਸਤ ਨਾਲ ਸੰਪਰਕ ਕਰਨਗੇ।",
      asideBody2:
        "18 ਸਾਲ ਤੋਂ ਘੱਟ ਉਮਰ ਦੇ ਬੱਚਿਆਂ ਲਈ ਇਹ ਫਾਰਮ ਮਾਤਾ-ਪਿਤਾ ਜਾਂ ਕਾਨੂੰਨੀ ਸਰਪ੍ਰਸਤ ਵੱਲੋਂ ਭਰਿਆ ਜਾਣਾ ਜ਼ਰੂਰੀ ਹੈ। ਬਾਲਗ ਵਿਦਿਆਰਥੀ ਖੁਦ ਰਜਿਸਟਰ ਕਰ ਸਕਦੇ ਹਨ।",
      asideBody3:
        "ਸਿਰਫ਼ ਪਹਿਲਾ ਨਾਮ ਅਤੇ ਸਰਪ੍ਰਸਤ ਦਾ ਈਮੇਲ ਚਾਹੀਦਾ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਬੱਚੇ ਦਾ ਨਿੱਜੀ ਫ਼ੋਨ ਨੰਬਰ, ਘਰ ਦਾ ਪਤਾ ਜਾਂ ਪਛਾਣ ਪੱਤਰ ਨਾ ਭੇਜੋ।",
    },
    enquiryForm: {
      languageBanner: "ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ:",
      contactHeading: "ਸਾਨੂੰ ਸੁਨੇਹਾ ਭੇਜੋ",
      studentHeading: "ਮੁਫ਼ਤ ਵਿਦਿਆਰਥੀ ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
      volunteerHeading: "ਵਲੰਟੀਅਰ ਅਧਿਆਪਕ ਰਜਿਸਟ੍ਰੇਸ਼ਨ",
      studentNameLabel: "ਵਿਦਿਆਰਥੀ ਦਾ ਪਹਿਲਾ ਨਾਮ",
      yourNameLabel: "ਤੁਹਾਡਾ ਨਾਮ",
      studentNamePlaceholder: "ਵਿਦਿਆਰਥੀ ਦਾ ਪਹਿਲਾ ਨਾਮ",
      yourNamePlaceholder: "ਪੂਰਾ ਨਾਮ",
      guardianEmailLabel: "ਮਾਤਾ-ਪਿਤਾ / ਸਰਪ੍ਰਸਤ ਦਾ ਈਮੇਲ",
      emailLabel: "ਈਮੇਲ ਪਤਾ",
      classStudentLabel: "ਜਮਾਤ (Class)",
      classVolunteerLabel: "ਤੁਸੀਂ ਕਿਹੜੀਆਂ ਜਮਾਤਾਂ ਪੜ੍ਹਾ ਸਕਦੇ ਹੋ",
      selectClassOption: "ਜਮਾਤ ਚੁਣੋ",
      subjectsLabel: "ਵਿਸ਼ੇ",
      subjectsPlaceholder: "ਜਿਵੇਂ: ਅੰਗਰੇਜ਼ੀ, ਵਿਗਿਆਨ, ਗਣਿਤ",
      languageStudentLabel: "ਸਿੱਖਣ ਦੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ",
      languageVolunteerLabel: "ਪੜ੍ਹਾਉਣ ਦੀਆਂ ਭਾਸ਼ਾਵਾਂ",
      formatLabel: "ਪੜ੍ਹਾਈ ਦਾ ਤਰੀਕਾ",
      qualificationsLabel: "ਵਿੱਦਿਅਕ ਯੋਗਤਾ",
      qualificationsPlaceholder: "ਤੁਹਾਡੀ ਸਿੱਖਿਆ ਅਤੇ ਯੋਗਤਾ",
      experienceLabel: "ਪੜ੍ਹਾਉਣ ਦਾ ਤਜਰਬਾ",
      experiencePlaceholder: "ਨਵੇਂ ਵਲੰਟੀਅਰਾਂ ਦਾ ਸਵਾਗਤ ਹੈ",
      availabilityLabel: "ਉਪਲਬਧ ਸਮਾਂ",
      availabilityPlaceholder: "ਦਿਨ ਅਤੇ ਸਮਾਂ ਜੋ ਤੁਸੀਂ ਦੇ ਸਕਦੇ ਹੋ",
      messageVolunteerLabel: "ਤੁਸੀਂ ਸੇਵਾ ਕਿਉਂ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
      messageStudentLabel: "ਵਿਦਿਆਰਥੀ ਨੂੰ ਕਿਸ ਤਰ੍ਹਾਂ ਦੀ ਮਦਦ ਚਾਹੀਦੀ ਹੈ?",
      messageContactLabel: "ਤੁਹਾਡਾ ਸੁਨੇਹਾ",
      messageContactPlaceholder: "ਦੱਸੋ ਕਿ ਤੁਸੀਂ ਸਾਡੇ ਨਾਲ ਕਿਵੇਂ ਜੁੜਨਾ ਚਾਹੁੰਦੇ ਹੋ…",
      messageOtherPlaceholder: "ਲੋੜੀਂਦੀ ਮਦਦ ਬਾਰੇ ਥੋੜ੍ਹਾ ਹੋਰ ਦੱਸੋ…",
      consentStudent:
        "ਮੈਂ ਵਿਦਿਆਰਥੀ ਦਾ ਮਾਤਾ-ਪਿਤਾ ਜਾਂ ਸਰਪ੍ਰਸਤ (ਜਾਂ ਬਾਲਗ ਸਿੱਖਿਆਰਥੀ) ਹਾਂ ਅਤੇ ਸਿੱਖਣ ਸਹਾਇਤਾ ਲਈ ਸੰਪਰਕ ਕਰਨ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦਾ/ਦਿੰਦੀ ਹਾਂ।",
      consentOther: "ਮੈਂ ਸਹਿਮਤ ਹਾਂ ਕਿ ਰਾਬਤਾ ਮੇਰੀ ਪੁੱਛਗਿੱਛ ਦਾ ਜਵਾਬ ਦੇਣ ਲਈ ਇਸ ਜਾਣਕਾਰੀ ਦੀ ਵਰਤੋਂ ਕਰੇ।",
      consentPolicyPrefix: "ਮੈਂ ਪੜ੍ਹ ਲਈ ਹੈ:",
      consentPolicyLink: "ਗੋਪਨੀਯਤਾ ਅਤੇ ਬਾਲ ਸੁਰੱਖਿਆ ਨੀਤੀ",
      sending: "ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ…",
      submitContact: "ਸੁਨੇਹਾ ਭੇਜੋ",
      submitStudent: "ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਜਮ੍ਹਾਂ ਕਰੋ",
      submitVolunteer: "ਵਲੰਟੀਅਰ ਵਜੋਂ ਅਪਲਾਈ ਕਰੋ",
      finePrint:
        "ਕਿਰਪਾ ਕਰਕੇ ਕੋਈ ਪਛਾਣ ਪੱਤਰ, ਬੈਂਕ ਵੇਰਵੇ ਜਾਂ ਨਿੱਜੀ ਦਸਤਾਵੇਜ਼ ਨਾ ਭੇਜੋ। ਫਾਰਮ ਭਰਨ ਨਾਲ ਕਲਾਸ ਦੀ ਸੀਟ ਪੱਕੀ ਨਹੀਂ ਹੁੰਦੀ।",
      successMessage:
        "ਧੰਨਵਾਦ! ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਰਾਬਤਾ ਕੋਲ ਸੁਰੱਖਿਅਤ ਢੰਗ ਨਾਲ ਪਹੁੰਚ ਗਈ ਹੈ। ਅਸੀਂ ਤੁਹਾਡੇ ਦਿੱਤੇ ਈਮੇਲ ਤੇ ਜਵਾਬ ਦੇਵਾਂਗੇ।",
      errorFallback: "ਸੁਨੇਹਾ ਸੁਰੱਖਿਅਤ ਨਹੀਂ ਹੋ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
    },
  },
};
