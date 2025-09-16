const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, shell, nativeImage, safeStorage } = require('electron');
const path = require('path');
const MCPClient = require('./mcp-client');

// Set the app name and icon immediately
app.setName('Sentauri');

// Set dock icon immediately for macOS
if (process.platform === 'darwin' && app.dock) {
    const iconPath = path.join(__dirname, '../assets/icon.png');
    app.dock.setIcon(iconPath);
}

// Initialize MCP Client
const mcpClient = new MCPClient();

// Simple store using app.getPath for settings
const fs = require('fs');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// JSON Schema for settings validation
const settingsSchema = {
    type: 'object',
    properties: {
        windowBounds: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' }
            }
        },
        copilotConfig: {
            type: 'object',
            properties: {
                apiProvider: { type: 'string' },
                apiEndpoint: { type: 'string' },
                apiModel: { type: 'string' },
                maxTokens: { type: 'number' },
                temperature: { type: 'number' },
                autoAnalyze: { type: 'boolean' },
                streamResponses: { type: 'boolean' }
            }
        },
        hasShownHideNotification: { type: 'boolean' }
    }
};

// Validate JSON data against schema
function validateSettings(data) {
    // Basic validation - in production, use a proper JSON schema validator
    if (typeof data !== 'object' || data === null) {
        throw new Error('Settings must be an object');
    }
    return data;
}

const store = {
    get: (key, defaultValue) => {
        try {
            if (fs.existsSync(settingsPath)) {
                const rawData = fs.readFileSync(settingsPath, 'utf8');
                const data = JSON.parse(rawData);
                
                // Validate parsed data
                validateSettings(data);
                
                return data[key] !== undefined ? data[key] : defaultValue;
            }
        } catch (error) {
            console.log('Error reading settings:', error.message);
            // If settings are corrupted, backup and reset
            if (fs.existsSync(settingsPath)) {
                const backupPath = settingsPath + '.backup.' + Date.now();
                try {
                    fs.copyFileSync(settingsPath, backupPath);
                    console.log('Corrupted settings backed up to:', backupPath);
                } catch (backupError) {
                    console.log('Failed to backup corrupted settings:', backupError.message);
                }
            }
        }
        return defaultValue;
    },
    set: (key, value) => {
        try {
            let data = {};
            if (fs.existsSync(settingsPath)) {
                const rawData = fs.readFileSync(settingsPath, 'utf8');
                data = JSON.parse(rawData);
                validateSettings(data);
            }
            data[key] = value;
            
            // Validate before writing
            validateSettings(data);
            
            fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('Error writing settings:', error.message);
        }
    }
};

