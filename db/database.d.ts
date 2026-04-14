interface Database {
  all(sql: string, params: unknown[], callback: (err: Error | null, rows: unknown[]) => void): void;
}

declare const db: Database;
export default db;
