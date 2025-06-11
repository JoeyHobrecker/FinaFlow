import Dexie from './dexie.mjs';

export const db = new Dexie('FinaFlowDB');

db.version(1).stores({
    // Original Schema
    tasks: '++id, projectId, status, *tags, completed, priority, deadline, createdAt, isToday',
    quickTasks: '++id, createdAt',
    projects: '++id, status, title, deadline, createdAt, folderId',
    concepts: '++id, createdAt, title, updatedAt',
    notes: '++id, projectId, *tags, updatedAt, title, createdAt, pinned', // Stand-alone notes
    folders: '++id, parentId, createdAt, name, color',
    
    // Expanded Schema
    habits: '++id, title, schedule, perWeek, *tags', // schedule is array of weekdays e.g. [1,3,5]
    habitLogs: '++id, habitId, dateISO, status', // status: 'done', 'missed', 'skipped'
    
    weekly: '++id, title, targetMinutes',
    weeklyLogs: '++id, &[weeklyId+weekStartISO], weeklyId, weekStartISO, loggedMinutes, completed',
    
    shopping: '++id, title, type, tag, deadline, done, store', // type: 'physical'|'online'|'wishlist'
    shoppingTags: 'name, color',

    cleaningAreas: '++id, name, svgPath',
    cleaningTasks: '++id, areaId, title, frequencyDays, lastDoneISO',
    
    timelogs: '++id, label, color, icon, startISO, endISO',
    pomodoroLogs: '++id, sessionsPlanned, sessionsDone, configJSON, startedISO, associatedTask',

    taskTags: 'name, color', // Separate from noteTags
    noteTags: 'name, color',

    settings: 'key' // For storing simple key-value settings
});

// Pre-populate default settings if they don't exist
 db.on('populate', async (tx) => {
    await tx.settings.bulkAdd([
        { key: 'theme', value: 'dark' },
        { key: 'priorityFormula', value: 'importance * 30 + deadline * 20 + project * 5' },
        { key: 'notificationsEnabled', value: true },
        { key: 'soundsEnabled', value: true },
        { key: 'currentView', value: 'tasks'},
        { key: 'projectsViewMode', value: 'grid'},
    ]);
});

export default db;
