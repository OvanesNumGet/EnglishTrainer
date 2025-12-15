import { state } from '../state/store.js';
import { getAnimMultiplier } from './animSpeed.js';

// ============ Toast Notifications ============
const TOAST_DURATION = 3200;
const TOAST_LIMIT = 6;

let toastSeq = 0;
const toastItems = [];

function ensureToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function layoutToasts() {
    const container = ensureToastContainer();
    if (!container) return;

    toastItems.forEach((t, index) => {
        const el = t.el;
        const baseStep = 14;
        const extraStep = 6;

        const y = index <= 2 ? index * baseStep : (2 * baseStep) + ((index - 2) * extraStep);
        const scale = index <= 2 ? (1 - index * 0.02) : (0.96 - Math.min(0.05, (index - 2) * 0.01));
        const alpha = index <= 2 ? (1 - index * 0.06) : Math.max(0.6, 0.88 - (index - 2) * 0.06);
        const visible = index < 5;

        el.style.display = visible ? 'flex' : 'none';
        el.style.setProperty('--toast-y', `${y}px`);
        el.style.setProperty('--toast-scale', `${scale}`);
        el.style.setProperty('--toast-alpha', `${alpha}`);
        el.style.zIndex = `${1000 - index}`;
        el.style.pointerEvents = index < 2 ? 'auto' : 'none';
    });

    container.style.height = '0px';
}

function removeToastById(id) {
    const idx = toastItems.findIndex(t => t.id === id);
    if (idx === -1) return;

    const item = toastItems[idx];
    if (item.timeout) {
        clearTimeout(item.timeout);
        item.timeout = null;
    }

    toastItems.splice(idx, 1);
    if (item.el && item.el.parentElement) item.el.remove();

    layoutToasts();
}

function dismissToast(id, { exitX = 90, exitY = 0 } = {}) {
    const item = toastItems.find(t => t.id === id);
    if (!item) return;

    const el = item.el;

    if (state.settings?.reduceMotion) {
        removeToastById(id);
        return;
    }

    el.style.setProperty('--toast-exit-x', `${exitX}px`);
    el.style.setProperty('--toast-exit-y', `${exitY}px`);
    el.classList.add('toast--exit');

    const done = () => {
        el.removeEventListener('transitionend', done);
        removeToastById(id);
    };

    el.addEventListener('transitionend', done);

    // Fallback in case transitionend doesn't fire (scaled with anim speed)
    const fallbackMs = Math.round(260 * getAnimMultiplier());
    setTimeout(() => removeToastById(id), fallbackMs);
}

function setupToastSwipe(el, id) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let active = false;

    const setDrag = (x, y) => {
        el.style.setProperty('--toast-dx', `${x}px`);
        el.style.setProperty('--toast-dy', `${y}px`);
        const dist = Math.sqrt(x * x + y * y);
        const baseAlpha = parseFloat(getComputedStyle(el).getPropertyValue('--toast-alpha')) || 1;
        const dragAlpha = Math.max(0.25, 1 - dist / 240);
        el.style.setProperty('--toast-alpha', `${baseAlpha * dragAlpha}`);
    };

    const resetDrag = () => {
        el.style.setProperty('--toast-dx', `0px`);
        el.style.setProperty('--toast-dy', `0px`);
        layoutToasts();
    };

    el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        active = true;
        startX = e.clientX;
        startY = e.clientY;
        dx = 0;
        dy = 0;
        el.classList.add('toast--dragging');
        el.setPointerCapture(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
        if (!active) return;
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        setDrag(dx, dy);
    });

    el.addEventListener('pointerup', () => {
        if (!active) return;
        active = false;
        el.classList.remove('toast--dragging');

        const dist = Math.sqrt(dx * dx + dy * dy);
        const threshold = 55;

        if (dist > threshold) {
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            let exitX = 0;
            let exitY = 0;

            if (absX >= absY) {
                exitX = dx > 0 ? 110 : -110;
                exitY = dy * 0.15;
            } else {
                exitX = dx * 0.15;
                exitY = dy > 0 ? 110 : -110;
            }

            dismissToast(id, { exitX, exitY });
            return;
        }

        resetDrag();
    });

    el.addEventListener('pointercancel', () => {
        if (!active) return;
        active = false;
        el.classList.remove('toast--dragging');
        resetDrag();
    });
}

export function showToast(type, title, message = '') {
    // Focus mode: no messages
    try {
        if (document?.body?.classList?.contains('focus-mode')) return null;
    } catch {
        // ignore
    }

    const container = ensureToastContainer();
    const toast = document.createElement('div');
    const id = ++toastSeq;

    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    // [-- NEVER DELETE THIS LINE --] data-lucide="check-circle-2" For lucide icons auto scraper
    // [-- NEVER DELETE THIS LINE --] data-lucide="x-circle" For lucide icons auto scraper
    // [-- NEVER DELETE THIS LINE --] data-lucide="alert-triangle" For lucide icons auto scraper
    // [-- NEVER DELETE THIS LINE --] data-lucide="info" For lucide icons auto scraper
    const iconNames = {
        success: 'check-circle-2',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${iconNames[type] || 'info'}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
    `;

    container.prepend(toast);

    const item = { id, el: toast, timeout: null };
    toastItems.unshift(item);

    while (toastItems.length > TOAST_LIMIT) {
        const oldest = toastItems[toastItems.length - 1];
        removeToastById(oldest.id);
    }

    layoutToasts();

    if (!state.settings?.reduceMotion) {
        toast.classList.add('toast--enter');
        requestAnimationFrame(() => {
            toast.classList.remove('toast--enter');
        });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }

    setupToastSwipe(toast, id);

    toast.addEventListener('click', () => {
        dismissToast(id, { exitX: 110, exitY: 0 });
    });

    item.timeout = window.setTimeout(() => {
        dismissToast(id, { exitX: 110, exitY: 0 });
    }, TOAST_DURATION);

    return id;
}
