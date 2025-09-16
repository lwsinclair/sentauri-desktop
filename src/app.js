// Sentauri Desktop Application

// Configure marked for better code highlighting when it's available
function configureMarked() {
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
}

// Call this when DOM is ready
document.addEventListener('DOMContentLoaded', configureMarked);

class SentauriDesktop {
    constructor() {
        // Configuration
        this.config = {
            apiProvider: 'openai',
            apiKey: '',
            apiEndpoint: '',
            apiModel: 'gpt-4',
            maxTokens: 2000,
            temperature: 0.7,
            autoAnalyze: true,
            streamResponses: true,
            theme: 'dark'
        };

        // State
        this.isConnected = false;
        this.currentTab = 'chat';
        this.messages = [];
        this.conversationHistory = [];
        this.conversations = [];
        this.currentConversationId = null;
        this.isDesktop = window.electronAPI?.isDesktop || false;
        this.sidebarCollapsed = false;
        this.abortController = null;
        
        // Initialize
        this.init();
    }

    async init() {
        console.log('🚀 Sentauri starting...');
        
        try {
            await this.loadSettings();
            console.log('Settings loaded');
            
            await this.loadConversations();
            console.log('Conversations loaded');
            
            this.displayConversationList();
            console.log('Conversation list displayed');
            
            this.setupEventListeners();
            console.log('Event listeners setup');
            
            this.setupKeyboardShortcuts();
            console.log('Keyboard shortcuts setup');
            
            this.checkConnection();
            console.log('Connection checked');
            
            this.showWelcomeMessage();
            console.log('Welcome message shown');

            // Desktop-specific initialization
            if (this.isDesktop) {
                this.setupDesktopFeatures();
                console.log('Desktop features setup');
            }

            // Add system message to conversation history
            this.conversationHistory = [
                { role: 'system', content: 'You are Sentauri, an AI assistant helping with design systems and components.' }
            ];

            console.log('✅ Sentauri ready');
        } catch (error) {
            console.error('❌ Sentauri initialization failed:', error);
        }
    }

    async loadSettings() {
        try {
            if (this.isDesktop && window.electronAPI) {
                const savedConfig = await window.electronAPI.getStoredConfig();
                this.config = { ...this.config, ...savedConfig };
                
                // Load API key from secure storage
                const apiKey = await window.electronAPI.getSecureCredential('apiKey');
                if (apiKey) {
                    this.config.apiKey = apiKey;
                }
                
                console.log('📱 Loaded settings from Electron store');
            } else {
                const saved = localStorage.getItem('sentauriConfig');
                if (saved) {
                    this.config = { ...this.config, ...JSON.parse(saved) };
                }
                console.log('💾 Loaded settings from localStorage');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            if (this.isDesktop && window.electronAPI) {
                // Separate API key from other config for secure storage
                const { apiKey, ...configWithoutKey } = this.config;
                
                // Save non-sensitive config normally
                await window.electronAPI.setStoredConfig(configWithoutKey);
                
                // Save API key securely
                if (apiKey) {
                    await window.electronAPI.setSecureCredential('apiKey', apiKey);
                } else {
                    await window.electronAPI.deleteSecureCredential('apiKey');
                }
                
                console.log('📱 Saved settings to Electron store');
            } else {
                localStorage.setItem('sentauriConfig', JSON.stringify(this.config));
                console.log('💾 Saved settings to localStorage');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    setupDesktopFeatures() {
        // Listen for Electron events
        if (window.electronAPI) {
            window.electronAPI.onOpenSettings(() => {
                this.openSettings();
            });

            window.electronAPI.onFocusInput(() => {
                const input = document.getElementById('chatInput');
                if (input) {
                    input.focus();
                }
            });
        }

        console.log('🖥️ Desktop features enabled');
    }

    setupEventListeners() {
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }

        // Settings modal
        const settingsCloseBtn = document.getElementById('settingsCloseBtn');
        const settingsCancelBtn = document.getElementById('settingsCancelBtn');
        const settingsSaveBtn = document.getElementById('settingsSaveBtn');
        const testConnectionBtn = document.getElementById('testConnectionBtn');

        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', () => this.closeSettings());
        if (settingsCancelBtn) settingsCancelBtn.addEventListener('click', () => this.closeSettings());
        if (settingsSaveBtn) settingsSaveBtn.addEventListener('click', () => this.handleSaveSettings());
        if (testConnectionBtn) testConnectionBtn.addEventListener('click', () => this.testConnection());

        // API Provider change
        const apiProvider = document.getElementById('apiProvider');
        if (apiProvider) {
            apiProvider.addEventListener('change', (e) => {
                this.onProviderChange(e.target.value);
            });
        }

        // Local LLM buttons
        const detectLocalBtn = document.getElementById('detectLocalBtn');
        const refreshModelsBtn = document.getElementById('refreshModelsBtn');
        if (detectLocalBtn) detectLocalBtn.addEventListener('click', () => this.detectLocalServices());
        if (refreshModelsBtn) refreshModelsBtn.addEventListener('click', () => this.refreshLocalModels());

        // Chat input
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // File upload functionality
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
                // Reset input to allow selecting the same file again
                e.target.value = '';
            });
        }

        // Simplified sidebar toggle - only use the fixed menuToggle button
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }


