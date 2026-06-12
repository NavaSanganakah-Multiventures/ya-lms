const fs = require('fs');
const path = require('path');

const schemaFile = path.join(__dirname, '..', 'schema.sql');
const destFile = path.join(__dirname, '..', 'src', 'lib', 'schema.ts');

const sql = fs.readFileSync(schemaFile, 'utf8');

const tables = [];

// More robust regex to extract CREATE TABLE statements
const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g;
let match;

while ((match = tableRegex.exec(sql)) !== null) {
  const tableName = match[1];
  const columnsBody = match[2];

  const columns = [];

  // Split by comma but ignore commas inside parentheses
  let currentField = '';
  let openParens = 0;
  for (let i = 0; i < columnsBody.length; i++) {
    const char = columnsBody[i];
    if (char === '(') openParens++;
    if (char === ')') openParens--;

    if (char === ',' && openParens === 0) {
      currentField = currentField.trim();
      if (currentField) {
        processColumnField(currentField, columns);
      }
      currentField = '';
    } else {
      currentField += char;
    }
  }

  currentField = currentField.trim();
  if (currentField) {
    processColumnField(currentField, columns);
  }

  // Clean up the trailing semicolon if it matched in the original regex
  let cleanSql = match[0].trim();
  if (cleanSql.endsWith(';')) {
      cleanSql = cleanSql.slice(0, -1);
  }

  tables.push({
    name: tableName,
    createSql: cleanSql,
    columns: columns
  });
}

function processColumnField(line, columns) {
    if (line.startsWith('FOREIGN KEY') || line.startsWith('UNIQUE') || line.startsWith('PRIMARY KEY') || line.startsWith('CHECK')) {
      return;
    }

    // basic splitting
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const name = parts[0];
      const type = parts[1];

      let nullable = true;
      if (line.includes('NOT NULL')) nullable = false;

      let defaultSql = undefined;
      const defaultMatch = line.match(/DEFAULT\s+([^,]+)/i);

      if (defaultMatch) {
         // handle the case where default match goes up to the end of the line
         let extractedDefault = defaultMatch[1].trim();
         if (extractedDefault.endsWith(')')) {
             // Let's just trust our original parsing rules or do a simpler check
             // The previous logic was actually fine for this specific codebase, let's keep it simple
             const simplerMatch = line.match(/DEFAULT\s+(CURRENT_TIMESTAMP|'(?:[^'\\]|\\.)*'|\d+|(?:\w+))/i);
             if (simplerMatch) {
                 defaultSql = simplerMatch[1].trim();
             } else {
                 const funcMatch = line.match(/DEFAULT\s+(\w+\([^)]*\))/i);
                 if (funcMatch) defaultSql = funcMatch[1].trim();
             }
         } else {
             // For general cases
             const simplerMatch = line.match(/DEFAULT\s+(CURRENT_TIMESTAMP|'(?:[^'\\]|\\.)*'|\d+|(?:\w+))/i);
             if (simplerMatch) {
                 defaultSql = simplerMatch[1].trim();
             } else {
                 const funcMatch = line.match(/DEFAULT\s+(\w+\([^)]*\))/i);
                 if (funcMatch) defaultSql = funcMatch[1].trim();
             }
         }
      }

      columns.push({ name, type, nullable, defaultSql });
    }
}

// Find indexes
const indexRegex = /(CREATE (UNIQUE )?INDEX IF NOT EXISTS \w+ ON \w+\([\s\S]*?\));/g;
const indexes = [];
while ((match = indexRegex.exec(sql)) !== null) {
   indexes.push(match[1]);
}

let tsContent = `// Auto-generated from schema.sql. DO NOT EDIT DIRECTLY.
export interface ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
  defaultSql?: string;
}

export interface TableSchema {
  createSql: string;
  columns: ColumnDef[];
  indexes?: string[];
}

export const TABLE_SCHEMAS: Record<string, TableSchema> = {
`;

for (const table of tables) {
  tsContent += `  ${table.name}: {\n`;
  tsContent += `    createSql: \`${table.createSql}\`,\n`;
  tsContent += `    columns: [\n`;
  for (const col of table.columns) {
    let colStr = `      { name: '${col.name}', type: '${col.type}'`;
    if (col.nullable === false) colStr += `, nullable: false`;
    if (col.defaultSql !== undefined) {
       let escaped = col.defaultSql.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
       colStr += `, defaultSql: '${escaped}'`;
    }
    colStr += ` },\n`;
  }
  tsContent += `    ],\n`;

  // Add indexes that belong to this table
  const tableIndexes = indexes.filter(idx => idx.includes(`ON ${table.name}(`));
  if (tableIndexes.length > 0) {
     tsContent += `    indexes: [\n`;
     for (const idx of tableIndexes) {
       tsContent += `      '${idx.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',\n`;
     }
     tsContent += `    ],\n`;
  }

  tsContent += `  },\n\n`;
}

tsContent += `};\n`;

fs.writeFileSync(destFile, tsContent);
console.log('Successfully synchronized schema.sql to src/lib/schema.ts');
