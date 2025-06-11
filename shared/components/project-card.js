class ProjectCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setData(project, taskCounts, mode = 'grid') {
        this.project = project;
        this.taskCounts = taskCounts;
        this.mode = mode;
        this.render();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        if (!this.project) return;
        
        const { id, title, description, status, deadline, imageData } = this.project;
        const { total, active, completed } = this.taskCounts;

        const gridTemplate = `
            <div class="card project-card status-${status}">
                <div class="image" style="background-image: url(${imageData || ''})">
                     ${!imageData ? `<i class="fas fa-folder-open"></i>` : ''}
                </div>
                <div class="content">
                    <h4>${title}</h4>
                    <p>${description || 'No description.'}</p>
                    <div class="meta">
                        <span><i class="fas fa-tasks"></i> ${completed}/${total} tasks</span>
                        <span><i class="fas fa-fire"></i> ${active} active</span>
                    </div>
                </div>
            </div>`;
            
        const listTemplate = `
            <div class="list-item project-list-item status-${status}">
                <div class="list-status">${status}</div>
                <div class="list-main">
                    <h4>${title}</h4>
                     <div class="list-meta">
                        <span><i class="fas fa-tasks"></i> ${completed} / ${total}</span>
                        ${deadline ? `<span><i class="far fa-calendar-check"></i> ${new Date(deadline).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
                <div class="list-actions">
                     <button class="btn btn-sm btn-secondary">View</button>
                </div>
            </div>
        `;

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; cursor: pointer; }
                .card { /* Grid styles */ }
                .list-item { /* List styles */ }
                /* Add more detailed shared styles here */
            </style>
            ${this.mode === 'grid' ? gridTemplate : listTemplate}
        `;
    }
}
customElements.define('project-card', ProjectCard);