        // New chat button
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.startNewChat());
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.showExportMenu());
        }

        // Stop button
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopStreaming());
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterConversations(e.target.value);
            });
        }

        // Analysis tab file input
        const analysisDropZone = document.querySelector('.analysis-drop-zone');
        const analysisFileInput = document.getElementById('analysisFileInput');
        if (analysisDropZone && analysisFileInput) {
            analysisDropZone.addEventListener('click', () => analysisFileInput.click());
            
            analysisDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                analysisDropZone.classList.add('dragover');
            });
            
            analysisDropZone.addEventListener('dragleave', () => {
                analysisDropZone.classList.remove('dragover');
            });
            
            analysisDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                analysisDropZone.classList.remove('dragover');
                this.handleAnalysisFiles(e.dataTransfer.files);
            });
            
            analysisFileInput.addEventListener('change', (e) => {
                this.handleAnalysisFiles(e.target.files);
            });
        }

        // Sidebar tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('active');
            
            // Populate current settings
            this.populateSettingsForm();
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('active');
            // Ensure modal is fully hidden
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.display = '';  // Reset to CSS default
            }, 300); // Wait for transition to complete
        }
        
        // Ensure the chat tab is visible after closing settings
        const chatTab = document.getElementById('chat-tab');
        if (chatTab && !chatTab.classList.contains('active')) {
            chatTab.classList.add('active');
        }
        
        // Re-focus the chat input
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            setTimeout(() => {
                chatInput.focus();
            }, 100);
        }
    }

    populateSettingsForm() {
        const elements = {
            'apiProvider': this.config.apiProvider,
            'apiKey': this.config.apiKey,
            'apiEndpoint': this.config.apiEndpoint,
            'apiModel': this.config.apiModel
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        // Trigger provider change to show/hide relevant fields
        this.onProviderChange(this.config.apiProvider);
    }

    async handleSaveSettings() {
        // Get values from form
        const newConfig = {
            apiProvider: document.getElementById('apiProvider')?.value || this.config.apiProvider,
            apiKey: document.getElementById('apiKey')?.value || this.config.apiKey,
            apiEndpoint: document.getElementById('apiEndpoint')?.value || this.config.apiEndpoint,
            apiModel: document.getElementById('apiModel')?.value || this.config.apiModel,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            autoAnalyze: this.config.autoAnalyze,
            streamResponses: this.config.streamResponses
        };

        this.config = { ...this.config, ...newConfig };
        await this.saveSettings();

        // Test connection
        const connected = await this.testConnection();
        
        if (connected) {
            this.closeSettings();
            this.addMessage('✅ Settings saved successfully! I\'m ready to help.', false);
        }
    }

    onProviderChange(provider) {
        const endpointGroup = document.getElementById('endpointGroup');
        const apiKeyGroup = document.getElementById('apiKeyGroup');
        const detectBtn = document.getElementById('detectLocalBtn');
        const refreshBtn = document.getElementById('refreshModelsBtn');
        const endpointHelp = document.getElementById('endpointHelp');
        const modelHelp = document.getElementById('modelHelp');
        const modelSelect = document.getElementById('apiModel');

        if (!modelSelect) return;

        // Clear model options
        modelSelect.innerHTML = '';

        // Hide/show API key field for local providers
        const localProviders = ['ollama', 'lmstudio', 'localai'];
        const isLocal = localProviders.includes(provider);
        
        if (apiKeyGroup) {
            apiKeyGroup.style.display = isLocal ? 'none' : 'block';
        }

        if (endpointGroup) {
            endpointGroup.style.display = isLocal ? 'block' : 'none';
        }

        if (detectBtn) {
            detectBtn.style.display = isLocal ? 'inline-block' : 'none';
        }

        if (refreshBtn) {
            refreshBtn.style.display = isLocal ? 'inline-block' : 'none';
        }

        // Configure based on provider
        switch(provider) {
            case 'openai':
                this.addModelOptions(['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo']);
                if (modelHelp) modelHelp.textContent = 'Choose the OpenAI model to use';
                break;
                
            case 'anthropic':
                this.addModelOptions(['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']);
                if (modelHelp) modelHelp.textContent = 'Choose the Anthropic Claude model to use';
                break;
                
            case 'google':
                this.addModelOptions(['gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-pro']);
                if (modelHelp) modelHelp.textContent = 'Choose the Google Gemini model to use';
                break;
                
            case 'ollama':
                const endpointInput = document.getElementById('apiEndpoint');
                if (endpointInput) endpointInput.value = 'http://localhost:11434';
                if (endpointHelp) endpointHelp.innerHTML = this.sanitizeHTML('🖥️ Ollama server URL. <a href="https://ollama.ai" target="_blank" style="color: #3B82F6;">Install Ollama</a> if not running.');
                this.addModelOptions(['llama2', 'mistral', 'codellama', 'llama2:13b', 'mistral:7b']);
                if (modelHelp) modelHelp.textContent = '🖥️ Available Ollama models (click Refresh to load installed models)';
                break;
                
            case 'lmstudio':
                const lmEndpointInput = document.getElementById('apiEndpoint');
                if (lmEndpointInput) lmEndpointInput.value = 'http://localhost:1234/v1';
                if (endpointHelp) endpointHelp.innerHTML = this.sanitizeHTML('🖥️ LM Studio server URL. <a href="https://lmstudio.ai" target="_blank" style="color: #3B82F6;">Download LM Studio</a> and start local server.');
                this.addModelOptions(['local-model']);
                if (modelHelp) modelHelp.textContent = '🖥️ LM Studio loaded model (start server first)';
                break;
                
            case 'localai':
                const localAIEndpointInput = document.getElementById('apiEndpoint');
                if (localAIEndpointInput) localAIEndpointInput.value = 'http://localhost:8080/v1';
                if (endpointHelp) endpointHelp.innerHTML = this.sanitizeHTML('🖥️ LocalAI server URL. <a href="https://localai.io" target="_blank" style="color: #3B82F6;">Setup LocalAI</a> for local inference.');
                this.addModelOptions(['gpt-3.5-turbo', 'gpt-4']);
                if (modelHelp) modelHelp.textContent = '🖥️ LocalAI compatible models';
                break;
                
            case 'custom':
                this.addModelOptions(['custom']);
                if (modelHelp) modelHelp.textContent = 'Custom model name';
                break;
        }
    }

    addModelOptions(models) {
        const modelSelect = document.getElementById('apiModel');
        if (!modelSelect) return;

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
    }

    async testConnection() {
        this.updateStatus('connecting');
        
        try {
            const response = await this.callAPI('Test connection');
            
            if (response) {
                this.updateStatus('connected');
                this.isConnected = true;
                
                const statusEl = document.getElementById('connectionStatus');
                if (statusEl) {
                    statusEl.textContent = 'Connected';
                    statusEl.style.color = '#48bb78';
                }
                
                return true;
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.updateStatus('disconnected');
            this.isConnected = false;
            
            const statusEl = document.getElementById('connectionStatus');
            if (statusEl) {
                statusEl.textContent = 'Connection Failed';
                statusEl.style.color = '#f56565';
            }
            
            alert('❌ Connection failed. Please check your settings.');
        }
        
        return false;
    }

    checkConnection() {
        const localProviders = ['ollama', 'lmstudio', 'localai'];
        if (this.config.apiKey || localProviders.includes(this.config.apiProvider)) {
            this.updateStatus('connected');
            this.isConnected = true;
        } else {
            this.updateStatus('disconnected');
            this.isConnected = false;
        }
    }

    updateStatus(status) {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        
        if (!dot || !text) return;

        dot.className = 'status-dot';
        
        switch(status) {
            case 'connected':
                dot.classList.add('connected');
                text.textContent = 'AI Ready';
                break;
            case 'connecting':
                dot.classList.add('connecting');
                text.textContent = 'Connecting...';
                break;
            case 'disconnected':
                dot.classList.add('disconnected');
                text.textContent = 'Not Connected';
                break;
        }
    }

    showWelcomeMessage() {
        // Don't show the welcome message bubble - we have the new welcome screen instead
        // The welcome screen will handle the initial user experience
        return;
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;

        // Hide welcome screen when sending first message
        const welcomeScreen = document.getElementById('newChatWelcome');
        if (welcomeScreen && !welcomeScreen.classList.contains('hidden')) {
            welcomeScreen.classList.add('hidden');
        }

        // Add user message
        this.addMessage(message, true);
        input.value = '';

        // Show typing indicator
        this.showTyping();

        try {
            // Check if API is configured
            const localProviders = ['ollama', 'lmstudio', 'localai'];
            const needsApiKey = !localProviders.includes(this.config.apiProvider) && !this.config.apiKey;
            const needsEndpoint = localProviders.includes(this.config.apiProvider) && !this.config.apiEndpoint;

            if (needsApiKey) {
                this.hideTyping();
                this.addMessage('Please configure your API settings first. Click the ⚙️ settings button to get started.', false);
                // Save conversation even for configuration messages
                await this.saveConversation();
                return;
            }

            if (needsEndpoint) {
                this.hideTyping();
                this.addMessage('Please configure your local LLM endpoint first. Click the ⚙️ settings button and set up your local service.', false);
                // Save conversation even for configuration messages
                await this.saveConversation();
                return;
            }

            // Call API
            const response = await this.callAPI(message);
            this.hideTyping();

            if (response) {
                this.addMessage(response, false);
                // Save conversation after getting response
                await this.saveConversation();
            }
        } catch (error) {
            this.hideTyping();
            this.addMessage('Sorry, I encountered an error. Please check your API settings and try again.', false);
            console.error('Send message error:', error);
            // Save conversation even on errors
            await this.saveConversation();
        }
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        // Create file info message
        const fileList = Array.from(files);
        let fileMessage = `📎 Uploaded ${fileList.length} file${fileList.length > 1 ? 's' : ''}:\n`;
        
        for (const file of fileList) {
            const fileSize = this.formatFileSize(file.size);
            fileMessage += `• ${file.name} (${fileSize})\n`;
            
            // Handle different file types
            if (file.type.startsWith('image/')) {
                // For images, show a preview
                await this.handleImageFile(file);
            } else if (file.type.startsWith('text/') || this.isTextFile(file.name)) {
                // For text files, read and display content
                await this.handleTextFile(file);
            } else {
                // For other files, just show info
                this.addMessage(`File: ${file.name}\nType: ${file.type || 'Unknown'}\nSize: ${fileSize}`, true);
            }
        }
    }

    async handleImageFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imgMessage = document.createElement('div');
            imgMessage.className = 'chat-message user';
            imgMessage.innerHTML = `
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <p>Uploaded image: ${file.name}</p>
                    <img src="${e.target.result}" style="max-width: 300px; max-height: 300px; border-radius: 8px; margin-top: 10px;">
                </div>
            `;
            
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.appendChild(imgMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        };
        
        reader.readAsDataURL(file);
    }

    async handleTextFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
            this.addMessage(`📄 ${file.name}:\n\`\`\`\n${preview}\n\`\`\``, true);
        };
        
        reader.readAsText(file);
    }

    isTextFile(filename) {
        const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.xml', '.yaml', '.yml', '.csv', '.log', '.py', '.java', '.cpp', '.c', '.h', '.hpp', '.sh', '.bat'];
        return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async callAPI(message) {
        const localProviders = ['ollama', 'lmstudio', 'localai'];
        if (!localProviders.includes(this.config.apiProvider) && !this.config.apiKey) {
            throw new Error('API key not configured');
        }

        // Add message to conversation history
        if (!this.conversationHistory) {
            this.conversationHistory = [];
        }
        this.conversationHistory.push({ role: 'user', content: message });

        // Use streaming if enabled
        if (this.config.streamResponses) {
            return await this.streamChat(message);
        } else {
            return await this.callAPINonStreaming(message);
        }
    }

    async callAPINonStreaming(message) {
        let endpoint, headers, body;

        switch(this.config.apiProvider) {
            case 'openai':
                endpoint = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    stream: false
                });
                break;

            case 'anthropic':
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    max_tokens: this.config.maxTokens,
                    system: 'You are Sentauri, an AI assistant helping with design systems and components.'
                });
                break;

            case 'ollama':
                endpoint = `${this.config.apiEndpoint}/api/generate`;
                headers = {
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    prompt: message,
                    stream: false,
                    options: {
                        temperature: this.config.temperature,
                        num_predict: this.config.maxTokens
                    }
                });
                break;

            case 'lmstudio':
            case 'localai':
                endpoint = `${this.config.apiEndpoint}/chat/completions`;
                headers = {
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    stream: false
                });
                break;

            case 'google':
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.apiModel}:generateContent?key=${this.config.apiKey}`;
                headers = {
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    contents: [{
                        parts: [{ text: message }]
                    }],
                    generationConfig: {
                        temperature: this.config.temperature,
                        maxOutputTokens: this.config.maxTokens
                    }
                });
                break;

            case 'custom':
                endpoint = this.config.apiEndpoint;
                headers = {
                    'Content-Type': 'application/json'
                };
                if (this.config.apiKey) {
                    headers['Authorization'] = `Bearer ${this.config.apiKey}`;
                }
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    stream: false
                });
                break;

            default:
                throw new Error('Unsupported API provider');
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: body
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const data = await response.json();
            let responseText;

            // Extract message based on provider
            switch(this.config.apiProvider) {
                case 'openai':
                case 'lmstudio':
                case 'localai':
                    responseText = data.choices[0].message.content;
                    break;
                case 'anthropic':
                    responseText = data.content[0].text;
                    break;
                case 'ollama':
                    responseText = data.response;
                    break;
                case 'google':
                    responseText = data.candidates[0].content.parts[0].text;
                    break;
                default:
                    responseText = data.message || data.response || data.choices?.[0]?.message?.content;
            }

            // Add assistant response to history
            this.conversationHistory.push({ role: 'assistant', content: responseText });
            
            // Save conversation
            await this.saveConversation();
            
            return responseText;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async streamChat(message) {
        let endpoint, headers, body;
        let responseText = '';
        let messageDiv = null;
        
        // Create abort controller for stopping stream
        this.abortController = new AbortController();
        
        // Show stop button, hide send button
        const stopBtn = document.getElementById('stopBtn');
        const sendBtn = document.getElementById('sendBtn');
        if (stopBtn) stopBtn.style.display = 'flex';
        if (sendBtn) sendBtn.style.display = 'none';

        switch(this.config.apiProvider) {
            case 'openai':
                endpoint = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    stream: true
                });
                break;

            case 'anthropic':
                endpoint = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'x-api-key': this.config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    max_tokens: this.config.maxTokens,
                    system: 'You are Sentauri, an AI assistant helping with design systems and components.',
                    stream: true
                });
                break;

            case 'ollama':
                endpoint = `${this.config.apiEndpoint}/api/generate`;
                headers = {
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    prompt: message,
                    stream: true,
                    options: {
                        temperature: this.config.temperature,
                        num_predict: this.config.maxTokens
                    }
                });
                break;

            case 'lmstudio':
            case 'localai':
                endpoint = `${this.config.apiEndpoint}/chat/completions`;
                headers = {
                    'Content-Type': 'application/json'
                };
                body = JSON.stringify({
                    model: this.config.apiModel,
                    messages: this.conversationHistory,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    stream: true
                });
                break;

            default:
                // Fall back to non-streaming for unsupported providers
                return await this.callAPINonStreaming(message);
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: body,
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} ${response.statusText}\n${errorText}`);
            }

            // Hide typing indicator and create message div for streaming
            this.hideTyping();
            messageDiv = this.createStreamingMessage();

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const json = JSON.parse(data);
                            let content = '';

                            switch(this.config.apiProvider) {
                                case 'openai':
                                case 'lmstudio':
                                case 'localai':
                                    content = json.choices?.[0]?.delta?.content || '';
                                    break;
                                case 'anthropic':
                                    content = json.delta?.text || '';
                                    break;
                                case 'ollama':
                                    content = json.response || '';
                                    break;
                            }

                            if (content) {
                                responseText += content;
                                this.updateStreamingMessage(messageDiv, responseText);
                            }
                        } catch (e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }

            // Add assistant response to history
            this.conversationHistory.push({ role: 'assistant', content: responseText });
            
            // Save conversation
            await this.saveConversation();
            
            // Hide stop button, show send button
            const stopBtn = document.getElementById('stopBtn');
            const sendBtn = document.getElementById('sendBtn');
            if (stopBtn) stopBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = 'flex';
            
            // Clear abort controller
            this.abortController = null;
            
            return responseText;
        } catch (error) {
            console.error('Streaming failed:', error);
            
            // Hide stop button, show send button
            const stopBtn = document.getElementById('stopBtn');
            const sendBtn = document.getElementById('sendBtn');
            if (stopBtn) stopBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = 'flex';
            
            // Clear abort controller
            this.abortController = null;
            
            // Fall back to non-streaming
            return await this.callAPINonStreaming(message);
        }
    }

    createStreamingMessage() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return null;

        const message = document.createElement('div');
        message.className = 'chat-message ai';
        message.innerHTML = `
            <div class="message-avatar">
                <div class="voice-orb">
                    <div class="orb-gradient">
                        <div class="eye eye-left"></div>
                        <div class="eye eye-right"></div>
                    </div>
                </div>
            </div>
            <div class="message-content" id="streaming-content"></div>
        `;

        messagesContainer.appendChild(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return message;
    }

    updateStreamingMessage(messageDiv, content) {
        if (!messageDiv) return;
        
        const contentDiv = messageDiv.querySelector('#streaming-content');
        if (contentDiv) {
            // Check if content contains markdown
            if (content.includes('```') || content.includes('#') || content.includes('**') || 
                content.includes('- ') || content.includes('1.') || content.includes('[')) {
                contentDiv.innerHTML = this.renderMarkdown(content);
                this.addCopyButtonsToCode();
            } else {
                contentDiv.textContent = content;
            }
            
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    addMessage(content, isUser = false, saveToHistory = true) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const message = document.createElement('div');
        message.className = `chat-message ${isUser ? 'user' : 'ai'}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (isUser) {
            avatar.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            `;
        } else {
            // Create voice orb avatar matching the main design
            avatar.innerHTML = `
                <div class="voice-orb">
                    <div class="orb-gradient">
                        <div class="eye eye-left"></div>
                        <div class="eye eye-right"></div>
                    </div>
                </div>
            `;
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Use markdown rendering for AI responses
        if (isUser) {
            // User messages are always safe text
            messageContent.textContent = content;
        } else {
            // For AI responses, check if it's markdown or HTML
            if (content.includes('```') || content.includes('#') || content.includes('**') || 
                content.includes('- ') || content.includes('1.') || content.includes('[')) {
                // This looks like markdown, render it
                messageContent.innerHTML = this.renderMarkdown(content);
                this.addCopyButtonsToCode();
            } else if (content.includes('<strong>') || content.includes('<br>') || content.includes('<a href=')) {
                // This looks like intentional HTML formatting (welcome message), render it safely
                messageContent.innerHTML = this.sanitizeHTML(content);
            } else {
                // Plain text response
                messageContent.textContent = content;
            }
        }

        // Create action toolbar
        const actionToolbar = document.createElement('div');
        actionToolbar.className = 'message-action-toolbar';
        actionToolbar.innerHTML = `
            <button class="action-btn branch-btn" title="Branch conversation" data-action="branch">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 3v12M18 9v12M9 21a3 3 0 11-6 0 3 3 0 016 0zM21 21a3 3 0 11-6 0 3 3 0 016 0zM9 3a3 3 0 11-6 0 3 3 0 016 0zM12 6h6"/>
                </svg>
            </button>
            <button class="action-btn copy-btn" title="Copy message" data-action="copy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
            </button>
            <button class="action-btn edit-btn" title="Edit message" data-action="edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="action-btn delete-btn" title="Delete message" data-action="delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;

        // Add event listeners to action buttons
        actionToolbar.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleMessageAction(action, message, content, isUser);
            });
        });

        message.appendChild(avatar);
        message.appendChild(messageContent);
        message.appendChild(actionToolbar);

        messagesContainer.appendChild(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (saveToHistory) {
            this.messages.push({ content, isUser, timestamp: new Date() });
        }
    }

    handleMessageAction(action, messageElement, content, isUser) {
        switch(action) {
            case 'branch':
                // Branch conversation - create a new conversation with this message as starting point
                this.branchConversation(content, isUser);
                break;
            
            case 'copy':
                // Copy message to clipboard
                this.copyToClipboard(content);
                break;
            
            case 'edit':
                // Edit message
                this.editMessage(messageElement, content, isUser);
                break;
            
            case 'delete':
                // Delete message
                this.deleteMessage(messageElement);
                break;
        }
    }

    branchConversation(content, isUser) {
        // Save current conversation
        this.saveConversation();
        
        // Create new conversation with this message as starting point
        this.startNewChat();
        
        // Add the branched message to the new conversation
        this.addMessage(content, isUser, true);
        
        // Show notification
        this.showNotification('Conversation branched successfully');
    }

    copyToClipboard(text) {
        // Remove HTML tags if present
        const plainText = text.replace(/<[^>]*>/g, '');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(plainText).then(() => {
                this.showNotification('Message copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy:', err);
                // Fallback method
                const textarea = document.createElement('textarea');
                textarea.value = plainText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showNotification('Message copied to clipboard');
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = plainText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification('Message copied to clipboard');
        }
    }

    editMessage(messageElement, originalContent, isUser) {
        const messageContent = messageElement.querySelector('.message-content');
        if (!messageContent) return;

        // Create edit interface
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'edit-textarea';
        textarea.value = originalContent.replace(/<[^>]*>/g, ''); // Remove HTML tags
        textarea.style.width = '100%';
        textarea.style.minHeight = '80px';
        textarea.style.padding = '8px';
        textarea.style.borderRadius = '8px';
        textarea.style.background = 'rgba(255, 255, 255, 0.1)';
        textarea.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        textarea.style.color = 'white';
        textarea.style.fontSize = '14px';
        textarea.style.resize = 'vertical';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '8px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';
        
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'edit-save-btn';
        saveBtn.style.padding = '6px 12px';
        saveBtn.style.borderRadius = '6px';
        saveBtn.style.background = '#10b981';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        saveBtn.style.cursor = 'pointer';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'edit-cancel-btn';
        cancelBtn.style.padding = '6px 12px';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        cancelBtn.style.cursor = 'pointer';
        
        buttonContainer.appendChild(saveBtn);
        buttonContainer.appendChild(cancelBtn);
        editContainer.appendChild(textarea);
        editContainer.appendChild(buttonContainer);
        
        // Replace content with edit interface
        const originalHTML = messageContent.innerHTML;
        messageContent.innerHTML = '';
        messageContent.appendChild(editContainer);
        
        // Focus and select text
        textarea.focus();
        textarea.select();
        
        // Save handler
        saveBtn.addEventListener('click', () => {
            const newContent = textarea.value.trim();
            if (newContent) {
                if (isUser) {
                    messageContent.textContent = newContent;
                } else {
                    messageContent.innerHTML = this.renderMarkdown(newContent);
                }
                
                // Update in conversation history
                const messageIndex = Array.from(messageElement.parentElement.children).indexOf(messageElement);
                if (this.messages[messageIndex]) {
                    this.messages[messageIndex].content = newContent;
                }
                
                this.showNotification('Message updated');
            }
        });
        
        // Cancel handler
        cancelBtn.addEventListener('click', () => {
            messageContent.innerHTML = originalHTML;
        });
        
        // Enter to save, Escape to cancel
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                saveBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });
    }

    deleteMessage(messageElement) {
        if (confirm('Are you sure you want to delete this message?')) {
            // Find message index
            const messageIndex = Array.from(messageElement.parentElement.children).indexOf(messageElement);
            
            // Remove from DOM with animation
            messageElement.style.transition = 'opacity 0.3s, transform 0.3s';
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                messageElement.remove();
                
                // Remove from conversation history
                if (this.messages[messageIndex]) {
                    this.messages.splice(messageIndex, 1);
                }
                
                this.showNotification('Message deleted');
            }, 300);
        }
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.background = 'rgba(0, 0, 0, 0.9)';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        notification.style.zIndex = '10000';
        notification.style.animation = 'slideIn 0.3s ease';
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    renderMarkdown(text) {
        // Convert markdown to HTML with syntax highlighting
        if (!window.marked || !window.DOMPurify) {
            return text; // Fallback to plain text if libraries not loaded
        }
        const html = window.marked.parse(text);
        const sanitized = window.DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 
                          'blockquote', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 
                          'h3', 'h4', 'h5', 'h6', 'hr', 'table', 'thead', 
                          'tbody', 'tr', 'td', 'th', 'span', 'div'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-language']
        });
        return sanitized;
    }

    sanitizeHTML(html) {
        // Simple HTML sanitization for welcome messages
        // Only allow safe tags and remove any dangerous attributes
        const allowedTags = ['strong', 'br', 'a'];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove any scripts or dangerous elements
        const scripts = tempDiv.querySelectorAll('script, object, embed, iframe');
        scripts.forEach(script => script.remove());
        
        // Clean up links to only allow safe URLs
        const links = tempDiv.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.startsWith('https://') || href.startsWith('http://'))) {
                // Keep safe URLs
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            } else {
                // Remove unsafe URLs
                link.removeAttribute('href');
            }
        });
        
        return tempDiv.innerHTML;
    }

    addCopyButtonsToCode() {
        // Add copy buttons to all code blocks
        setTimeout(() => {
            document.querySelectorAll('pre code').forEach(block => {
                if (block.parentElement.querySelector('.copy-button')) return;
                
                const button = document.createElement('button');
                button.className = 'copy-button';
                button.innerHTML = '📋 Copy';
                button.onclick = () => {
                    const text = block.textContent;
                    navigator.clipboard.writeText(text).then(() => {
                        button.innerHTML = '✅ Copied!';
                        setTimeout(() => {
                            button.innerHTML = '📋 Copy';
                        }, 2000);
                    });
                };
                
                block.parentElement.style.position = 'relative';
                block.parentElement.appendChild(button);
            });
            
            // Re-highlight code blocks
            if (window.Prism) {
                Prism.highlightAll();
            }
        }, 100);
    }

    showTyping() {
        const typing = document.createElement('div');
        typing.id = 'typing-indicator';
        typing.className = 'chat-message ai';
        typing.innerHTML = `
            <div class="message-avatar">
                <div class="voice-orb">
                    <div class="orb-gradient">
                        <div class="eye eye-left"></div>
                        <div class="eye eye-right"></div>
                    </div>
                </div>
            </div>
            <div class="message-content">
                <div class="loading">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.appendChild(typing);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        const fixedControls = document.querySelector('.fixed-controls');
        
        if (!sidebar) return;
        
        this.sidebarOpen = !this.sidebarOpen;
        
        if (this.sidebarOpen) {
            sidebar.classList.add('open');
            if (mainContent) mainContent.classList.add('sidebar-open');
            if (fixedControls) fixedControls.classList.add('sidebar-open');
        } else {
            sidebar.classList.remove('open');
            if (mainContent) mainContent.classList.remove('sidebar-open');
            if (fixedControls) fixedControls.classList.remove('sidebar-open');
        }
    }

    switchTab(tabName) {
        // If clicking on chat tab (New Convo), start a new chat
        if (tabName === 'chat') {
            this.startNewChat();
            return; // startNewChat will handle showing the welcome screen
        }

        // Update sidebar tab buttons
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.currentTab = tabName;
    }

    async startNewChat() {
        // Save current conversation if it has messages
        if (this.messages.length > 0) {
            await this.saveConversation();
        }
        
        // Clear the chat messages
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            this.messages = [];
        }
        
        // Reset conversation history
        this.conversationHistory = [
            { role: 'system', content: 'You are Sentauri, an AI assistant helping with design systems and components.' }
        ];
        this.currentConversationId = null;
        
        // Remove active state from all sidebar tabs including New Convo
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Also remove active state from any conversation items
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show the welcome screen explicitly
        const welcomeScreen = document.getElementById('newChatWelcome');
        if (welcomeScreen) {
            welcomeScreen.classList.remove('hidden');
        }
        
        // Also trigger the welcome screen if it exists
        if (window.welcomeScreen && window.welcomeScreen.showWelcome) {
            window.welcomeScreen.showWelcome();
        }
        
        // Focus on chat input
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.focus();
        }
    }

    async loadConversations() {
        try {
            if (this.isDesktop && window.electronAPI) {
                const saved = await window.electronAPI.getStoredConfig();
                if (saved.conversations) {
                    this.conversations = saved.conversations;
                }
            } else {
                const saved = localStorage.getItem('sentauriConversations');
                if (saved) {
                    this.conversations = JSON.parse(saved);
                }
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.conversations = [];
        }
    }

    async saveConversation() {
        try {
            if (this.messages.length === 0) return;
            
            const conversation = {
                id: this.currentConversationId || Date.now().toString(),
                timestamp: new Date().toISOString(),
                messages: this.messages,
                history: this.conversationHistory,
                title: this.messages[0]?.content?.substring(0, 50) || 'New conversation'
            };
            
            // Update or add conversation
            const index = this.conversations.findIndex(c => c.id === conversation.id);
            if (index >= 0) {
                this.conversations[index] = conversation;
            } else {
                this.conversations.unshift(conversation);
                this.currentConversationId = conversation.id;
            }
            
            // Limit to 100 conversations
            if (this.conversations.length > 100) {
                this.conversations = this.conversations.slice(0, 100);
            }
            
            // Save to storage
            if (this.isDesktop && window.electronAPI) {
                const config = await window.electronAPI.getStoredConfig();
                config.conversations = this.conversations;
                await window.electronAPI.setStoredConfig(config);
            } else {
                localStorage.setItem('sentauriConversations', JSON.stringify(this.conversations));
            }
            
            // Update conversation list display
            this.displayConversationList();
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }
    }

    displayConversationList() {
        const container = document.getElementById('conversationItems');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.conversations.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 12px;">No conversations yet</div>';
            return;
        }
        
        this.conversations.forEach((conv, index) => {
            if (index > 10) return; // Show only last 10 conversations
            
            const item = document.createElement('div');
            item.className = 'conversation-item';
            if (conv.id === this.currentConversationId) {
                item.classList.add('active');
            }
            
            const title = document.createElement('div');
            title.className = 'conversation-title';
            title.textContent = conv.title || 'Untitled conversation';
            
            const date = document.createElement('div');
            date.className = 'conversation-date';
            const convDate = new Date(conv.timestamp);
            date.textContent = this.formatRelativeTime(convDate);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'conversation-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteConversation(conv.id);
            };
            
            item.appendChild(title);
            item.appendChild(date);
            item.appendChild(deleteBtn);
            
            item.onclick = () => this.loadConversation(conv.id);
            
            container.appendChild(item);
        });
    }
    
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }
    
    async deleteConversation(conversationId) {
        if (!confirm('Delete this conversation?')) return;
        
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        
        // Save updated list
        if (this.isDesktop && window.electronAPI) {
            const config = await window.electronAPI.getStoredConfig();
            config.conversations = this.conversations;
            await window.electronAPI.setStoredConfig(config);
        } else {
            localStorage.setItem('sentauriConversations', JSON.stringify(this.conversations));
        }
        
        // If deleting current conversation, start new
        if (conversationId === this.currentConversationId) {
            this.startNewChat();
        }
        
        this.displayConversationList();
    }

    async loadConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        // Hide welcome screen when loading a conversation
        const welcomeScreen = document.getElementById('newChatWelcome');
        if (welcomeScreen) {
            welcomeScreen.classList.add('hidden');
        }
        
        // Clear current chat
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Load conversation
        this.currentConversationId = conversation.id;
        this.messages = conversation.messages || [];
        this.conversationHistory = conversation.history || [
            { role: 'system', content: 'You are Sentauri, an AI assistant helping with design systems and components.' }
        ];
        
        // Display messages
        for (const msg of this.messages) {
            this.addMessage(msg.content, msg.isUser, false);
        }
    }

    // Export functionality
    async exportConversation(format = 'markdown') {
        if (this.messages.length === 0) {
            alert('No messages to export');
            return;
        }

        let content = '';
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `sentauri-chat-${timestamp}`;

        switch(format) {
            case 'markdown':
                content = this.exportAsMarkdown();
                this.downloadFile(`${filename}.md`, content, 'text/markdown');
                break;
            case 'json':
                content = JSON.stringify({
                    conversation: this.messages,
                    history: this.conversationHistory,
                    timestamp: new Date().toISOString()
                }, null, 2);
                this.downloadFile(`${filename}.json`, content, 'application/json');
                break;
            case 'txt':
                content = this.exportAsText();
                this.downloadFile(`${filename}.txt`, content, 'text/plain');
                break;
        }
    }

    exportAsMarkdown() {
        let markdown = `# Sentauri Chat Export\n\n`;
        markdown += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
        markdown += `---\n\n`;

        this.messages.forEach(msg => {
            if (msg.isUser) {
                markdown += `### 👤 User\n\n${msg.content}\n\n`;
            } else {
                markdown += `### 🤖 Sentauri\n\n${msg.content}\n\n`;
            }
            markdown += `---\n\n`;
        });

        return markdown;
    }

    exportAsText() {
        let text = 'Sentauri Chat Export\n';
        text += `Date: ${new Date().toLocaleDateString()}\n\n`;
        text += '='.repeat(50) + '\n\n';

        this.messages.forEach(msg => {
            if (msg.isUser) {
                text += `USER:\n${msg.content}\n\n`;
            } else {
                text += `SENTAURI:\n${msg.content}\n\n`;
            }
            text += '-'.repeat(50) + '\n\n';
        });

        return text;
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + K: New chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.startNewChat();
            }
            // Cmd/Ctrl + /: Focus search
            else if ((e.metaKey || e.ctrlKey) && e.key === '/') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
            }
            // Cmd/Ctrl + E: Export
            else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                this.showExportMenu();
            }
            // Cmd/Ctrl + ,: Settings
            else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
                e.preventDefault();
                this.openSettings();
            }
            // Escape: Stop streaming
            else if (e.key === 'Escape' && this.abortController) {
                this.stopStreaming();
            }
        });
    }

    showExportMenu() {
        const formats = ['Markdown', 'JSON', 'Text'];
        const selected = prompt(`Export format?\n${formats.join(', ')}`, 'Markdown');
        if (selected) {
            this.exportConversation(selected.toLowerCase());
        }
    }

    stopStreaming() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.hideTyping();
            this.addMessage('⏹ Generation stopped', false);
            
            // Hide stop button, show send button
            const stopBtn = document.getElementById('stopBtn');
            const sendBtn = document.getElementById('sendBtn');
            if (stopBtn) stopBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = 'flex';
        }
    }

    filterConversations(query) {
        const items = document.querySelectorAll('.conversation-item');
        const searchTerm = query.toLowerCase();
        
        items.forEach(item => {
            const title = item.querySelector('.conversation-title')?.textContent.toLowerCase() || '';
            if (title.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async handleAnalysisFiles(files) {
        if (!files || files.length === 0) return;
        
        const resultsDiv = document.getElementById('analysisResults');
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '<p>Analyzing files...</p>';
        
        const fileList = Array.from(files);
        let analysisHTML = '';
        
        for (const file of fileList) {
            const content = await this.readFileContent(file);
            const analysis = this.analyzeCode(file.name, content);
            
            analysisHTML += `
                <div class="analysis-item">
                    <h3>${file.name}</h3>
                    <p><strong>Type:</strong> ${analysis.type}</p>
                    <p><strong>Size:</strong> ${this.formatFileSize(file.size)}</p>
                    <p><strong>Lines:</strong> ${analysis.lines}</p>
                    <p><strong>Components:</strong> ${analysis.components}</p>
                    <p><strong>Functions:</strong> ${analysis.functions}</p>
                    <p><strong>Suggestions:</strong> ${analysis.suggestions}</p>
                </div>
            `;
        }
        
        resultsDiv.innerHTML = analysisHTML;
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    analyzeCode(filename, content) {
        const lines = content.split('\n').length;
        const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
        const componentMatches = content.match(/class\s+\w+\s+extends\s+(Component|React\.Component)|function\s+[A-Z]\w*\s*\(|const\s+[A-Z]\w*\s*=\s*\(/g) || [];
        
        let type = 'Unknown';
        if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) {
            type = 'React Component';
        } else if (filename.endsWith('.js') || filename.endsWith('.ts')) {
            type = 'JavaScript/TypeScript';
        } else if (filename.endsWith('.css')) {
            type = 'Stylesheet';
        } else if (filename.endsWith('.vue')) {
            type = 'Vue Component';
        }
        
        const suggestions = [];
        if (lines > 300) suggestions.push('Consider breaking into smaller modules');
        if (functionMatches.length > 20) suggestions.push('High complexity - consider refactoring');
        if (!content.includes('test') && !content.includes('spec')) suggestions.push('Add unit tests');
        
        return {
            type,
            lines,
            functions: functionMatches.length,
            components: componentMatches.length,
            suggestions: suggestions.length > 0 ? suggestions.join(', ') : 'Code looks good!'
        };
    }

    async detectLocalServices() {
        const provider = this.config.apiProvider || document.getElementById('apiProvider')?.value;
        const endpointInput = document.getElementById('apiEndpoint');
        
        if (!endpointInput) return;

        try {
            let detectedUrl = null;
            
            if (provider === 'ollama') {
                const ports = [11434, 11435];
                for (const port of ports) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const response = await fetch(`http://localhost:${port}/api/tags`, { 
                            method: 'GET',
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            detectedUrl = `http://localhost:${port}`;
                            break;
                        }
                    } catch (e) {
                        // Continue to next port
                    }
                }
            } else if (provider === 'lmstudio') {
                const ports = [1234, 1235];
                for (const port of ports) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const response = await fetch(`http://localhost:${port}/v1/models`, {
                            method: 'GET',
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            detectedUrl = `http://localhost:${port}/v1`;
                            break;
                        }
                    } catch (e) {
                        // Continue to next port
                    }
                }
            } else if (provider === 'localai') {
                const ports = [8080, 8081];
                for (const port of ports) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);
                        const response = await fetch(`http://localhost:${port}/v1/models`, {
                            method: 'GET',
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            detectedUrl = `http://localhost:${port}/v1`;
                            break;
                        }
                    } catch (e) {
                        // Continue to next port
                    }
                }
            }
            
            if (detectedUrl) {
                endpointInput.value = detectedUrl;
                alert(`✅ Detected ${provider} service at ${detectedUrl}`);
                // Auto-refresh models after detection
                this.refreshLocalModels();
            } else {
                alert(`❌ Could not detect ${provider} service. Make sure it's running and try manually entering the URL.`);
            }
        } catch (error) {
            console.error('Detection failed:', error);
            alert(`❌ Detection failed. Make sure ${provider} is running.`);
        }
    }

    async refreshLocalModels() {
        const provider = this.config.apiProvider || document.getElementById('apiProvider')?.value;
        const endpoint = document.getElementById('apiEndpoint')?.value;
        const modelSelect = document.getElementById('apiModel');
        
        if (!endpoint || !modelSelect) {
            alert('Please enter an endpoint URL first');
            return;
        }
        
        try {
            let modelsUrl;
            
            if (provider === 'ollama') {
                modelsUrl = `${endpoint}/api/tags`;
            } else if (provider === 'lmstudio' || provider === 'localai') {
                modelsUrl = `${endpoint}/models`;
            } else {
                alert('Model refresh not supported for this provider');
                return;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(modelsUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            let models = [];
            
            if (provider === 'ollama') {
                models = data.models?.map(m => m.name) || [];
            } else if (provider === 'lmstudio' || provider === 'localai') {
                models = data.data?.map(m => m.id) || [];
            }
            
            if (models.length > 0) {
                // Clear and populate model options
                modelSelect.innerHTML = '';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    modelSelect.appendChild(option);
                });
                alert(`✅ Found ${models.length} models`);
            } else {
                alert('❌ No models found. Make sure you have models installed.');
            }
        } catch (error) {
            console.error('Model refresh failed:', error);
            alert(`❌ Failed to fetch models: ${error.message}`);
        }
    }
}

// Initialize the desktop app
document.addEventListener('DOMContentLoaded', () => {
    window.sentauriApp = new SentauriDesktop();
});

// Export for global access
window.SentauriDesktop = SentauriDesktop;