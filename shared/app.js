import db from './db.js';
import router from './router.js';

// --- Simple Event Bus ---
const eventBus = document.createElement('div');
export const on = (eventName, handler) => eventBus.addEventListener(eventName, handler);
export const off = (eventName, handler) => eventBus.removeEventListener(eventName, handler);
export const dispatchEvent = (eventName, detail) => {
    eventBus.dispatchEvent(new CustomEvent(eventName, { detail }));
};

// --- Utilities ---
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
};
export const truncateText = (text, maxLength) => !text ? '' : (text.length > maxLength ? text.substring(0, maxLength) + '...' : text);
export const capitalizeFirstLetter = (string) => !string ? '' : string.charAt(0).toUpperCase() + string.slice(1);
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
export const uuid = () => (window.crypto && typeof window.crypto.randomUUID === 'function') ? window.crypto.randomUUID() : generateId();

// --- Notifications & Sounds ---
let areNotificationsEnabled = true;
let areSoundsEnabled = true;
const sounds = {
    click: new Audio('assets/sounds/click.mp3'),
    done: new Audio('assets/sounds/done.mp3'),
    break: new Audio('assets/sounds/break.mp3'),
};

export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notification');
        return 'unsupported';
    }
    const permission = await Notification.requestPermission();
    await db.settings.put({ key: 'notificationsAllowed', value: permission });
    return permission;
}

export function showNotification(title, options = {}) {
    if (!areNotificationsEnabled) return;
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: "FinaFlow Productivity Suite",
                icon: 'assets/icons/icon-192x192.png',
                ...options
            });
        });
    }
}

export function playSound(soundName) {
    if (!areSoundsEnabled || !sounds[soundName]) return;
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch(err => console.warn(`Sound playback failed for ${soundName}:`, err));
}

// --- Toast Notifications ---
export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let iconClass = 'fas fa-info-circle';
    if (type === 'success') iconClass = 'fas fa-check-circle';
    else if (type === 'error') iconClass = 'fas fa-times-circle';
    else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    
    toast.innerHTML = `<i class="toast-icon ${iconClass}"></i><p class="toast-message">${message}</p><button class="toast-close">×</button>`;
    
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    };
    closeBtn.addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
}

// --- Global App Initialization ---
async function init() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
            console.log('Service Worker registered successfully.');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
    
    // Load settings from DB
    const settings = await db.settings.toArray();
    areNotificationsEnabled = settings.find(s => s.key === 'notificationsEnabled')?.value ?? true;
    areSoundsEnabled = settings.find(s => s.key === 'soundsEnabled')?.value ?? true;
    const theme = settings.find(s => s.key === 'theme')?.value ?? 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Initialize router
    router.registerPageLoad();
    
    console.log('FinaFlow App Initialized');
}

document.addEventListener('DOMContentLoaded', init);
