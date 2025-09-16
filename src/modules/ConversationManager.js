/**
 * Conversation Manager Module
 * Handles conversation history, storage, and retrieval
 */

class ConversationManager {
    constructor(isDesktop = false) {
        this.conversations = [];
        this.currentConversationId = null;
        this.conversationHistory = [];
        this.messages = [];
        this.isDesktop = isDesktop;
        
        // Initialize with system message
        this.resetConversationHistory();
    }

    resetConversationHistory() {
        this.conversationHistory = [
            { 
                role: 'system', 
                content: 'You are Sentauri, an AI assistant helping with design systems and components.' 
            }
        ];
    }

    async loadConversations() {
        try {
            if (this.isDesktop && window.electronAPI) {
                this.conversations = await window.electronAPI.getConversations() || [];
            } else {
                // Web fallback
                const saved = localStorage.getItem('sentauri-conversations');
                this.conversations = saved ? JSON.parse(saved) : [];
            }
            
            // Sort by last updated
            this.conversations.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );
            
            return this.conversations;
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.conversations = [];
            return this.conversations;
        }
    }

    async saveConversations() {
        try {
            if (this.isDesktop && window.electronAPI) {
                await window.electronAPI.saveConversations(this.conversations);
            } else {
                // Web fallback
                localStorage.setItem('sentauri-conversations', 
                    JSON.stringify(this.conversations));
            }
            return true;
        } catch (error) {
            console.error('Failed to save conversations:', error);
            return false;
        }
    }

    createNewConversation(title = null) {
        const now = new Date();
        const conversation = {
            id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: title || `New Chat ${now.toLocaleTimeString()}`,
            messages: [],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            metadata: {
                messageCount: 0,
                lastModel: null,
                tags: []
            }
        };
        
        this.conversations.unshift(conversation);
        this.currentConversationId = conversation.id;
        this.messages = [];
        this.resetConversationHistory();
        
        return conversation;
    }

    loadConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            this.currentConversationId = conversationId;
            this.messages = [...conversation.messages];
            
            // Rebuild conversation history for API
            this.resetConversationHistory();
            this.messages.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    this.conversationHistory.push({
                        role: msg.role,
                        content: msg.content
                    });
                }
            });
            
            return conversation;
        }
        return null;
    }

    addMessage(role, content, metadata = {}) {
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role,
            content,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        
        this.messages.push(message);
        
        // Add to conversation history for API
        if (role === 'user' || role === 'assistant') {
            this.conversationHistory.push({ role, content });
        }
        
        // Update current conversation
        if (this.currentConversationId) {
            this.updateCurrentConversation();
        }
        
        return message;
    }

    updateCurrentConversation() {
        const conversation = this.conversations.find(
            c => c.id === this.currentConversationId
        );
        
        if (conversation) {
            conversation.messages = [...this.messages];
            conversation.updatedAt = new Date().toISOString();
            conversation.metadata.messageCount = this.messages.length;
            
            // Auto-generate title from first user message if needed
            if (conversation.title.startsWith('New Chat') && this.messages.length > 0) {
                const firstUserMessage = this.messages.find(m => m.role === 'user');
                if (firstUserMessage) {
                    conversation.title = this.generateTitle(firstUserMessage.content);
                }
            }
            
            // Re-sort conversations
            this.conversations.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );
            
            this.saveConversations();
        }
    }

    generateTitle(content) {
        // Generate a title from the first message
        const maxLength = 50;
        let title = content.replace(/\n/g, ' ').trim();
        
        if (title.length > maxLength) {
            title = title.substring(0, maxLength) + '...';
        }
        
        return title;
    }

    deleteConversation(conversationId) {
        const index = this.conversations.findIndex(c => c.id === conversationId);
        if (index !== -1) {
            this.conversations.splice(index, 1);
            
            // If deleting current conversation, clear it
            if (this.currentConversationId === conversationId) {
                this.currentConversationId = null;
                this.messages = [];
                this.resetConversationHistory();
            }
            
            this.saveConversations();
            return true;
        }
        return false;
    }

    renameConversation(conversationId, newTitle) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.title = newTitle;
            conversation.updatedAt = new Date().toISOString();
            this.saveConversations();
            return true;
        }
        return false;
    }

    searchConversations(query) {
        const searchTerm = query.toLowerCase();
        return this.conversations.filter(conv => {
            // Search in title
            if (conv.title.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Search in messages
            return conv.messages.some(msg => 
                msg.content.toLowerCase().includes(searchTerm)
            );
        });
    }

    exportConversation(conversationId, format = 'json') {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) return null;
        
        switch (format) {
            case 'json':
                return JSON.stringify(conversation, null, 2);
                
            case 'markdown':
                let md = `# ${conversation.title}\n\n`;
                md += `*Created: ${new Date(conversation.createdAt).toLocaleString()}*\n\n`;
                
                conversation.messages.forEach(msg => {
                    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
                    md += `## ${role}\n\n${msg.content}\n\n---\n\n`;
                });
                
                return md;
                
            case 'text':
                let text = `${conversation.title}\n${'='.repeat(conversation.title.length)}\n\n`;
                
                conversation.messages.forEach(msg => {
                    const role = msg.role.toUpperCase();
                    text += `[${role}]\n${msg.content}\n\n`;
                });
                
                return text;
                
            default:
                return null;
        }
    }

    getConversationStats() {
        const totalMessages = this.conversations.reduce(
            (sum, conv) => sum + conv.messages.length, 0
        );
        
        return {
            totalConversations: this.conversations.length,
            totalMessages,
            averageMessagesPerConversation: 
                this.conversations.length > 0 
                    ? (totalMessages / this.conversations.length).toFixed(1) 
                    : 0
        };
    }

    getCurrentMessages() {
        return [...this.messages];
    }

    getConversationHistory() {
        return [...this.conversationHistory];
    }

    clearCurrentConversation() {
        this.messages = [];
        this.resetConversationHistory();
        
        if (this.currentConversationId) {
            this.updateCurrentConversation();
        }
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationManager;
}