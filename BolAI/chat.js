import { 
    auth, 
    onAuth, 
    saveMessage, 
    listenToMessages, 
    logout,
    createNewChat,
    listenToChatList,
    updateChatTitle,
    updateChatTimestamp,
    deleteChat,
    getFiles,
    getTechBotContext
} from './firestore.js';
import { getSettings, getSources } from './settings.js';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const userAvatar = document.getElementById('user-avatar');
const loader = document.getElementById('loader');
const welcomeScreen = document.getElementById('welcome-screen');
const historyList = document.getElementById('chat-history-list');
const newChatBtn = document.getElementById('new-chat-btn');
const mobileNewChatBtn = document.getElementById('mobile-new-chat');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

// State
let currentChatId = null;
let currentUnsubscribeMessages = null;
let currentUnsubscribeChats = null;
let currentMessagesCache = []; // Cache for AI context
let isInitialLoad = true;
let isGenerating = false;
let abortController = null; // For stopping generation

// Initialize
onAuth(async (user) => {
    // User Info
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    if (userAvatar) userAvatar.textContent = user.email[0].toUpperCase();
    if (loader) loader.classList.add('hidden');

    // Listen to Chat List
    if (currentUnsubscribeChats) currentUnsubscribeChats();
    currentUnsubscribeChats = listenToChatList(user.uid, (chats) => {
        renderChatList(chats);
        
        // If no chat selected, or no chats exist, create one or select first?
        // Let's stay on "Welcome" screen if no chat selected.
        // Or if chats exist and currentChatId is null, maybe don't select automatically to show welcome screen.
    });
});

// Sidebar & Mobile Menu
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
});

// New Chat
async function handleNewChat() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const newId = await createNewChat(user.uid);
        loadChat(newId);
        // On mobile, close sidebar after creating new chat
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
    } catch (error) {
        console.error("Error creating chat:", error);
    }
}

if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
if (mobileNewChatBtn) mobileNewChatBtn.addEventListener('click', handleNewChat);

// Logout
if (logoutBtn) logoutBtn.addEventListener('click', logout);

const stopBtn = document.getElementById('stop-btn');

// Stop Generation
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        if (abortController) {
            abortController.abort();
            abortController = null;
            isGenerating = false;
            removeTypingIndicator();
            sendBtn.disabled = false;
            stopBtn.classList.remove('active');
            stopBtn.style.display = 'none'; // Ensure hidden
            chatInput.focus();
        }
    });
}

// Chat Loading Logic
function loadChat(chatId) {
    if (currentChatId === chatId) return;
    currentChatId = chatId;
    isInitialLoad = true;
    
    // Update UI Active State
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === chatId) item.classList.add('active');
    });

    // Hide Welcome Screen initially (will be shown if empty in renderMessages)
    if(welcomeScreen) welcomeScreen.style.display = 'none';
    chatMessages.innerHTML = ''; // Clear previous messages
    chatMessages.style.display = 'flex'; // Ensure it's visible while loading
    // But if we want to show welcome screen on initial load if no messages?
    // loadChat calls listenToMessages, which calls renderMessages.
    // If messages are empty, renderMessages will show welcome screen.
    // So clearing here is fine.

    // Unsubscribe previous listener
    if (currentUnsubscribeMessages) currentUnsubscribeMessages();

    const user = auth.currentUser;
    currentUnsubscribeMessages = listenToMessages(user.uid, chatId, (messages) => {
        currentMessagesCache = messages; // Update Cache
        renderMessages(messages);
        isInitialLoad = false; // After first batch, subsequent updates are "new"
    });
}

// Render Chat List
function renderChatList(chats) {
    historyList.innerHTML = '';
    
    if (chats.length === 0) {
        // Maybe show "No chats" placeholder
        return;
    }

    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        item.dataset.id = chat.id;
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = chat.title || "New Chat";
        item.appendChild(titleSpan);

        item.addEventListener('click', () => {
            loadChat(chat.id);
            if (window.innerWidth <= 768) sidebar.classList.remove('open');
        });

        historyList.appendChild(item);
    });
}

