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
    server: z.string().describe('SQL Server host or host\\instance'),
    port: z.number().int().positive().optional().describe('TCP port; default 1433'),
    user: z.string().describe('SQL login user'),
    password: z.string().describe('SQL login password'),
    database: z.string().optional().describe('Database name; default master'),
    encrypt: z.boolean().optional().describe('Enable TLS encryption; default true'),
  },
  async (args) => {
    const params = args as unknown as SqlConnectionParams;
    await sqlClient.connect(params);
    return { content: [textContent('Connected successfully')] };
  }
);

mcp.tool('disconnect', async () => {
  await sqlClient.disconnect();
  return { content: [textContent('Disconnected')] };
});

mcp.tool('query',
  { sql: z.string().describe('SQL text to execute') },
  async ({ sql }) => {
    const result = await sqlClient.query(sql);
    return {
      content: [textContent(JSON.stringify({ rowsAffected: result.rowsAffected, recordset: result.recordset }, null, 2))],
    };
  }
);

mcp.tool('info', async () => {
  const version = await sqlClient.getVersion();
  return { content: [textContent(version)] };
});

mcp.tool('list_databases', async () => {
  const dbs = await sqlClient.listDatabases();
  return { content: [textContent(JSON.stringify(dbs, null, 2))] };
});

mcp.tool('list_schemas', async () => {
  const schemas = await sqlClient.listSchemas();
  return { content: [textContent(JSON.stringify(schemas, null, 2))] };
});

mcp.tool('list_tables',
  { schema: z.string().optional().describe('Optional schema filter') },
  async ({ schema }) => {
    const tables = await sqlClient.listTables(schema);
    return { content: [textContent(JSON.stringify(tables, null, 2))] };
  }
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
