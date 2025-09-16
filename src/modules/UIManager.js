/**
 * UI Manager Module
 * Handles all UI interactions and DOM manipulations
 */

class UIManager {
    constructor() {
        this.elements = {};
        this.templates = {};
        this.initializeElements();
        this.initializeTemplates();
    }

    initializeElements() {
        // Cache commonly used DOM elements
        this.elements = {
            // Main containers
            chatContainer: document.getElementById('chat-container'),
            messagesContainer: document.getElementById('messages-container'),
            inputContainer: document.getElementById('input-container'),
            
            // Sidebar
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            conversationList: document.getElementById('conversation-list'),
            
            // Settings
            settingsModal: document.getElementById('settings-modal'),
            settingsForm: document.getElementById('settings-form'),
            
            // Input
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-button'),
            
            // Status
            statusIndicator: document.getElementById('status-indicator'),
            connectionStatus: document.getElementById('connection-status'),
            
            // Tabs
            tabButtons: document.querySelectorAll('.tab-button'),
            tabContents: document.querySelectorAll('.tab-content')
        };
    }

    initializeTemplates() {
        // Define reusable HTML templates
        this.templates = {
            message: (role, content, timestamp) => {
                const roleClass = role === 'user' ? 'user-message' : 'assistant-message';
                const roleLabel = role === 'user' ? 'You' : 'Sentauri';
                const time = new Date(timestamp).toLocaleTimeString();
                
                return `
                    <div class="message ${roleClass}" data-timestamp="${timestamp}">
                        <div class="message-header">
                            <span class="message-role">${roleLabel}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <div class="message-content">${this.formatContent(content)}</div>
                        <div class="message-actions">
                            <button class="copy-button" title="Copy message">
                                <svg class="icon"><use xlink:href="#icon-copy"></use></svg>
                            </button>
                            <button class="edit-button" title="Edit message">
                                <svg class="icon"><use xlink:href="#icon-edit"></use></svg>
                            </button>
                        </div>
                    </div>
                `;
            },
            
            conversationItem: (conversation) => {
                const date = new Date(conversation.updatedAt);
                const dateStr = this.formatDate(date);
                
                return `
                    <div class="conversation-item" data-id="${conversation.id}">
                        <div class="conversation-info">
                            <div class="conversation-title">${this.escapeHtml(conversation.title)}</div>
                            <div class="conversation-meta">
                                <span class="conversation-date">${dateStr}</span>
                                <span class="conversation-messages">${conversation.messages.length} messages</span>
                            </div>
                        </div>
                        <div class="conversation-actions">
                            <button class="rename-conversation" title="Rename">
                                <svg class="icon"><use xlink:href="#icon-edit"></use></svg>
                            </button>
                            <button class="delete-conversation" title="Delete">
                                <svg class="icon"><use xlink:href="#icon-delete"></use></svg>
                            </button>
                        </div>
                    </div>
                `;
            },
            
            loadingIndicator: () => `
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <span>Sentauri is thinking...</span>
                </div>
            `,
            
            errorMessage: (error) => `
                <div class="error-message">
                    <svg class="icon icon-error"><use xlink:href="#icon-alert"></use></svg>
                    <span>${this.escapeHtml(error)}</span>
                </div>
            `,
            
            welcomeMessage: () => `
                <div class="welcome-message">
                    <h2>Welcome to Sentauri</h2>
                    <p>Your AI-powered design system assistant</p>
                    <div class="quick-actions">
                        <button class="quick-action" data-prompt="Help me create a button component">
                            Create Component
                        </button>
                        <button class="quick-action" data-prompt="Review my design system for consistency">
                            Review System
                        </button>
                        <button class="quick-action" data-prompt="Suggest accessibility improvements">
                            Accessibility Check
                        </button>
                    </div>
                </div>
            `
        };
    }

    // Message handling
    addMessage(role, content, timestamp = new Date().toISOString()) {
        const messageHtml = this.templates.message(role, content, timestamp);
        const messageElement = this.createElementFromHTML(messageHtml);
        
        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Add event listeners
        this.attachMessageListeners(messageElement);
        
        return messageElement;
    }

    updateMessage(element, content) {
        const contentElement = element.querySelector('.message-content');
        if (contentElement) {
            contentElement.innerHTML = this.formatContent(content);
        }
    }

