import { db } from '../db.js';
import { formatDate } from '../app.js';

class TaskCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setData(task, project) {
        this.task = task;
        this.project = project;
        this.render();
    }

    connectedCallback() {
        this.render();
        this.shadowRoot.addEventListener('click', e => {
            if (e.target.closest('.task-edit-btn')) {
                this.dispatchEvent(new CustomEvent('task-edit', { detail: { id: this.task.id }, bubbles: true, composed: true }));
            }
            if (e.target.closest('.task-complete-btn')) {
                 this.dispatchEvent(new CustomEvent('task-toggle-complete', { detail: { id: this.task.id }, bubbles: true, composed: true }));
            }
        });
        
        // Shake to mark for today
        let lastX = 0; let lastY = 0; let shakeCount = 0; let lastMove = 0;
        this.addEventListener('pointermove', e => {
            if (e.buttons !== 1) return; // only when dragging
            const now = Date.now();
            if (now - lastMove < 50) return;
            
            const dx = Math.abs(e.clientX - lastX);
            if(dx > 20) shakeCount++;
            
            lastX = e.clientX;
            lastMove = now;
            
            if (shakeCount > 5) {
                this.dispatchEvent(new CustomEvent('task-toggle-today', { detail: { id: this.task.id }, bubbles: true, composed: true }));
                shakeCount = 0; // Reset after trigger
            }
        });
        this.addEventListener('pointerup', () => shakeCount = 0);
    }

    render() {
        if (!this.task) return;

        const { id, title, description, tags, deadline, importance, status, completed, priority, isToday } = this.task;

        let dlStr = '', dlClass = '';
        if (deadline) {
            const d = new Date(deadline), now = new Date();
            const days = Math.ceil((d.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 864e5); 
            if (days < 0) { dlStr = 'Overdue!'; dlClass = 'urgent'; }
            else if (days === 0) { dlStr = 'Today'; dlClass = 'urgent'; }
            else if (days === 1) { dlStr = 'Tomorrow'; dlClass = 'near-deadline'; }
            else dlStr = formatDate(deadline);
        }
        
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; }
                .card {
                    background-color: var(--secondary-bg);
                    border-radius: var(--border-radius-md);
                    padding: 20px;
                    transition: all 0.25s ease-in-out;
                    border-left: 5px solid transparent;
                    cursor: grab;
                }
                .card:active { cursor: grabbing; }
                .card.completed { opacity: 0.65; border-left-color: var(--completed-color); }
                .card.completed .title { text-decoration: line-through; }
                .card.status-active { border-left-color: var(--mint); }
                .card.status-waiting { border-left-color: var(--lavender); }
                .card.is-today { box-shadow: 0 0 0 2px var(--accent); }

                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
                .title { font-size: 1.2em; margin-right: 10px; font-family: 'Poppins', sans-serif; }
                .actions { display: flex; gap: 8px; }
                .action-btn { background: none; border: none; color: var(--secondary-text); font-size: 1em; cursor: pointer; padding: 5px; border-radius: 50%; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center;}
                .action-btn:hover { background-color: var(--tertiary-bg); color: var(--offwhite); }
                .description { font-size: 0.9em; color: var(--secondary-text); margin-bottom: 12px; }
                .meta { display: flex; flex-wrap: wrap; gap: 15px; font-size: 0.85em; }
                .meta-item { display: flex; align-items: center; gap: 5px; }
                .deadline.urgent { color: var(--danger); font-weight: bold; }
                .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
                .tag { padding: 4px 8px; border-radius: 4px; font-size: 0.75em; background-color: var(--tertiary-bg); }
                .project { font-size: 0.9em; background-color: var(--tertiary-bg); padding: 5px 10px; border-radius: var(--border-radius-sm); margin-top: 10px; display: inline-block; }
                .priority { font-size: 0.75em; font-weight: 500; background-color: var(--tertiary-bg); padding: 2px 6px; border-radius: 4px; }
            </style>
            <div class="card ${status} ${completed ? 'completed' : ''} ${isToday ? 'is-today' : ''}">
                <div class="header">
                    <h4 class="title">${title}</h4>
                    <div class="actions">
                         <span class="priority" title="Priority Score">${priority}</span>
                         <button class="action-btn task-edit-btn" title="Edit Task"><i class="fas fa-pencil-alt"></i></button>
                         <button class="action-btn task-complete-btn" title="Complete Task"><i class="fas fa-check"></i></button>
                    </div>
                </div>
                ${description ? `<p class="description">${description}</p>` : ''}
                <div class="meta">
                    ${deadline ? `<span class="meta-item deadline ${dlClass}"><i class="far fa-calendar-alt"></i> ${dlStr}</span>` : ''}
                    <span class="meta-item importance"><i class="fas fa-star"></i> ${importance}</span>
                </div>
                ${this.project ? `<div class="project">Project: ${this.project.title}</div>` : ''}
                ${tags && tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </div>
        `;
    }
}
customElements.define('task-card', TaskCard);
