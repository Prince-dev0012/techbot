import { 
    auth, 
    onAuth, 
    saveSettings, 
    loadSettings, 
    saveSources, 
    loadSources,
    saveFile,
    getFiles,
    deleteFile
} from './firestore.js';

// State
let currentSettings = {
    apiKey: '',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    modelId: 'gemini-2.5-flash',
    useOnlineFallback: false
};
let currentSources = '';
let currentFiles = [];

// DOM Elements
const settingsModal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const testConnectionBtn = document.getElementById('test-connection-btn');
const statusMsg = document.getElementById('status-msg');

const apiKeyInput = document.getElementById('api-key');
// const apiUrlInput = document.getElementById('api-url'); // Removed
// const modelIdInput = document.getElementById('model-id'); // Removed
const sourcesInput = document.getElementById('sources-text');
const sourceNameInput = document.getElementById('source-name');
const onlineFallbackInput = document.getElementById('online-fallback');
const customGreetingInput = document.getElementById('custom-greeting');
const fileListContainer = document.getElementById('file-list');

// Initialize
onAuth(async (user) => {
    // Load Settings
    const savedSettings = await loadSettings(user.uid);
    if (savedSettings) {
        currentSettings = { ...currentSettings, ...savedSettings };
        // Enforce hardcoded defaults for API/Model to prevent legacy errors
        currentSettings.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
        currentSettings.modelId = 'gemini-2.5-flash';
    }
    
    // Load Sources
    const savedSources = await loadSources(user.uid);
    if (savedSources) {
        currentSources = savedSources;
    }

    // Load Files
    try {
        currentFiles = await getFiles(user.uid);
    } catch (err) {
        console.error("Error loading files:", err);
    }

    // Populate UI
    populateUI();
});

function populateUI() {
    if(apiKeyInput) apiKeyInput.value = currentSettings.apiKey || '';
    // Model ID and API URL are now handled by defaults
    if(sourcesInput) sourcesInput.value = currentSources || '';
    if(sourceNameInput) sourceNameInput.value = currentSettings.sourceName || '';
    
    renderFileList();

    // Populate Toggles
    const strictSourceMode = document.getElementById('strict-source-mode');
    const onlineSearchMode = document.getElementById('online-search-mode');
    
    if (strictSourceMode) {
        // If settings has strictSource, use it. Default to true if sources exist? No, default false.
        strictSourceMode.checked = currentSettings.strictSourceMode !== undefined ? currentSettings.strictSourceMode : false;
        
        // Listener to disable Online Search if Strict is ON
        strictSourceMode.addEventListener('change', () => {
             if (onlineSearchMode) {
                 onlineSearchMode.disabled = strictSourceMode.checked;
                 onlineSearchMode.parentElement.style.opacity = strictSourceMode.checked ? '0.5' : '1';
             }
        });
    }

    if (onlineSearchMode) {
        onlineSearchMode.checked = currentSettings.useOnlineFallback || false;
        // Initial state check
        if (strictSourceMode && strictSourceMode.checked) {
             onlineSearchMode.disabled = true;
             onlineSearchMode.parentElement.style.opacity = '0.5';
        }
    }
    
    if(customGreetingInput) customGreetingInput.value = currentSettings.customGreeting || '';
}

// Event Listeners
if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        // Trigger reflow for animation
        setTimeout(() => settingsModal.classList.add('active'), 10);
    });
}

if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
            setTimeout(() => settingsModal.style.display = 'none', 300);
        });
    }

    // Toggle API Key Visibility
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    if (toggleApiKeyBtn) {
        toggleApiKeyBtn.addEventListener('click', () => {
            const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
            apiKeyInput.setAttribute('type', type);
            // Optional: change icon
            toggleApiKeyBtn.textContent = type === 'password' ? '👁️' : '🔒';
        });
    }

// File Upload Logic
const fileInput = document.getElementById('kb-file-upload');
if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
    
            const user = auth.currentUser;
            if (!user) {
                showStatus('Please log in to upload files.', 'error');
                return;
            }
    
            showStatus('Uploading files...', 'info');
            
            for (const file of files) {
                try {
                    const text = await readFileContent(file);
                    if (text) {
                        const fileData = {
                            name: file.name,
                            content: text,
                            type: file.type || 'text/plain',
                            size: file.size
                        };
                        
                        // Save directly to Firestore
                        await saveFile(user.uid, fileData);
                        showStatus(`Uploaded ${file.name}`, 'success');
                    }
                } catch (err) {
                    console.error(`Error reading ${file.name}:`, err);
                    showStatus(`Error reading ${file.name}`, 'error');
                }
            }
    
            // Refresh file list
            currentFiles = await getFiles(user.uid);
            renderFileList();
            showStatus('Files uploaded successfully!', 'success');
            
            // Reset input so same file can be selected again if needed
            fileInput.value = '';
        });
    }
    
    function renderFileList() {
        if (!fileListContainer) return;
        
        if (currentFiles.length === 0) {
            fileListContainer.style.display = 'none';
            fileListContainer.innerHTML = '';
            return;
        }
    
        fileListContainer.style.display = 'block';
        fileListContainer.innerHTML = '';
    
        currentFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.style.display = 'flex';
            fileItem.style.justifyContent = 'space-between';
            fileItem.style.alignItems = 'center';
            fileItem.style.padding = '5px 0';
            fileItem.style.borderBottom = '1px solid #eee';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = file.name;
            nameSpan.style.fontSize = '0.9rem';
            nameSpan.title = file.name;
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            nameSpan.style.maxWidth = '200px';
    
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.color = 'red';
            deleteBtn.style.fontSize = '1.2rem';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.title = 'Delete File';
            
            deleteBtn.onclick = async () => {
                if (confirm(`Delete ${file.name}?`)) {
                    const user = auth.currentUser;
                    if (user) {
                        await deleteFile(user.uid, file.id);
                        currentFiles = currentFiles.filter(f => f.id !== file.id);
                        renderFileList();
                    }
                }
            };
    
            fileItem.appendChild(nameSpan);
            fileItem.appendChild(deleteBtn);
            fileListContainer.appendChild(fileItem);
        });
    }
    
    async function readFileContent(file) {
    const name = file.name.toLowerCase();
    
    if (name.endsWith('.txt') || name.endsWith('.csv')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Convert all sheets to CSV/Text
                    let text = '';
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        text += `--- Sheet: ${sheetName} ---\n`;
                        text += XLSX.utils.sheet_to_csv(sheet);
                        text += '\n';
                    });
                    resolve(text);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    } else if (name.endsWith('.pdf')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    
                    // Load PDF document
                    const loadingTask = pdfjsLib.getDocument(typedarray);
                    const pdf = await loadingTask.promise;
                    
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += `--- Page ${i} ---\n${pageText}\n`;
                    }
                    resolve(fullText);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    } else {
        return `[Unsupported file type: ${file.name}]`;
    }
}

