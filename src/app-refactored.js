/**
 * Sentauri Desktop Application - Main Entry Point
 * Refactored to use modular architecture
 */

// Import modules (in browser context, these would be loaded via script tags)
// For electron/node context, we'd use require()

class SentauriDesktop {
    constructor() {
        // Initialize managers
        this.configManager = new ConfigManager();
        this.conversationManager = new ConversationManager(window.electronAPI?.isDesktop || false);
        this.aiProvider = null; // Will be initialized after config is loaded
        this.uiManager = new UIManager();
        
        // State
        this.isConnected = false;
        this.currentTab = 'chat';
        this.isDesktop = window.electronAPI?.isDesktop || false;
        
        // Initialize
        this.init();
    }

    async init() {
        console.log('🚀 Sentauri starting...');
        
        try {
            // Load configuration
            await this.configManager.loadSettings();
            console.log('✅ Settings loaded');
            
            // Initialize AI provider with config
            this.aiProvider = new AIProvider(this.configManager.getConfig());
            console.log('✅ AI Provider initialized');
            
            // Load conversations
            await this.conversationManager.loadConversations();
            console.log('✅ Conversations loaded');
            
            // Setup UI
            this.uiManager.displayConversations(this.conversationManager.conversations);
            this.uiManager.populateSettingsForm(this.configManager.getConfig());
            console.log('✅ UI initialized');
            
            // Setup event listeners
            this.setupEventListeners();
            console.log('✅ Event listeners attached');
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            console.log('✅ Keyboard shortcuts configured');
            
            // Check connection
            await this.checkConnection();
            console.log('✅ Connection checked');
            
            // Show welcome message
            this.uiManager.showWelcomeMessage();
            
            // Desktop-specific initialization
            if (this.isDesktop) {
                this.setupDesktopFeatures();
                console.log('✅ Desktop features initialized');
            }
            
            console.log('✨ Sentauri ready!');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.uiManager.showError('Failed to initialize Sentauri: ' + error.message);
        }
    }

