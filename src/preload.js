const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // Settings persistence
    getStoredConfig: () => ipcRenderer.invoke('get-stored-config'),
    setStoredConfig: (config) => ipcRenderer.invoke('set-stored-config', config),
    
    // Secure credential storage
    getSecureCredential: (key) => ipcRenderer.invoke('get-secure-credential', key),
    setSecureCredential: (key, value) => ipcRenderer.invoke('set-secure-credential', key, value),
    deleteSecureCredential: (key) => ipcRenderer.invoke('delete-secure-credential', key),
    
    // Event listeners
    onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
    onFocusInput: (callback) => ipcRenderer.on('focus-input', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Platform detection
    platform: process.platform,
    
    // Desktop-specific features
    isDesktop: true,
    
    // MCP Server Management
    mcpListServers: () => ipcRenderer.invoke('mcp-list-servers'),
    mcpStartServer: (serverName) => ipcRenderer.invoke('mcp-start-server', serverName),
    mcpStopServer: (serverName) => ipcRenderer.invoke('mcp-stop-server', serverName),
    mcpCallTool: (params) => ipcRenderer.invoke('mcp-call-tool', params),
    mcpListTools: (serverName) => ipcRenderer.invoke('mcp-list-tools', serverName)
});