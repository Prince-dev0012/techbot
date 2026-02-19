import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration (Same as app.js)
const firebaseConfig = {
    apiKey: "AIzaSyBDqEcNZKgXBunaT2pgEaeoB1sQt_6scQI",
    authDomain: "techbot-1e695.firebaseapp.com",
    projectId: "techbot-1e695",
    storageBucket: "techbot-1e695.firebasestorage.app",
    messagingSenderId: "570824018421",
    appId: "1:570824018421:web:ecbb84c2cf00eef306f8bc",
    measurementId: "G-L7HHET9442"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// UI Elements
const loader = document.getElementById('loader');
const userEmailSpan = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');

// Auth State Check
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (loader) loader.classList.add('hidden');
    } else {
        // User is signed out, redirect to login
        window.location.href = 'index.html';
    }
});

// Logout Logic
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged will handle redirect
        } catch (error) {
            console.error("Logout error:", error);
        }
    });
}

// Chat Functionality (Basic Placeholder Logic)
function appendMessage(text, isBot = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(isBot ? 'bot' : 'user');
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (sendBtn && chatInput) {
    const sendMessage = () => {
        const text = chatInput.value.trim();
        if (text) {
            appendMessage(text, false);
            chatInput.value = '';
            
            // Simulate bot response
            setTimeout(() => {
                appendMessage("I'm still learning! I'll be able to help you properly soon.", true);
            }, 1000);
        }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}
