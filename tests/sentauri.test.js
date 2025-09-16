/**
 * Test Suite for Sentauri Desktop Application
 * Using Jest for unit and integration testing
 */

// ConfigManager Tests
describe('ConfigManager', () => {
    let configManager;

    beforeEach(() => {
        configManager = new ConfigManager();
    });

    test('should initialize with default config', () => {
        expect(configManager.config).toHaveProperty('apiProvider', 'openai');
        expect(configManager.config).toHaveProperty('temperature', 0.7);
        expect(configManager.config).toHaveProperty('maxTokens', 2000);
    });

    test('should update config correctly', () => {
        const updates = { apiProvider: 'anthropic', temperature: 0.9 };
        const updatedConfig = configManager.updateConfig(updates);
        
        expect(updatedConfig.apiProvider).toBe('anthropic');
        expect(updatedConfig.temperature).toBe(0.9);
        expect(updatedConfig.maxTokens).toBe(2000); // Unchanged
    });

    test('should validate API key', () => {
        expect(configManager.validateApiKey()).toBe(false);
        
        configManager.setSetting('apiKey', 'test-api-key');
        expect(configManager.validateApiKey()).toBe(true);
        
        configManager.setSetting('apiKey', '  ');
        expect(configManager.validateApiKey()).toBe(false);
    });

    test('should reset to defaults', () => {
        configManager.updateConfig({ temperature: 0.9, apiProvider: 'google' });
        configManager.resetToDefaults();
        
        expect(configManager.config.temperature).toBe(0.7);
        expect(configManager.config.apiProvider).toBe('openai');
    });

    test('should get provider settings', () => {
        configManager.updateConfig({
            apiProvider: 'openai',
            apiKey: 'test-key',
            apiModel: 'gpt-4',
            temperature: 0.8
        });

        const settings = configManager.getProviderSettings();
        
        expect(settings).toHaveProperty('provider', 'openai');
        expect(settings).toHaveProperty('apiKey', 'test-key');
        expect(settings).toHaveProperty('model', 'gpt-4');
        expect(settings).toHaveProperty('temperature', 0.8);
    });
});

// ConversationManager Tests
describe('ConversationManager', () => {
    let conversationManager;

    beforeEach(() => {
        conversationManager = new ConversationManager(false);
    });

    test('should create new conversation', () => {
        const conversation = conversationManager.createNewConversation('Test Chat');
        
        expect(conversation).toHaveProperty('id');
        expect(conversation.title).toBe('Test Chat');
        expect(conversation.messages).toHaveLength(0);
        expect(conversationManager.conversations).toHaveLength(1);
        expect(conversationManager.currentConversationId).toBe(conversation.id);
    });

    test('should add messages correctly', () => {
        conversationManager.createNewConversation();
        
        const userMessage = conversationManager.addMessage('user', 'Hello');
        const assistantMessage = conversationManager.addMessage('assistant', 'Hi there!');
        
        expect(conversationManager.messages).toHaveLength(2);
        expect(userMessage.role).toBe('user');
        expect(userMessage.content).toBe('Hello');
        expect(assistantMessage.role).toBe('assistant');
        expect(assistantMessage.content).toBe('Hi there!');
    });

    test('should generate title from first message', () => {
        const longMessage = 'This is a very long message that should be truncated when used as a title for the conversation';
        const title = conversationManager.generateTitle(longMessage);
        
        expect(title.length).toBeLessThanOrEqual(53); // 50 + '...'
        expect(title).toContain('This is a very long message');
    });

    test('should load conversation correctly', () => {
        const conv1 = conversationManager.createNewConversation('Chat 1');
        conversationManager.addMessage('user', 'Message 1');
        
        const conv2 = conversationManager.createNewConversation('Chat 2');
        conversationManager.addMessage('user', 'Message 2');
        
        conversationManager.loadConversation(conv1.id);
        
        expect(conversationManager.currentConversationId).toBe(conv1.id);
        expect(conversationManager.messages).toHaveLength(1);
        expect(conversationManager.messages[0].content).toBe('Message 1');
    });

    test('should delete conversation', () => {
        const conv1 = conversationManager.createNewConversation('Chat 1');
        const conv2 = conversationManager.createNewConversation('Chat 2');
        
        const deleted = conversationManager.deleteConversation(conv1.id);
        
        expect(deleted).toBe(true);
        expect(conversationManager.conversations).toHaveLength(1);
        expect(conversationManager.conversations[0].id).toBe(conv2.id);
    });

    test('should search conversations', () => {
        conversationManager.createNewConversation('JavaScript Tutorial');
        conversationManager.addMessage('user', 'Explain closures');
        
        conversationManager.createNewConversation('Python Guide');
        conversationManager.addMessage('user', 'List comprehensions');
        
        const results = conversationManager.searchConversations('javascript');
        
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('JavaScript Tutorial');
        
        const closureResults = conversationManager.searchConversations('closures');
        expect(closureResults).toHaveLength(1);
    });

    test('should export conversation in different formats', () => {
        const conv = conversationManager.createNewConversation('Export Test');
        conversationManager.addMessage('user', 'Hello');
        conversationManager.addMessage('assistant', 'Hi there!');
        
        const jsonExport = conversationManager.exportConversation(conv.id, 'json');
        const parsed = JSON.parse(jsonExport);
        expect(parsed.title).toBe('Export Test');
        expect(parsed.messages).toHaveLength(2);
        
        const markdownExport = conversationManager.exportConversation(conv.id, 'markdown');
        expect(markdownExport).toContain('# Export Test');
        expect(markdownExport).toContain('## User');
        expect(markdownExport).toContain('Hello');
        
        const textExport = conversationManager.exportConversation(conv.id, 'text');
        expect(textExport).toContain('[USER]');
        expect(textExport).toContain('[ASSISTANT]');
    });

    test('should calculate conversation statistics', () => {
        conversationManager.createNewConversation('Chat 1');
        conversationManager.addMessage('user', 'Message 1');
        conversationManager.addMessage('assistant', 'Response 1');
        
        conversationManager.createNewConversation('Chat 2');
        conversationManager.addMessage('user', 'Message 2');
        
        const stats = conversationManager.getConversationStats();
        
        expect(stats.totalConversations).toBe(2);
        expect(stats.totalMessages).toBe(3);
        expect(parseFloat(stats.averageMessagesPerConversation)).toBeCloseTo(1.5);
    });
});

