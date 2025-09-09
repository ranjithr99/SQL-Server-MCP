import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { SqlClient, type SqlConnectionParams } from './sql.js';

const sqlClient = new SqlClient();

function textContent(text: string): TextContent { return { type: 'text', text }; }

const mcp = new McpServer({ name: 'sql-server-mcp', version: '0.1.0' }, {
  capabilities: { tools: {} },
  instructions: 'Use the connect tool first to establish a SQL Server connection, then query or browse schema.',
});

mcp.tool('connect',
  {
    server: z.string().min(1).describe('SQL Server host or host\\instance'),
    port: z.number().int().min(1).max(65535).optional().describe('TCP port; default 1433'),
    user: z.string().min(1).describe('SQL login user'),
    password: z.string().min(1).describe('SQL login password'),
    database: z.string().optional().describe('Database name; default master'),
    encrypt: z.boolean().optional().describe('Enable TLS encryption; default true'),
  },
  async (args) => {
    try {
      const params: SqlConnectionParams = {
        server: args.server,
        port: args.port,
        user: args.user,
        password: args.password,
        database: args.database,
        encrypt: args.encrypt,
      };
      await sqlClient.connect(params);
      return { content: [textContent('Connected successfully')] };
    } catch (error) {
      return { 
        content: [textContent(`Connection failed: ${error instanceof Error ? error.message : String(error)}`)] 
      };
    }
  }
);

mcp.tool('disconnect', async () => {
  try {
    await sqlClient.disconnect();
    return { content: [textContent('Disconnected successfully')] };
  } catch (error) {
    return { content: [textContent(`Disconnect error: ${error instanceof Error ? error.message : String(error)}`)] };
  }
});

mcp.tool('query',
  { 
    sql: z.string().min(1).describe('SQL text to execute'),
    parameters: z.record(z.any()).optional().describe('Query parameters for safe SQL execution')
  },
  async ({ sql, parameters }) => {
    try {
      const result = await sqlClient.query(sql, parameters);
      return {
        content: [textContent(JSON.stringify({ 
          rowsAffected: result.rowsAffected, 
          recordset: result.recordset 
        }, null, 2))],
      };
    } catch (error) {
      return {
        content: [textContent(`Query failed: ${error instanceof Error ? error.message : String(error)}`)],
      };
    }
  }
);

mcp.tool('info', async () => {
  try {
    const version = await sqlClient.getVersion();
    return { content: [textContent(version)] };
  } catch (error) {
    return { content: [textContent(`Info query failed: ${error instanceof Error ? error.message : String(error)}`)] };
  }
});

mcp.tool('list_databases', async () => {
  try {
    const dbs = await sqlClient.listDatabases();
    return { content: [textContent(JSON.stringify(dbs, null, 2))] };
  } catch (error) {
    return { content: [textContent(`Failed to list databases: ${error instanceof Error ? error.message : String(error)}`)] };
  }
});

mcp.tool('list_schemas', async () => {
  try {
    const schemas = await sqlClient.listSchemas();
    return { content: [textContent(JSON.stringify(schemas, null, 2))] };
  } catch (error) {
    return { content: [textContent(`Failed to list schemas: ${error instanceof Error ? error.message : String(error)}`)] };
  }
});

mcp.tool('list_tables',
  { schema: z.string().optional().describe('Optional schema filter') },
  async ({ schema }) => {
    try {
      const tables = await sqlClient.listTables(schema);
      return { content: [textContent(JSON.stringify(tables, null, 2))] };
    } catch (error) {
      return { content: [textContent(`Failed to list tables: ${error instanceof Error ? error.message : String(error)}`)] };
    }
  }
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
