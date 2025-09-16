#!/usr/bin/env node

/**
 * Sentauri MCP Server
 * Implements Model Context Protocol for tool integration
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class SentauriMCPServer {
    constructor() {
        this.server = new Server({
            name: 'sentauri-mcp',
            version: '1.0.0'
        }, {
            capabilities: {
                tools: {},
                resources: {}
            }
        });

        this.db = null;
        this.setupHandlers();
    }

    setupHandlers() {
        // Tool handlers
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: this.getToolDefinitions()
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            return await this.executeTool(name, args);
        });
    }

    getToolDefinitions() {
        return [
            {
                name: 'database_query',
                description: 'Execute SQL queries on a local SQLite database',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'SQL query to execute'
                        },
                        database: {
                            type: 'string',
                            description: 'Database name (optional, defaults to main)',
                            default: 'main'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'file_operation',
                description: 'Perform file system operations (read, write, list)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        operation: {
                            type: 'string',
                            enum: ['read', 'write', 'list', 'delete'],
                            description: 'Operation to perform'
                        },
                        path: {
                            type: 'string',
                            description: 'File or directory path'
                        },
                        content: {
                            type: 'string',
                            description: 'Content to write (for write operation)'
                        }
                    },
                    required: ['operation', 'path']
                }
            },
            {
                name: 'http_request',
                description: 'Make HTTP requests to external APIs',
                inputSchema: {
                    type: 'object',
                    properties: {
                        method: {
                            type: 'string',
                            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                            description: 'HTTP method'
                        },
                        url: {
                            type: 'string',
                            description: 'URL to request'
                        },
                        headers: {
                            type: 'object',
                            description: 'Request headers (optional)'
                        },
                        body: {
                            type: 'object',
                            description: 'Request body (optional)'
                        }
                    },
                    required: ['method', 'url']
                }
            },
            {
                name: 'system_info',
                description: 'Get system information (OS, memory, CPU, etc.)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['all', 'os', 'memory', 'cpu', 'network'],
                            description: 'Type of information to retrieve',
                            default: 'all'
                        }
                    }
                }
            },
            {
                name: 'calculator',
                description: 'Perform mathematical calculations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        expression: {
                            type: 'string',
                            description: 'Mathematical expression to evaluate'
                        }
                    },
                    required: ['expression']
                }
            },
            {
                name: 'web_search',
                description: 'Search the web using a search engine API',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query'
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of results to return',
                            default: 10
                        }
                    },
                    required: ['query']
                }
            }
        ];
    }

    getResourceDefinitions() {
        return [
            {
                uri: 'file://home',
                name: 'Home Directory',
                description: 'Access to user home directory',
                mimeType: 'text/directory'
            },
            {
                uri: 'db://main',
                name: 'Main Database',
                description: 'SQLite database for application data',
                mimeType: 'application/x-sqlite3'
            }
        ];
    }

    async executeTool(toolName, args) {
        try {
            switch (toolName) {
                case 'database_query':
                    return await this.executeDatabaseQuery(args);
                
                case 'file_operation':
                    return await this.executeFileOperation(args);
                
                case 'http_request':
                    return await this.executeHttpRequest(args);
                
                case 'system_info':
                    return await this.getSystemInfo(args);
                
                case 'calculator':
                    return await this.calculate(args);
                
                case 'web_search':
                    return await this.webSearch(args);
                
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error executing tool ${toolName}: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async executeDatabaseQuery({ query, database = 'main' }) {
        return new Promise((resolve, reject) => {
            // Initialize database if not exists
            if (!this.db) {
                const dbPath = path.join(os.homedir(), '.sentauri', `${database}.db`);
                this.db = new sqlite3.Database(dbPath);
            }

            if (query.toLowerCase().startsWith('select')) {
                this.db.all(query, [], (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(rows, null, 2)
                                }
                            ]
                        });
                    }
                });
            } else {
                this.db.run(query, [], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            content: [
                                {
                                    type: 'text',
                                    text: `Query executed successfully. Rows affected: ${this.changes}`
                                }
                            ]
                        });
                    }
                });
            }
        });
    }

    async executeFileOperation({ operation, path: filePath, content }) {
        const safePath = path.resolve(filePath);
        
        // Security check - restrict to user's home directory
        const homeDir = os.homedir();
        if (!safePath.startsWith(homeDir)) {
            throw new Error('Access denied: Path must be within user home directory');
        }

        switch (operation) {
            case 'read':
                const fileContent = await fs.readFile(safePath, 'utf-8');
                return {
                    content: [
                        {
                            type: 'text',
                            text: fileContent
                        }
                    ]
                };

            case 'write':
                await fs.writeFile(safePath, content);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `File written successfully: ${safePath}`
                        }
                    ]
                };

            case 'list':
                const files = await fs.readdir(safePath);
                return {
                    content: [
                        {
                            type: 'text',
                            text: files.join('\n')
                        }
                    ]
                };

            case 'delete':
                await fs.unlink(safePath);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `File deleted: ${safePath}`
                        }
                    ]
                };

            default:
                throw new Error(`Unknown file operation: ${operation}`);
        }
    }

    async executeHttpRequest({ method, url, headers = {}, body = null }) {
        try {
            const response = await axios({
                method,
                url,
                headers,
                data: body,
                timeout: 30000
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            data: response.data
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `HTTP request failed: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async getSystemInfo({ type = 'all' }) {
        const info = {};

        if (type === 'all' || type === 'os') {
            info.os = {
                platform: os.platform(),
                type: os.type(),
                release: os.release(),
                hostname: os.hostname(),
                arch: os.arch(),
                uptime: os.uptime()
            };
        }

        if (type === 'all' || type === 'memory') {
            info.memory = {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
            };
        }

        if (type === 'all' || type === 'cpu') {
            info.cpu = {
                cores: os.cpus().length,
                model: os.cpus()[0].model,
                speed: os.cpus()[0].speed
            };
        }

        if (type === 'all' || type === 'network') {
            info.network = os.networkInterfaces();
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(info, null, 2)
                }
            ]
        };
    }

    async calculate({ expression }) {
        try {
            // Safe math evaluation using Function constructor
            // Only allows mathematical operations
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            const result = Function('"use strict"; return (' + sanitized + ')')();
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `${expression} = ${result}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error evaluating expression: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async webSearch({ query, limit = 10 }) {
        // This is a mock implementation - replace with actual search API
        // You could use Google Custom Search API, Bing Search API, etc.
        return {
            content: [
                {
                    type: 'text',
                    text: `Search results for "${query}":\n\n` +
                          `1. Example result 1 for ${query}\n` +
                          `2. Example result 2 for ${query}\n` +
                          `3. Example result 3 for ${query}\n` +
                          `...\n\n` +
                          `Note: Implement actual search API integration for real results.`
                }
            ]
        };
    }

    async readResource(uri) {
        if (uri === 'file://home') {
            const homeContents = await fs.readdir(os.homedir());
            return {
                contents: [
                    {
                        uri: uri,
                        mimeType: 'text/plain',
                        text: homeContents.join('\n')
                    }
                ]
            };
        } else if (uri === 'db://main') {
            return {
                contents: [
                    {
                        uri: uri,
                        mimeType: 'text/plain',
                        text: 'Database connection info and schema would go here'
                    }
                ]
            };
        }
        
        throw new Error(`Unknown resource: ${uri}`);
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Sentauri MCP Server started');
    }
}

// Start the server
const server = new SentauriMCPServer();
server.start().catch(console.error);