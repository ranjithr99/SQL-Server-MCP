## SQL Server MCP (Model Context Protocol) Server

A lightweight MCP stdio server that connects to Microsoft SQL Server using provided credentials and exposes tools to query and discover schema.

### Features
- **connect**: Connect by `server`, `port`, `user`, `password`, optional `database`, `encrypt`.
- **disconnect**: Close the pool.
- **info**: Return `@@VERSION`.
- **query**: Execute arbitrary SQL and return recordset.
- **list_databases**: List databases.
- **list_schemas**: List schemas.
- **list_tables**: List tables, with optional `schema` filter.

### Quickstart
- Node.js >= 18
- Install deps and build:
  ```bash
  npm install
  npm run build
  ```
- Run as an MCP stdio server (for MCP-compatible clients):
  ```bash
  npm start
  ```

The server starts over stdio and waits to be driven by an MCP client (e.g., Claude Desktop or other MCP-aware tooling). Use the tools in this order:
1) `connect` with your SQL Server credentials
2) `info`, `list_*`, or `query`

### MCP Tools and Schemas
- **connect** args:
  ```json
  {
    "server": "host or host\\\u005Cinstance",
    "port": 1433,
    "user": "sa",
    "password": "<secret>",
    "database": "master",
    "encrypt": true
  }
  ```
- **query** args:
  ```json
  { "sql": "SELECT TOP 1 * FROM sys.databases" }
  ```
- Other tools take no args or optional `schema`.

### Security
- Credentials are provided at call-time and are not stored. Prefer secure MCP clients and environments. TLS `encrypt` defaults to true.

### Development
- Scripts:
  - `npm run dev` to run with ts-node
  - `npm run build` to emit JS to `dist/`
  - `npm start` to run built server (`dist/server.js`)

### Commits
- chore: init project scaffolding with TypeScript, tsconfig, and deps
- feat: implement MCP stdio server with SQL Server tools (connect, query, info, list_*)
- docs: add execution plan outline and usage notes

### License
MIT
