import { useState, useEffect } from 'react';

interface LanguageInfo {
  code: string;
  name: string;
  detected: boolean;
}

const languageNames: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'ru': 'Russian',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'pl': 'Polish',
  'tr': 'Turkish',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'he': 'Hebrew',
  'cs': 'Czech',
  'sk': 'Slovak',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'mt': 'Maltese',
  'cy': 'Welsh',
  'ga': 'Irish',
  'eu': 'Basque',
  'ca': 'Catalan',
  'gl': 'Galician',
  'fa': 'Persian',
  'ur': 'Urdu',
  'bn': 'Bengali',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'kn': 'Kannada',
  'gu': 'Gujarati',
  'pa': 'Punjabi',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'my': 'Myanmar',
  'km': 'Khmer',
  'lo': 'Lao',
  'ka': 'Georgian',
  'hy': 'Armenian',
  'az': 'Azerbaijani',
  'kk': 'Kazakh',
  'ky': 'Kyrgyz',
  'tg': 'Tajik',
  'tk': 'Turkmen',
  'uz': 'Uzbek',
  'mn': 'Mongolian',
  'am': 'Amharic',
  'sw': 'Swahili',
  'zu': 'Zulu',
  'af': 'Afrikaans',
  'xh': 'Xhosa',
  'st': 'Southern Sotho',
  'tn': 'Tswana',
  'ss': 'Swati',
  've': 'Venda',
  'ts': 'Tsonga',
  'nr': 'South Ndebele',
  'nso': 'Northern Sotho'
};

export const useLanguageDetection = (): LanguageInfo => {
  const [language, setLanguage] = useState<LanguageInfo>({
    code: 'en',
    name: 'English',
    detected: false
  });

  useEffect(() => {
    const detectLanguage = () => {
      // Get browser language
      const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
      const langCode = browserLang.split('-')[0].toLowerCase();
      
      const detectedLanguage: LanguageInfo = {
        code: langCode,
        name: languageNames[langCode] || 'Unknown',
        detected: langCode !== 'en'
      };

      setLanguage(detectedLanguage);
    };

    detectLanguage();
  }, []);

  return language;
};