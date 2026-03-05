const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let history = [];
let isSending = false;

// Window controls
document.getElementById('btn-minimize').addEventListener('click', () => window.api.minimize());
document.getElementById('btn-maximize').addEventListener('click', () => window.api.maximize());
document.getElementById('btn-close').addEventListener('click', () => window.api.close());

function appendMessage(role, text, isMarkdown = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'user' ? 'ME' : 'AI';

    const textDiv = document.createElement('div');
    textDiv.className = 'text';

    if (isMarkdown && role !== 'user') {
        textDiv.innerHTML = marked.parse(text);
    } else {
        textDiv.textContent = text;
    }

    msgDiv.appendChild(avatar);
    msgDiv.appendChild(textDiv);
    chatContainer.appendChild(msgDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function setLoading(loading) {
    isSending = loading;
    sendBtn.disabled = loading;
    userInput.disabled = loading;
    if (loading) {
        sendBtn.classList.add('loading');
    } else {
        sendBtn.classList.remove('loading');
        userInput.focus();
    }
}

async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message || isSending) return;

    userInput.value = '';
    userInput.style.height = 'auto';

    appendMessage('user', message);
    setLoading(true);

    appendMessage('system', 'Thinking...');

    try {
        const response = await window.api.sendMessage({ message, history });

        chatContainer.removeChild(chatContainer.lastChild);
        appendMessage('system', response, true);

        history.push({ role: "user", content: message });
        history.push({ role: "assistant", content: response });

        if (history.length > 20) history = history.slice(-20);
    } catch (error) {
        chatContainer.lastChild.querySelector('.text').textContent = "Error: " + error.message;
    } finally {
        setLoading(false);
    }
}

sendBtn.addEventListener('click', handleSendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.scrollHeight > 150) {
        this.style.overflowY = 'auto';
        this.style.height = '150px';
    } else {
        this.style.overflowY = 'hidden';
    }
});
