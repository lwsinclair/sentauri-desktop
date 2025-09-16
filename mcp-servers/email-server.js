#!/usr/bin/env node

/**
 * Email MCP Server - Wrapper for email operations
 * Provides email sending capabilities through MCP protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const nodemailer = require('nodemailer');

class EmailMCPServer {
    constructor() {
        this.server = new Server({
            name: 'email-mcp-server',
            version: '1.0.0'
        }, {
            capabilities: {
                tools: {},
                resources: {}
            }
        });

        this.transporter = null;
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
                name: 'email_configure',
                description: 'Configure email settings (SMTP server, credentials)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        host: {
                            type: 'string',
                            description: 'SMTP server host',
                            default: 'smtp.gmail.com'
                        },
                        port: {
                            type: 'number',
                            description: 'SMTP server port',
                            default: 587
                        },
                        secure: {
                            type: 'boolean',
                            description: 'Use SSL/TLS',
                            default: false
                        },
                        username: {
                            type: 'string',
                            description: 'Email username/address'
                        },
                        password: {
                            type: 'string',
                            description: 'Email password or app password'
                        }
                    },
                    required: ['username', 'password']
                }
            },
            {
                name: 'email_send',
                description: 'Send an email message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        to: {
                            type: 'string',
                            description: 'Recipient email address'
                        },
                        subject: {
                            type: 'string',
                            description: 'Email subject'
                        },
                        text: {
                            type: 'string',
                            description: 'Plain text email content'
                        },
                        html: {
                            type: 'string',
                            description: 'HTML email content (optional)'
                        },
                        cc: {
                            type: 'string',
                            description: 'CC recipients (optional)'
                        },
                        bcc: {
                            type: 'string',
                            description: 'BCC recipients (optional)'
                        }
                    },
                    required: ['to', 'subject', 'text']
                }
            },
            {
                name: 'email_template',
                description: 'Generate email templates for common scenarios',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['meeting_invite', 'follow_up', 'notification', 'welcome', 'reminder'],
                            description: 'Type of email template'
                        },
                        recipient_name: {
                            type: 'string',
                            description: 'Name of the recipient'
                        },
                        context: {
                            type: 'object',
                            description: 'Additional context for the template'
                        }
                    },
                    required: ['type']
                }
            },
            {
                name: 'email_validate',
                description: 'Validate email addresses and content',
                inputSchema: {
                    type: 'object',
                    properties: {
                        email: {
                            type: 'string',
                            description: 'Email address to validate'
                        },
                        content: {
                            type: 'string',
                            description: 'Email content to check for spam indicators'
                        }
                    }
                }
            }
        ];
    }

    async executeTool(toolName, args) {
        try {
            switch (toolName) {
                case 'email_configure':
                    return await this.configureEmail(args);
                
                case 'email_send':
                    return await this.sendEmail(args);
                
                case 'email_template':
                    return await this.generateTemplate(args);
                
                case 'email_validate':
                    return await this.validateEmail(args);
                
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Email operation failed: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async configureEmail(config) {
        try {
            this.transporter = nodemailer.createTransporter({
                host: config.host || process.env.SMTP_HOST || 'smtp.gmail.com',
                port: config.port || process.env.SMTP_PORT || 587,
                secure: config.secure || false,
                auth: {
                    user: config.username,
                    pass: config.password
                }
            });

            // Test the connection
            await this.transporter.verify();

            return {
                content: [
                    {
                        type: 'text',
                        text: `Email configuration successful for ${config.username}`
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Failed to configure email: ${error.message}`);
        }
    }

    async sendEmail(emailData) {
        if (!this.transporter) {
            throw new Error('Email not configured. Use email_configure first.');
        }

        const mailOptions = {
            to: emailData.to,
            subject: emailData.subject,
            text: emailData.text,
            html: emailData.html,
            cc: emailData.cc,
            bcc: emailData.bcc
        };

        const result = await this.transporter.sendMail(mailOptions);

        return {
            content: [
                {
                    type: 'text',
                    text: `Email sent successfully to ${emailData.to}. Message ID: ${result.messageId}`
                }
            ]
        };
    }

    async generateTemplate(templateData) {
        const templates = {
            meeting_invite: {
                subject: `Meeting Invitation: ${templateData.context?.meeting_title || 'Discussion'}`,
                text: `Hi ${templateData.recipient_name || 'there'},\n\nI'd like to invite you to a meeting:\n\nTopic: ${templateData.context?.meeting_title || 'Discussion'}\nDate: ${templateData.context?.date || '[Date]'}\nTime: ${templateData.context?.time || '[Time]'}\nLocation: ${templateData.context?.location || '[Location/Link]'}\n\nPlease let me know if you can attend.\n\nBest regards,\n[Your Name]`
            },
            follow_up: {
                subject: `Follow-up: ${templateData.context?.topic || 'Our Conversation'}`,
                text: `Hi ${templateData.recipient_name || 'there'},\n\nI wanted to follow up on our recent conversation about ${templateData.context?.topic || '[topic]'}.\n\n${templateData.context?.details || '[Follow-up details]'}\n\nPlease let me know if you have any questions.\n\nBest regards,\n[Your Name]`
            },
            notification: {
                subject: `Notification: ${templateData.context?.title || 'Update'}`,
                text: `Hi ${templateData.recipient_name || 'there'},\n\nThis is to notify you about: ${templateData.context?.title || '[notification]'}\n\n${templateData.context?.details || '[Details]'}\n\nBest regards,\n[Your Name]`
            },
            welcome: {
                subject: `Welcome ${templateData.recipient_name || 'aboard'}!`,
                text: `Hi ${templateData.recipient_name || 'there'},\n\nWelcome to ${templateData.context?.organization || '[Organization]'}!\n\nWe're excited to have you join us. Here's what you can expect:\n\n${templateData.context?.details || '• [Welcome details]\n• [Next steps]\n• [Resources]'}\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\n[Your Name]`
            },
            reminder: {
                subject: `Reminder: ${templateData.context?.title || 'Upcoming Event'}`,
                text: `Hi ${templateData.recipient_name || 'there'},\n\nThis is a friendly reminder about: ${templateData.context?.title || '[event]'}\n\nDate: ${templateData.context?.date || '[Date]'}\nTime: ${templateData.context?.time || '[Time]'}\n\n${templateData.context?.details || '[Additional details]'}\n\nBest regards,\n[Your Name]`
            }
        };

        const template = templates[templateData.type];
        if (!template) {
            throw new Error(`Unknown template type: ${templateData.type}`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `Subject: ${template.subject}\n\n${template.text}`
                }
            ]
        };
    }

    async validateEmail(validationData) {
        let result = [];

        if (validationData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailRegex.test(validationData.email);
            result.push(`Email address "${validationData.email}" is ${isValid ? 'valid' : 'invalid'}`);
        }

        if (validationData.content) {
            const spamIndicators = [
                'URGENT', 'ACT NOW', 'LIMITED TIME', 'FREE', 'WINNER',
                'CLICK HERE', 'GUARANTEE', 'AMAZING', 'INCREDIBLE'
            ];
            
            const foundIndicators = spamIndicators.filter(indicator => 
                validationData.content.toUpperCase().includes(indicator)
            );

            if (foundIndicators.length > 0) {
                result.push(`Potential spam indicators found: ${foundIndicators.join(', ')}`);
            } else {
                result.push('No obvious spam indicators detected');
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: result.join('\n')
                }
            ]
        };
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Email MCP Server started');
    }
}

// Start the server
const server = new EmailMCPServer();
server.start().catch(console.error);