// Secure credential storage using Electron's safeStorage
const secureStore = {
    credentialsPath: path.join(app.getPath('userData'), 'credentials.json'),
    
    async get(key) {
        try {
            if (!safeStorage.isEncryptionAvailable()) {
                console.warn('⚠️ Encryption not available on this system. Credentials cannot be stored securely.');
                // Return null instead of throwing to prevent app crash
                return null;
            }
            
            if (!fs.existsSync(this.credentialsPath)) {
                return null;
            }
            
            const data = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
            if (!data[key]) {
                return null;
            }
            
            const encryptedBuffer = Buffer.from(data[key], 'base64');
            const decrypted = safeStorage.decryptString(encryptedBuffer);
            return decrypted;
        } catch (error) {
            console.log('Error reading secure credential:', error.message);
            return null;
        }
    },
    
    async set(key, value) {
        try {
            if (!safeStorage.isEncryptionAvailable()) {
                console.warn('⚠️ Encryption not available on this system. Credentials will not be stored.');
                // Don't store credentials if encryption is unavailable
                return false;
            }
            
            let data = {};
            if (fs.existsSync(this.credentialsPath)) {
                data = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
            }
            
            const encrypted = safeStorage.encryptString(value);
            data[key] = encrypted.toString('base64');
            
            fs.writeFileSync(this.credentialsPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.log('Error storing secure credential:', error.message);
            return false;
        }
    },
    
    async delete(key) {
        try {
            if (!fs.existsSync(this.credentialsPath)) {
                return true;
            }
            
            const data = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
            delete data[key];
            
            fs.writeFileSync(this.credentialsPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.log('Error deleting secure credential:', error.message);
            return false;
        }
    }
};

class SentauriApp {
    constructor() {
        this.mainWindow = null;
        this.tray = null;
        this.isQuitting = false;
        
        // App configuration
        this.config = {
            width: 400,
            height: 700,
            minWidth: 350,
            minHeight: 500,
            show: true,
            frame: true,
            resizable: true,
            alwaysOnTop: false,
            skipTaskbar: false,
            icon: path.join(__dirname, '../assets/icon.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            }
        };
    }

    async init() {
        console.log('🚀 Initializing Sentauri...');
        
        this.createWindow();
        this.setupMenu();
        this.setupEventListeners();
        
        // Load MCP servers
        this.loadMCPServers();
        
        // Optional features that might cause issues
        try {
            this.createTray();
        } catch (error) {
            console.log('Tray creation failed, continuing without tray:', error.message);
        }
        
        try {
            this.setupGlobalShortcuts();
        } catch (error) {
            console.log('Global shortcuts failed, continuing without shortcuts:', error.message);
        }
        
        // Set app name and icon
        try {
            // Set the app name for the dock
            app.setName('Sentauri');
            app.setAppUserModelId('com.sentauri.desktop');
            
            const iconPath = path.join(__dirname, '../assets/icon.png');
            if (fs.existsSync(iconPath)) {
                // For macOS dock icon
                if (process.platform === 'darwin') {
                    app.dock.setIcon(iconPath);
                }
                
                console.log('✅ App name and icon set successfully');
            }
        } catch (error) {
            console.log('App name/icon setting failed:', error.message);
        }

        console.log('🚀 Sentauri started');
    }

    createWindow() {
        // Load saved window state
        const savedBounds = store.get('windowBounds');
        if (savedBounds) {
            this.config.x = savedBounds.x;
            this.config.y = savedBounds.y;
            this.config.width = savedBounds.width;
            this.config.height = savedBounds.height;
        }

        // Explicitly set icon path - use different formats for different platforms
        let iconPath;
        if (process.platform === 'darwin') {
            // macOS prefers .icns but will accept .png
            iconPath = path.join(__dirname, '../assets/icon.icns');
            if (!fs.existsSync(iconPath)) {
                iconPath = path.join(__dirname, '../assets/icon.png');
            }
        } else if (process.platform === 'win32') {
            // Windows prefers .ico but will accept .png
            iconPath = path.join(__dirname, '../assets/icon.ico');
            if (!fs.existsSync(iconPath)) {
                iconPath = path.join(__dirname, '../assets/icon.png');
            }
        } else {
            // Linux uses .png
            iconPath = path.join(__dirname, '../assets/icon.png');
        }
        
        console.log('Icon path:', iconPath);
        
        // Create the browser window with the icon
        this.mainWindow = new BrowserWindow({
            ...this.config,
            icon: nativeImage.createFromPath(iconPath),
            title: 'Sentauri',
            titleBarStyle: 'hiddenInset',  // macOS: hide title bar but keep traffic lights
            frame: process.platform !== 'darwin',  // Windows/Linux: completely frameless
            transparent: false,  // Set to true if you want transparency
            vibrancy: 'dark',  // macOS: adds vibrancy effect
            visualEffectState: 'active'  // macOS: keeps vibrancy active
        });

        // Load the app
        this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

        // Handle window events with proper synchronization
        this.mainWindow.on('close', (event) => {
            console.log('🔄 Window close event, isQuitting:', this.isQuitting);
            
            // Use synchronous check to prevent race condition
            if (!this.isQuitting && this.mainWindow && !this.mainWindow.isDestroyed()) {
                console.log('🔄 Preventing close, hiding window instead');
                event.preventDefault();
                
                // Use setImmediate to ensure proper event loop handling
                setImmediate(() => {
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        this.mainWindow.hide();
                        
                        // Show notification on first hide
                        if (!store.get('hasShownHideNotification')) {
                            this.showNotification('Sentauri is still running in the background');
                            store.set('hasShownHideNotification', true);
                        }
                    }
                });
            } else {
                console.log('🔄 Allowing window to close');
            }
        });

        this.mainWindow.on('closed', () => {
            console.log('Main window closed');
            this.mainWindow = null;
        });

        this.mainWindow.on('ready-to-show', () => {
            console.log('Window ready to show');
        });

        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
            console.error('Failed to load page:', errorCode, errorDescription, validatedURL, isMainFrame);
        });

        this.mainWindow.webContents.on('crashed', (event, killed) => {
            console.error('Renderer process crashed:', killed);
        });

        this.mainWindow.webContents.on('did-finish-load', () => {
            console.log('✅ Page finished loading');
            // Force set window title after page loads
            this.mainWindow.setTitle('Sentauri');
        });

        this.mainWindow.webContents.on('dom-ready', () => {
            console.log('✅ DOM ready');
        });

        // Capture console logs from renderer process
        this.mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
            console.log(`[RENDERER ${level}] ${message} (${sourceId}:${line})`);
        });

        // Save window bounds when moved or resized
        this.mainWindow.on('resize', () => this.saveWindowBounds());
        this.mainWindow.on('move', () => this.saveWindowBounds());

        // Dev tools in development
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }

        // Handle external links with validation
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (this.isValidExternalUrl(url)) {
                shell.openExternal(url);
            } else {
                console.log('Blocked potentially unsafe URL:', url);
            }
            return { action: 'deny' };
        });
    }

    isValidExternalUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Allow only HTTPS and HTTP protocols
            if (!['https:', 'http:'].includes(urlObj.protocol)) {
                return false;
            }
            
            // Whitelist of allowed domains for external links
            const allowedDomains = [
                'ollama.ai',
                'lmstudio.ai', 
                'localai.io',
                'openai.com',
                'anthropic.com',
                'github.com',
                'docs.anthropic.com',
                'platform.openai.com'
            ];
            
            // Check if domain is in whitelist
            const hostname = urlObj.hostname.toLowerCase();
            return allowedDomains.some(domain => 
                hostname === domain || hostname.endsWith('.' + domain)
            );
            
        } catch (error) {
            return false;
        }
    }

    loadMCPServers() {
        try {
            const configPath = path.join(__dirname, '../mcp-config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                // Register each server with the MCP client
                for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
                    mcpClient.registerServer({
                        name,
                        ...serverConfig
                    });
                }
                
                console.log(`Loaded ${Object.keys(config.mcpServers).length} MCP servers`);
            }
        } catch (error) {
            console.error('Failed to load MCP servers:', error);
        }
    }

    createTray() {
        // Create tray icon - use Sentauri icon
        const trayIconPath = path.join(__dirname, '../assets/tray-icon.png');
        const regularIconPath = path.join(__dirname, '../assets/icon.png');
        
        // Check if icon exists, use regular icon as fallback
        try {
            let iconToUse;
            if (fs.existsSync(trayIconPath)) {
                iconToUse = nativeImage.createFromPath(trayIconPath);
            } else if (fs.existsSync(regularIconPath)) {
                iconToUse = nativeImage.createFromPath(regularIconPath);
            } else {
                // Create a simple template icon as last resort
                iconToUse = nativeImage.createEmpty();
            }
            
            // Resize icon for tray (16x16 or 22x22 for most systems)
            if (!iconToUse.isEmpty()) {
                iconToUse = iconToUse.resize({ width: 16, height: 16 });
            }
            
            this.tray = new Tray(iconToUse);
        } catch (error) {
            console.log('Tray creation failed:', error.message);
            return; // Skip tray creation if it fails
        }
        
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show Sentauri',
                click: () => this.showWindow()
            },
            {
                label: 'Toggle Always on Top',
                type: 'checkbox',
                checked: this.mainWindow?.isAlwaysOnTop() || false,
                click: () => this.toggleAlwaysOnTop()
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => {
                    this.showWindow();
                    this.mainWindow.webContents.send('open-settings');
                }
            },
            { type: 'separator' },
            {
                label: 'About',
                click: () => this.showAbout()
            },
            {
                label: 'Quit Sentauri',
                click: () => this.quit()
            }
        ]);

        this.tray.setContextMenu(contextMenu);
        this.tray.setToolTip('Sentauri - AI Design System Assistant');
        
        // Double click to show/hide
        this.tray.on('double-click', () => {
            this.toggleWindow();
        });
    }

    setupMenu() {
        const template = [
            {
                label: 'Sentauri',
                submenu: [
                    {
                        label: 'About Sentauri',
                        click: () => this.showAbout()
                    },
                    { type: 'separator' },
                    {
                        label: 'Preferences...',
                        accelerator: 'CmdOrCtrl+,',
                        click: () => {
                            this.mainWindow.webContents.send('open-settings');
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Hide Sentauri',
                        accelerator: 'CmdOrCtrl+H',
                        click: () => this.mainWindow.hide()
                    },
                    {
                        label: 'Quit Sentauri',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => this.quit()
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    {
                        label: 'Toggle Always on Top',
                        accelerator: 'CmdOrCtrl+T',
                        click: () => this.toggleAlwaysOnTop()
                    },
                    { type: 'separator' },
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' },
                    {
                        label: 'Show/Hide',
                        accelerator: 'CmdOrCtrl+Shift+A',
                        click: () => this.toggleWindow()
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    setupGlobalShortcuts() {
        // Global shortcut to show/hide the app
        globalShortcut.register('CmdOrCtrl+Shift+A', () => {
            this.toggleWindow();
        });

        // Quick AI shortcut
        globalShortcut.register('CmdOrCtrl+Shift+C', () => {
            this.showWindow();
            this.mainWindow.webContents.send('focus-input');
        });
    }

    setupEventListeners() {
        // IPC listeners
        ipcMain.handle('get-app-version', () => {
            return app.getVersion();
        });
        
        ipcMain.handle('get-stored-config', () => {
            return store.get('copilotConfig', {});
        });
        
        ipcMain.handle('set-stored-config', (event, config) => {
            store.set('copilotConfig', config);
            return true;
        });
        
        // Secure credential storage handlers with input validation
        ipcMain.handle('get-secure-credential', async (event, key) => {
            // Validate input
            if (typeof key !== 'string' || !key || key.length > 100) {
                throw new Error('Invalid credential key');
            }
            // Sanitize key to prevent path traversal
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
            return await secureStore.get(sanitizedKey);
        });
        
        ipcMain.handle('set-secure-credential', async (event, key, value) => {
            // Validate input
            if (typeof key !== 'string' || !key || key.length > 100 ||
                typeof value !== 'string' || value.length > 10000) {
                throw new Error('Invalid credential key or value');
            }
            // Sanitize key to prevent path traversal
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
            return await secureStore.set(sanitizedKey, value);
        });
        
        ipcMain.handle('delete-secure-credential', async (event, key) => {
            // Validate input
            if (typeof key !== 'string' || !key || key.length > 100) {
                throw new Error('Invalid credential key');
            }
            // Sanitize key to prevent path traversal
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
            return await secureStore.delete(sanitizedKey);
        });

        // MCP Server Management
        ipcMain.handle('mcp-list-servers', async () => {
            return mcpClient.getServers();
        });

        ipcMain.handle('mcp-start-server', async (event, serverName) => {
            // Validate server name
            if (typeof serverName !== 'string' || !serverName || serverName.length > 50) {
                return { success: false, error: 'Invalid server name' };
            }
            try {
                const tools = await mcpClient.startServer(serverName);
                return { success: true, tools };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('mcp-stop-server', async (event, serverName) => {
            mcpClient.stopServer(serverName);
            return { success: true };
        });

        ipcMain.handle('mcp-call-tool', async (event, { serverName, toolName, args }) => {
            // Validate inputs
            if (typeof serverName !== 'string' || !serverName || serverName.length > 50 ||
                typeof toolName !== 'string' || !toolName || toolName.length > 100) {
                return { success: false, error: 'Invalid server or tool name' };
            }
            // Validate args is an object
            if (args && (typeof args !== 'object' || Array.isArray(args))) {
                return { success: false, error: 'Invalid arguments' };
            }
            try {
                const result = await mcpClient.callTool(serverName, toolName, args);
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('mcp-list-tools', async (event, serverName) => {
            try {
                const tools = await mcpClient.listTools(serverName);
                return { success: true, tools };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        // App event listeners
        app.on('before-quit', () => {
            console.log('🔄 App before-quit event');
            this.isQuitting = true;
        });

        app.on('activate', () => {
            console.log('🔄 App activate event');
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            } else {
                this.showWindow();
            }
        });

        app.on('window-all-closed', () => {
            console.log('🔄 All windows closed event');
            if (process.platform !== 'darwin') {
                console.log('🔄 Quitting app (not macOS)');
                app.quit();
            } else {
                console.log('🔄 Keeping app alive (macOS)');
            }
        });

        app.on('will-quit', (event) => {
            console.log('🔄 App will-quit event');
            globalShortcut.unregisterAll();
        });

        // Add more debugging events
        app.on('quit', () => {
            console.log('🔄 App quit event');
        });

        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught exception:', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
        });
    }

    showWindow() {
        if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) {
                this.mainWindow.restore();
            }
            this.mainWindow.show();
            this.mainWindow.focus();
        }
    }

    hideWindow() {
        if (this.mainWindow) {
            this.mainWindow.hide();
        }
    }

    toggleWindow() {
        if (this.mainWindow) {
            if (this.mainWindow.isVisible()) {
                this.hideWindow();
            } else {
                this.showWindow();
            }
        }
    }

    toggleAlwaysOnTop() {
        if (this.mainWindow) {
            const isOnTop = this.mainWindow.isAlwaysOnTop();
            this.mainWindow.setAlwaysOnTop(!isOnTop);
            
            // Dispose old tray before creating new one to prevent memory leak
            if (this.tray) {
                this.tray.destroy();
                this.tray = null;
            }
            // Update tray menu
            this.createTray();
        }
    }

    saveWindowBounds() {
        if (this.mainWindow) {
            store.set('windowBounds', this.mainWindow.getBounds());
        }
    }

    showAbout() {
        const { dialog } = require('electron');
        dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'About Sentauri',
            message: 'Sentauri',
            detail: `Version: ${app.getVersion()}\\n\\nAI-powered design system assistant with local LLM support.\\n\\nBuilt with Electron and love for developers.`,
            buttons: ['OK']
        });
    }

    showNotification(message) {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
            new Notification({
                title: 'Sentauri',
                body: message,
                icon: path.join(__dirname, '../assets/icon.png')
            }).show();
        }
    }

    quit() {
        this.isQuitting = true;
        app.quit();
    }
}

// Force set app name before anything else
app.setName('Sentauri');
if (process.platform === 'darwin') {
    app.dock?.setIcon?.(path.join(__dirname, '../assets/icon.png'));
}

// Create the app instance
const sentauriApp = new SentauriApp();

// Initialize when Electron is ready
app.whenReady().then(() => {
    // Set app name again to ensure it sticks
    app.setName('Sentauri');
    
    // Set the dock icon again after app is ready (for macOS)
    if (process.platform === 'darwin' && app.dock) {
        const iconPath = path.join(__dirname, '../assets/icon.png');
        if (fs.existsSync(iconPath)) {
            const icon = nativeImage.createFromPath(iconPath);
            app.dock.setIcon(icon);
            console.log('✅ Dock icon set to Sentauri logo');
        }
    }
    
    sentauriApp.init().catch((error) => {
        console.error('💥 Failed to initialize Sentauri:', error);
    });
});

// Handle app events
app.on('ready', () => {
    console.log('✅ Electron app ready');
});

app.on('before-quit', () => {
    console.log('👋 Sentauri shutting down');
});