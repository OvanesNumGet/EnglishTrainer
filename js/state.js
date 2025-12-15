// Backward-compatible entrypoint.
// The state logic has been decomposed into ./state/* modules.
// Keep importing from "../state.js" across the project.
export * from './state/index.js';
