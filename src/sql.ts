import sql from 'mssql';

export type SqlConnectionParams = {
  server: string;
  port?: number;
  user: string;
  password: string;
  database?: string;
  encrypt?: boolean;
};

export class SqlClient {
  private pool: sql.ConnectionPool | null = null;
  private currentConfig: sql.config | null = null;

  async connect(params: SqlConnectionParams): Promise<void> {
    const { server, port = 1433, user, password, database = 'master', encrypt = true } = params;
    const config: sql.config = {
      server,
      port,
      user,
      password,
      database,
      options: {
        encrypt,
        trustServerCertificate: encrypt ? false : true,
        enableArithAbort: true,
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    } as unknown as sql.config;

    if (this.pool) {
      try { await this.pool.close(); } catch {}
      this.pool = null;
    }

    this.pool = await new sql.ConnectionPool(config).connect();
    this.currentConfig = config;
  }

  isConnected(): boolean {
    return !!this.pool && this.pool.connected;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      this.currentConfig = null;
    }
  }

  async query(queryText: string): Promise<sql.IResult<any>> {
    if (!this.pool || !this.pool.connected) {
      throw new Error('Not connected to SQL Server');
    }
    return this.pool.request().query(queryText);
  }

  async getVersion(): Promise<string> {
    const result = await this.query('SELECT @@VERSION AS version');
    return result.recordset?.[0]?.version ?? '';
  }

  async listDatabases(): Promise<string[]> {
    const result = await this.query(`SELECT name FROM sys.databases ORDER BY name`);
    return result.recordset.map(r => r.name);
  }

  async listSchemas(): Promise<string[]> {
    const result = await this.query(`SELECT name FROM sys.schemas ORDER BY name`);
    return result.recordset.map(r => r.name);
  }

  async listTables(schema?: string): Promise<{ schema: string; name: string }[]> {
    const where = schema ? 'WHERE s.name = @schema' : '';
    if (!this.pool) throw new Error('Not connected');
    const request = this.pool.request();
    if (schema) request.input('schema', sql.VarChar, schema);
    const result = await request.query(`
      SELECT s.name AS schemaName, t.name AS tableName
      FROM sys.tables t
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      ${where}
      ORDER BY s.name, t.name
    `);
    return result.recordset.map(r => ({ schema: r.schemaName, name: r.tableName }));
  }
}
