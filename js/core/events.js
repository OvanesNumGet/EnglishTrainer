// Backward-compatible entrypoint.
// The event wiring has been decomposed into ./events/* modules.
// Keep importing { attachEventListeners } from "./events.js" across the project.
export { attachEventListeners } from './events/index.js';