// AIProvider Tests
describe('AIProvider', () => {
    let aiProvider;
    let config;

    beforeEach(() => {
        config = {
            apiProvider: 'openai',
            apiKey: 'test-key',
            apiModel: 'gpt-3.5-turbo',
            maxTokens: 1000,
            temperature: 0.7,
            streamResponses: false
        };
        aiProvider = new AIProvider(config);
    });

    test('should initialize with correct providers', () => {
        const providers = aiProvider.getAllProviders();
        
        expect(providers).toContainEqual(
            expect.objectContaining({ id: 'openai', name: 'OpenAI' })
        );
        expect(providers).toContainEqual(
            expect.objectContaining({ id: 'anthropic', name: 'Anthropic Claude' })
        );
        expect(providers).toContainEqual(
            expect.objectContaining({ id: 'ollama', name: 'Ollama (Local)' })
        );
    });

    test('should get provider info', () => {
        const openaiInfo = aiProvider.getProviderInfo('openai');
        
        expect(openaiInfo).toHaveProperty('name', 'OpenAI');
        expect(openaiInfo.models).toContain('gpt-4');
        expect(openaiInfo.models).toContain('gpt-3.5-turbo');
    });

    test('should handle request cancellation', () => {
        expect(aiProvider.isRequestActive()).toBe(false);
        
        // Simulate starting a request
        aiProvider.abortController = new AbortController();
        expect(aiProvider.isRequestActive()).toBe(true);
        
        aiProvider.cancelRequest();
        expect(aiProvider.isRequestActive()).toBe(false);
    });

    test('should validate provider requirements', async () => {
        // Test with missing API key
        const noKeyConfig = { ...config, apiKey: '' };
        const noKeyProvider = new AIProvider(noKeyConfig);
        
        await expect(
            noKeyProvider.sendMessage([{ role: 'user', content: 'test' }])
        ).rejects.toThrow('API key is required');
        
        // Test with local provider (no key required)
        const localConfig = { ...config, apiProvider: 'ollama', apiKey: '' };
        const localProvider = new AIProvider(localConfig);
        
        // This should not throw for missing API key
        // (will fail for other reasons in test environment)
        await expect(
            localProvider.sendMessage([{ role: 'user', content: 'test' }])
        ).rejects.not.toThrow('API key is required');
    });
});

