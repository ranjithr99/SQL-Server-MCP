import sql from 'mssql';

export type SqlConnectionParams = {
  server: string;
  port?: number;
  user: string;
  password: string;
  database?: string;
  encrypt?: boolean;
};

function validateConnectionParams(params: SqlConnectionParams): void {
  if (!params.server?.trim()) {
    throw new Error('Server hostname is required');
  }
  if (!params.user?.trim()) {
    throw new Error('Username is required');
  }
  if (!params.password) {
    throw new Error('Password is required');
  }
  if (params.port && (params.port < 1 || params.port > 65535)) {
    throw new Error('Port must be between 1 and 65535');
  }
}

export class SqlClient {
  private pool: sql.ConnectionPool | null = null;
  private currentConfig: sql.config | null = null;

  async connect(params: SqlConnectionParams): Promise<void> {
    validateConnectionParams(params);
    
    const { server, port = 1433, user, password, database = 'master', encrypt = true } = params;
    const config: sql.config = {
      server,
      port,
      user,
      password,
      database,
      options: {
        encrypt,
        trustServerCertificate: false,
        enableArithAbort: true,
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      connectionTimeout: 15000,
      requestTimeout: 15000,
    };

    if (this.pool) {
      try { 
        await this.pool.close(); 
      } catch (error) {
        console.error('Error closing existing connection:', error instanceof Error ? error.message : String(error));
      }
      this.pool = null;
    }

    try {
      this.pool = await new sql.ConnectionPool(config).connect();
      this.currentConfig = config;
    } catch (error) {
      this.pool = null;
      this.currentConfig = null;
      throw new Error(`Failed to connect to SQL Server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isConnected(): boolean {
    return !!this.pool && this.pool.connected;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
      } catch (error) {
        console.error('Error during disconnect:', error instanceof Error ? error.message : String(error));
      } finally {
        this.pool = null;
        this.currentConfig = null;
      }
    }
  }

  async query(queryText: string, parameters?: { [key: string]: any }): Promise<sql.IResult<any>> {
    if (!this.pool || !this.pool.connected) {
      throw new Error('Not connected to SQL Server. Use connect tool first.');
    }
    
    try {
      const request = this.pool.request();
      
      if (parameters) {
        for (const [key, value] of Object.entries(parameters)) {
          request.input(key, value);
        }
      }
      
      return await request.query(queryText);
    } catch (error) {
      throw new Error(`SQL execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
