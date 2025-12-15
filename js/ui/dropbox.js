function getClosest(el, selector) {
    if (!el) return null;
    return el.closest ? el.closest(selector) : null;
}

function safeText(s) {
    return (s ?? '').toString();
}

export function initDropboxUI() {
    const roots = Array.from(document.querySelectorAll('.dropbox[data-select-id]'));
    roots.forEach((root) => enhanceDropbox(root));
}

function enhanceDropbox(root) {
    const selectId = root.getAttribute('data-select-id');
    const select = document.getElementById(selectId);
    const trigger = root.querySelector('.dropbox-trigger');
    const textEl = root.querySelector('.dropbox-trigger-text');
    const menu = root.querySelector('.dropbox-menu');

    if (!select || !trigger || !textEl || !menu) return;

    const buildItems = () => {
        menu.innerHTML = '';
        const opts = Array.from(select.options);

        opts.forEach((opt) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dropbox-item';
            btn.setAttribute('role', 'option');
            btn.setAttribute('data-value', opt.value);

            const isSelected = opt.value === select.value;
            btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');

            btn.innerHTML = `
                <span class="dropbox-item-check"><i data-lucide="check" style="width:16px;height:16px"></i></span>
                <span class="dropbox-item-textcol">
                    <span class="dropbox-item-label">${safeText(opt.textContent)}</span>
                </span>
            `;

            btn.addEventListener('click', () => {
                if (select.value !== opt.value) {
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                close();
                trigger.focus();
            });

            menu.appendChild(btn);
        });

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    };

    const syncFromSelect = () => {
        const selectedOpt = select.selectedOptions && select.selectedOptions[0]
            ? select.selectedOptions[0]
            : select.querySelector(`option[value="${CSS.escape(select.value)}"]`);

        textEl.textContent = selectedOpt ? safeText(selectedOpt.textContent) : 'Выбрать';

        const items = Array.from(menu.querySelectorAll('.dropbox-item'));
        items.forEach((it) => {
            const val = it.getAttribute('data-value');
            it.setAttribute('aria-selected', val === select.value ? 'true' : 'false');
        });
    };

    const open = () => {
        root.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');

        // Ensure menu is built at least once, and selection is synced
        if (!menu.hasChildNodes()) buildItems();
        syncFromSelect();

        // Focus selected item for keyboard navigation
        const selectedItem = menu.querySelector('.dropbox-item[aria-selected="true"]') || menu.querySelector('.dropbox-item');
        if (selectedItem) selectedItem.focus({ preventScroll: true });
    };

    const close = () => {
        root.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    };

    const toggle = () => {
        if (root.classList.contains('open')) close();
        else open();
    };

    // Init
    buildItems();
    syncFromSelect();

    // Keep in sync if code changes the select
    select.addEventListener('change', () => {
        syncFromSelect();
        // If options were dynamically changed somewhere, rebuild
        if (menu.children.length !== select.options.length) buildItems();
    });

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
    });

    // Keyboard
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            open();
        }
    });

    menu.addEventListener('keydown', (e) => {
        const items = Array.from(menu.querySelectorAll('.dropbox-item'));
        const current = document.activeElement;
        const idx = items.indexOf(current);

        if (e.key === 'Escape') {
            e.preventDefault();
            close();
            trigger.focus();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = items[Math.min(items.length - 1, Math.max(0, idx + 1))] || items[0];
            if (next) next.focus();
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = items[Math.max(0, idx - 1)] || items[items.length - 1];
            if (prev) prev.focus();
            return;
        }

        if (e.key === 'Home') {
            e.preventDefault();
            if (items[0]) items[0].focus();
            return;
        }

        if (e.key === 'End') {
            e.preventDefault();
            if (items[items.length - 1]) items[items.length - 1].focus();
            return;
        }
    });

    // Click outside to close
    document.addEventListener('pointerdown', (e) => {
        const inside = getClosest(e.target, '.dropbox');
        if (inside === root) return;
        close();
    }, { capture: true });

    // Close on ESC globally if open
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!root.classList.contains('open')) return;
        close();
        trigger.focus();
    });
}