// Render Messages
function renderMessages(messages) {
    // Check for empty messages -> Show Welcome with Custom Greeting and Source Animation
    if (messages.length === 0) {
        const settings = getSettings();
        const greeting = settings.customGreeting || "How can I help you today?";
        const welcomeTitle = document.querySelector('.welcome-screen h1');
        
        if(welcomeTitle) welcomeTitle.textContent = greeting;
        if(welcomeScreen) {
            welcomeScreen.style.display = 'flex';
            chatMessages.style.display = 'none'; // Hide message area
            
            // Animated Source Greeting
            const sourceName = settings.sourceName || "Knowledge Base";
            const sources = getSources();
            
            // Remove existing source-greeting if any to prevent duplicates
            const existingSourceGreeting = document.getElementById('source-greeting-anim');
            if (existingSourceGreeting) existingSourceGreeting.remove();

            if (sources && sources.trim().length > 0) {
                const sourceGreetingDiv = document.createElement('div');
                sourceGreetingDiv.id = 'source-greeting-anim';
                sourceGreetingDiv.className = 'source-greeting-anim';
                sourceGreetingDiv.innerHTML = `<span>Ready to answer from <strong>${sourceName}</strong></span>`;
                welcomeScreen.appendChild(sourceGreetingDiv);
            }
        }
        return;
    }
    
    if(welcomeScreen) welcomeScreen.style.display = 'none';
    chatMessages.style.display = 'flex'; // Show message area

    // Strategy: 
    // 1. Identify existing messages in DOM.
    // 2. Append new ones.
    // 3. If new one is assistant & !isInitialLoad, animate it.
    
    const existingIds = new Set(Array.from(chatMessages.children).map(el => el.dataset.id));
    
    messages.forEach(msg => {
        if (existingIds.has(msg.id)) return; // Already rendered

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;
        msgDiv.dataset.id = msg.id;
        
        // Timestamp
        let timeString = '';
        const ts = msg.timestamp || new Date(); // Fallback to now if pending
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // --- NEW RENDERING LOGIC: SPLIT TEXT & CODE ---
        if (msg.role === 'assistant') {
            
            // 1. SOURCE LABEL (Top of message, ONLY if isSource)
            if (msg.isSource) {
                const sourceLabel = document.createElement('div');
                sourceLabel.className = 'source-label-container';
                sourceLabel.innerHTML = `<span class="source-badge">Source Context Used</span>`;
                msgDiv.appendChild(sourceLabel);
            }

            // 2. CONTENT SPLITTING
            const parts = msg.content.split(/(```[\s\S]*?```)/g);
            
            parts.forEach(part => {
                if (!part.trim()) return; 

                const partDiv = document.createElement('div');
                
                if (part.startsWith('```') && part.endsWith('```')) {
                    // CODE BLOCK
                    partDiv.className = 'message-content code-part'; 
                    // Render only the code block
                    partDiv.innerHTML = marked.parse(part); 
                    addCopyButtons(partDiv);
                } else {
                    // TEXT BLOCK
                    // Source Text gets .source-bg
                    // Standard Text gets .text-bg (new container style)
                    partDiv.className = `message-content ${msg.isSource ? 'source-bg' : 'text-bg'}`;
                    partDiv.innerHTML = marked.parse(part);
                }
                msgDiv.appendChild(partDiv);
            });
            
            // 3. COPY BUTTON (Bottom of message, Icon Only)
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            
            // Timestamp for Assistant
            if (timeString) {
                const timeSpan = document.createElement('span');
                timeSpan.className = 'message-timestamp';
                timeSpan.textContent = timeString;
                actionsDiv.appendChild(timeSpan);
            }

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-response-btn';
            copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(msg.content).then(() => {
                    copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => {
                       copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    }, 2000);
                });
            };
            actionsDiv.appendChild(copyBtn);
            msgDiv.appendChild(actionsDiv);

        } else {
            // User Message (Standard)
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = marked.parse(msg.content);
            msgDiv.appendChild(contentDiv);

            // Actions for User (Copy)
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            
            // Timestamp for User
            if (timeString) {
                const timeSpan = document.createElement('span');
                timeSpan.className = 'message-timestamp';
                timeSpan.textContent = timeString;
                actionsDiv.appendChild(timeSpan);
            }

            // Copy Button for User
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-response-btn';
            copyBtn.style.marginLeft = '8px'; // Add some spacing
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(msg.content).then(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => {
                       copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    }, 2000);
                });
            };
            actionsDiv.appendChild(copyBtn);
            msgDiv.appendChild(actionsDiv);
        }
        
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    });

    scrollToBottom();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Typewriter Effect
