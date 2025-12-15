import { showToast } from '../utils.js';

export async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}`);
        const html = await response.text();
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        } else {
            console.error(`Element with id ${elementId} not found`);
        }
    } catch (error) {
        console.error(error);
        showToast('error', 'Ошибка загрузки', 'Не удалось загрузить интерфейс. Проверьте подключение.');
    }
}
