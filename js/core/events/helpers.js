// Small DOM helpers for event wiring.

export function byId(id) {
  return document.getElementById(id);
}

export function on(el, event, handler, options) {
  if (!el) return false;
  el.addEventListener(event, handler, options);
  return true;
}

export function onId(id, event, handler, options) {
  return on(byId(id), event, handler, options);
}

export function onAll(selector, event, handler, options) {
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener(event, handler, options);
  });
}

export function isShown(el) {
  if (!el) return false;

  // Works well for this project since visibility is controlled via inline style.display.
  const style = window.getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;

  // If element has no layout boxes it is effectively not visible/clickable.
  return el.getClientRects().length > 0;
}

export function isTextInputTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  return !!target.closest('input, textarea');
}
