import { state } from '../state/store.js';

// ============ Speech Synthesis ============
export function speak(text) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();

        let cleanText = text.split('/')[0].trim();
        // Allow Cyrillic and English characters
        cleanText = cleanText.replace(/[^a-zA-Z0-9 а-яА-ЯёЁ]/g, ' ');

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Auto-detect language
        const hasCyrillic = /[а-яА-ЯёЁ]/.test(cleanText);
        utterance.lang = hasCyrillic ? 'ru-RU' : 'en-US';

        utterance.rate = (state.settings && state.settings.speechRate) ? state.settings.speechRate : 1.0;

        speechSynthesis.speak(utterance);
    }
}
