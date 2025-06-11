import { on, dispatchEvent } from '../app.js';

class HabitTracker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['habit', 'logs']; }

    set habit(value) {
        this._habit = value;
        this.render();
    }
    get habit() { return this._habit; }

    set logs(value) {
        this._logs = value;
        this.render();
    }
    get logs() { return this._logs; }

    connectedCallback() {
        this.render();
        this.shadowRoot.addEventListener('click', e => {
            const button = e.target.closest('.day-btn');
            if (button) {
                const { date, status } = button.dataset;
                if(status === 'done') return; // Cannot change done status from here
                const newStatus = status === 'pending' ? 'done' : (status === 'skipped' ? 'pending' : 'skipped');
                dispatchEvent('habit-log-updated', { habitId: this.habit.id, date, status: newStatus });
            }
            if (e.target.closest('.edit-btn')) {
                dispatchEvent('habit-edit', { id: this.habit.id });
            }
        });
    }

    render() {
        if (!this.habit) return;
        const { id, title, schedule, perWeek } = this.habit;

        const today = new Date();
        const weekStart = this.getWeekStart(today);
        const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        let weekHTML = '';
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dateISO = dayDate.toISOString().split('T')[0];
            const isPast = dayDate < today.setHours(0,0,0,0);
            
            const log = this._logs.find(l => l.dateISO === dateISO);
            const isScheduled = schedule.includes(i + 1);

            let status = 'none';
            let icon = '';

            if (log) {
                status = log.status; // 'done' or 'skipped'
            } else if (isScheduled && isPast) {
                status = 'missed';
            } else if (isScheduled) {
                status = 'pending';
            }
            
            switch(status) {
                case 'done': icon = `<i class="fas fa-check"></i>`; break;
                case 'missed': icon = `<i class="fas fa-times"></i>`; break;
                case 'skipped': icon = `<i class="fas fa-forward"></i>`; break;
                case 'pending': icon = ``; break;
                case 'none': icon = ``; break;
            }

            weekHTML += `
                <div class="day">
                    <span class="day-label">${weekdays[i]}</span>
                    <button class="day-btn status-${status}" data-date="${dateISO}" data-status="${status}" ${status === 'none' ? 'disabled' : ''}>
                        ${icon}
                    </button>
                </div>
            `;
        }

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .card {
                    background-color: var(--secondary-bg);
                    border-radius: var(--border-radius-md);
                    padding: var(--padding-md);
                    display: flex;
                    flex-direction: column;
                    gap: var(--padding-md);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .title {
                    font-size: 1.1em;
                    font-weight: 600;
                }
                .week-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 8px;
                }
                .day { text-align: center; }
                .day-label { font-size: 0.8em; color: var(--secondary-text); }
                .day-btn {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    border: 2px solid var(--tertiary-bg);
                    background-color: var(--tertiary-bg);
                    color: var(--primary-text);
                    cursor: pointer;
                    transition: var(--transition-std);
                    font-size: 1em;
                }
                .day-btn:disabled { background-color: transparent; border-color: transparent; cursor: default; }
                .day-btn.status-pending:hover { border-color: var(--accent); }
                .day-btn.status-done { background-color: var(--success); border-color: var(--success); color: var(--primary-bg); }
                .day-btn.status-missed { background-color: var(--danger); border-color: var(--danger); }
                .day-btn.status-skipped { background-color: var(--lavender); border-color: var(--lavender); }
                .edit-btn { background: none; border: none; color: var(--secondary-text); cursor: pointer; }
                .edit-btn:hover { color: var(--accent); }
            </style>
            <div class="card">
                <div class="header">
                    <span class="title">${title}</span>
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                </div>
                <div class="week-grid">
                    ${weekHTML}
                </div>
            </div>
        `;
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0,0,0,0);
        return d;
    }
}
customElements.define('habit-tracker', HabitTracker);