function typeWriter(element, text) {
    element.textContent = '';
    let i = 0;
    element.classList.add('cursor'); // Add cursor
    
    // Speed: 10ms - 30ms per char
    const interval = setInterval(() => {
        element.textContent += text.charAt(i);
        i++;
        scrollToBottom();
        
        if (i >= text.length) {
            clearInterval(interval);
            element.classList.remove('cursor'); // Remove cursor
            // Finalize with Markdown
            element.innerHTML = marked.parse(text);
            addCopyButtons(element);
        }
    }, 15);
}

// Helper to add Copy Code Buttons
function addCopyButtons(container) {
    const preTags = container.querySelectorAll('pre');
    preTags.forEach(pre => {
        // Check if already processed
        if (pre.querySelector('.code-header')) return;

        const codeBlock = pre.querySelector('code');
        if (!codeBlock) return;

        // Create Header
        const header = document.createElement('div');
        header.className = 'code-header';
        
        // Language label (try to get class from code block)
        const langClass = Array.from(codeBlock.classList).find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : 'Code';
        
        const langSpan = document.createElement('span');
        langSpan.textContent = lang.toUpperCase();
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.innerHTML = `<span>Copy</span>`;
        copyBtn.addEventListener('click', () => {
            const codeText = codeBlock.innerText; // Get text content of code
            navigator.clipboard.writeText(codeText).then(() => {
                copyBtn.innerHTML = `<span>Copied!</span>`;
                setTimeout(() => copyBtn.innerHTML = `<span>Copy</span>`, 2000);
            });
        });

        header.appendChild(langSpan);
        header.appendChild(copyBtn);

        // Wrapper for Code Content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'code-content';
        
        // Move code into wrapper
        // Note: marked renders <pre><code>...</code></pre>
        // We want <pre><header>...</header><div class="code-content"><code>...</code></div></pre>
        // Or wrap the pre?
        // Let's modify the structure slightly.
        // Current structure: pre > code
        // New structure: div.code-block-wrapper > header + pre > code
        // But `pre` has the black background style.
        // Let's keep `pre` as the container?
        // No, `pre` implies preformatted text.
        // Better: Wrap the original code content in a new div, insert header before it.
        
        // Actually, let's restructure:
        // Create a wrapper div to replace the pre
        const wrapper = document.createElement('div');
        wrapper.style.backgroundColor = '#000000';
        wrapper.style.border = '1px solid var(--border-color)';
        wrapper.style.borderRadius = '8px';
        wrapper.style.margin = '12px 0';
        wrapper.style.overflow = 'hidden'; // Ensure header corners are clipped

        // Clone the code block
        const newPre = document.createElement('pre');
        newPre.style.margin = '0';
        newPre.style.border = 'none';
        newPre.style.borderRadius = '0';
        newPre.style.background = 'transparent';
        newPre.appendChild(codeBlock.cloneNode(true));
        
        // Add padding to newPre (or code-content)
        const codeContentDiv = document.createElement('div');
        codeContentDiv.className = 'code-content';
        codeContentDiv.appendChild(newPre);

        wrapper.appendChild(header);
        wrapper.appendChild(codeContentDiv);
        
        // Replace old pre with new wrapper
        pre.parentNode.replaceChild(wrapper, pre);
        
        // Re-attach event listener to new button (it's in the DOM now)
        // Wait, the button logic above is attached to the element in memory. It should work.
    });
}

