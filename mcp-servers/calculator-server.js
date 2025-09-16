#!/usr/bin/env node

/**
 * Calculator MCP Server - Wrapper for mathematical operations
 * Provides advanced calculation capabilities through MCP protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { evaluate, parse, format } = require('mathjs');

class CalculatorMCPServer {
    constructor() {
        this.server = new Server({
            name: 'calculator-mcp-server',
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
                name: 'calculate',
                description: 'Evaluate mathematical expressions and calculations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        expression: {
                            type: 'string',
                            description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4", "sqrt(16)", "sin(pi/2)")'
                        }
                    },
                    required: ['expression']
                }
            },
            {
                name: 'solve_equation',
                description: 'Solve algebraic equations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        equation: {
                            type: 'string',
                            description: 'Equation to solve (e.g., "x^2 - 4 = 0", "2*x + 5 = 11")'
                        },
                        variable: {
                            type: 'string',
                            description: 'Variable to solve for',
                            default: 'x'
                        }
                    },
                    required: ['equation']
                }
            },
            {
                name: 'convert_units',
                description: 'Convert between different units of measurement',
                inputSchema: {
                    type: 'object',
                    properties: {
                        value: {
                            type: 'number',
                            description: 'Value to convert'
                        },
                        from_unit: {
                            type: 'string',
                            description: 'Source unit (e.g., "m", "ft", "kg", "lb", "celsius", "fahrenheit")'
                        },
                        to_unit: {
                            type: 'string',
                            description: 'Target unit'
                        }
                    },
                    required: ['value', 'from_unit', 'to_unit']
                }
            },
            {
                name: 'statistics',
                description: 'Calculate statistical measures for a dataset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Array of numbers for statistical analysis'
                        },
                        operation: {
                            type: 'string',
                            enum: ['mean', 'median', 'mode', 'std', 'var', 'all'],
                            description: 'Statistical operation to perform',
                            default: 'all'
                        }
                    },
                    required: ['data']
                }
            }
        ];
    }

    async executeTool(toolName, args) {
        try {
            switch (toolName) {
                case 'calculate':
                    return await this.calculate(args.expression);
                
                case 'solve_equation':
                    return await this.solveEquation(args.equation, args.variable || 'x');
                
                case 'convert_units':
                    return await this.convertUnits(args.value, args.from_unit, args.to_unit);
                
                case 'statistics':
                    return await this.calculateStatistics(args.data, args.operation || 'all');
                
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Calculation failed: ${error.message}`
                    }
                ],
                isError: true
            };
        }
    }

    async calculate(expression) {
        try {
            const result = evaluate(expression);
            const formatted = format(result, { precision: 14 });
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `${expression} = ${formatted}`
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Invalid expression: ${error.message}`);
        }
    }

    async solveEquation(equation, variable) {
        try {
            const { solve } = require('mathjs');
            const solutions = solve(equation, variable);
            
            let result;
            if (Array.isArray(solutions)) {
                result = `Solutions for ${variable}: ${solutions.map(s => format(s)).join(', ')}`;
            } else {
                result = `Solution for ${variable}: ${format(solutions)}`;
            }
            
            return {
                content: [
                    {
                        type: 'text',
                        text: result
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Could not solve equation: ${error.message}`);
        }
    }

    async convertUnits(value, fromUnit, toUnit) {
        try {
            const { unit } = require('mathjs');
            const result = unit(value, fromUnit).to(toUnit);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `${value} ${fromUnit} = ${format(result.toNumber())} ${toUnit}`
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Unit conversion failed: ${error.message}`);
        }
    }

    async calculateStatistics(data, operation) {
        try {
            const { mean, median, mode, std, variance } = require('mathjs');
            
            let result = [];
            
            if (operation === 'all' || operation === 'mean') {
                result.push(`Mean: ${format(mean(data))}`);
            }
            if (operation === 'all' || operation === 'median') {
                result.push(`Median: ${format(median(data))}`);
            }
            if (operation === 'all' || operation === 'mode') {
                try {
                    const modeResult = mode(data);
                    result.push(`Mode: ${Array.isArray(modeResult) ? modeResult.join(', ') : modeResult}`);
                } catch (e) {
                    result.push('Mode: No unique mode found');
                }
            }
            if (operation === 'all' || operation === 'std') {
                result.push(`Standard Deviation: ${format(std(data))}`);
            }
            if (operation === 'all' || operation === 'var') {
                result.push(`Variance: ${format(variance(data))}`);
            }
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `Statistics for [${data.join(', ')}]:\n${result.join('\n')}`
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Statistical calculation failed: ${error.message}`);
        }
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Calculator MCP Server started');
    }
}

// Start the server
const server = new CalculatorMCPServer();
server.start().catch(console.error);