#!/usr/bin/env node

/**
 * Git MCP Server - Wrapper for Git operations
 * Provides version control capabilities through MCP protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const simpleGit = require('simple-git');
const fs = require('fs').promises;
const path = require('path');

class GitMCPServer {
    constructor() {
        this.server = new Server({
            name: 'git-mcp-server',
            version: '1.0.0'
        }, {
            capabilities: {
                tools: {},
                resources: {}
            }
        });

        this.setupHandlers();
    }

    setupHandlers() {
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
                name: 'git_status',
                description: 'Get the status of a Git repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the Git repository'
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'git_log',
                description: 'Get commit history from a Git repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the Git repository'
                        },
                        maxCount: {
                            type: 'number',
                            description: 'Maximum number of commits to retrieve',
                            default: 10
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'git_diff',
                description: 'Show differences between commits, commit and working tree, etc',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the Git repository'
                        },
                        cached: {
                            type: 'boolean',
                            description: 'Show staged changes',
                            default: false
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'git_add',
                description: 'Add file contents to the index',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the Git repository'
                        },
                        files: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Files to add (or ["."] for all)'
                        }
                    },
                    required: ['path', 'files']
                }
            },
            {
                name: 'git_commit',
                description: 'Record changes to the repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the Git repository'
                        },
                        message: {
                            type: 'string',
                            description: 'Commit message'
                        }
                    },
                    required: ['path', 'message']
                }
            },
            {
                name: 'git_branch',
                description: 'List, create, or delete branches',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the Git repository'
                        },
                        action: {
                            type: 'string',
                            enum: ['list', 'create', 'delete', 'switch'],
                            description: 'Action to perform'
                        },
                        branchName: {
                            type: 'string',
                            description: 'Branch name (for create, delete, switch)'
                        }
                    },
                    required: ['path', 'action']
                }
            }
        ];
    }

    async executeTool(toolName, args) {
        try {
            const git = simpleGit(args.path);
            
            switch (toolName) {
                case 'git_status':
                    return await this.gitStatus(git);
                
                case 'git_log':
                    return await this.gitLog(git, args.maxCount || 10);
                
                case 'git_diff':
                    return await this.gitDiff(git, args.cached);
                
                case 'git_add':
                    return await this.gitAdd(git, args.files);
                
                case 'git_commit':
                    return await this.gitCommit(git, args.message);
                
                case 'git_branch':
                    return await this.gitBranch(git, args.action, args.branchName);
                
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Git operation failed: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async gitStatus(git) {
        const status = await git.status();
        let output = `On branch ${status.current}\n\n`;
        
        if (status.files.length === 0) {
            output += 'Working tree clean\n';
        } else {
            output += 'Changes:\n';
            status.files.forEach(file => {
                output += `  ${file.index}${file.working_dir} ${file.path}\n`;
            });
        }
        
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    }

    async gitLog(git, maxCount) {
        const log = await git.log({ maxCount });
        let output = '';
        
        log.all.forEach(commit => {
            output += `commit ${commit.hash}\n`;
            output += `Author: ${commit.author_name} <${commit.author_email}>\n`;
            output += `Date: ${commit.date}\n\n`;
            output += `    ${commit.message}\n\n`;
        });
        
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    }

    async gitDiff(git, cached) {
        const diff = await git.diff(cached ? ['--cached'] : []);
        
        return {
            content: [
                {
                    type: 'text',
                    text: diff || 'No differences found'
                }
            ]
        };
    }

    async gitAdd(git, files) {
        await git.add(files);
        
        return {
            content: [
                {
                    type: 'text',
                    text: `Added files: ${files.join(', ')}`
                }
            ]
        };
    }

    async gitCommit(git, message) {
        const result = await git.commit(message);
        
        return {
            content: [
                {
                    type: 'text',
                    text: `Committed: ${result.commit} - ${message}`
                }
            ]
        };
    }

    async gitBranch(git, action, branchName) {
        let result;
        
        switch (action) {
            case 'list':
                result = await git.branchLocal();
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Current branch: ${result.current}\nAll branches:\n${result.all.join('\n')}`
                        }
                    ]
                };
            
            case 'create':
                await git.checkoutBranch(branchName, 'HEAD');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Created and switched to branch: ${branchName}`
                        }
                    ]
                };
            
            case 'switch':
                await git.checkout(branchName);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Switched to branch: ${branchName}`
                        }
                    ]
                };
            
            case 'delete':
                await git.deleteLocalBranch(branchName);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Deleted branch: ${branchName}`
                        }
                    ]
                };
        }
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Git MCP Server started');
    }
}

// Start the server
const server = new GitMCPServer();
server.start().catch(console.error);