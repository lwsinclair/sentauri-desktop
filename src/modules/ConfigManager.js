/**
 * Configuration Manager Module
 * Handles all configuration-related operations
 */

class ConfigManager {
    constructor() {
        this.defaultConfig = {
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
        
        this.config = { ...this.defaultConfig };
        this.isDesktop = window.electronAPI?.isDesktop || false;
    }

    async loadSettings() {
        try {
            if (this.isDesktop && window.electronAPI) {
                const savedConfig = await window.electronAPI.getStoredConfig();
                this.config = { ...this.config, ...savedConfig };
                
                // Load API key from secure storage
                const apiKey = await window.electronAPI.getApiKey();
                if (apiKey) {
                    this.config.apiKey = apiKey;
                }
            } else {
                // Web fallback - load from localStorage
                const savedConfig = localStorage.getItem('sentauri-config');
                if (savedConfig) {
                    this.config = { ...this.config, ...JSON.parse(savedConfig) };
                }
            }
            
            // Apply theme
            this.applyTheme(this.config.theme);
            
            return this.config;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.config;
        }
    }

    async saveSettings() {
        try {
            if (this.isDesktop && window.electronAPI) {
                // Save config (excluding API key)
                const configToSave = { ...this.config };
                delete configToSave.apiKey;
                await window.electronAPI.saveConfig(configToSave);
                
                // Save API key separately in secure storage
                if (this.config.apiKey) {
                    await window.electronAPI.saveApiKey(this.config.apiKey);
                }
            } else {
                // Web fallback
                localStorage.setItem('sentauri-config', JSON.stringify(this.config));
            }
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        
        // Apply theme immediately if changed
        if (updates.theme) {
            this.applyTheme(updates.theme);
        }
        
        return this.config;
    }

    getConfig() {
        return { ...this.config };
    }

    getSetting(key) {
        return this.config[key];
    }

    setSetting(key, value) {
        this.config[key] = value;
        return this.config[key];
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update theme-color meta tag for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1e1e2e' : '#ffffff');
        }
    }

    resetToDefaults() {
        this.config = { ...this.defaultConfig };
        this.applyTheme(this.config.theme);
        return this.config;
    }

    validateApiKey() {
        return this.config.apiKey && this.config.apiKey.trim().length > 0;
    }

    getProviderSettings() {
        const provider = this.config.apiProvider;
        return {
            provider,
            apiKey: this.config.apiKey,
            endpoint: this.config.apiEndpoint,
            model: this.config.apiModel,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            stream: this.config.streamResponses
        };
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}