// Send Message
async function handleSendMessage() {
    if (isGenerating) return;

    const text = chatInput.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    // Ensure we have a chat session
    if (!currentChatId) {
        try {
            const newChatId = await createNewChat(user.uid);
            loadChat(newChatId); // This will set up listener and update currentChatId
        } catch (e) {
            console.error("Failed to create chat", e);
            return;
        }
    }

    // Clear Input
    chatInput.value = '';
    adjustTextareaHeight(chatInput); // Reset height
    sendBtn.disabled = true;
    sendBtn.style.display = 'none'; // Hide Send button

    // 1. Save User Message
    try {
        await saveMessage(user.uid, currentChatId, {
            role: 'user',
            content: text,
            timestamp: new Date()
        });
        
        // Update chat timestamp for sorting
        updateChatTimestamp(user.uid, currentChatId);

        // 2. Show Thinking/Typing Indicator
        showTypingIndicator();
        isGenerating = true;

        // 3. Call AI
        // Show stop button
        if (stopBtn) {
            stopBtn.style.display = 'flex';
            setTimeout(() => stopBtn.classList.add('active'), 10);
        }
        
        await callAI(user.uid, currentChatId, text);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Generation stopped by user');
            // Maybe add a small system message saying "Stopped"
        } else {
            console.error("Error flow:", error);
            removeTypingIndicator();
            // Append error message locally
            const errDiv = document.createElement('div');
            errDiv.className = 'message assistant';
            errDiv.innerHTML = `<div class="message-content" style="color: #ef4444;">Error: ${error.message}</div>`;
            chatMessages.appendChild(errDiv);
        }
    } finally {
        isGenerating = false;
        sendBtn.disabled = chatInput.value.trim() === ''; // Enable only if text exists
        sendBtn.style.display = 'flex'; // Show Send button
        if (stopBtn) {
            stopBtn.classList.remove('active');
            stopBtn.style.display = 'none';
        }
        
        // Focus back on input
        chatInput.focus();
    }
}

// Event Listeners for Input
if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);

if (chatInput) {
    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        adjustTextareaHeight(this);
        sendBtn.disabled = this.value.trim() === '';
    });

    // Enter to send (Shift+Enter for newline)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}

function adjustTextareaHeight(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight < 200 ? el.scrollHeight : 200) + 'px';
    if (el.value === '') el.style.height = 'auto';
}

// Typing Indicator Helpers
let typingIndicatorDiv = null;

