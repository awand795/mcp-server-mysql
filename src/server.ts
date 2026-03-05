import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mysql from "mysql";

const connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    database: "db_penjualan",
    user: "root",
    password: ""
})

connection.connect((err: any) => {
    if (err) {
        console.error("Gagal konek ke database:", err)
        process.exit(1)
    }
    console.error("Terhubung ke database MySQL")
})

function query(sql: string): Promise<any> {
    return new Promise((resolve, reject) => {
        connection.query(sql, (err: any, result: any) => {
            if (err) reject(err)
            else resolve(result)
        })
    })
}

const server = new McpServer({
    name: "mysql-server",
    version: "1.0.0",
})

// Tool 1: List semua tabel di database
server.tool("list-tables", "List all tables in the database", {}, {
    title: "List Tables",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
}, async () => {
    const result = await query("SHOW TABLES")
    const tables = result.map((row: any) => Object.values(row)[0])
    return {
        content: [{
            type: "text",
            text: JSON.stringify(tables, null, 2)
        }]
    }
})

// Tool 2: Get semua data dari tabel tertentu
server.tool("get-table-data", "Get all data (SELECT *) from a specific table in the database", {
    table_name: z.string().describe("The name of the table to retrieve data from")
}, {
    title: "Get Table Data",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
}, async ({ table_name }) => {
    // Validasi nama tabel untuk mencegah SQL injection
    const tables = await query("SHOW TABLES")
    const tableNames = tables.map((row: any) => Object.values(row)[0] as string)

    if (!tableNames.includes(table_name)) {
        return {
            content: [{
                type: "text",
                text: `Error: Table '${table_name}' not found. Available tables: ${tableNames.join(", ")}`
            }],
            isError: true
        }
    }

    const result = await query(`SELECT * FROM \`${table_name}\``)
    return {
        content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
        }]
    }
})

// Tool 3: Describe tabel (lihat struktur kolom)
server.tool("describe-table", "Show the structure/columns of a specific table", {
    table_name: z.string().describe("The name of the table to describe")
}, {
    title: "Describe Table",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
}, async ({ table_name }) => {
    const tables = await query("SHOW TABLES")
    const tableNames = tables.map((row: any) => Object.values(row)[0] as string)

    if (!tableNames.includes(table_name)) {
        return {
            content: [{
                type: "text",
                text: `Error: Table '${table_name}' not found. Available tables: ${tableNames.join(", ")}`
            }],
            isError: true
        }
    }

    const result = await query(`DESCRIBE \`${table_name}\``)
    return {
        content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
        }]
    }
})

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
