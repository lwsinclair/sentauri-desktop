/**
 * AI Provider Module
 * Handles communication with different AI providers (OpenAI, Anthropic, Google, Local LLMs)
 */

class AIProvider {
    constructor(config) {
        this.config = config;
        this.abortController = null;
        this.providers = {
            openai: {
                name: 'OpenAI',
                models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                endpoint: 'https://api.openai.com/v1/chat/completions',
                headers: (apiKey) => ({
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                })
            },
            anthropic: {
                name: 'Anthropic Claude',
                models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
                endpoint: 'https://api.anthropic.com/v1/messages',
                headers: (apiKey) => ({
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                })
            },
            google: {
                name: 'Google Gemini',
                models: ['gemini-pro', 'gemini-pro-vision'],
                endpoint: (apiKey, model) => 
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                headers: () => ({
                    'Content-Type': 'application/json'
                })
            },
            ollama: {
                name: 'Ollama (Local)',
                models: [], // Dynamically loaded
                endpoint: 'http://localhost:11434/api/chat',
                headers: () => ({
                    'Content-Type': 'application/json'
                }),
                requiresApiKey: false
            },
            lmstudio: {
                name: 'LM Studio (Local)',
                models: [], // Dynamically loaded
                endpoint: 'http://localhost:1234/v1/chat/completions',
                headers: () => ({
                    'Content-Type': 'application/json'
                }),
                requiresApiKey: false
            },
            localai: {
                name: 'LocalAI',
                models: [], // Dynamically loaded
                endpoint: 'http://localhost:8080/v1/chat/completions',
                headers: () => ({
                    'Content-Type': 'application/json'
                }),
                requiresApiKey: false
            }
        };
    }

    async sendMessage(messages, options = {}) {
        const provider = this.config.apiProvider;
        const providerConfig = this.providers[provider];
        
        if (!providerConfig) {
            throw new Error(`Unknown provider: ${provider}`);
        }

        // Check API key if required
        if (providerConfig.requiresApiKey !== false && !this.config.apiKey) {
            throw new Error('API key is required for this provider');
        }

        // Create abort controller for cancellation
        this.abortController = new AbortController();

        try {
            let response;
            
            switch (provider) {
                case 'openai':
                case 'lmstudio':
                case 'localai':
                    response = await this.sendOpenAICompatible(messages, providerConfig, options);
                    break;
                case 'anthropic':
                    response = await this.sendAnthropic(messages, providerConfig, options);
                    break;
                case 'google':
                    response = await this.sendGoogle(messages, providerConfig, options);
                    break;
                case 'ollama':
                    response = await this.sendOllama(messages, providerConfig, options);
                    break;
                default:
                    throw new Error(`Provider ${provider} not implemented`);
            }
            
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request cancelled');
            }
            throw error;
        } finally {
            this.abortController = null;
        }
    }

    async sendOpenAICompatible(messages, providerConfig, options) {
        const endpoint = this.config.apiEndpoint || providerConfig.endpoint;
        const headers = providerConfig.headers(this.config.apiKey);
        
        const requestBody = {
            model: this.config.apiModel,
            messages: messages,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            stream: options.stream || this.config.streamResponses
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${error}`);
        }

        if (options.stream || this.config.streamResponses) {
            return this.handleStream(response, 'openai');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async sendAnthropic(messages, providerConfig, options) {
        const endpoint = this.config.apiEndpoint || providerConfig.endpoint;
        const headers = providerConfig.headers(this.config.apiKey);
        
        // Convert messages format for Anthropic
        const anthropicMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));

        const systemMessage = messages.find(m => m.role === 'system');
        
        const requestBody = {
            model: this.config.apiModel,
            messages: anthropicMessages,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            ...(systemMessage && { system: systemMessage.content })
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${error}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    async sendGoogle(messages, providerConfig, options) {
        const endpoint = providerConfig.endpoint(this.config.apiKey, this.config.apiModel);
        const headers = providerConfig.headers();
        
        // Convert messages format for Google
        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const requestBody = {
            contents,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${error}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    async sendOllama(messages, providerConfig, options) {
        const endpoint = this.config.apiEndpoint || providerConfig.endpoint;
        const headers = providerConfig.headers();
        
        const requestBody = {
            model: this.config.apiModel,
            messages: messages,
            stream: options.stream || this.config.streamResponses
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error: ${error}`);
        }

        if (options.stream || this.config.streamResponses) {
            return this.handleStream(response, 'ollama');
        }

        const data = await response.json();
        return data.message.content;
    }

    async handleStream(response, provider) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        return {
            async *[Symbol.asyncIterator]() {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        
                        let content = '';
                        
                        if (provider === 'openai' || provider === 'lmstudio') {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;
                                
                                try {
                                    const parsed = JSON.parse(data);
                                    content = parsed.choices[0]?.delta?.content || '';
                                } catch (e) {
                                    continue;
                                }
                            }
                        } else if (provider === 'ollama') {
                            try {
                                const parsed = JSON.parse(line);
                                content = parsed.message?.content || '';
                            } catch (e) {
                                continue;
                            }
                        }
                        
                        if (content) {
                            yield content;
                        }
                    }
                }
            }
        };
    }

    async testConnection() {
        try {
            const testMessage = [
                { role: 'user', content: 'Say "Connection successful" in 5 words or less.' }
            ];
            
            const response = await this.sendMessage(testMessage, { stream: false });
            return { success: true, message: response };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async detectLocalModels() {
        const provider = this.config.apiProvider;
        const providerConfig = this.providers[provider];
        
        if (!providerConfig || providerConfig.requiresApiKey !== false) {
            return [];
        }

        try {
            let models = [];
            
            switch (provider) {
                case 'ollama':
                    const ollamaResponse = await fetch('http://localhost:11434/api/tags');
                    if (ollamaResponse.ok) {
                        const data = await ollamaResponse.json();
                        models = data.models?.map(m => m.name) || [];
                    }
                    break;
                    
                case 'lmstudio':
                    const lmResponse = await fetch('http://localhost:1234/v1/models');
                    if (lmResponse.ok) {
                        const data = await lmResponse.json();
                        models = data.data?.map(m => m.id) || [];
                    }
                    break;
                    
                case 'localai':
                    const localResponse = await fetch('http://localhost:8080/v1/models');
                    if (localResponse.ok) {
                        const data = await localResponse.json();
                        models = data.data?.map(m => m.id) || [];
                    }
                    break;
            }
            
            return models;
        } catch (error) {
            console.error('Failed to detect local models:', error);
            return [];
        }
    }

    cancelRequest() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    isRequestActive() {
        return this.abortController !== null;
    }

    getProviderInfo(provider) {
        return this.providers[provider] || null;
    }

    getAllProviders() {
        return Object.keys(this.providers).map(key => ({
            id: key,
            ...this.providers[key]
        }));
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIProvider;
}