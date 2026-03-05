const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

let mainWindow;
let mcpClient;
let mcpTransport;

const NVIDIA_API_KEY = "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";
const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

function getResourcePath(relativePath) {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, relativePath);
    }
    return path.join(__dirname, relativePath);
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hidden',
        backgroundColor: '#0f172a'
    });

    mainWindow.loadFile('index.html');
}

async function initMcp() {
    try {
        console.log("Starting MCP Server...");
        const serverPath = getResourcePath(path.join('build', 'server.js'));
        console.log("Server path:", serverPath);

        mcpTransport = new StdioClientTransport({
            command: "node",
            args: [serverPath],
        });

        mcpClient = new Client({
            name: "electron-client",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });

        await mcpClient.connect(mcpTransport);
        console.log("Connected to MCP Server");
        return true;
    } catch (error) {
        console.error("Failed to connect to MCP:", error);
        return false;
    }
}

app.whenReady().then(async () => {
    await createWindow();
    const connected = await initMcp();
    if (!connected) {
        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.executeJavaScript(`
                document.getElementById('chat-container').lastChild.querySelector('.text').textContent =
                    'Warning: MCP Server not connected. Make sure MySQL is running and the database exists.';
            `);
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());

ipcMain.handle('chat-message', async (event, { message, history }) => {
    try {
        if (!mcpClient) {
            // Try to reconnect
            const connected = await initMcp();
            if (!connected) {
                return "Error: MCP Server not connected. Make sure MySQL is running.";
            }
        }

        let tools = [];
        let formattedTools = [];
        try {
            tools = await mcpClient.listTools();
            formattedTools = tools.tools.map(tool => ({
                type: "function",
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                }
            }));
        } catch (e) {
            console.error("Failed to list tools, trying without tools:", e);
        }

        const messages = [
            { role: "system", content: "You are a helpful AI assistant with access to local tools. When asked about data, use the available tools to fetch information. Always format your responses using Markdown. Use tables, bold, lists, and code blocks when appropriate. When presenting data analysis, always use complete markdown tables with all rows." },
            ...history,
            { role: "user", content: message }
        ];

        const requestBody = {
            model: "meta/llama-3.3-70b-instruct",
            messages: messages,
            max_tokens: 8192,
            temperature: 0.6,
        };

        if (formattedTools.length > 0) {
            requestBody.tools = formattedTools;
            requestBody.tool_choice = "auto";
        }

        const response = await axios.post(INVOKE_URL, requestBody, {
            headers: {
                "Authorization": `Bearer ${NVIDIA_API_KEY}`,
                "Content-Type": "application/json"
            },
            timeout: 120000,
        });

        let aiMessage = response.data.choices[0].message;

        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            const toolCall = aiMessage.tool_calls[0];
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            console.log(`Executing tool: ${toolName}`, toolArgs);

            const toolResult = await mcpClient.callTool({
                name: toolName,
                arguments: toolArgs
            });

            const finalResponse = await axios.post(INVOKE_URL, {
                model: "meta/llama-3.3-70b-instruct",
                messages: [
                    ...messages,
                    aiMessage,
                    {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: toolName,
                        content: JSON.stringify(toolResult)
                    }
                ],
                max_tokens: 8192,
            }, {
                headers: {
                    "Authorization": `Bearer ${NVIDIA_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 120000,
            });

            return finalResponse.data.choices[0].message.content;
        }

        return aiMessage.content;
    } catch (error) {
        console.error("Chat Error:", error.response?.data || error.message);
        return `Error: ${error.message}`;
    }
});
