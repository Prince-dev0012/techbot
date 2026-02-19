import { subscribeToChats, createNewChat, saveMessage, deleteChat } from './chat-service.js';
import { getEvents, getNotifications } from './firebase.js';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const chatHistory = document.getElementById('chat-history');
const clearHistoryBtn = document.getElementById('clear-chats-btn');
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const apiKeyInput = document.getElementById('api-key');
const systemPromptInput = document.getElementById('system-prompt');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('chat-sidebar');

// State
let currentChatId = null;
let apiKey = localStorage.getItem('techbot_api_key') || '';
let systemPrompt = localStorage.getItem('techbot_system_prompt') || 'You are TechBot, a helpful AI assistant for TechXplore.';
let contextData = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load Settings
    if (apiKeyInput) apiKeyInput.value = apiKey;
    if (systemPromptInput) systemPromptInput.value = systemPrompt;

    // Load Context (RAG-lite)
    await loadContextData();

    // Subscribe to History
    subscribeToChats((chats) => {
        renderHistory(chats);
    });

    // Event Listeners
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    newChatBtn.addEventListener('click', () => {
        currentChatId = null;
        chatMessages.innerHTML = '';
        addMessage('assistant', 'Hello! I\'m TechBot. How can I help you with TechXplore today?');
    });

    // Settings Modal
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.style.display = 'none');
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            apiKey = apiKeyInput.value.trim();
            systemPrompt = systemPromptInput.value.trim();
            localStorage.setItem('techbot_api_key', apiKey);
            localStorage.setItem('techbot_system_prompt', systemPrompt);
            settingsModal.style.display = 'none';
            alert('Settings saved!');
        });
    }

    // Sidebar Toggle (Mobile)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Clear History (Local only for demo, or delete all from firestore?)
    // For safety, let's just reload or clear local view.
    // Real implementation would delete from Firestore.
    // We have deleteChat function.
});

async function loadContextData() {
    try {
        const events = await getEvents();
        const notifications = await getNotifications();
        
        let context = "Current Date: " + new Date().toLocaleDateString() + "\n\n";
        
        if (events.length > 0) {
            context += "UPCOMING EVENTS:\n";
            events.forEach(e => {
                context += `- Event: ${e.title}\n  Date: ${e.date}\n  Venue: ${e.venue}\n  Description: ${e.shortDescription}\n\n`;
            });
        }
        
        if (notifications.length > 0) {
            context += "LATEST ANNOUNCEMENTS:\n";
            notifications.forEach(n => {
                context += `- Notification: ${n.title}\n  Message: ${n.message}\n\n`;
            });
        }
        
        contextData = context;
        console.log("RAG Context Loaded:", contextData.length, "chars");
    } catch (e) {
        console.error("Error loading context:", e);
    }
}

function renderHistory(chats) {
    chatHistory.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        div.innerHTML = `
            <span><i class="far fa-comment-alt"></i> ${chat.title}</span>
            <i class="fas fa-trash-alt delete-chat-btn" title="Delete"></i>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-chat-btn')) {
                e.stopPropagation();
                if(confirm('Delete this chat?')) deleteChat(chat.id);
                return;
            }
            loadChat(chat);
        });
        
        chatHistory.appendChild(div);
    });
}

function loadChat(chat) {
    currentChatId = chat.id;
    chatMessages.innerHTML = '';
    
    // Highlight in sidebar
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    // (Re-rendering sidebar handles active class, but for instant feedback:)
    
    chat.messages.forEach(msg => {
        addMessage(msg.role, msg.content, false);
    });
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    
    if (!apiKey) {
        alert('Please set your API Key in Settings first.');
        settingsModal.style.display = 'flex';
        return;
    }

    userInput.value = '';
    addMessage('user', text);
    
    // Create chat if new
    if (!currentChatId) {
        try {
            currentChatId = await createNewChat(text);
        } catch (e) {
            console.error("Failed to create chat:", e);
            addMessage('assistant', 'Error: Could not start new chat.');
            return;
        }
    } else {
        // Save user message
        saveMessage(currentChatId, {
            role: 'user',
            content: text,
            timestamp: Date.now()
        });
    }

    // Prepare Prompt with RAG
    const messages = [
        { role: "system", content: `${systemPrompt}\n\nCONTEXT DATA:\n${contextData}\n\nINSTRUCTIONS:\nUse the above context to answer user questions. If you use information from the context, strictly cite the source using the format [SOURCE_USED: Event Name/Title].` },
        // We should ideally load previous messages here for context window
        // For simplicity, we just send the last message and system prompt, or a few recent.
        { role: "user", content: text }
    ];

    // Stream Response
    await streamResponse(messages);
}

async function streamResponse(messages) {
    const responseDiv = addMessage('assistant', '<i class="fas fa-spinner fa-spin"></i> Thinking...', false);
    let fullResponse = "";
    
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.href,
            },
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo", // Or any free model if available, user can change logic
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        // Clear spinner
        responseDiv.innerHTML = "";
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content || "";
                        fullResponse += content;
                        responseDiv.innerHTML = marked.parse(fullResponse);
                        
                        // Auto-scroll
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }
        
        // Save assistant message
        if (currentChatId) {
            saveMessage(currentChatId, {
                role: 'assistant',
                content: fullResponse,
                timestamp: Date.now()
            });
        }
        
    } catch (error) {
        responseDiv.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
}

function addMessage(role, content, save = true) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    // Parse Markdown if assistant
    const htmlContent = role === 'assistant' ? (content.includes('<i class') ? content : marked.parse(content)) : content;
    
    div.innerHTML = `
        <div class="message-content">${htmlContent}</div>
    `;
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return div.querySelector('.message-content');
}
