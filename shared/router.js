import { dispatchEvent } from './app.js';

const router = {
    init() {
        this.backButton = document.getElementById('back-button');
        if (!this.backButton) {
            console.error('Router init failed: #back-button not found.');
            return;
        }

        this.updateBackButton();
        
        // Listen for custom navigation events
        window.addEventListener('navigate', this.updateBackButton.bind(this));
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.path) {
                // This is a simplified router; a full implementation
                // would load page content here. For this MPA structure,
                // we just ensure the back button is correct.
                this.updateBackButton();
            }
        });

        this.backButton.addEventListener('click', (e) => {
            e.preventDefault();
            const lastPage = this.getHistory().pop(); // remove current
            const targetPage = this.getHistory().pop(); // get previous
            if (targetPage) {
                this.navigate(targetPage, true); // true to indicate it's a 'back' navigation
            } else {
                this.navigate('/index.html', true);
            }
        });
    },

    navigate(path, isBack = false) {
        if (!isBack) {
            const history = this.getHistory();
            if (history[history.length - 1] !== path) {
                history.push(path);
                sessionStorage.setItem('navigationHistory', JSON.stringify(history));
                // In a real SPA, you'd pushState here. For MPA, we just navigate.
            }
        } else {
            // If it's a back navigation, the popstate handler will manage history.
            // For MPA, we just go there.
            const history = this.getHistory();
            history.pop();
            sessionStorage.setItem('navigationHistory', JSON.stringify(history));
        }
        
        window.location.href = path;
    },
    
    updateBackButton() {
        const history = this.getHistory();
        const currentPage = window.location.pathname;

        if (currentPage === '/index.html' || currentPage === '/' || history.length <= 1) {
            this.backButton.classList.add('hidden');
        } else {
            this.backButton.classList.remove('hidden');
        }
        
        dispatchEvent('routeChanged', { path: currentPage });
    },

    getHistory() {
        try {
            return JSON.parse(sessionStorage.getItem('navigationHistory')) || [window.location.pathname];
        } catch (e) {
            return [window.location.pathname];
        }
    },
    
    // Called on every page load to ensure history is consistent
    registerPageLoad() {
        const history = this.getHistory();
        const currentPage = window.location.pathname;
        if(history[history.length - 1] !== currentPage) {
            history.push(currentPage);
            sessionStorage.setItem('navigationHistory', JSON.stringify(history));
        }
        this.init();
    }
};

export default router;
