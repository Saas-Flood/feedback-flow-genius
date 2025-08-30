import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

export const useTranslation = () => {
  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = async (text: string, targetLanguage: string): Promise<TranslationResult | null> => {
    if (!text.trim() || targetLanguage === 'en') {
      return { translatedText: text };
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text,
          targetLanguage,
          sourceLanguage: 'auto'
        }
      });

      if (error) {
        console.error('Translation error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Translation failed:', error);
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  const translatePageContent = async (targetLanguage: string) => {
    if (targetLanguage === 'en') {
      // Reset to original content
      window.location.reload();
      return;
    }

    setIsTranslating(true);
    try {
      // Get all text nodes in the page
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // Skip script, style, and other non-visible elements
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'meta', 'title'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip empty or whitespace-only text
            const text = node.textContent?.trim();
            if (!text || text.length < 2) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes: Text[] = [];
      let node: Node | null;
      while (node = walker.nextNode()) {
        textNodes.push(node as Text);
      }

      // Translate text nodes in batches
      const batchSize = 10;
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        const translationPromises = batch.map(async (textNode) => {
          const originalText = textNode.textContent;
          if (!originalText) return;

          try {
            const result = await translateText(originalText, targetLanguage);
            if (result?.translatedText && result.translatedText !== originalText) {
              textNode.textContent = result.translatedText;
            }
          } catch (error) {
            console.warn('Failed to translate text:', originalText, error);
          }
        });

        await Promise.all(translationPromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < textNodes.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Page translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    translateText,
    translatePageContent,
    isTranslating
  };
};