/**
 * MCP Integration for Sentauri App
 * Frontend integration for MCP servers
 */

class MCPIntegration {
    constructor() {
        this.servers = [];
        this.activeServer = null;
        this.tools = [];
    }

    async init() {
        if (!window.electronAPI) {
            console.warn('MCP integration requires Electron environment');
            return;
        }

        await this.loadServers();
        this.setupUI();
    }

    async loadServers() {
        try {
            this.servers = await window.electronAPI.mcpListServers();
            this.renderServers();
        } catch (error) {
            console.error('Failed to load MCP servers:', error);
            this.showError('Failed to load MCP servers. Please check your configuration.');
        }
    }

    renderServers() {
        const serverList = document.getElementById('serverList');
        if (!serverList) return;

        if (this.servers.length === 0) {
            serverList.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 12px;">No MCP servers configured</p>';
            return;
        }

        serverList.innerHTML = this.servers.map(server => `
            <div class="mcp-server-item" data-server="${server.name}">
                <div class="mcp-server-info">
                    <div class="mcp-server-name">${server.name}</div>
                    <div class="mcp-server-description">${server.description || 'No description'}</div>
                </div>
                <div class="mcp-server-status">
                    <div class="mcp-status-dot ${server.status === 'running' ? 'running' : ''}"></div>
                    <button class="mcp-server-button ${server.status === 'running' ? 'stop' : ''}" 
                            onclick="mcpIntegration.toggleServer('${server.name}')">
                        ${server.status === 'running' ? 'Stop' : 'Start'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    async toggleServer(serverName) {
        const server = this.servers.find(s => s.name === serverName);
        if (!server) {
            this.showError(`Server ${serverName} not found`);
            return;
        }

        const button = document.querySelector(`[data-server="${serverName}"] .mcp-server-button`);
        if (button) {
            button.disabled = true;
            button.textContent = server.status === 'running' ? 'Stopping...' : 'Starting...';
        }

        try {
            if (server.status === 'running') {
                await window.electronAPI.mcpStopServer(serverName);
                server.status = 'stopped';
                this.showSuccess(`Server ${serverName} stopped successfully`);
            } else {
                const result = await window.electronAPI.mcpStartServer(serverName);
                if (result.success) {
                    server.status = 'running';
                    server.tools = result.tools;
                    this.activeServer = serverName;
                    this.tools = result.tools;
                    this.renderTools();
                    this.showSuccess(`Server ${serverName} started successfully`);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            }
            this.renderServers();
        } catch (error) {
            console.error(`Failed to toggle server ${serverName}:`, error);
            server.status = 'error';
            this.showError(`Failed to ${server.status === 'running' ? 'stop' : 'start'} server: ${error.message}`);
            this.renderServers();
        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }

    renderTools() {
        const toolList = document.getElementById('toolList');
        if (!toolList) return;

        if (this.tools.length === 0) {
            toolList.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 12px;">No tools available. Start a server to see available tools.</p>';
            return;
        }

        toolList.innerHTML = this.tools.map(tool => `
            <div class="mcp-tool-item" onclick="mcpIntegration.showToolDialog('${tool.name}')">
                <div class="mcp-tool-name">${tool.name}</div>
                <div class="mcp-tool-description">${tool.description}</div>
            </div>
        `).join('');
    }

    showToolDialog(toolName) {
        const tool = this.tools.find(t => t.name === toolName);
        if (!tool) return;

        // Create a simple dialog for tool input
        const params = {};
        const schema = tool.inputSchema;

        if (schema && schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
                const value = prompt(`${prop.description || key} (${prop.type}):`, prop.default || '');
                if (value !== null) {
                    // Convert to appropriate type
                    if (prop.type === 'number') {
                        params[key] = Number(value);
                    } else if (prop.type === 'boolean') {
                        params[key] = value.toLowerCase() === 'true';
                    } else if (prop.type === 'object') {
                        try {
                            params[key] = JSON.parse(value);
                        } catch {
                            params[key] = value;
                        }
                    } else {
                        params[key] = value;
                    }
                }
            }
        }

        this.executeTool(toolName, params);
    }

    async executeTool(toolName, params) {
        if (!this.activeServer) {
            this.showError('Please start a server first');
            return;
        }

        const outputDiv = document.getElementById('toolOutput');
        if (outputDiv) {
            outputDiv.innerHTML = '<div class="loading-spinner">Executing tool...</div>';
        }

        try {
            const result = await window.electronAPI.mcpCallTool({
                serverName: this.activeServer,
                toolName,
                args: params
            });

            if (result.success && result.result) {
                this.displayToolResult(result.result);
                this.showSuccess(`Tool ${toolName} executed successfully`);
            } else {
                throw new Error(result.error || 'Tool execution failed');
            }
        } catch (error) {
            console.error('Tool execution failed:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            if (outputDiv) {
                outputDiv.innerHTML = `
                    <div class="error-container">
                        <span style="color: #ef4444; font-weight: 600;">⚠️ Error</span>
                        <p style="color: rgba(255,255,255,0.8); margin-top: 8px;">${this.escapeHtml(errorMessage)}</p>
                    </div>
                `;
            }
            this.showError(`Tool execution failed: ${errorMessage}`);
        }
    }

    displayToolResult(result) {
        const outputDiv = document.getElementById('toolOutput');
        if (!outputDiv) return;

        if (result.content && Array.isArray(result.content)) {
            const content = result.content.map(item => {
                if (item.type === 'text') {
                    return item.text;
                }
                return JSON.stringify(item);
            }).join('\n');

            outputDiv.innerHTML = this.escapeHtml(content);
        } else {
            outputDiv.innerHTML = this.escapeHtml(JSON.stringify(result, null, 2));
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupUI() {
        // Add MCP button click handler to open modal
        const mcpBtn = document.getElementById('mcpBtn');
        const mcpModal = document.getElementById('mcpModal');
        const mcpCloseBtn = document.getElementById('mcpCloseBtn');
        
        if (mcpBtn) {
            mcpBtn.addEventListener('click', () => {
                mcpModal.style.display = 'block';
                this.loadServers();
            });
        }
        
        if (mcpCloseBtn) {
            mcpCloseBtn.addEventListener('click', () => {
                mcpModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === mcpModal) {
                mcpModal.style.display = 'none';
            }
        });
    }

    // Integration with main chat
    async useToolInChat(toolName, params) {
        const result = await this.executeTool(toolName, params);
        // You can integrate this with the main chat to show tool results
        return result;
    }

    // Notification methods
    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `mcp-notification mcp-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
}

// Create global instance
const mcpIntegration = new MCPIntegration();

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPIntegration;
}