    setupEventListeners() {
        // Message input
        const messageInput = this.uiManager.elements.messageInput;
        const sendButton = this.uiManager.elements.sendButton;
        
        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.uiManager.adjustInputHeight();
            });
            
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        // Sidebar toggle
        const sidebarToggle = this.uiManager.elements.sidebarToggle;
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.uiManager.toggleSidebar();
            });
        }
        
        // Tab switching
        this.uiManager.elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Settings
        const settingsButton = document.getElementById('settings-button');
        const settingsClose = document.getElementById('settings-close');
        const settingsForm = this.uiManager.elements.settingsForm;
        
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                this.uiManager.showSettings();
            });
        }
        
        if (settingsClose) {
            settingsClose.addEventListener('click', () => {
                this.uiManager.hideSettings();
            });
        }
        
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveSettings();
            });
        }
        
        // New conversation button
        const newConversationBtn = document.getElementById('new-conversation-btn');
        if (newConversationBtn) {
            newConversationBtn.addEventListener('click', () => {
                this.startNewConversation();
            });
        }
        
        // Custom events from UI Manager
        document.addEventListener('load-conversation', (e) => {
            this.loadConversation(e.detail.conversationId);
        });
        
        document.addEventListener('rename-conversation', (e) => {
            this.renameConversation(e.detail.conversationId, e.detail.newTitle);
        });
        
        document.addEventListener('delete-conversation', (e) => {
            this.deleteConversation(e.detail.conversationId);
        });
        
        document.addEventListener('edit-message', (e) => {
            // Handle message editing
            console.log('Edit message:', e.detail);
        });
        
        // Provider change
        const providerSelect = document.getElementById('api-provider');
        if (providerSelect) {
            providerSelect.addEventListener('change', async () => {
                await this.handleProviderChange(providerSelect.value);
            });
        }
        
        // Auto-detect button for local LLMs
        const autoDetectBtn = document.getElementById('auto-detect-btn');
        if (autoDetectBtn) {
            autoDetectBtn.addEventListener('click', async () => {
                await this.autoDetectLocalModels();
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K - Focus input
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.uiManager.focusInput();
            }
            
            // Cmd/Ctrl + N - New conversation
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                this.startNewConversation();
            }
            
            // Cmd/Ctrl + , - Settings
            if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.uiManager.showSettings();
            }
            
            // Escape - Close modals
            if (e.key === 'Escape') {
                this.uiManager.hideSettings();
            }
            
            // Cmd/Ctrl + / - Toggle sidebar
            if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                this.uiManager.toggleSidebar();
            }
        });
    }

    setupDesktopFeatures() {
        // Desktop-specific features
        if (window.electronAPI) {
            // Handle window controls
            window.electronAPI.onWindowControl((event, action) => {
                console.log('Window control:', action);
            });
            
            // Handle global shortcuts
            window.electronAPI.onGlobalShortcut((event, shortcut) => {
                console.log('Global shortcut:', shortcut);
                if (shortcut === 'quick-chat') {
                    this.uiManager.focusInput();
                }
            });
        }
    }

    async sendMessage() {
        const input = this.uiManager.elements.messageInput;
        const message = input.value.trim();
        
        if (!message) return;
        
        // Check if we have a valid configuration
        if (!this.configManager.validateApiKey() && 
            !['ollama', 'lmstudio', 'localai'].includes(this.configManager.getSetting('apiProvider'))) {
            this.uiManager.showError('Please configure your API key in settings');
            return;
        }
        
        // Clear input
        this.uiManager.clearInput();
        this.uiManager.setInputEnabled(false);
        
        // Create new conversation if needed
        if (!this.conversationManager.currentConversationId) {
            this.conversationManager.createNewConversation();
        }
        
        // Add user message
        this.conversationManager.addMessage('user', message);
        this.uiManager.addMessage('user', message);
        
        // Show loading
        this.uiManager.showLoadingIndicator();
        
        try {
            // Get conversation history
            const messages = this.conversationManager.getConversationHistory();
            
            // Send to AI provider
            const response = await this.aiProvider.sendMessage(messages, {
                stream: this.configManager.getSetting('streamResponses')
            });
            
            // Handle response
            if (this.configManager.getSetting('streamResponses') && response[Symbol.asyncIterator]) {
                // Streaming response
                let fullResponse = '';
                let messageElement = null;
                
                for await (const chunk of response) {
                    fullResponse += chunk;
                    
                    if (!messageElement) {
                        this.uiManager.hideLoadingIndicator();
                        messageElement = this.uiManager.addMessage('assistant', fullResponse);
                    } else {
                        this.uiManager.updateMessage(messageElement, fullResponse);
                    }
                }
                
                // Save complete message
                this.conversationManager.addMessage('assistant', fullResponse);
            } else {
                // Non-streaming response
                this.uiManager.hideLoadingIndicator();
                this.conversationManager.addMessage('assistant', response);
                this.uiManager.addMessage('assistant', response);
            }
            
            // Save conversation
            await this.conversationManager.saveConversations();
            
            // Update conversation list
            this.uiManager.displayConversations(this.conversationManager.conversations);
            this.uiManager.highlightConversation(this.conversationManager.currentConversationId);
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.uiManager.hideLoadingIndicator();
            this.uiManager.showError('Failed to get response: ' + error.message);
            
            // Check if it's a connection error
            if (error.message.includes('fetch')) {
                this.isConnected = false;
                this.uiManager.updateConnectionStatus(false, 'Connection lost');
            }
        } finally {
            this.uiManager.setInputEnabled(true);
            this.uiManager.focusInput();
        }
    }

    async checkConnection() {
        try {
            const result = await this.aiProvider.testConnection();
            this.isConnected = result.success;
            this.uiManager.updateConnectionStatus(
                result.success,
                result.success ? 'Connected' : 'Not connected'
            );
        } catch (error) {
            this.isConnected = false;
            this.uiManager.updateConnectionStatus(false, 'Connection check failed');
        }
    }

    async saveSettings() {
        const formData = this.uiManager.getSettingsFormData();
        
        // Update configuration
        this.configManager.updateConfig(formData);
        
        // Save to storage
        const saved = await this.configManager.saveSettings();
        
        if (saved) {
            // Reinitialize AI provider with new config
            this.aiProvider = new AIProvider(this.configManager.getConfig());
            
            // Check connection with new settings
            await this.checkConnection();
            
            this.uiManager.showToast('Settings saved successfully');
            this.uiManager.hideSettings();
        } else {
            this.uiManager.showError('Failed to save settings');
        }
    }

    async handleProviderChange(provider) {
        const modelSelect = document.getElementById('api-model');
        const autoDetectBtn = document.getElementById('auto-detect-btn');
        
        // Show/hide auto-detect button for local providers
        if (autoDetectBtn) {
            autoDetectBtn.style.display = 
                ['ollama', 'lmstudio', 'localai'].includes(provider) ? 'block' : 'none';
        }
        
        // Update model options
        const providerInfo = this.aiProvider.getProviderInfo(provider);
        if (providerInfo && modelSelect) {
            modelSelect.innerHTML = '';
            
            providerInfo.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
        }
        
        // Update endpoint if needed
        const endpointInput = document.getElementById('api-endpoint');
        if (endpointInput && providerInfo) {
            if (typeof providerInfo.endpoint === 'string') {
                endpointInput.value = providerInfo.endpoint;
            }
        }
    }

    async autoDetectLocalModels() {
        try {
            this.uiManager.showToast('Detecting local models...');
            
            const models = await this.aiProvider.detectLocalModels();
            
            if (models.length > 0) {
                const modelSelect = document.getElementById('api-model');
                if (modelSelect) {
                    modelSelect.innerHTML = '';
                    
                    models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model;
                        option.textContent = model;
                        modelSelect.appendChild(option);
                    });
                    
                    this.uiManager.showToast(`Found ${models.length} models`);
                }
            } else {
                this.uiManager.showError('No local models detected. Make sure your local LLM service is running.');
            }
        } catch (error) {
            this.uiManager.showError('Failed to detect models: ' + error.message);
        }
    }

    startNewConversation() {
        const conversation = this.conversationManager.createNewConversation();
        this.uiManager.clearMessages();
        this.uiManager.showWelcomeMessage();
        this.uiManager.displayConversations(this.conversationManager.conversations);
        this.uiManager.highlightConversation(conversation.id);
        this.uiManager.focusInput();
    }

    loadConversation(conversationId) {
        const conversation = this.conversationManager.loadConversation(conversationId);
        
        if (conversation) {
            // Clear and display messages
            this.uiManager.clearMessages();
            
            conversation.messages.forEach(msg => {
                this.uiManager.addMessage(msg.role, msg.content, msg.timestamp);
            });
            
            this.uiManager.highlightConversation(conversationId);
            this.uiManager.focusInput();
        }
    }

    renameConversation(conversationId, newTitle) {
        if (this.conversationManager.renameConversation(conversationId, newTitle)) {
            this.uiManager.displayConversations(this.conversationManager.conversations);
            this.uiManager.highlightConversation(this.conversationManager.currentConversationId);
            this.uiManager.showToast('Conversation renamed');
        }
    }

    deleteConversation(conversationId) {
        if (this.conversationManager.deleteConversation(conversationId)) {
            this.uiManager.displayConversations(this.conversationManager.conversations);
            
            // If we deleted the current conversation, show welcome
            if (!this.conversationManager.currentConversationId) {
                this.uiManager.clearMessages();
                this.uiManager.showWelcomeMessage();
            }
            
            this.uiManager.showToast('Conversation deleted');
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        this.uiManager.switchTab(tabName);
        
        // Load tab-specific content if needed
        switch (tabName) {
            case 'chat':
                // Chat tab is default
                break;
            case 'components':
                // Load components view
                console.log('Loading components...');
                break;
            case 'mcp-tools':
                // Load MCP tools
                console.log('Loading MCP tools...');
                break;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sentauri = new SentauriDesktop();
});

// Configure marked for markdown rendering
if (window.marked) {
    window.marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function(code, lang) {
            if (window.Prism && window.Prism.languages[lang]) {
                return window.Prism.highlight(code, window.Prism.languages[lang], lang);
            }
            return code;
        }
    });
}