function showTypingIndicator() {
    if (typingIndicatorDiv) return;
    typingIndicatorDiv = document.createElement('div');
    typingIndicatorDiv.className = 'typing-indicator';
    typingIndicatorDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatMessages.appendChild(typingIndicatorDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    if (typingIndicatorDiv) {
        typingIndicatorDiv.remove();
        typingIndicatorDiv = null;
    }
}

// AI Call & Auto-Title
async function callAI(uid, chatId, userMessage) {
    const settings = getSettings();
    const sourcesText = getSources();
    let files = [];
    
    try {
        files = await getFiles(uid);
    } catch (e) {
        console.error("Error fetching files:", e);
    }

    // --- TechBot Data Injection ---
    try {
        const techBotContext = await getTechBotContext();
        if (techBotContext) {
            files.push({
                name: "TechBot Data",
                content: techBotContext,
                type: "system-data",
                size: techBotContext.length
            });
        }
    } catch (e) {
        console.error("Error fetching TechBot context:", e);
    }
    
    // Combine Sources & Filter (RAG - Client Side)
    // User requested: "use conditions insted if aksed q was in source or file it should give that to prompt using string concate"
    
    // 1. Construct Full Context List (Chunks)
    const allChunks = [];
    let totalChars = 0;
    
    // Add Manual Source Text
    if (sourcesText && sourcesText.trim()) {
        const textChunks = sourcesText.split(/\n\s*\n/); // Split by paragraphs
        textChunks.forEach(chunk => {
            if (chunk.trim()) {
                allChunks.push({ text: chunk.trim(), source: "Manual Entry", score: 0 });
                totalChars += chunk.trim().length;
            }
        });
    }

    // Add Files
    if (files.length > 0) {
        files.forEach(file => {
            // Split file content by paragraphs/lines
            const fileChunks = file.content.split(/\n\s*\n/);
            fileChunks.forEach(chunk => {
                if (chunk.trim()) {
                    allChunks.push({ 
                        text: chunk.trim(), 
                        source: `File: ${file.name}`, 
                        score: 0 
                    });
                    totalChars += chunk.trim().length;
                }
            });
        });
    }

    let combinedSources = "";
    const hasSources = allChunks.length > 0;
    const MAX_CONTEXT_CHARS = 12000; // ~3000 tokens

    if (hasSources) {
        // STRATEGY: 
        // If total content is small enough, SEND EVERYTHING (Bypass RAG).
        // This ensures NO data loss for small/medium files.
        if (totalChars < MAX_CONTEXT_CHARS) {
            combinedSources += "--- KNOWLEDGE BASE START ---\n";
            for (const chunk of allChunks) {
                 combinedSources += `[Source: ${chunk.source}]\n${chunk.text}\n\n`;
            }
            combinedSources += "--- KNOWLEDGE BASE END ---\n";
        } else {
            // RAG MODE (Large Data)
            // 2. Score Chunks based on Query
            // Improve Search Logic: Fuzzy matching, stemming (simple), and bigrams
            const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '');
            const queryTerms = normalize(userMessage).split(/\s+/).filter(w => w.length > 2);
            
            // Generate bigrams for better phrase matching
            const bigrams = [];
            for (let i = 0; i < queryTerms.length - 1; i++) {
                bigrams.push(queryTerms[i] + " " + queryTerms[i+1]);
            }
    
            allChunks.forEach(chunk => {
                const lowerText = normalize(chunk.text);
                let matches = 0;
                
                // Keyword matching
                queryTerms.forEach(term => {
                    if (lowerText.includes(term)) matches += 1; // Base score
                });
    
                // Bigram matching (higher weight)
                bigrams.forEach(bigram => {
                    if (lowerText.includes(bigram)) matches += 2;
                });
                
                // Exact phrase bonus (if query is short enough)
                if (userMessage.length < 50 && lowerText.includes(normalize(userMessage))) {
                    matches += 5;
                }
    
                chunk.score = matches;
            });
    
            // 3. Filter & Sort
            // Improve sorting: Prioritize chunks with higher density of matches?
            // Current score is just count.
            
            let relevantChunks = allChunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score);
            
            // Fallback Strategy:
            // If relevantChunks is empty, check for very short common words or just take the first few chunks (Introduction).
            if (relevantChunks.length === 0) {
                 // Fallback: Include the first 5 chunks of the Knowledge Base.
                 relevantChunks = allChunks.slice(0, 5);
            }
    
            // 4. Concatenate until Limit
            let currentChars = 0;
    
            if (relevantChunks.length > 0) {
                combinedSources += "--- RELEVANT CONTEXT START ---\n";
                for (const chunk of relevantChunks) {
                    const chunkStr = `[Source: ${chunk.source}]\n${chunk.text}\n\n`;
                    if (currentChars + chunkStr.length > MAX_CONTEXT_CHARS) break;
                    combinedSources += chunkStr;
                    currentChars += chunkStr.length;
                }
                combinedSources += "--- RELEVANT CONTEXT END ---\n";
            }
        }
    }

    if (!settings.apiKey) {
        removeTypingIndicator();
        alert("Please set your OpenRouter API Key in Settings.");
        return;
    }
    
    if (!settings.modelId) {
        removeTypingIndicator();
        alert("Please set a Model ID in Settings (e.g., google/gemini-2.0-flash-001).");
        return;
    }

    // Prepare System Prompt
    let systemPrompt = "You are a helpful AI assistant.";
    
    // Check if we actually have RELEVANT sources now
    const hasRelevantSources = combinedSources.trim().length > 0;

    if (settings.strictSourceMode) {
        if (hasRelevantSources) {
            // STRICT MODE (Offline / Knowledge Base Only)
            systemPrompt = `You are a strict AI assistant. Answer the user's question.
You have access to a Knowledge Base (Relevant Context).

Relevant Context:
${combinedSources}

INSTRUCTIONS:
1. FIRST, try to answer using the provided Relevant Context.
2. If the answer is found in the context, start your response with "[SOURCE_USED]".
3. If the answer is NOT found in the context, you MAY use your general knowledge, BUT you must explicitly state: "This information is not in your uploaded files, but here is what I know:".
4. DO NOT use the "[SOURCE_USED]" tag if you are using general knowledge.`;
        } else {
             // Strict mode is ON, but no relevant context found.
             systemPrompt = `You are a strict AI assistant. You have access to a Knowledge Base, but no relevant information was found for the user's query.
             
INSTRUCTIONS:
1. You may answer from general knowledge.
2. You MUST preface your answer with: "I couldn't find this in your uploaded files, but here is a general answer:".`;
        }
    } else if (hasRelevantSources) {
        // HYBRID MODE (Default with Sources)
        systemPrompt = `You are a helpful AI assistant. You have access to a Knowledge Base.
Use the Knowledge Base to answer the user's questions when relevant. 
If the Knowledge Base doesn't contain the answer, you can use your general knowledge.

Relevant Context:
${combinedSources}

INSTRUCTIONS:
1. First, check the Relevant Context for the answer.
2. If the answer is found in the context, you MUST start your response with "[SOURCE_USED]".
3. If the answer is NOT in the context, use your general knowledge to answer.
4. If you use general knowledge (not the Knowledge Base), DO NOT use the "[SOURCE_USED]" tag.`;
    } else {
        // No sources available or found
        systemPrompt = "You are a helpful AI assistant. Answer the user's questions to the best of your ability.";
    }

    // Prepare History
    let historyMessages = [];
    try {
         // Use cached messages instead of DOM
         // Filter out empty content and system messages (if any stored)
         // Map to { role, content }
         const cleanMessages = currentMessagesCache
            .filter(msg => msg.content && msg.content.trim().length > 0)
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model', // Gemini uses 'model' instead of 'assistant'
                content: msg.content.trim()
            }));

         // Check if the last message is the current user message (avoid duplicate)
         // If we just sent "Hello", and it's in cache, cleanMessages has "Hello" at end.
         // We are about to append "Hello" again in messagesPayload.
         // So we should remove the last one if it matches.
         
         const lastMsg = cleanMessages[cleanMessages.length - 1];
         if (lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage.trim()) {
             cleanMessages.pop();
         }
         
         // Take last 10 of remaining
         historyMessages = cleanMessages.slice(-10);
         
    } catch (e) {
        console.warn("Failed to process history", e);
    }

    abortController = new AbortController();

    try {
        const isGemini = settings.apiUrl.includes('generativelanguage.googleapis.com');
        let bodyPayload;
        let fetchUrl = settings.apiUrl;
        let fetchHeaders = {
            'Content-Type': 'application/json'
        };

        if (isGemini) {
            // Construct Gemini URL
            let baseUrl = settings.apiUrl;
            if (!baseUrl.endsWith('/') && !baseUrl.includes(':generateContent')) {
                 baseUrl += '/';
            }
            
            // Sanitize Model ID: remove 'google/' or 'openai/' prefix if present
            const cleanModelId = settings.modelId.replace(/^(google\/|openai\/|anthropic\/)/, '');

            if (baseUrl.includes(':generateContent')) {
                 fetchUrl = `${baseUrl}?key=${settings.apiKey.trim()}`;
            } else {
                 fetchUrl = `${baseUrl}${cleanModelId}:generateContent?key=${settings.apiKey.trim()}`;
            }

            // Convert history to Gemini Format
            // { role: "user" | "model", parts: [{ text: "..." }] }
            const contents = historyMessages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }));
            
            // Add current user message
            contents.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });

            bodyPayload = JSON.stringify({
                system_instruction: {
                    parts: { text: systemPrompt }
                },
                contents: contents
            });

        } else {
            // Standard OpenRouter / OpenAI
            fetchHeaders['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
            fetchHeaders['HTTP-Referer'] = window.location.origin;
            fetchHeaders['X-Title'] = 'BolAI Chatbot';

            const messagesPayload = [
                { role: "system", content: systemPrompt },
                ...historyMessages.map(m => ({role: m.role === 'model' ? 'assistant' : m.role, content: m.content})),
                { role: "user", content: userMessage }
            ];

            bodyPayload = JSON.stringify({
                model: settings.modelId,
                messages: messagesPayload
            });
        }

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: fetchHeaders,
            body: bodyPayload,
            signal: abortController.signal
        });

        if (response.status === 401) {
            throw new Error("Invalid API Key (401). Please check Settings.");
        }
        
        if (!response.ok) {
            const errText = await response.text();
            console.error("API Error Body:", errText);
            let errJson;
            try {
                errJson = JSON.parse(errText);
            } catch (e) {
                errJson = { error: { message: `Status ${response.status}: ${response.statusText}` } };
            }
            throw new Error(errJson.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        let aiContent = '';
        
        if (isGemini) {
            // Gemini Response Parsing
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                aiContent = data.candidates[0].content.parts.map(p => p.text).join(' ');
            } else {
                // Safety blocking or empty response
                if (data.promptFeedback && data.promptFeedback.blockReason) {
                     aiContent = `[Blocked by Safety Filter: ${data.promptFeedback.blockReason}]`;
                } else {
                     aiContent = "[No response generated]";
                }
            }
        } else {
            // OpenAI / OpenRouter Response Parsing
            aiContent = data.choices[0].message.content;
        }

        let isSource = false;

        // Check for Source Tag
        // Regex to match [SOURCE_USED] with optional colon and whitespace
        const sourceTagRegex = /\[SOURCE_USED\]:?\s*/i;
        if (sourceTagRegex.test(aiContent)) {
            isSource = true;
            aiContent = aiContent.replace(sourceTagRegex, '').trim();
        }

        removeTypingIndicator();

        // Save AI Response
        await saveMessage(uid, chatId, {
            role: 'assistant',
            content: aiContent,
            timestamp: new Date(),
            isSource: isSource
        });
        
        // Auto-Title Logic (Fire and forget)
        const activeChatTitle = document.querySelector(`.history-item[data-id="${chatId}"] span`);
        if (activeChatTitle && activeChatTitle.textContent === "New Chat") {
            generateChatTitle(uid, chatId, userMessage, aiContent, settings);
        }

    } catch (error) {
        throw error;
    }
}

