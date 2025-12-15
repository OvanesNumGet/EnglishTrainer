import { state } from '../state/store.js';

// ============ Speech Synthesis ============
export function speak(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();

    let cleanText = text.split('/')[0].trim();
    cleanText = cleanText.replace(/[^a-zA-Z0-9 ]/g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = (state.settings && state.settings.speechRate) ? state.settings.speechRate : 1.0;

    speechSynthesis.speak(utterance);
  }
}