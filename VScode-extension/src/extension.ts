import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('DevAid extension activated!');

    const provider = new DevAidChatProvider(context.extensionPath);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'devaid.chatView',
            provider
        ),

        vscode.commands.registerCommand('devaid.openChat', async () => {
            await vscode.commands.executeCommand(
                'devaid.chatView.focus'
            );
        }) 
    );
}
class DevAidChatProvider implements vscode.WebviewViewProvider {
    constructor(private readonly extensionPath: string) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
        vscode.Uri.file(
            path.join(this.extensionPath, 'media')
                )
            ]
        };
        const markdownScriptUri = webviewView.webview.asWebviewUri(
        vscode.Uri.file(
            path.join(this.extensionPath, 'media', 'chat.bundle.js')
            )
        );

webviewView.webview.html = this.getHtml(markdownScriptUri);

        webviewView.webview.onDidReceiveMessage(async message => {
            if (message.type !== 'userMessage') {
                return;
            }

            const workspace = vscode.workspace.workspaceFolders?.[0];

            if (!workspace) {
                webviewView.webview.postMessage({
                    type: 'error',
                    text: 'Please open a repository folder in VS Code first.'
                });
                return;
            }

            webviewView.webview.postMessage({
                type: 'status',
                text: 'DevAid is thinking...'
            });

            try {
                const answer = await this.askPython(
                    message.text,
                    workspace.uri.fsPath
                );

                webviewView.webview.postMessage({
                    type: 'response',
                    text: answer
                });
            } catch (error) {
                webviewView.webview.postMessage({
                    type: 'error',
                    text: error instanceof Error
                        ? error.message
                        : String(error)
                });
            }
        });
    }

    private askPython(prompt: string, repositoryPath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // During development, the extension lives inside DevAid.
           const projectRoot = vscode.workspace
            .getConfiguration('devaid')
            .get<string>('backendPath', '').trim();

    if (!projectRoot || !path.isAbsolute(projectRoot)) {
        reject(new Error('Configure DevAid: Backend Path in VS Code Settings.'));
        return;
    }

const pythonPath = path.join(projectRoot, '.venv', 'bin', 'python');
            if (!fs.existsSync(pythonPath)) {
                reject(new Error(`Python environment not found: ${pythonPath}`));
                return;
            }

            const python = spawn(
                pythonPath,
                ['-m', 'devaid.bridge'],
                {
                    cwd: projectRoot,
                    env: process.env,
                    stdio: ['pipe', 'pipe', 'pipe']
                }
            );

            let output = '';
            let errors = '';
            let settled = false;

            const finish = (error?: Error, answer?: string) => {
                if (settled) {
                    return;
                }

                settled = true;
                clearTimeout(timeout);

                if (error) {
                    reject(error);
                } else {
                    resolve(answer ?? '');
                }
            };

            const timeout = setTimeout(() => {
                python.kill();
                finish(new Error('DevAid timed out after 2 minutes.'));
            }, 120000);

            python.stdout.on('data', chunk => {
                output += chunk.toString();

                const newline = output.indexOf('\n');

                if (newline === -1 || settled) {
                    return;
                }

                const line = output.slice(0, newline).trim();

                try {
                    const result = JSON.parse(line);

                    if (result.type === 'response') {
                        finish(undefined, result.text);
                    } else {
                        finish(new Error(result.text || 'Unknown Python error'));
                    }
                } catch {
                    finish(new Error('Invalid response from Python bridge.'));
                }

                python.kill();
            });

            python.stderr.on('data', chunk => {
                errors += chunk.toString();
                console.log('[DevAid Python]', chunk.toString());
            });

            python.on('error', error => {
                finish(error);
            });

            python.on('close', code => {
                if (!settled) {
                    finish(new Error(
                        `Python exited with code ${code}. ${errors.slice(-1000)}`
                    ));
                }
            });

            python.stdin.write(JSON.stringify({
                prompt,
                repository_path: repositoryPath
            }) + '\n');

            python.stdin.end();
        });
    }

    private getHtml(markdownScriptUri: vscode.Uri): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">

        <meta name="viewport"
            content="width=device-width, initial-scale=1.0">

        <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-devaid';">

        <style>
            * {
                box-sizing: border-box;
            }

            :root {
                --border: var(--vscode-panel-border, #333333);
                --background: var(--vscode-sideBar-background);
                --foreground: var(--vscode-foreground);
                --muted: var(--vscode-descriptionForeground);
                --input-bg: var(--vscode-input-background);
                --accent: var(--vscode-focusBorder, #007acc);
            }

            html,
            body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
            }

            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size, 13px);
                color: var(--foreground);
                background: var(--background);
            }

            .app {
                height: 100vh;
                display: flex;
                flex-direction: column;
            }

            /* HEADER */

            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px 14px;
                border-bottom: 1px solid var(--border);
                flex-shrink: 0;
            }

            .brand {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            .brand-name {
                font-size: 15px;
                font-weight: 650;
                letter-spacing: -0.3px;
            }

            .brand-subtitle {
                font-size: 11px;
                color: var(--muted);
            }

            .new-chat {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: transparent;
                color: var(--foreground);
                cursor: pointer;
                font-size: 19px;
                transition: background 0.15s;
            }

            .new-chat:hover {
                background: var(--vscode-toolbar-hoverBackground);
            }

            /* CHAT AREA */

            #chat {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 18px 12px;
                display: flex;
                flex-direction: column;
                gap: 20px;
                scroll-behavior: smooth;
            }

            #chat::-webkit-scrollbar {
                width: 5px;
            }

            #chat::-webkit-scrollbar-thumb {
                background: var(--vscode-scrollbarSlider-background);
                border-radius: 8px;
            }

            /* WELCOME SCREEN */

            .welcome {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 48px 14px;
                gap: 12px;
                flex: 1;
            }

            .welcome-logo {
                width: 46px;
                height: 46px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--border);
                font-size: 18px;
                font-weight: 700;
            }

            .welcome-title {
                font-size: 18px;
                font-weight: 600;
            }

            .welcome-description {
                font-size: 12px;
                color: var(--muted);
                line-height: 1.7;
                max-width: 250px;
            }

            /* MESSAGES */

            .message {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 100%;
                min-width: 0;
            }

            .message-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 11px;
                font-weight: 600;
            }

            .avatar {
                width: 22px;
                height: 22px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 700;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border: 1px solid var(--border);
            }

            .message-content {
                line-height: 1.65;
                overflow-wrap: anywhere;
                white-space: pre-wrap;
                font-size: 12.5px;
            }

            /* USER MESSAGE */

            .message.user {
                align-self: flex-end;
                max-width: 90%;
            }

            .message.user .message-header {
                justify-content: flex-end;
            }

            .message.user .message-content {
                background: var(--vscode-input-background);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 11px 13px;
            }

            /* ASSISTANT MESSAGE */

            .message.assistant {
                align-self: stretch;
            }

            .message.assistant .message-content {
                padding: 4px 2px;
            }

            /* ERROR MESSAGE */

            .message.error .message-content {
                color: var(--vscode-errorForeground);
                background: var(--vscode-inputValidation-errorBackground);
                border: 1px solid var(--vscode-inputValidation-errorBorder);
                border-radius: 8px;
                padding: 10px 12px;
            }

            /* LOADING */

            .thinking {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--muted);
                font-size: 12px;
                padding: 8px 2px;
            }

            .thinking-dots {
                display: flex;
                gap: 4px;
            }

            .thinking-dots span {
                width: 5px;
                height: 5px;
                background: var(--muted);
                border-radius: 50%;
                animation: pulse 1.2s infinite;
            }

            .thinking-dots span:nth-child(2) {
                animation-delay: 0.2s;
            }

            .thinking-dots span:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes pulse {
                0%, 60%, 100% {
                    opacity: 0.3;
                    transform: scale(0.8);
                }

                30% {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            /* INPUT AREA */

            .composer {
                flex-shrink: 0;
                padding: 12px;
                border-top: 1px solid var(--border);
                background: var(--background);
            }

            .input-container {
                border: 1px solid var(--vscode-input-border, var(--border));
                border-radius: 10px;
                background: var(--input-bg);
                overflow: hidden;
                transition: border-color 0.15s;
            }

            .input-container:focus-within {
                border-color: var(--accent);
            }

            textarea {
                display: block;
                width: 100%;
                min-height: 65px;
                max-height: 160px;
                resize: none;
                border: none;
                outline: none;
                background: transparent;
                color: var(--vscode-input-foreground);
                font-family: inherit;
                font-size: 12.5px;
                line-height: 1.5;
                padding: 12px;
            }

            textarea::placeholder {
                color: var(--vscode-input-placeholderForeground);
            }

            .input-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 5px 8px 8px 12px;
            }

            .input-hint {
                font-size: 10px;
                color: var(--muted);
            }

            .send-button {
                width: 29px;
                height: 29px;
                border: none;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                cursor: pointer;
            }

            .send-button:hover:not(:disabled) {
                background: var(--vscode-button-hoverBackground);
            }

            .send-button:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .send-button svg {
                width: 15px;
                height: 15px;
            }

            #status {
                font-size: 11px;
                color: var(--muted);
                margin-top: 8px;
                min-height: 0;
            }

            #status:empty {
                display: none;
            }

            .footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-top: 9px;
                font-size: 10px;
                color: var(--muted);
            }

            .status-dot {
                display: inline-block;
                width: 6px;
                height: 6px;
                background: var(--vscode-testing-iconPassed, #4caf50);
                border-radius: 50%;
                margin-right: 5px;
            }
        </style>
    </head>

    <body>

    <div class="app">

        <!-- HEADER -->

        <header class="header">

            <div class="brand">
                <div class="brand-name">DevAid</div>
                <div class="brand-subtitle">AI Coding Assistant</div>
            </div>

            <button
                class="new-chat"
                id="newChat"
                title="New Chat"
                aria-label="New Chat"
            >+</button>

        </header>

        <!-- CHAT -->

        <main id="chat" aria-live="polite">

            <div class="welcome" id="welcome">

                <div class="welcome-logo">D</div>

                <div class="welcome-title">How can I help?</div>

                <div class="welcome-description">
                    Ask questions about your repository,
                    explore code, or understand how
                    different components work together.
                </div>

            </div>

        </main>

        <!-- INPUT -->

        <div class="composer">

            <div class="input-container">

                <textarea
                    id="input"
                    rows="3"
                    placeholder="Ask DevAid about your code..."
                    aria-label="Message DevAid"
                ></textarea>

                <div class="input-toolbar">

                    <span class="input-hint">
                        Enter to send
                    </span>

                    <button
                        id="send"
                        class="send-button"
                        title="Send message"
                        aria-label="Send message"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M12 19V5"></path>
                            <path d="M5 12l7-7 7 7"></path>
                        </svg>
                    </button>

                </div>

            </div>

            <div id="status" role="status"></div>

            <div class="footer">
                <span><span class="status-dot"></span>DevAid</span>
                <span>Repository Assistant</span>
            </div>

        </div>

    </div>
    <script nonce="devaid" src="${markdownScriptUri}"></script>
    <script nonce="devaid">

        const vscode = acquireVsCodeApi();

        const chat = document.getElementById('chat');
        const input = document.getElementById('input');
        const button = document.getElementById('send');
        const status = document.getElementById('status');
        const welcome = document.getElementById('welcome');
        const newChatButton = document.getElementById('newChat');

        let isProcessing = false;
        let thinkingElement = null;

        function scrollToBottom() {
            chat.scrollTop = chat.scrollHeight;
        }

        function removeWelcome() {
            if (welcome && welcome.parentNode) {
                welcome.remove();
            }
        }

        function addMessage(text, role) {

            removeWelcome();

            const message = document.createElement('div');
            message.className = 'message ' + role;

            const header = document.createElement('div');
            header.className = 'message-header';

            const avatar = document.createElement('div');
            avatar.className = 'avatar';

            const name = document.createElement('span');

            if (role === 'user') {
                avatar.textContent = 'Y';
                name.textContent = 'You';
            } else if (role === 'error') {
                avatar.textContent = '!';
                name.textContent = 'Error';
            } else {
                avatar.textContent = 'D';
                name.textContent = 'DevAid';
            }

            header.appendChild(avatar);
            header.appendChild(name);

            const content = document.createElement('div');
            content.className = 'message-content';

            // textContent safely displays model output as plain text.
            if (role === 'assistant' && window.renderMarkdown) {
            content.innerHTML = window.renderMarkdown(text);
            } else {
            content.textContent = text;
        }

            message.appendChild(header);
            message.appendChild(content);

            chat.appendChild(message);

            scrollToBottom();
        }

        function showThinking() {

            removeThinking();

            thinkingElement = document.createElement('div');
            thinkingElement.className = 'thinking';

            const label = document.createElement('span');
            label.textContent = 'DevAid is thinking';

            const dots = document.createElement('div');
            dots.className = 'thinking-dots';

            for (let i = 0; i < 3; i++) {
                dots.appendChild(document.createElement('span'));
            }

            thinkingElement.appendChild(label);
            thinkingElement.appendChild(dots);

            chat.appendChild(thinkingElement);

            scrollToBottom();
        }

        function removeThinking() {

            if (thinkingElement) {
                thinkingElement.remove();
                thinkingElement = null;
            }
        }

        function setProcessing(processing) {

            isProcessing = processing;
            button.disabled = processing;
            input.disabled = processing;

            if (processing) {
                showThinking();
            } else {
                removeThinking();
                input.focus();
            }
        }

        function sendMessage() {

            const text = input.value.trim();

            if (!text || isProcessing) {
                return;
            }

            addMessage(text, 'user');

            input.value = '';

            setProcessing(true);

            vscode.postMessage({
                type: 'userMessage',
                text: text
            });
        }

        button.addEventListener('click', sendMessage);

        input.addEventListener('keydown', event => {

            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }

        });

        newChatButton.addEventListener('click', () => {

            if (isProcessing) {
                return;
            }

            // Clears the visible chat only.
            // Backend conversation reset will be implemented separately.

            chat.replaceChildren();

            const emptyState = document.createElement('div');
            emptyState.className = 'welcome';
            emptyState.id = 'welcome';

            emptyState.innerHTML =
                '<div class="welcome-logo">D</div>' +
                '<div class="welcome-title">New conversation</div>' +
                '<div class="welcome-description">' +
                'Ask DevAid about your repository.' +
                '</div>';

            chat.appendChild(emptyState);

            status.textContent = '';
            input.focus();
        });

        window.addEventListener('message', event => {

            const message = event.data;

            if (message.type === 'status') {
                status.textContent = message.text;
            }

            if (message.type === 'response') {

                setProcessing(false);

                addMessage(message.text, 'assistant');

                status.textContent = '';
            }

            if (message.type === 'error') {

                setProcessing(false);

                addMessage('Error: ' + message.text, 'error');

                status.textContent = '';
            }

        });

    </script>

    </body>
    </html>`;
    }
}
export function deactivate() {}