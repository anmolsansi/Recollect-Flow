/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));

export function createD1Mock(): D1Database {
  const database = new DatabaseSync(':memory:');
  const migrationsDirectory = join(testDirectory, '../../../migrations');
  for (const file of readdirSync(migrationsDirectory).sort()) {
    if (!file.endsWith('.sql')) continue;
    const sql = readFileSync(join(migrationsDirectory, file), 'utf8');
    try {
      database.exec('BEGIN');
      database.exec(sql);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw new Error(
        `Migration ${file} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  }

  const prepare = (query: string): any => {
    const statement = database.prepare(query);
    const execute = (args: any[]) => ({
      first: async () => statement.get(...args),
      all: async () => ({ results: statement.all(...args) }),
      run: async () => {
        const result = statement.run(...args);
        return { meta: { changes: result.changes } };
      },
      raw: async () => statement.all(...args).map((row) => Object.values(row)),
    });
    return {
      bind: (...args: any[]) => execute(args),
      ...execute([]),
    };
  };

  return {
    prepare,
    batch: async (statements: any[]) => {
      const results = [];
      database.exec('BEGIN');
      try {
        for (const statement of statements) results.push(await statement.run());
        database.exec('COMMIT');
        return results;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  } as any as D1Database;
}
