/**
 * Database Helper Functions
 * Eliminates repeated patterns in db.ts
 */

import { QueryResult, QueryResultRow } from 'pg';

/** Extract first row from query result or return null */
export function getFirstRow<T extends QueryResultRow>(result: QueryResult<T>): T | null {
  return result.rows[0] || null;
}

/** Extract all rows from query result */
export function getAllRows<T extends QueryResultRow>(result: QueryResult<T>): T[] {
  return result.rows;
}

/** Check if query affected any rows */
export function hasAffectedRows(result: QueryResult): boolean {
  return (result.rowCount ?? 0) > 0;
}

/** Build dynamic UPDATE query from partial object */
export function buildUpdateQuery(
  tableName: string,
  updates: Record<string, unknown>,
  idColumn: string = 'id'
): { query: string; values: unknown[]; paramCount: number } {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== idColumn) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    return { query: '', values: [], paramCount: 0 };
  }

  const query = `UPDATE ${tableName} SET ${fields.join(', ')}, updated_at = NOW() WHERE ${idColumn} = $${paramIndex} RETURNING *`;

  return { query, values, paramCount: paramIndex };
}

/** Validate string length for DB constraints */
export function validateStringLength(
  value: string,
  maxLength: number,
  fieldName: string
): void {
  if (value.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/** Sanitize search query to prevent SQL injection patterns */
export function sanitizeSearchQuery(query: string): string {
  // Remove SQL injection patterns while preserving valid search text
  return query
    .replace(/[%;'"\\]/g, '')
    .trim()
    .slice(0, 100); // Limit length
}
