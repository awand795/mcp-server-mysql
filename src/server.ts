import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

const server = new McpServer({
    name: "mysql-server",
    version: "1.0.0",
})

server.tool("get-data", "Getting data from mysql database", {}, {
    title: "Get Data",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
}, async () => {
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM penjualan', (err: any, result: any) => {
            if (err) {
                reject(err)
                return
            }
            resolve({
                content: [{
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }]
            })
        })
    })
})

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
