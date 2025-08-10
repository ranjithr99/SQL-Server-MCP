import { Server, Tool, StdioServerTransport } from '@modelcontextprotocol/sdk/server/index.js';
import { TextContent } from '@modelcontextprotocol/sdk/types.js';
import { SqlClient, SqlConnectionParams } from './sql.js';

const sqlClient = new SqlClient();

function makeText(text: string): TextContent {
  return { type: 'text', text };
}

const tools: Tool[] = [
  {
    name: 'connect',
    description: 'Connect to a SQL Server. Inputs: server, port, user, password, database, encrypt',
    inputSchema: {
      type: 'object',
      properties: {
        server: { type: 'string' },
        port: { type: 'number' },
        user: { type: 'string' },
        password: { type: 'string' },
        database: { type: 'string' },
        encrypt: { type: 'boolean' },
      },
      required: ['server', 'user', 'password'],
      additionalProperties: false,
    },
  },
  {
    name: 'disconnect',
    description: 'Disconnect from SQL Server',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'query',
    description: 'Run a SQL query and return rows',
    inputSchema: {
      type: 'object',
      properties: { sql: { type: 'string' } },
      required: ['sql'],
      additionalProperties: false,
    },
  },
  {
    name: 'info',
    description: 'Get SQL Server version and basic info',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_databases',
    description: 'List databases',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_schemas',
    description: 'List schemas',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_tables',
    description: 'List tables; optional schema filter',
    inputSchema: {
      type: 'object',
      properties: { schema: { type: 'string' } },
      additionalProperties: false,
    },
  },
];

const server = new Server({
  name: 'sql-server-mcp',
  version: '0.1.0',
  tools,
});

server.tool('connect', async (args) => {
  const params = args as SqlConnectionParams;
  await sqlClient.connect(params);
  return { content: [makeText('Connected successfully')] };
});

server.tool('disconnect', async () => {
  await sqlClient.disconnect();
  return { content: [makeText('Disconnected')] };
});

server.tool('query', async (args) => {
  const { sql: sqlText } = args as { sql: string };
  const result = await sqlClient.query(sqlText);
  return {
    content: [
      makeText(JSON.stringify({ rowsAffected: result.rowsAffected, recordset: result.recordset }, null, 2)),
    ],
  };
});

server.tool('info', async () => {
  const version = await sqlClient.getVersion();
  return { content: [makeText(version)] };
});

server.tool('list_databases', async () => {
  const dbs = await sqlClient.listDatabases();
  return { content: [makeText(JSON.stringify(dbs, null, 2))] };
});

server.tool('list_schemas', async () => {
  const schemas = await sqlClient.listSchemas();
  return { content: [makeText(JSON.stringify(schemas, null, 2))] };
});

server.tool('list_tables', async (args) => {
  const { schema } = (args ?? {}) as { schema?: string };
  const tables = await sqlClient.listTables(schema);
  return { content: [makeText(JSON.stringify(tables, null, 2))] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
