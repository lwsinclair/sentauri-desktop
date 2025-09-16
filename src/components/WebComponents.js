/**
 * Web Components for Sentauri
 * Custom HTML elements for better modularity
 */

// Chat Message Component
class ChatMessage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const role = this.getAttribute('role') || 'user';
        const content = this.getAttribute('content') || '';
        const timestamp = this.getAttribute('timestamp') || new Date().toISOString();
        
        this.render(role, content, timestamp);
        this.attachListeners();
    }

    render(role, content, timestamp) {
        const roleClass = role === 'user' ? 'user-message' : 'assistant-message';
        const roleLabel = role === 'user' ? 'You' : 'Sentauri';
        const time = new Date(timestamp).toLocaleTimeString();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin: 1rem 0;
                }
                
                .message {
                    padding: 1rem;
                    border-radius: 0.5rem;
                    background: var(--message-bg, #f5f5f5);
                    animation: slideIn 0.3s ease-out;
                }
                
                .message.user-message {
                    background: var(--user-message-bg, #e3f2fd);
                    margin-left: 2rem;
                }
                
                .message.assistant-message {
                    background: var(--assistant-message-bg, #f5f5f5);
                    margin-right: 2rem;
                }
                
                .message-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                    opacity: 0.7;
                }
                
                .message-content {
                    line-height: 1.6;
                }
                
                .message-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .message:hover .message-actions {
                    opacity: 1;
                }
                
                .action-button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                
                .action-button:hover {
                    opacity: 1;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            </style>
            
            <div class="message ${roleClass}">
                <div class="message-header">
                    <span class="message-role">${roleLabel}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-content">${this.formatContent(content)}</div>
                <div class="message-actions">
                    <button class="action-button copy-button" title="Copy message">
                        📋
                    </button>
                    <button class="action-button edit-button" title="Edit message">
                        ✏️
                    </button>
                </div>
            </div>
        `;
    }

    formatContent(content) {
        // Apply markdown if available
        if (window.marked) {
            content = window.marked.parse(content);
        }
        
        // Sanitize if DOMPurify is available
        if (window.DOMPurify) {
            content = window.DOMPurify.sanitize(content);
        }
        
        return content;
    }

    attachListeners() {
        const copyBtn = this.shadowRoot.querySelector('.copy-button');
        const editBtn = this.shadowRoot.querySelector('.edit-button');
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const content = this.shadowRoot.querySelector('.message-content').textContent;
                navigator.clipboard.writeText(content);
                this.dispatchEvent(new CustomEvent('message-copied'));
            });
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('message-edit-requested'));
            });
        }
    }

    updateContent(newContent) {
        const contentEl = this.shadowRoot.querySelector('.message-content');
        if (contentEl) {
            contentEl.innerHTML = this.formatContent(newContent);
        }
    }
}

// Conversation Item Component
class ConversationItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.attachListeners();
    }

    render() {
        const id = this.getAttribute('conversation-id');
        const title = this.getAttribute('title') || 'Untitled Conversation';
        const messageCount = this.getAttribute('message-count') || '0';
        const updatedAt = this.getAttribute('updated-at') || new Date().toISOString();
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                
                .conversation-item {
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                
                .conversation-item:hover {
                    background: var(--hover-bg, rgba(0, 0, 0, 0.05));
                }
                
                .conversation-item.active {
                    background: var(--active-bg, rgba(0, 123, 255, 0.1));
                }
                
                .conversation-title {
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .conversation-meta {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    display: flex;
                    justify-content: space-between;
                }
                
                .conversation-actions {
                    display: flex;
                    gap: 0.25rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .conversation-item:hover .conversation-actions {
                    opacity: 1;
                }
                
                .action-button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem;
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                
                .action-button:hover {
                    opacity: 1;
                }
            </style>
            
            <div class="conversation-item" data-id="${id}">
                <div class="conversation-title">${this.escapeHtml(title)}</div>
                <div class="conversation-meta">
                    <span class="conversation-date">${this.formatDate(updatedAt)}</span>
                    <span class="conversation-messages">${messageCount} messages</span>
                </div>
                <div class="conversation-actions">
                    <button class="action-button rename-button" title="Rename">✏️</button>
                    <button class="action-button delete-button" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachListeners() {
        const item = this.shadowRoot.querySelector('.conversation-item');
        const renameBtn = this.shadowRoot.querySelector('.rename-button');
        const deleteBtn = this.shadowRoot.querySelector('.delete-button');
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.conversation-actions')) {
                this.dispatchEvent(new CustomEvent('conversation-selected', {
                    detail: { id: this.getAttribute('conversation-id') }
                }));
            }
        });
        
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('conversation-rename', {
                    detail: { id: this.getAttribute('conversation-id') }
                }));
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent('conversation-delete', {
                    detail: { id: this.getAttribute('conversation-id') }
                }));
            });
        }
    }

    setActive(isActive) {
        const item = this.shadowRoot.querySelector('.conversation-item');
        if (item) {
            item.classList.toggle('active', isActive);
        }
    }
}

// Loading Indicator Component
class LoadingIndicator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        const message = this.getAttribute('message') || 'Loading...';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                }
                
                .spinner {
                    width: 24px;
                    height: 24px;
                    border: 3px solid var(--spinner-bg, #f3f3f3);
                    border-top: 3px solid var(--spinner-color, #3498db);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .message {
                    color: var(--text-color, #666);
                }
            </style>
            
            <div class="spinner"></div>
            <span class="message">${message}</span>
        `;
    }
}

// Toast Notification Component
class ToastNotification extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.autoHide();
    }

    render() {
        const message = this.getAttribute('message') || '';
        const type = this.getAttribute('type') || 'info';
        const duration = parseInt(this.getAttribute('duration')) || 3000;
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    z-index: 1000;
                    animation: slideUp 0.3s ease-out;
                }
                
                .toast {
                    padding: 1rem 1.5rem;
                    border-radius: 0.5rem;
                    background: var(--toast-bg, #333);
                    color: var(--toast-color, white);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .toast.success {
                    background: var(--success-bg, #4caf50);
                }
                
                .toast.error {
                    background: var(--error-bg, #f44336);
                }
                
                .toast.warning {
                    background: var(--warning-bg, #ff9800);
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeOut {
                    to {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                }
            </style>
            
            <div class="toast ${type}">
                ${message}
            </div>
        `;
    }

    autoHide() {
        const duration = parseInt(this.getAttribute('duration')) || 3000;
        
        setTimeout(() => {
            const toast = this.shadowRoot.querySelector('.toast');
            if (toast) {
                toast.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => this.remove(), 300);
            }
        }, duration);
    }
}

// Register custom elements
customElements.define('chat-message', ChatMessage);
customElements.define('conversation-item', ConversationItem);
customElements.define('loading-indicator', LoadingIndicator);
customElements.define('toast-notification', ToastNotification);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChatMessage,
        ConversationItem,
        LoadingIndicator,
        ToastNotification
    };
}