import { state } from './store.js';

// Config Persistence per Dataset
export function getDatasetConfig(datasetName) {
  return state.datasetConfigs[datasetName] || { category: 'all', isReverse: false };
}

export function saveDatasetConfig(datasetName, config) {
  state.datasetConfigs[datasetName] = { ...state.datasetConfigs[datasetName], ...config };
  localStorage.setItem('datasetConfigs', JSON.stringify(state.datasetConfigs));
}