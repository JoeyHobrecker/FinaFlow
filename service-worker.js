// A simple service worker for background timers and notifications

const CACHE_NAME = 'finaflow-cache-v1';
const urlsToCache = [
    './',
    'index.html',
    'tasks.html',
    'projects.html',
    'habits.html',
    'household.html',
    'general.html',
    'time.html',
    'settings.html',
    'shared/ui.css',
    'shared/app.js',
    'shared/db.js',
    'shared/router.js',
    'shared/dexie.mjs',
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png',
    // Note: Sounds are not cached by default to save space, but could be added.
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Timer functionality
let timerInterval = null;
let pomodoroState = {};

function handleTimerCommand(data) {
    switch (data.command) {
        case 'start':
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({ type: 'timer-tick' }));
                });
            }, 1000);
            break;
        
        case 'stop':
            clearInterval(timerInterval);
            timerInterval = null;
            break;

        case 'startPomodoro':
            pomodoroState = { ...data.state, remaining: data.state.duration };
            clearInterval(timerInterval);
            timerInterval = setInterval(updatePomodoro, 1000);
            break;

        case 'stopPomodoro':
            clearInterval(timerInterval);
            timerInterval = null;
            pomodoroState = {};
            break;
    }
}

function updatePomodoro() {
    pomodoroState.remaining--;

    self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ 
            type: 'pomodoro-tick', 
            remaining: pomodoroState.remaining,
            currentMode: pomodoroState.currentMode
        }));
    });

    if (pomodoroState.remaining <= 0) {
        clearInterval(timerInterval);
        
        // Show notification
        const notifTitle = pomodoroState.currentMode === 'work' ? 'Time for a break!' : 'Break\'s over! Time to focus.';
        const notifBody = pomodoroState.currentMode === 'work' ? `You completed a ${pomodoroState.config.workMinutes} minute session.` : `Your ${pomodoroState.config.breakMinutes} minute break is done.`;

        self.registration.showNotification(notifTitle, {
            body: notifBody,
            icon: 'assets/icons/icon-192x192.png',
        });
        
        self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'pomodoro-complete', mode: pomodoroState.currentMode }));
        });
    }
}


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'timer-command') {
        handleTimerCommand(event.data);
    }
});