async function generateChatTitle(uid, chatId, userMsg, aiMsg, settings) {
    // Simple prompt to generate title
    try {
        const isGemini = settings.apiUrl.includes('generativelanguage.googleapis.com');
        let fetchUrl = settings.apiUrl;
        let fetchHeaders = { 'Content-Type': 'application/json' };
        let bodyPayload;

        if (isGemini) {
             let baseUrl = settings.apiUrl;
             if (!baseUrl.endsWith('/') && !baseUrl.includes(':generateContent')) baseUrl += '/';
             
             // Sanitize Model ID
             const cleanModelId = settings.modelId.replace(/^(google\/|openai\/|anthropic\/)/, '');

             if (baseUrl.includes(':generateContent')) {
                  fetchUrl = `${baseUrl}?key=${settings.apiKey.trim()}`;
             } else {
                  fetchUrl = `${baseUrl}${cleanModelId}:generateContent?key=${settings.apiKey.trim()}`;
             }

             bodyPayload = JSON.stringify({
                 contents: [
                     { role: 'user', parts: [{ text: `Generate a very short title (3-5 words max) for this conversation based on: User: "${userMsg}" AI: "${aiMsg}". Do not use quotes.` }] }
                 ],
                 generationConfig: { maxOutputTokens: 20 }
             });

        } else {
             fetchHeaders['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
             bodyPayload = JSON.stringify({
                model: settings.modelId,
                messages: [
                    { role: "system", content: "Generate a very short title (3-5 words max) for this conversation. Do not use quotes." },
                    { role: "user", content: userMsg },
                    { role: "assistant", content: aiMsg }
                ],
                max_tokens: 20
            });
        }

        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: fetchHeaders,
            body: bodyPayload
        });
        
        if (response.ok) {
            const data = await response.json();
            let title = '';
            if (isGemini) {
                 if (data.candidates && data.candidates[0].content) {
                     title = data.candidates[0].content.parts[0].text;
                 }
            } else {
                 title = data.choices[0].message.content;
            }
            
            title = title ? title.trim().replace(/^["']|["']$/g, '') : '';
            
            if (title) {
                updateChatTitle(uid, chatId, title);
            }
        }
    } catch (e) {
        console.warn("Failed to auto-title chat:", e);
    }
}
