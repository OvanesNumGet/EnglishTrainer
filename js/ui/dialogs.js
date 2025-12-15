import { state } from '../state.js';

let overlayEl = null;
let modalEl = null;
let titleEl = null;
let bodyEl = null;
let cancelBtn = null;
let confirmBtn = null;
let closeBtn = null;

let isOpen = false;
let resolveFn = null;
let lastFocused = null;

function getAnimMultiplier() {
    return state.settings?.animSpeed === 'slow'
        ? 1.5
        : state.settings?.animSpeed === 'fast'
            ? 0.5
            : 1;
}

function setBackgroundDisabled(disabled) {
    document.body.classList.toggle('modal-open', !!disabled);

    // Optional: also disable focus/navigation in the background where supported
    const appContainer = document.querySelector('.container');
    if (appContainer) {
        try {
            appContainer.inert = !!disabled;
        } catch {
            // inert not supported in some browsers; CSS pointer-events handles the main issue
        }

        if (disabled) appContainer.setAttribute('aria-hidden', 'true');
        else appContainer.removeAttribute('aria-hidden');
    }

    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
        try {
            toastContainer.inert = !!disabled;
        } catch {
            // ignore
        }
        if (disabled) toastContainer.setAttribute('aria-hidden', 'true');
        else toastContainer.removeAttribute('aria-hidden');
    }
}

function ensureDialog() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay';
    overlayEl.setAttribute('role', 'presentation');

    overlayEl.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">
            <div class="modal-header">
                <div class="modal-title" id="appModalTitle">Подтверждение</div>
                <button type="button" class="modal-close" aria-label="Закрыть">
                    <i data-lucide="x" style="width:20px;height:20px"></i>
                </button>
            </div>
            <div class="modal-body" id="appModalBody"></div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" data-action="cancel">Отмена</button>
                <button type="button" class="btn btn-danger" data-action="confirm">Подтвердить</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlayEl);

    modalEl = overlayEl.querySelector('.modal');
    titleEl = overlayEl.querySelector('#appModalTitle');
    bodyEl = overlayEl.querySelector('#appModalBody');
    cancelBtn = overlayEl.querySelector('[data-action="cancel"]');
    confirmBtn = overlayEl.querySelector('[data-action="confirm"]');
    closeBtn = overlayEl.querySelector('.modal-close');

    const close = (result) => {
        if (!isOpen) return;
        isOpen = false;

        // Keep catching pointer events while fading out to prevent "click-through"
        overlayEl.classList.add('closing');
        overlayEl.classList.remove('active');

        const finish = () => {
            overlayEl.classList.remove('closing');

            setBackgroundDisabled(false);

            const r = resolveFn;
            resolveFn = null;
            if (r) r(result);

            if (lastFocused && typeof lastFocused.focus === 'function') {
                lastFocused.focus({ preventScroll: true });
            }
            lastFocused = null;
        };

        if (state.settings?.reduceMotion) {
            finish();
        } else {
            const ms = Math.round(180 * getAnimMultiplier());
            setTimeout(finish, ms);
        }
    };

    // Click on overlay (outside modal) -> cancel.
    // Use click (not pointerdown) to avoid triggering underlying click after close.
    overlayEl.addEventListener('click', (e) => {
        if (!isOpen) return;
        if (e.target !== overlayEl) return;

        e.preventDefault();
        e.stopPropagation();
        close(false);
    });

    cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        close(false);
    });

    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        close(false);
    });

    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        close(true);
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            close(false);
        }
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

export function openConfirmDialog({
    title = 'Подтверждение',
    message = '',
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    variant = 'default'
} = {}) {
    ensureDialog();

    titleEl.textContent = title;
    bodyEl.textContent = message;

    cancelBtn.textContent = cancelText;
    confirmBtn.textContent = confirmText;

    // Variant styles
    confirmBtn.classList.remove('btn-primary', 'btn-danger', 'btn-secondary');
    if (variant === 'danger') {
        confirmBtn.classList.add('btn', 'btn-danger');
    } else {
        confirmBtn.classList.add('btn', 'btn-primary');
    }

    lastFocused = document.activeElement;

    overlayEl.classList.remove('closing');
    overlayEl.classList.add('active');
    isOpen = true;

    // Disable background interactions/focus while modal is open
    setBackgroundDisabled(true);

    // Focus confirm by default (destructive -> user sees it)
    setTimeout(() => {
        if (confirmBtn) confirmBtn.focus({ preventScroll: true });
    }, 0);

    return new Promise((resolve) => {
        resolveFn = resolve;
    });
}

/**
 * Installs a global click-capture handler:
 * any element with [data-confirm] will show a modal confirm,
 * and only after confirm we re-dispatch click to let existing handlers run.
 */
export function initConfirmDialogs() {
    ensureDialog();

    document.addEventListener('click', async (e) => {
        const target = e.target;
        const el = target && target.closest ? target.closest('[data-confirm]') : null;
        if (!el) return;

        // bypass to avoid recursion
        if (el.dataset.confirmBypassed === '1') return;

        e.preventDefault();
        e.stopPropagation();

        const variant = el.getAttribute('data-confirm-variant') || 'default';
        const title = el.getAttribute('data-confirm-title') || 'Подтверждение';
        const message = el.getAttribute('data-confirm-message') || '';
        const confirmText = el.getAttribute('data-confirm-confirm') || 'Подтвердить';
        const cancelText = el.getAttribute('data-confirm-cancel') || 'Отмена';

        const ok = await openConfirmDialog({ title, message, confirmText, cancelText, variant });
        if (!ok) return;

        // Re-dispatch click so existing logic stays untouched
        el.dataset.confirmBypassed = '1';
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        queueMicrotask(() => {
            delete el.dataset.confirmBypassed;
        });
    }, { capture: true });
}