// Close on outside click
window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
        setTimeout(() => settingsModal.style.display = 'none', 300);
    }
});

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        const strictSourceMode = document.getElementById('strict-source-mode');
        const onlineSearchMode = document.getElementById('online-search-mode');

        const newSettings = {
            apiKey: apiKeyInput.value.trim(),
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/', // Hardcoded Default
            modelId: 'gemini-2.5-flash', // Hardcoded Default
            useOnlineFallback: onlineSearchMode ? onlineSearchMode.checked : false,
            strictSourceMode: strictSourceMode ? strictSourceMode.checked : false,
            customGreeting: customGreetingInput ? customGreetingInput.value.trim() : '',
            sourceName: sourceNameInput ? sourceNameInput.value.trim() : ''
        };

        const newSources = sourcesInput.value.trim();

        // Update local state immediately (Session Persistence)
        currentSettings = newSettings;
        currentSources = newSources;

        try {
            saveSettingsBtn.textContent = 'Saving...';
            await saveSettings(user.uid, newSettings);
            await saveSources(user.uid, newSources);
            
            showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error(error);
            showStatus('Settings applied (Cloud Save Failed - Check AdBlock?)', 'error');
        } finally {
            saveSettingsBtn.textContent = 'Save Settings';
        }
    });
}

if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
        const modelId = 'gemini-2.5-flash';

        if (!apiKey) {
            showStatus('Please enter an API Key first.', 'error');
            return;
        }

        testConnectionBtn.textContent = 'Testing...';
        testConnectionBtn.disabled = true;

        console.log(`Testing connection with Key: ${apiKey.substring(0, 8)}... Model: ${modelId}`);

        try {
            // Check if it's Gemini API
            const isGemini = apiUrl.includes('generativelanguage.googleapis.com');
            
            let fetchUrl = apiUrl;
            let fetchOptions = {};

            if (isGemini) {
                // Construct Gemini URL
                // Check if user accidentally pasted full URL into model ID or something? No, trust defaults.
                // Ensure apiUrl ends with slash if it's the base path
                let baseUrl = apiUrl;
                if (!baseUrl.endsWith('/') && !baseUrl.includes(':generateContent')) {
                     baseUrl += '/';
                }
                
                // If the user hasn't messed with the URL, it should be fine.
                // Pattern: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY
                
                // Sanitize Model ID: remove 'google/' or 'openai/' prefix if present
                const cleanModelId = modelId.replace(/^(google\/|openai\/|anthropic\/)/, '');

                if (baseUrl.includes(':generateContent')) {
                     // Full URL provided
                     fetchUrl = `${baseUrl}?key=${apiKey}`;
                } else {
                     // Base URL provided
                     fetchUrl = `${baseUrl}${cleanModelId}:generateContent?key=${apiKey}`;
                }
                
                fetchOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: 'Hello' }]
                        }]
                    })
                };
            } else {
                // OpenRouter / OpenAI Standard
                fetchUrl = apiUrl;
                fetchOptions = {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'BolAI Chatbot'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{ role: 'user', content: 'Hello' }]
                    })
                };
            }

            const response = await fetch(fetchUrl, fetchOptions);

            if (response.ok) {
                const data = await response.json();
                console.log('Test Connection Success:', data);
                showStatus('Connection Successful!', 'success');
            } else if (response.status === 400 && isGemini) {
                const errorText = await response.text();
                 console.error("Test Connection Failed (400):", errorText);
                 showStatus("Error: Bad Request (Check Model ID)", "error");
            } else if (response.status === 401) {
                console.error("Test Connection Failed: 401 Unauthorized (Invalid API Key)");
                showStatus("Error: Invalid API Key. Please check your OpenRouter dashboard.", "error");
            } else {
                const errorText = await response.text();
                console.error('Test Connection Failed Body:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: { message: `Status ${response.status}` } };
                }
                showStatus(`Connection Failed: ${errorData.error?.message || response.statusText}`, 'error');
            }
        } catch (error) {
            console.error('Test Connection Error:', error);
            showStatus(`Network Error: ${error.message}`, 'error');
        } finally {
            testConnectionBtn.textContent = 'Test Connection';
            testConnectionBtn.disabled = false;
        }
    });
}

function showStatus(msg, type) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.className = `status-msg ${type}`;
    statusMsg.style.display = 'block';
    setTimeout(() => {
        statusMsg.style.display = 'none';
    }, 5000);
}

// Export for chat.js to access
export function getSettings() {
    return currentSettings;
}

export function getSources() {
    return currentSources;
}