// UIManager Tests
describe('UIManager', () => {
    let uiManager;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="chat-container"></div>
            <div id="messages-container"></div>
            <div id="input-container">
                <textarea id="message-input"></textarea>
                <button id="send-button">Send</button>
            </div>
            <div id="sidebar">
                <button id="sidebar-toggle"></button>
                <div id="conversation-list"></div>
            </div>
            <div id="settings-modal">
                <form id="settings-form"></form>
            </div>
            <div id="status-indicator"></div>
            <div id="connection-status"></div>
        `;
        
        uiManager = new UIManager();
    });

    test('should initialize with DOM elements', () => {
        expect(uiManager.elements.chatContainer).toBeDefined();
        expect(uiManager.elements.messageInput).toBeDefined();
        expect(uiManager.elements.sidebar).toBeDefined();
    });

    test('should add messages to DOM', () => {
        const messageElement = uiManager.addMessage('user', 'Test message');
        
        expect(messageElement).toBeDefined();
        expect(messageElement.classList.contains('message')).toBe(true);
        expect(messageElement.textContent).toContain('Test message');
    });

    test('should toggle sidebar', () => {
        const sidebar = uiManager.elements.sidebar;
        
        expect(sidebar.classList.contains('collapsed')).toBe(false);
        
        uiManager.toggleSidebar();
        expect(sidebar.classList.contains('collapsed')).toBe(true);
        
        uiManager.toggleSidebar();
        expect(sidebar.classList.contains('collapsed')).toBe(false);
    });

    test('should update connection status', () => {
        uiManager.updateConnectionStatus(true, 'Connected');
        
        expect(uiManager.elements.statusIndicator.classList.contains('connected')).toBe(true);
        expect(uiManager.elements.connectionStatus.textContent).toBe('Connected');
        
        uiManager.updateConnectionStatus(false, 'Disconnected');
        
        expect(uiManager.elements.statusIndicator.classList.contains('disconnected')).toBe(true);
        expect(uiManager.elements.connectionStatus.textContent).toBe('Disconnected');
    });

    test('should escape HTML', () => {
        const dangerous = '<script>alert("XSS")</script>';
        const escaped = uiManager.escapeHtml(dangerous);
        
        expect(escaped).not.toContain('<script>');
        expect(escaped).toContain('&lt;script&gt;');
    });

    test('should format dates correctly', () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        expect(uiManager.formatDate(today)).toBe('Today');
        expect(uiManager.formatDate(yesterday)).toBe('Yesterday');
        expect(uiManager.formatDate(weekAgo)).toBe('7 days ago');
    });

    test('should handle input state', () => {
        const input = uiManager.elements.messageInput;
        const button = uiManager.elements.sendButton;
        
        uiManager.setInputEnabled(false);
        expect(input.disabled).toBe(true);
        expect(button.disabled).toBe(true);
        
        uiManager.setInputEnabled(true);
        expect(input.disabled).toBe(false);
        expect(button.disabled).toBe(false);
    });
});

// Integration Tests
describe('Sentauri Integration', () => {
    test('should handle complete conversation flow', async () => {
        const configManager = new ConfigManager();
        const conversationManager = new ConversationManager(false);
        const aiProvider = new AIProvider(configManager.getConfig());
        
        // Create conversation
        const conversation = conversationManager.createNewConversation('Integration Test');
        
        // Add user message
        conversationManager.addMessage('user', 'What is JavaScript?');
        
        // Verify conversation history
        const history = conversationManager.getConversationHistory();
        expect(history).toHaveLength(2); // System + user message
        expect(history[1].content).toBe('What is JavaScript?');
        
        // Simulate AI response
        conversationManager.addMessage('assistant', 'JavaScript is a programming language...');
        
        // Verify complete conversation
        expect(conversationManager.messages).toHaveLength(2);
        expect(conversationManager.conversations[0].messages).toHaveLength(2);
    });
});

// Export for Jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConfigManager: require('../src/modules/ConfigManager'),
        ConversationManager: require('../src/modules/ConversationManager'),
        AIProvider: require('../src/modules/AIProvider'),
        UIManager: require('../src/modules/UIManager')
    };
}