    showLoadingIndicator() {
        const indicator = this.createElementFromHTML(this.templates.loadingIndicator());
        indicator.id = 'loading-indicator';
        this.elements.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    showError(error) {
        const errorElement = this.createElementFromHTML(this.templates.errorMessage(error));
        this.elements.messagesContainer.appendChild(errorElement);
        this.scrollToBottom();
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorElement.style.opacity = '0';
            setTimeout(() => errorElement.remove(), 300);
        }, 5000);
    }

    // Conversation handling
    displayConversations(conversations) {
        this.elements.conversationList.innerHTML = '';
        
        if (conversations.length === 0) {
            this.elements.conversationList.innerHTML = `
                <div class="no-conversations">
                    <p>No conversations yet</p>
                    <button id="new-conversation-prompt">Start your first chat</button>
                </div>
            `;
            return;
        }
        
        conversations.forEach(conversation => {
            const itemHtml = this.templates.conversationItem(conversation);
            const itemElement = this.createElementFromHTML(itemHtml);
            this.elements.conversationList.appendChild(itemElement);
            this.attachConversationListeners(itemElement);
        });
    }

    highlightConversation(conversationId) {
        // Remove previous highlight
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add highlight to current
        const currentItem = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    // Tab handling
    switchTab(tabName) {
        // Update tab buttons
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab contents
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    // Status handling
    updateConnectionStatus(isConnected, message = '') {
        this.elements.statusIndicator.className = `status-indicator ${isConnected ? 'connected' : 'disconnected'}`;
        this.elements.connectionStatus.textContent = message || (isConnected ? 'Connected' : 'Disconnected');
    }

    // Settings handling
    showSettings() {
        this.elements.settingsModal.classList.add('open');
    }

    hideSettings() {
        this.elements.settingsModal.classList.remove('open');
    }

    populateSettingsForm(config) {
        Object.keys(config).forEach(key => {
            const input = this.elements.settingsForm.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = config[key];
                } else {
                    input.value = config[key];
                }
            }
        });
    }

    getSettingsFormData() {
        const formData = new FormData(this.elements.settingsForm);
        const config = {};
        
        for (const [key, value] of formData.entries()) {
            const input = this.elements.settingsForm.querySelector(`[name="${key}"]`);
            if (input && input.type === 'checkbox') {
                config[key] = input.checked;
            } else if (input && input.type === 'number') {
                config[key] = parseFloat(value);
            } else {
                config[key] = value;
            }
        }
        
        return config;
    }

    // Sidebar handling
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
        const isCollapsed = this.elements.sidebar.classList.contains('collapsed');
        
        // Update toggle button icon
        const icon = this.elements.sidebarToggle.querySelector('.icon use');
        if (icon) {
            icon.setAttribute('xlink:href', isCollapsed ? '#icon-menu' : '#icon-close');
        }
        
        return isCollapsed;
    }

    // Input handling
    clearInput() {
        this.elements.messageInput.value = '';
        this.adjustInputHeight();
    }

    focusInput() {
        this.elements.messageInput.focus();
    }

    setInputEnabled(enabled) {
        this.elements.messageInput.disabled = !enabled;
        this.elements.sendButton.disabled = !enabled;
    }

    adjustInputHeight() {
        const input = this.elements.messageInput;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    }

    // Utility functions
    formatContent(content) {
        // Apply markdown formatting if available
        if (window.marked) {
            content = window.marked.parse(content);
        }
        
        // Sanitize HTML if DOMPurify is available
        if (window.DOMPurify) {
            content = window.DOMPurify.sanitize(content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
            });
        }
        
        return content;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return 'Today';
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    createElementFromHTML(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    attachMessageListeners(element) {
        // Copy button
        const copyBtn = element.querySelector('.copy-button');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const content = element.querySelector('.message-content').textContent;
                navigator.clipboard.writeText(content);
                this.showToast('Message copied to clipboard');
            });
        }
        
        // Edit button
        const editBtn = element.querySelector('.edit-button');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                // Emit custom event for editing
                element.dispatchEvent(new CustomEvent('edit-message', {
                    bubbles: true,
                    detail: { element }
                }));
            });
        }
    }

    attachConversationListeners(element) {
        // Click to load conversation
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.conversation-actions')) {
                const conversationId = element.dataset.id;
                element.dispatchEvent(new CustomEvent('load-conversation', {
                    bubbles: true,
                    detail: { conversationId }
                }));
            }
        });
        
        // Rename button
        const renameBtn = element.querySelector('.rename-conversation');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const conversationId = element.dataset.id;
                const currentTitle = element.querySelector('.conversation-title').textContent;
                
                const newTitle = prompt('Enter new title:', currentTitle);
                if (newTitle && newTitle !== currentTitle) {
                    element.dispatchEvent(new CustomEvent('rename-conversation', {
                        bubbles: true,
                        detail: { conversationId, newTitle }
                    }));
                }
            });
        }
        
        // Delete button
        const deleteBtn = element.querySelector('.delete-conversation');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const conversationId = element.dataset.id;
                
                if (confirm('Delete this conversation? This cannot be undone.')) {
                    element.dispatchEvent(new CustomEvent('delete-conversation', {
                        bubbles: true,
                        detail: { conversationId }
                    }));
                }
            });
        }
    }

    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    showWelcomeMessage() {
        this.elements.messagesContainer.innerHTML = this.templates.welcomeMessage();
        
        // Attach quick action listeners
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.elements.messageInput.value = prompt;
                this.adjustInputHeight();
                this.focusInput();
            });
        });
    }

    clearMessages() {
        this.elements.messagesContainer.innerHTML = '';
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}