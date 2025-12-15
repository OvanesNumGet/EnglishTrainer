import { createIcons as _createIcons } from 'lucide';
import { lucideIcons } from './lucide-icons.generated.js';

/**
 * Expose icons map too (handy for debugging and closer to the CDN build API).
 * In dist (IIFE) this becomes: window.lucide.icons
 */
export const icons = lucideIcons;

/**
 * Our public createIcons keeps the same API shape as Lucide,
 * but defaults to the generated subset.
 */
export function createIcons(options = {}) {
    return _createIcons({
        ...options,
        icons: options.icons ?? lucideIcons
    });
}
