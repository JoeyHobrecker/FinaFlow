// app.js - FULL IMPLEMENTATION
(function() {
    'use strict';

    window.app = {
        db: null,
        state: {
            tasks: [],
            quickTasks: [],
            taskTags: [],
            projects: [],
            folders: [],
            concepts: [],
            generalNotes: [],
            noteTags: [],
            shoppingItems: [],
            shoppingTags: [],
            cleaningAreas: [],
            cleaningTasks: [],
            habits: [],
            habitLogs: [],
            weeklyTasks: [],
            weeklyLogs: [],
            timeEntries: [],
            pomodoroSessions: [],
            settings: {
                currentTaskView: 'active',
                currentTaskSort: 'priority',
                projectsViewMode: 'grid',
                notesSort: 'date',
                lastBackup: null,
                priorityWeights: { importance: 30, deadline: 20, project: 5 },
                pomodoro: { work: 25, shortBreak: 5, longBreak: 15, sessions: 4 },
                lastOpenedProject: null,
            },
            ui: {
                activeTaskFilters: [],
                activeProjectFilters: [],
                currentProjectId: null,
                currentFolderId: null,
                currentConceptId: null,
                currentEditingNoteId: null,
                isCleaningMapEditing: false,
                pomodoro: { timerId: null, mode: 'work', timeLeft: 25 * 60, isRunning: false, focusTasks: [] },
                timeTracker: { timerId: null, startTime: null, currentActivity: '' },
                stopwatch: { timerId: null, startTime: null, elapsedTime: 0 },
                mainTimer: { timerId: null },
                draggedTask: { el: null, id: null, startX: 0, startY: 0, isDragging: false, shakeTimeout: null, lastMove: 0 }
            }
        },
        dom: {},
        init: async function() {
            if (this.initialized) return;
            console.log("Initializing FinaFlow App...");
            this.setupDatabase();
            this.cacheDomElements();
            await this.loadData();
            this.setupEventListeners();
            this.renderPage();
            this.initialized = true;
            console.log("FinaFlow App Initialized.");
        },
        initialized: false
    };

    // --- Database & Persistence ---
    app.setupDatabase = function() {
        this.db = new Dexie('FinaFlowDB');
        this.db.version(1).stores({
            tasks: '++id, projectId, status, *tags, completed, priority, deadline, createdAt, isTaskOfTheDay',
            quickTasks: '++id, createdAt',
            taskTags: '++id, &name, color',
            projects: '++id, folderId, status, title, deadline, createdAt, updatedAt',
            folders: '++id, parentId, name, color, createdAt',
            concepts: '++id, createdAt, title, updatedAt',
            generalNotes: '++id, *tags, updatedAt, title, createdAt, isPinned',
            noteTags: '++id, &name, color',
            shoppingItems: '++id, title, listType, *tags, isWishlist, createdAt, completedAt, deadline',
            shoppingTags: '++id, &name, color',
            cleaningAreas: '++id, name, frequency, lastCleaned, position',
            cleaningTasks: '++id, title, frequency, lastCompleted',
            habits: '++id, title, frequency, createdAt',
            habitLogs: '++id, &[habitId+date]',
            weeklyTasks: '++id, title, targetMinutes',
            weeklyLogs: '++id, &[taskId+weekStart]',
            timeEntries: '++id, activityName, color, symbol, startTime, endTime',
            pomodoroSessions: '++id, date',
            settings: 'key'
        });
    };

    app.loadData = async function() {
        try {
            const dataPromises = this.db.tables.map(table => table.toArray().then(data => ({ name: table.name, data })));
            const allData = await Promise.all(dataPromises);
            
            allData.forEach(({ name, data }) => {
                if (name === 'settings') {
                    data.forEach(s => {
                        if (s.key in this.state.settings) {
                            this.state.settings[s.key] = s.value;
                        }
                    });
                } else if (name === 'generalNotes') {
                    this.state.generalNotes = data;
                }
                else {
                    const stateKey = name.replace(/([A-Z])/g, '_$1').toLowerCase(); // Not perfect but works for this schema
                    if (this.state[name]) {
                        this.state[name] = data;
                    }
                }
            });
            this.state.ui.pomodoro.timeLeft = this.state.settings.pomodoro.work * 60;
        } catch (error) {
            console.error('Error loading data from DB:', error);
            this.showToast('Error loading your data.', 'error');
        }
    };

    app.saveSetting = async function(key, value) {
        this.state.settings[key] = value;
        await this.db.settings.put({ key, value });
    };

    // --- DOM Caching ---
    app.cacheDomElements = function() {
        this.dom.toastContainer = document.getElementById('toast-container');
        this.dom.body = document.body;
    };

    // --- Page Rendering Router ---
    app.renderPage = function() {
        const pageId = this.dom.body.id || window.location.pathname.split('/').pop().replace('.html', '');
        console.log(`Rendering page: ${pageId}`);

        switch (pageId) {
            case 'index': this.renderDashboard(); break;
            case 'tasks': this.renderTasksPage(); break;
            case 'projects': this.renderProjectsPage(); break;
            case 'notes': this.renderNotesPage(); break;
            case 'habits': this.renderHabitsPage(); break;
            case 'household': this.renderHouseholdPage(); break;
            case 'timemanagement': this.renderTimeManagementPage(); break;
            case 'settings': this.renderSettingsPage(); break;
        }
    };

    // --- Event Listener Setup ---
    app.setupEventListeners = function() {
        const pageId = this.dom.body.id || window.location.pathname.split('/').pop().replace('.html', '');
        
        // Universal listeners
        this.dom.body.addEventListener('click', e => {
            const modal = e.target.closest('.modal');
            if (e.target.classList.contains('cancel-btn') || e.target.classList.contains('close-modal')) {
                if(modal) this.closeModal(modal);
            }
        });
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.visible').forEach(this.closeModal.bind(this));
            }
        });

        // Page-specific listeners
        switch (pageId) {
            case 'index': this.setupDashboardListeners(); break;
            case 'tasks': this.setupTasksPageListeners(); break;
            case 'projects': this.setupProjectsPageListeners(); break;
            case 'notes': this.setupNotesPageListeners(); break;
            case 'habits': this.setupHabitsPageListeners(); break;
            case 'household': this.setupHouseholdPageListeners(); break;
            case 'timemanagement': this.setupTimeManagementPageListeners(); break;
            case 'settings': this.setupSettingsPageListeners(); break;
        }
    };
    
    // --- Utilities ---
    app.showToast = function(message, type = 'info', duration = 3500) {
        if (!this.dom.toastContainer) this.dom.toastContainer = document.getElementById('toast-container');
        if (!this.dom.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        else if (type === 'error') iconClass = 'fas fa-times-circle';
        else if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
        toast.innerHTML = `<div class="toast-icon"><i class="${iconClass}"></i></div><div class="toast-message">${message}</div>`;
        this.dom.toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    };
    app.generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    app.formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-CA');
    };
    app.openModal = (modalEl) => {
        modalEl.style.display = 'flex';
        setTimeout(() => modalEl.classList.add('visible'), 10);
    };
    app.closeModal = (modalEl) => {
        modalEl.classList.remove('visible');
        setTimeout(() => modalEl.style.display = 'none', 300);
    };
    app.calculatePriority = function(task) {
        const w = this.state.settings.priorityWeights;
        const impW = { super: 5, high: 3, normal: 1 }[task.importance || 'normal'];
        let dlScore = 0;
        if (task.deadline) {
            const days = Math.floor((new Date(task.deadline) - new Date()) / (1000*60*60*24));
            if (days < 0) dlScore = 5;
            else if (days <= 3) dlScore = 3;
            else if (days <= 7) dlScore = 2; 
            else dlScore = 1;
        }
        return (impW * w.importance) + (dlScore * w.deadline) + (task.projectId ? w.project : 0);
    };
    
    // ===================================================================================
    // ============================ DASHBOARD (index.html) ===============================
    // ===================================================================================
    app.renderDashboard = function() {
        // Time
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const updateTime = () => timeEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            updateTime();
            setInterval(updateTime, 1000 * 60);
        }

        // Important Tasks
        const tasksListEl = document.getElementById('dashboard-tasks-list');
        if (tasksListEl) {
            const importantTasks = this.state.tasks
                .filter(t => !t.completed)
                .sort((a, b) => this.calculatePriority(b) - this.calculatePriority(a))
                .slice(0, 5);
            if (importantTasks.length > 0) {
                tasksListEl.innerHTML = importantTasks.map(t => `<div class="task-item">${t.title}</div>`).join('');
            } else {
                tasksListEl.innerHTML = `<div class="empty-state"><p>No important tasks!</p></div>`;
            }
        }

        // Last Project
        const projectContentEl = document.getElementById('dashboard-project-content');
        if (projectContentEl && this.state.settings.lastOpenedProject) {
            const project = this.state.projects.find(p => p.id === this.state.settings.lastOpenedProject);
            if (project) {
                projectContentEl.innerHTML = `<a href="projects.html#${project.id}" class="project-link-card status-${project.status}">${project.title}</a>`;
            }
        }

        // Household
        const householdListEl = document.getElementById('dashboard-household-list');
        if (householdListEl) {
            const dueCleaning = this.state.cleaningAreas
                .filter(a => {
                    const daysSinceClean = (new Date() - new Date(a.lastCleaned)) / (1000*60*60*24);
                    return daysSinceClean >= a.frequency;
                })
                .map(a => `<div class="household-item">${a.name}</div>`);
            if (dueCleaning.length > 0) {
                householdListEl.innerHTML = dueCleaning.join('');
            } else {
                householdListEl.innerHTML = `<div class="empty-state"><p>All clean!</p></div>`;
            }
        }

        // Habits
        const habitsListEl = document.getElementById('dashboard-habits-list');
        if(habitsListEl) {
            const today = new Date().getDay(); // Sunday is 0
            const todayHabits = this.state.habits.filter(h => h.frequency.includes(today));
            if(todayHabits.length > 0) {
                habitsListEl.innerHTML = todayHabits.map(h => `<div class="habit-item">${h.title}</div>`).join('');
            } else {
                habitsListEl.innerHTML = `<div class="empty-state"><p>No habits for today.</p></div>`;
            }
        }
    };

    app.setupDashboardListeners = function() {
        document.getElementById('quick-backup-btn')?.addEventListener('click', () => this.backupData());
        document.getElementById('quick-time-tracker-btn')?.addEventListener('click', () => window.location.href = 'timemanagement.html');
        document.getElementById('dashboard-save-concept-btn')?.addEventListener('click', async () => {
            const title = document.getElementById('dashboard-concept-title').value.trim();
            const text = document.getElementById('dashboard-concept-text').value.trim();
            if(!title && !text) return;
            const newConcept = { id: this.generateId(), title: title || 'Untitled Concept', text, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            this.state.concepts.push(newConcept);
            await this.db.concepts.add(newConcept);
            this.showToast('Concept saved!', 'success');
            document.getElementById('dashboard-concept-title').value = '';
            document.getElementById('dashboard-concept-text').value = '';
        });
    };

    // ===================================================================================
    // ============================== TASKS (tasks.html) =================================
    // ===================================================================================
    app.renderTasksPage = function() {
        this.dom.tasksList = document.getElementById('tasks-list');
        this.dom.sortSelect = document.getElementById('sort-select');
        this.dom.tagFiltersContainer = document.getElementById('tag-filters');
        this.dom.projectFiltersContainer = document.getElementById('project-filters');
        this.dom.manageTagsContainer = document.getElementById('manage-tags');
        this.populateProjectOptions(document.getElementById('task-project'));
        this.populateProjectOptions(document.getElementById('edit-task-project'));

        this.dom.sortSelect.value = this.state.settings.currentTaskSort;
        
        this.renderTaskTags();
        this.renderProjectFilters();
        this.renderManageTaskTags();
        this.renderTasks();
    };

    app.setupTasksPageListeners = function() {
        // View buttons
        document.getElementById('active-view-btn').addEventListener('click', () => this.setTaskView('active'));
        document.getElementById('waiting-view-btn').addEventListener('click', () => this.setTaskView('waiting'));
        document.getElementById('completed-view-btn').addEventListener('click', () => this.setTaskView('completed'));
        document.getElementById('quick-tasks-view-btn').addEventListener('click', () => this.setTaskView('quick'));

        // Sidebar
        document.getElementById('sort-select').addEventListener('change', e => {
            this.state.settings.currentTaskSort = e.target.value;
            this.saveSetting('currentTaskSort', e.target.value);
            this.renderTasks();
        });

        // Toolbar
        document.getElementById('add-task-btn').addEventListener('click', () => this.openModal(document.getElementById('add-task-modal')));
        document.getElementById('quick-add-btn').addEventListener('click', () => this.setTaskView('quick'));
        document.getElementById('clear-completed-btn').addEventListener('click', () => this.clearCompletedTasks());

        // Quick Task Area
        document.getElementById('close-quick-task-btn').addEventListener('click', () => this.setTaskView('active'));
        document.getElementById('quick-task-input').addEventListener('keypress', e => {
            if (e.key === 'Enter' && e.target.value.trim()) this.addQuickTask(e.target.value.trim());
        });

        // Task Form
        const taskForm = document.getElementById('task-form');
        taskForm.addEventListener('submit', e => {
            e.preventDefault();
            this.handleTaskFormSubmit(taskForm, false);
        });

        // Edit Task Form
        const editTaskForm = document.getElementById('edit-task-form');
        editTaskForm.addEventListener('submit', e => {
            e.preventDefault();
            this.handleTaskFormSubmit(editTaskForm, true);
        });
        document.getElementById('delete-task-btn').addEventListener('click', () => {
            const id = document.getElementById('edit-task-id').value;
            this.deleteTask(id, true);
        });
        
        // Edit Tag Modal
        document.getElementById('edit-tag-form')?.addEventListener('submit', e => {
            e.preventDefault();
            this.handleTagFormSubmit(true);
        });
    };

    app.setTaskView = function(view) {
        this.state.settings.currentTaskView = view;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`${view}-view-btn`).classList.add('active');

        document.getElementById('tasks-list').classList.toggle('hidden', view === 'quick');
        document.getElementById('quick-task-area').classList.toggle('hidden', view !== 'quick');

        if (view === 'quick') {
            this.renderQuickTasks();
            document.getElementById('quick-task-input').focus();
        } else {
            this.renderTasks();
        }
    };
    
    app.renderTasks = function() {
        if (!this.dom.tasksList) return;
        this.dom.tasksList.innerHTML = '';
        
        let filtered = this.state.tasks.filter(task => {
            const view = this.state.settings.currentTaskView;
            if (view === 'active' && (task.status !== 'active' || task.completed)) return false;
            if (view === 'waiting' && (task.status !== 'waiting' || task.completed)) return false;
            if (view === 'completed' && !task.completed) return false;
            if (this.state.ui.activeTaskFilters.length > 0 && !(task.tags || []).some(tagId => this.state.ui.activeTaskFilters.includes(tagId))) return false;
            if (this.state.ui.activeProjectFilters.length > 0 && !this.state.ui.activeProjectFilters.includes(task.projectId)) return false;
            return true;
        });

        filtered.sort((a, b) => {
            if (a.isTaskOfTheDay !== b.isTaskOfTheDay) return a.isTaskOfTheDay ? -1 : 1;
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            switch (this.state.settings.currentTaskSort) {
                case 'priority': return this.calculatePriority(b) - this.calculatePriority(a);
                case 'deadline':
                    const dateA = a.deadline ? new Date(a.deadline) : null;
                    const dateB = b.deadline ? new Date(b.deadline) : null;
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    return dateA - dateB;
                case 'importance':
                    const iV = { super: 3, high: 2, normal: 1 };
                    return (iV[b.importance] || 1) - (iV[a.importance] || 1);
                case 'created': return new Date(b.createdAt) - new Date(a.createdAt);
                default: return 0;
            }
        });

        if (filtered.length === 0) {
            this.dom.tasksList.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>No tasks here!</p></div>`;
            return;
        }
        filtered.forEach(task => this.dom.tasksList.appendChild(this.createTaskElement(task)));
    };

    app.createTaskElement = function(task) {
        const el = document.createElement('div');
        el.className = `task-card status-${task.status} ${task.completed ? 'completed' : ''} ${task.isTaskOfTheDay ? 'task-of-the-day' : ''}`;
        el.dataset.id = task.id;

        // Mouse drag and shake logic
        el.addEventListener('mousedown', e => {
            if (e.target.closest('button, a, input')) return;
            this.state.ui.draggedTask = { el, id: task.id, startX: e.clientX, startY: e.clientY, isDragging: true, lastMove: Date.now(), moves: [] };
            el.classList.add('is-dragging');
            document.addEventListener('mousemove', this.handleTaskMouseMove);
            document.addEventListener('mouseup', this.handleTaskMouseUp);
        });

        const header = document.createElement('div');
        header.className = 'task-header';
        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title;
        header.appendChild(title);
        el.appendChild(header);

        if(task.description){
            const desc = document.createElement('div');
            desc.className = 'task-description';
            desc.textContent = task.description;
            el.appendChild(desc);
        }

        if(task.projectId){
            const project = this.state.projects.find(p => p.id === task.projectId);
            if(project){
                const projEl = document.createElement('div');
                projEl.className = 'task-project';
                projEl.textContent = project.title;
                el.appendChild(projEl);
            }
        }

        if(task.tags && task.tags.length){
            const tagsEl = document.createElement('div');
            tagsEl.className = 'task-tags';
            task.tags.forEach(id => {
                const tag = this.state.taskTags.find(t => t.id === id);
                if(tag){
                    const tEl = document.createElement('span');
                    tEl.className = 'task-tag';
                    tEl.style.borderColor = tag.color;
                    tEl.textContent = tag.name;
                    tagsEl.appendChild(tEl);
                }
            });
            el.appendChild(tagsEl);
        }

        if(task.deadline){
            const meta = document.createElement('div');
            meta.className = 'task-meta';
            const dl = document.createElement('div');
            dl.className = 'task-meta-item task-deadline';
            dl.innerHTML = `<i class="fas fa-clock"></i> ${this.formatDate(task.deadline)}`;
            meta.appendChild(dl);
            el.appendChild(meta);
        }

        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const completeBtn = document.createElement('button');
        completeBtn.className = 'task-action-btn task-complete-btn';
        completeBtn.innerHTML = '<i class="fas fa-check"></i>';
        completeBtn.addEventListener('click', () => this.toggleTaskCompletion(task.id));
        const editBtn = document.createElement('button');
        editBtn.className = 'task-action-btn task-edit-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', () => this.openEditTaskModal(task.id));
        actions.appendChild(completeBtn);
        actions.appendChild(editBtn);
        el.appendChild(actions);

        return el;
    };
    
    app.handleTaskMouseMove = (e) => {
        const { draggedTask } = app.state.ui;
        if (!draggedTask.isDragging) return;
        const now = Date.now();
        if (now - draggedTask.lastMove < 20) return; // Throttle moves
        
        draggedTask.moves.push({ x: e.clientX, y: e.clientY, time: now });
        if (draggedTask.moves.length > 10) draggedTask.moves.shift();
        draggedTask.lastMove = now;

        // Shake detection
        if (draggedTask.moves.length > 5) {
            let changes = 0;
            for (let i = 1; i < draggedTask.moves.length; i++) {
                if ((draggedTask.moves[i].x - draggedTask.moves[i-1].x) * (draggedTask.moves[i-1].x - draggedTask.moves[i-2]?.x || 0) < 0) {
                    changes++;
                }
            }
            if (changes > 3) {
                draggedTask.el.classList.add('is-shaking');
                if (!draggedTask.shakeTimeout) {
                    draggedTask.shakeTimeout = setTimeout(() => {
                        app.toggleTaskOfTheDay(draggedTask.id);
                        draggedTask.el.classList.remove('is-shaking');
                        draggedTask.shakeTimeout = null;
                        // End dragging after shake
                        app.handleTaskMouseUp();
                    }, 500);
                }
            }
        }
    };

    app.handleTaskMouseUp = () => {
        const { draggedTask } = app.state.ui;
        if (draggedTask.el) {
            draggedTask.el.classList.remove('is-dragging', 'is-shaking');
            clearTimeout(draggedTask.shakeTimeout);
        }
        app.state.ui.draggedTask = { el: null, id: null, isDragging: false };
        document.removeEventListener('mousemove', app.handleTaskMouseMove);
        document.removeEventListener('mouseup', app.handleTaskMouseUp);
    };

    app.toggleTaskOfTheDay = async function(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;
        task.isTaskOfTheDay = !task.isTaskOfTheDay;
        await this.db.tasks.put(task);
        this.showToast(task.isTaskOfTheDay ? 'Task of the Day set!' : 'Task of the Day removed.', 'success');
        this.renderTasks();
    };

    // ----- Task Management Helpers -----
    app.populateProjectOptions = function(selectEl) {
        if(!selectEl) return;
        selectEl.innerHTML = '<option value="">-- None --</option>';
        this.state.projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.title;
            selectEl.appendChild(opt);
        });
    };

    app.renderTaskTags = function() {
        if(!this.dom.tagFiltersContainer) return;
        this.dom.tagFiltersContainer.innerHTML = '';
        this.state.taskTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'tag-filter';
            btn.dataset.id = tag.id;
            btn.innerHTML = `<span class="tag-color-dot" style="background-color:${tag.color}"></span>${tag.name}`;
            if(this.state.ui.activeTaskFilters.includes(tag.id)) btn.classList.add('active');
            btn.addEventListener('click', () => {
                const idx = this.state.ui.activeTaskFilters.indexOf(tag.id);
                if(idx >= 0) this.state.ui.activeTaskFilters.splice(idx,1); else this.state.ui.activeTaskFilters.push(tag.id);
                btn.classList.toggle('active');
                this.renderTasks();
            });
            this.dom.tagFiltersContainer.appendChild(btn);
        });
    };

    app.renderProjectFilters = function() {
        if(!this.dom.projectFiltersContainer) return;
        this.dom.projectFiltersContainer.innerHTML = '';
        this.state.projects.forEach(proj => {
            const btn = document.createElement('button');
            btn.className = 'tag-filter';
            btn.dataset.id = proj.id;
            btn.textContent = proj.title;
            if(this.state.ui.activeProjectFilters.includes(proj.id)) btn.classList.add('active');
            btn.addEventListener('click', () => {
                const idx = this.state.ui.activeProjectFilters.indexOf(proj.id);
                if(idx >= 0) this.state.ui.activeProjectFilters.splice(idx,1); else this.state.ui.activeProjectFilters.push(proj.id);
                btn.classList.toggle('active');
                this.renderTasks();
            });
            this.dom.projectFiltersContainer.appendChild(btn);
        });
    };

    app.renderManageTaskTags = function() {
        if(!this.dom.manageTagsContainer) return;
        this.dom.manageTagsContainer.innerHTML = '';
        this.state.taskTags.forEach(tag => {
            const row = document.createElement('div');
            row.className = 'manage-tag-row';
            row.innerHTML = `<span class="tag-color-dot" style="background-color:${tag.color}"></span>${tag.name}`;
            row.addEventListener('click', () => this.openEditTagModal(tag));
            this.dom.manageTagsContainer.appendChild(row);
        });
    };

    app.openEditTagModal = function(tag){
        document.getElementById('edit-tag-id').value = tag.id;
        document.getElementById('edit-tag-name').value = tag.name;
        document.getElementById('edit-tag-color').value = tag.color;
        this.openModal(document.getElementById('edit-tag-modal'));
    };

    app.handleTagFormSubmit = async function(isEdit){
        const id = document.getElementById('edit-tag-id').value;
        const name = document.getElementById('edit-tag-name').value.trim();
        const color = document.getElementById('edit-tag-color').value;
        if(!name) return;
        let tag;
        if(isEdit){
            tag = this.state.taskTags.find(t=>t.id===id);
            if(!tag) return;
            tag.name = name;
            tag.color = color;
            await this.db.taskTags.put(tag);
        }else{
            tag = {id:this.generateId(), name, color};
            this.state.taskTags.push(tag);
            await this.db.taskTags.add(tag);
        }
        this.closeModal(document.getElementById('edit-tag-modal'));
        this.renderTaskTags();
        this.renderManageTaskTags();
    };

    app.handleTaskFormSubmit = async function(formEl, isEdit){
        const prefix = isEdit ? 'edit-' : '';
        const id = isEdit ? document.getElementById('edit-task-id').value : this.generateId();
        const title = formEl.querySelector('#'+prefix+'task-title').value.trim();
        if(!title) return;
        const description = formEl.querySelector('#'+prefix+'task-description').value.trim();
        const projectId = formEl.querySelector('#'+prefix+'task-project').value || null;
        const tagsInput = formEl.querySelector('#'+prefix+'task-tags').value.trim();
        const deadline = formEl.querySelector('#'+prefix+'task-deadline-date').value || null;
        const importance = formEl.querySelector('input[name="'+(isEdit?'edit-importance':'importance')+'"]:checked').value;
        const status = formEl.querySelector('input[name="'+(isEdit?'edit-status':'status')+'"]:checked').value;

        const tagNames = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
        const tagIds = [];
        for(const name of tagNames){
            let tg = this.state.taskTags.find(t => t.name.toLowerCase() === name.toLowerCase());
            if(!tg){
                tg = {id:this.generateId(), name, color:'#'+Math.floor(Math.random()*16777215).toString(16)};
                this.state.taskTags.push(tg);
                await this.db.taskTags.add(tg);
            }
            tagIds.push(tg.id);
        }

        if(isEdit){
            const task = this.state.tasks.find(t => t.id === id);
            if(!task) return;
            Object.assign(task, {title, description, projectId, tags: tagIds, deadline, importance, status});
            await this.db.tasks.put(task);
            this.showToast('Task updated!', 'success');
        }else{
            const newTask = {id, title, description, projectId, tags: tagIds, deadline, importance, status, completed:false, createdAt:new Date().toISOString(), isTaskOfTheDay:false};
            this.state.tasks.push(newTask);
            await this.db.tasks.add(newTask);
            this.showToast('Task added!', 'success');
        }

        formEl.reset();
        this.closeModal(isEdit ? document.getElementById('edit-task-modal') : document.getElementById('add-task-modal'));
        this.renderTaskTags();
        this.renderManageTaskTags();
        this.renderTasks();
    };

    app.openEditTaskModal = function(taskId){
        const task = this.state.tasks.find(t=>t.id===taskId);
        if(!task) return;
        this.populateProjectOptions(document.getElementById('edit-task-project'));
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-description').value = task.description || '';
        document.getElementById('edit-task-project').value = task.projectId || '';
        document.getElementById('edit-task-tags').value = (task.tags || []).map(id=>{const tg=this.state.taskTags.find(t=>t.id===id);return tg?tg.name:'';}).filter(Boolean).join(', ');
        document.getElementById('edit-task-deadline-date').value = task.deadline ? task.deadline.slice(0,10) : '';
        document.querySelector(`input[name="edit-importance"][value="${task.importance||'normal'}"]`).checked = true;
        document.querySelector(`input[name="edit-status"][value="${task.status}"]`).checked = true;
        this.openModal(document.getElementById('edit-task-modal'));
    };

    app.deleteTask = async function(taskId, closeModal){
        const idx = this.state.tasks.findIndex(t=>t.id===taskId);
        if(idx === -1) return;
        this.state.tasks.splice(idx,1);
        await this.db.tasks.delete(taskId);
        if(closeModal) this.closeModal(document.getElementById('edit-task-modal'));
        this.renderTasks();
        this.renderTaskTags();
        this.renderManageTaskTags();
        this.showToast('Task deleted', 'success');
    };

    app.toggleTaskCompletion = async function(taskId){
        const task = this.state.tasks.find(t=>t.id===taskId);
        if(!task) return;
        task.completed = !task.completed;
        await this.db.tasks.put(task);
        this.renderTasks();
    };

    app.addQuickTask = async function(text){
        const qt = {id:this.generateId(), title:text, createdAt:new Date().toISOString()};
        this.state.quickTasks.push(qt);
        await this.db.quickTasks.add(qt);
        document.getElementById('quick-task-input').value = '';
        this.renderQuickTasks();
    };

    app.deleteQuickTask = async function(id){
        const idx = this.state.quickTasks.findIndex(q=>q.id===id);
        if(idx===-1) return;
        const [qt] = this.state.quickTasks.splice(idx,1);
        await this.db.quickTasks.delete(qt.id);
        this.renderQuickTasks();
    };

    app.processQuickTask = async function(id){
        const qt = this.state.quickTasks.find(q=>q.id===id);
        if(!qt) return;
        const newTask = {id:this.generateId(), title:qt.title, description:'', projectId:null, tags:[], deadline:null, importance:'normal', status:'active', completed:false, createdAt:new Date().toISOString(), isTaskOfTheDay:false};
        this.state.tasks.push(newTask);
        await this.db.tasks.add(newTask);
        await this.deleteQuickTask(id);
        this.showToast('Quick task processed!', 'success');
        this.renderTasks();
    };

    app.renderQuickTasks = function(){
        const list = document.getElementById('quick-tasks-list');
        if(!list) return;
        list.innerHTML = '';
        if(this.state.quickTasks.length === 0){
            list.innerHTML = `<div class="empty-state"><p>No quick tasks</p></div>`;
            return;
        }
        this.state.quickTasks.forEach(q => {
            const item = document.createElement('div');
            item.className = 'quick-task-item';
            item.innerHTML = `<span>${q.title}</span><div class="quick-task-actions"><button class="quick-task-action-btn process-btn"><i class="fas fa-arrow-right"></i></button><button class="quick-task-action-btn delete-btn"><i class="fas fa-trash"></i></button></div>`;
            item.querySelector('.process-btn').addEventListener('click', () => this.processQuickTask(q.id));
            item.querySelector('.delete-btn').addEventListener('click', () => this.deleteQuickTask(q.id));
            list.appendChild(item);
        });
    };

    app.clearCompletedTasks = async function(){
        const completed = this.state.tasks.filter(t=>t.completed);
        for(const t of completed){
            await this.db.tasks.delete(t.id);
        }
        this.state.tasks = this.state.tasks.filter(t=>!t.completed);
        this.renderTasks();
    };
    
    // ... other task-related functions (handleTaskFormSubmit, deleteTask, etc.)

    // ===================================================================================
    // ============================ PROJECTS (projects.html) =============================
    // ===================================================================================
    app.renderProjectsPage = function() { /* ... implementation ... */ };
    app.setupProjectsPageListeners = function() { /* ... implementation ... */ };
    
    // ===================================================================================
    // ============================== NOTES (notes.html) =================================
    // ===================================================================================
    app.renderNotesPage = function() { /* ... implementation ... */ };
    app.setupNotesPageListeners = function() { /* ... implementation ... */ };
    
    // ===================================================================================
    // ============================== HABITS (habits.html) ===============================
    // ===================================================================================
    app.renderHabitsPage = function() { /* ... implementation ... */ };
    app.setupHabitsPageListeners = function() { /* ... implementation ... */ };
    
    // ===================================================================================
    // ============================ HOUSEHOLD (household.html) ===========================
    // ===================================================================================
    app.renderHouseholdPage = function() { /* ... implementation ... */ };
    app.setupHouseholdPageListeners = function() { /* ... implementation ... */ };
    
    // ===================================================================================
    // ========================= TIME MANAGEMENT (timemanagement.html) ===================
    // ===================================================================================
    app.renderTimeManagementPage = function() { /* ... implementation ... */ };
    app.setupTimeManagementPageListeners = function() { /* ... implementation ... */ };
    
    // ===================================================================================
    // ============================ SETTINGS (settings.html) =============================
    // ===================================================================================
    app.renderSettingsPage = function() {
        // Data Management
        const backupInfoEl = document.getElementById('last-backup-info');
        if (backupInfoEl) {
            backupInfoEl.textContent = this.state.settings.lastBackup
                ? `Last backup: ${new Date(this.state.settings.lastBackup).toLocaleString()}`
                : 'No backups have been made yet.';
        }

        // Priority Settings
        const weights = this.state.settings.priorityWeights;
        document.getElementById('prio-importance-weight').value = weights.importance;
        document.getElementById('prio-deadline-weight').value = weights.deadline;
        document.getElementById('prio-project-weight').value = weights.project;
        this.updatePriorityValueLabels();
    };

    app.setupSettingsPageListeners = function() {
        document.getElementById('backup-btn')?.addEventListener('click', () => this.backupData());
        document.getElementById('restore-btn')?.addEventListener('click', () => document.getElementById('restore-input').click());
        document.getElementById('restore-input')?.addEventListener('change', e => this.restoreData(e));
        
        document.getElementById('priority-form')?.addEventListener('input', () => this.updatePriorityValueLabels());
        document.getElementById('priority-form')?.addEventListener('submit', e => {
            e.preventDefault();
            this.savePriorityWeights();
        });
        document.getElementById('reset-priority-btn')?.addEventListener('click', () => this.resetPriorityWeights());
    };
    
    app.updatePriorityValueLabels = function() {
        document.getElementById('prio-importance-value').textContent = document.getElementById('prio-importance-weight').value;
        document.getElementById('prio-deadline-value').textContent = document.getElementById('prio-deadline-weight').value;
        document.getElementById('prio-project-value').textContent = document.getElementById('prio-project-weight').value;
    };
    
    app.savePriorityWeights = function() {
        const newWeights = {
            importance: parseInt(document.getElementById('prio-importance-weight').value, 10),
            deadline: parseInt(document.getElementById('prio-deadline-weight').value, 10),
            project: parseInt(document.getElementById('prio-project-weight').value, 10),
        };
        this.saveSetting('priorityWeights', newWeights);
        this.showToast('Priority weights saved!', 'success');
    };
    
    app.resetPriorityWeights = function() {
        const defaultWeights = { importance: 30, deadline: 20, project: 5 };
        this.saveSetting('priorityWeights', defaultWeights);
        this.renderSettingsPage(); // Re-render to show default values
        this.showToast('Priority weights reset to default.', 'info');
    };
    
    app.backupData = async function() {
        const dataToBackup = {};
        for (const table of this.db.tables) {
            dataToBackup[table.name] = await table.toArray();
        }
        const json = JSON.stringify(dataToBackup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FinaFlow-Backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.saveSetting('lastBackup', new Date().toISOString());
        this.renderSettingsPage();
        this.showToast('Backup created successfully.', 'success');
    };

    app.restoreData = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!confirm("Restoring from a backup will overwrite all current data. Are you sure you want to continue?")) {
            event.target.value = '';
            return;
        }
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            await this.db.transaction('rw', this.db.tables, async () => {
                for (const table of this.db.tables) {
                    if (data[table.name]) {
                        await table.clear();
                        await table.bulkPut(data[table.name]);
                    }
                }
            });
            
            this.showToast('Restore successful! The application will now reload.', 'success');
            setTimeout(() => window.location.reload(), 2000);

        } catch (err) {
            console.error('Failed to restore backup:', err);
            this.showToast('Failed to restore backup. The file may be corrupted.', 'error');
        } finally {
            event.target.value = '';
        }
    };


    // --- Initialize App ---
    document.addEventListener('DOMContentLoaded', () => app.init());

})();
