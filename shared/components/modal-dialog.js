class ModalDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background-color: rgba(var(--charcoal-rgb), 0.6);
                    backdrop-filter: blur(5px);
                    z-index: 1000;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                :host(.visible) {
                    display: flex;
                    opacity: 1;
                }
                .modal-content {
                    background-color: var(--secondary-bg);
                    width: 90%;
                    max-width: 600px;
                    border-radius: var(--border-radius-md);
                    box-shadow: var(--shadow-lg);
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    transform: scale(0.95);
                    opacity: 0;
                    transition: transform 0.3s ease, opacity 0.3s ease;
                }
                :host(.visible) .modal-content {
                    transform: scale(1);
                    opacity: 1;
                }
                .header {
                    padding: 20px 25px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .header h2 { font-size: 1.4em; margin:0; }
                .close-btn { font-size: 24px; color: var(--secondary-text); transition: var(--transition-fast); background:none; border:none; cursor:pointer; }
                .close-btn:hover { color: var(--danger); transform: rotate(90deg); }
                .body { padding: 25px; overflow-y: auto; }
            </style>
            <div class="modal-content" role="dialog" aria-modal="true">
                <div class="header">
                    <h2 id="modal-title"></h2>
                    <button class="close-btn" aria-label="Close dialog">×</button>
                </div>
                <div class="body">
                    <slot></slot>
                </div>
            </div>
        `;
    }

    static get observedAttributes() {
        return ['title'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'title') {
            this.shadowRoot.getElementById('modal-title').textContent = newValue;
        }
    }

    connectedCallback() {
        this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.addEventListener('click', (e) => {
            // Close if backdrop is clicked
            if(e.target === this) {
                this.hide();
            }
            // Close if a button with data-action="close" is clicked inside the slot
            if(e.target.matches('[data-action="close"]')) {
                this.hide();
            }
        });
    }

    show() {
        this.classList.add('visible');
        this.setAttribute('aria-hidden', 'false');
    }

    hide() {
        this.classList.remove('visible');
        this.setAttribute('aria-hidden', 'true');
    }
    
    get title() {
        return this.getAttribute('title');
    }
    set title(value) {
        this.setAttribute('title', value);
    }
}
customElements.define('modal-dialog', ModalDialog);
