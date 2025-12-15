import { state } from './store.js';

// ============ Dataset-dependent UI helpers ============

export function computeForceSimpleMode(datasetName) {
  // Current project datasets:
  // - verbs => has pastSimple/pastParticiple
  // - text1..text5 => no forms, should behave like "simple mode"
  return datasetName !== 'verbs';
}

export function applyEffectiveSimpleMode() {
  if (typeof document === 'undefined' || !document.body) return;

  const effective = !!state.settings?.simpleMode || !!state.forceSimpleMode;
  document.body.classList.toggle('simple-mode', effective);
}

export function setCurrentDataset(datasetName) {
  state.currentDataset = datasetName || 'verbs';
  state.forceSimpleMode = computeForceSimpleMode(state.currentDataset);
  applyEffectiveSimpleMode();
}