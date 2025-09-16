# MCP (Model Context Protocol) Integration for Sentauri

## Overview
Sentauri now includes full MCP server integration, allowing AI assistants to interact with external tools and services through a standardized protocol.

## Architecture

### Components
1. **MCP Server** (`mcp-server/server.js`) - Implements the MCP protocol and provides tools
2. **MCP Client** (`src/mcp-client.js`) - Manages server connections in the main process
3. **MCP Integration** (`src/mcp-integration.js`) - Frontend UI for managing servers and tools
4. **Configuration** (`mcp-config.json`) - Server definitions and settings

## Available Tools

### Built-in Tools

#### 1. Database Query
Execute SQL queries on local SQLite databases.
```javascript
{
  tool: "database_query",
  args: {
    query: "SELECT * FROM users",
    database: "main"  // optional
  }
}
```

#### 2. File Operations
Perform file system operations (read, write, list, delete).
```javascript
{
  tool: "file_operation",
  args: {
    operation: "read",  // or "write", "list", "delete"
    path: "/path/to/file",
    content: "file content"  // for write operation
  }
}
```

#### 3. HTTP Requests
Make HTTP requests to external APIs.
```javascript
{
  tool: "http_request",
  args: {
    method: "GET",  // or "POST", "PUT", "DELETE", "PATCH"
    url: "https://api.example.com/data",
    headers: {},  // optional
    body: {}  // optional
  }
}
```

#### 4. System Info
Get system information (OS, memory, CPU, network).
```javascript
{
  tool: "system_info",
  args: {
    type: "all"  // or "os", "memory", "cpu", "network"
  }
}
```

#### 5. Calculator
Perform mathematical calculations.
```javascript
{
  tool: "calculator",
  args: {
    expression: "2 + 2 * 3"
  }
}
```

#### 6. Web Search
Search the web (requires API integration).
```javascript
{
  tool: "web_search",
  args: {
    query: "MCP protocol documentation",
    limit: 10
  }
}
```

## Usage

### Starting the MCP Server Standalone
```bash
cd mcp-server
npm start
```

### Using MCP in Sentauri App

1. **Open MCP Tools Tab**
   - Click on "MCP Tools" in the sidebar
   
2. **Start a Server**
   - Click "Start" next to the server you want to use
   - The server status will show as "running" with a green indicator
   
3. **Use Tools**
   - Available tools will appear once a server is running
   - Click on a tool to execute it
   - Enter parameters when prompted
   - Results appear in the output section

### Adding Custom Servers

Edit `mcp-config.json` to add new servers:

```json
{
  "mcpServers": {
    "my-custom-server": {
      "command": "python",
      "args": ["-m", "my_mcp_server"],
      "env": {
        "API_KEY": "${MY_API_KEY}"
      },
      "description": "My custom MCP server",
      "autoStart": false
    }
  }
}
```

## Protocol Implementation

### JSON-RPC 2.0 Communication
The implementation uses JSON-RPC 2.0 over stdio for communication:

```javascript
// Request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calculator",
    "arguments": {
      "expression": "2 + 2"
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "2 + 2 = 4"
      }
    ]
  }
}
```

### Supported Methods
- `initialize` - Server initialization
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources
- `resources/read` - Read resource content

## Security

### Path Restrictions
- File operations are restricted to user's home directory
- Dangerous paths (/etc, /sys, /proc) are blocked

### Input Validation
- All tool inputs are validated against JSON schemas
- SQL queries are parameterized to prevent injection
- Calculator expressions are sanitized

### Timeout Protection
- All operations have a 30-second timeout
- Long-running operations can be cancelled

## Development

### Creating a New Tool

1. Add tool definition in `getToolDefinitions()`:
```javascript
{
  name: 'my_new_tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter 1' }
    },
    required: ['param1']
  }
}
```

2. Implement tool execution in `executeTool()`:
```javascript
case 'my_new_tool':
  return await this.executeMyNewTool(args);
```

3. Add the implementation method:
```javascript
async executeMyNewTool({ param1 }) {
  // Tool logic here
  return {
    content: [
      {
        type: 'text',
        text: 'Tool result'
      }
    ]
  };
}
```

### Testing Tools

Use the test client to verify tool functionality:
```javascript
const client = new MCPClient();
client.registerServer({
  name: 'test',
  command: 'node',
  args: ['mcp-server/server.js']
});

await client.startServer('test');
const result = await client.callTool('test', 'calculator', {
  expression: '2 + 2'
});
console.log(result);
```

## Integration with AI Chat

The MCP tools can be automatically used by the AI assistant when configured. The assistant can:
1. Discover available tools
2. Understand tool capabilities from descriptions
3. Call tools with appropriate parameters
4. Process and present results to users

## Troubleshooting

### Server Won't Start
- Check that all dependencies are installed: `npm install`
- Verify the command path in `mcp-config.json`
- Check console for error messages

### Tools Not Appearing
- Ensure the server is running (green indicator)
- Check that the server implements `tools/list` method
- Verify tool definitions are properly formatted

### Tool Execution Fails
- Check parameter types match the schema
- Verify required parameters are provided
- Check server logs for detailed error messages

## Future Enhancements

1. **Streaming Support** - For long-running operations
2. **Authentication** - OAuth and API key management
3. **Resource Providers** - File browsers, database explorers
4. **Tool Composition** - Chain multiple tools together
5. **Visual Tool Builder** - GUI for creating custom tools
6. **Cloud Deployment** - Host MCP servers in the cloud

## Resources

- [MCP Specification](https://github.com/anthropics/model-context-protocol)
- [MCP SDK Documentation](https://github.com/anthropics/model-context-protocol-sdk)
- [Example Servers](https://github.com/anthropics/model-context-protocol-servers)

## License
MIT