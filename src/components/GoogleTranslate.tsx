import React, { useEffect } from 'react';
import { Globe } from 'lucide-react';

interface GoogleTranslateProps {
  targetLanguage?: string;
}

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const GoogleTranslate: React.FC<GoogleTranslateProps> = ({ targetLanguage = 'en' }) => {
  useEffect(() => {
    const addGoogleTranslateScript = () => {
      if (document.getElementById('google-translate-script')) {
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    };

    const initGoogleTranslate = () => {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'auto',
            includedLanguages: 'en,es,fr,de,it,pt,zh,ja,ko,ar,hi,ru,nl,sv,da,no,fi,pl,tr,th,vi,id,ms,tl,he,cs,sk,hu,ro,bg,hr,sl,et,lv,lt,mt,cy,ga,eu,ca,gl,fa,ur,bn,ta,te,ml,kn,gu,pa,ne,si,my,km,lo,ka,hy,az,kk,ky,tg,tk,uz,mn,am,sw,zu,af',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
            multilanguagePage: true
          },
          'google_translate_element'
        );
      };
    };

    if (!window.google) {
      initGoogleTranslate();
      addGoogleTranslateScript();
    } else if (window.google.translate) {
      window.googleTranslateElementInit();
    }
  }, []);

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">Need translation?</p>
        <p className="text-xs text-muted-foreground">Use the translate button below to read this page in your language</p>
      </div>
      <div id="google_translate_element" className="google-translate-container"></div>
    </div>
  );
};

export default GoogleTranslate;