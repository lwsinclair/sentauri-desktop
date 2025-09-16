/**
 * MCP Client for Sentauri Desktop App
 * Manages connections to MCP servers and tool execution
 */

const { spawn } = require('child_process');
const EventEmitter = require('events');

class MCPClient extends EventEmitter {
    constructor() {
        super();
        this.servers = new Map();
        this.activeConnections = new Map();
    }

    /**
     * Register an MCP server configuration
     */
    registerServer(config) {
        const {
            name,
            command,
            args = [],
            env = {},
            description = '',
            autoStart = false
        } = config;

        this.servers.set(name, {
            name,
            command,
            args,
            env,
            description,
            autoStart,
            status: 'stopped'
        });

        if (autoStart) {
            this.startServer(name);
        }
    }

    /**
     * Start an MCP server
     */
    async startServer(name) {
        const server = this.servers.get(name);
        if (!server) {
            throw new Error(`Server ${name} not found`);
        }

        if (server.status === 'running') {
            console.log(`Server ${name} is already running`);
            return;
        }

        try {
            const childProcess = spawn(server.command, server.args, {
                env: { ...process.env, ...server.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const connection = {
                process: childProcess,
                requestId: 0,
                pendingRequests: new Map(),
                buffer: ''
            };

            // Handle stdout (JSON-RPC responses)
            childProcess.stdout.on('data', (data) => {
                connection.buffer += data.toString();
                this.processBuffer(name, connection);
            });

            // Handle stderr (logging)
            childProcess.stderr.on('data', (data) => {
                console.error(`[${name}]`, data.toString());
            });

            // Handle process exit
            childProcess.on('exit', (code) => {
                console.log(`Server ${name} exited with code ${code}`);
                server.status = 'stopped';
                this.activeConnections.delete(name);
                this.emit('server-stopped', { name, code });
            });

            this.activeConnections.set(name, connection);
            server.status = 'running';

            // Initialize the server
            await this.initialize(name);
            
            // Get available tools
            const tools = await this.listTools(name);
            server.tools = tools;

            this.emit('server-started', { name, tools });
            
            return tools;
        } catch (error) {
            server.status = 'error';
            throw new Error(`Failed to start server ${name}: ${error.message}`);
        }
    }

    /**
     * Stop an MCP server
     */
    stopServer(name) {
        const connection = this.activeConnections.get(name);
        if (!connection) {
            console.log(`Server ${name} is not running`);
            return;
        }

        connection.process.kill();
        this.activeConnections.delete(name);
        
        const server = this.servers.get(name);
        if (server) {
            server.status = 'stopped';
        }
    }

    /**
     * Process buffered data from server
     */
    processBuffer(serverName, connection) {
        // Prevent buffer overflow - limit buffer size to 1MB
        const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB
        if (connection.buffer.length > MAX_BUFFER_SIZE) {
            console.error(`Buffer overflow detected for ${serverName}, clearing buffer`);
            connection.buffer = '';
            this.emit('server-error', { 
                name: serverName, 
                error: 'Buffer overflow - server sending too much data' 
            });
            return;
        }

        const lines = connection.buffer.split('\n');
        connection.buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const message = JSON.parse(line);
                    this.handleMessage(serverName, connection, message);
                } catch (error) {
                    console.error(`Failed to parse message from ${serverName}:`, line);
                    // Emit error event for monitoring
                    this.emit('parse-error', {
                        name: serverName,
                        error: error.message,
                        line: line.substring(0, 100) // Log first 100 chars only
                    });
                }
            }
        }
    }

    /**
     * Handle JSON-RPC message from server
     */
    handleMessage(serverName, connection, message) {
        if (message.id !== undefined) {
            // Response to a request
            const pending = connection.pendingRequests.get(message.id);
            if (pending) {
                if (message.error) {
                    pending.reject(new Error(message.error.message));
                } else {
                    pending.resolve(message.result);
                }
                connection.pendingRequests.delete(message.id);
            }
        } else if (message.method) {
            // Notification from server
            this.emit('notification', {
                server: serverName,
                method: message.method,
                params: message.params
            });
        }
    }

    /**
     * Send JSON-RPC request to server
     */
    sendRequest(serverName, method, params = {}) {
        return new Promise((resolve, reject) => {
            const connection = this.activeConnections.get(serverName);
            if (!connection) {
                reject(new Error(`Server ${serverName} is not running`));
                return;
            }

            const id = ++connection.requestId;
            const request = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };

            connection.pendingRequests.set(id, { resolve, reject });
            
            // Set timeout for request
            setTimeout(() => {
                if (connection.pendingRequests.has(id)) {
                    connection.pendingRequests.delete(id);
                    reject(new Error(`Request timeout for ${method}`));
                }
            }, 30000);

            connection.process.stdin.write(JSON.stringify(request) + '\n');
        });
    }

    /**
     * Initialize server connection
     */
    async initialize(serverName) {
        return await this.sendRequest(serverName, 'initialize', {
            protocolVersion: '1.0.0',
            capabilities: {
                tools: {},
                resources: {}
            },
            clientInfo: {
                name: 'sentauri-desktop',
                version: '1.0.0'
            }
        });
    }

    /**
     * List available tools from server
     */
    async listTools(serverName) {
        const response = await this.sendRequest(serverName, 'tools/list');
        return response.tools || [];
    }

    /**
     * Call a tool on server
     */
    async callTool(serverName, toolName, args = {}) {
        return await this.sendRequest(serverName, 'tools/call', {
            name: toolName,
            arguments: args
        });
    }

    /**
     * List available resources from server
     */
    async listResources(serverName) {
        const response = await this.sendRequest(serverName, 'resources/list');
        return response.resources || [];
    }

    /**
     * Read a resource from server
     */
    async readResource(serverName, uri) {
        return await this.sendRequest(serverName, 'resources/read', {
            uri
        });
    }

    /**
     * Get all registered servers
     */
    getServers() {
        return Array.from(this.servers.values());
    }

    /**
     * Get server status
     */
    getServerStatus(name) {
        const server = this.servers.get(name);
        return server ? server.status : 'not_found';
    }

    /**
     * Get available tools for a server
     */
    getServerTools(name) {
        const server = this.servers.get(name);
        return server ? server.tools || [] : [];
    }
}

// Export for use in Electron main process
module.exports = MCPClient;