import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    deleteDoc,
    getDocs,
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
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
const db = getFirestore(app);

// Authentication State Listener
function onAuth(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            callback(user);
        } else {
            window.location.href = 'index.html'; // Redirect to login if not authenticated
        }
    });
}

// Logout Function
async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

// --- Firestore Operations ---

// Save User Settings
async function saveSettings(uid, settings) {
    const settingsRef = doc(db, "users", uid, "settings", "config");
    await setDoc(settingsRef, settings, { merge: true });
}

// Load User Settings
async function loadSettings(uid) {
    const settingsRef = doc(db, "users", uid, "settings", "config");
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null;
    }
}

// Save Sources
async function saveSources(uid, text) {
    const sourcesRef = doc(db, "users", uid, "sources", "main");
    await setDoc(sourcesRef, { text: text }, { merge: true });
}

// Load Sources
async function loadSources(uid) {
    const sourcesRef = doc(db, "users", uid, "sources", "main");
    const docSnap = await getDoc(sourcesRef);
    if (docSnap.exists()) {
        return docSnap.data().text || "";
    }
    return "";
}

// Save Message
async function saveMessage(uid, chatId, message) {
    const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
    await addDoc(messagesRef, {
        ...message,
        timestamp: serverTimestamp()
    });
}

// Listen to Messages (Real-time)
function listenToMessages(uid, chatId, callback) {
    if (!chatId) return null;
    const messagesRef = collection(db, "users", uid, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        callback(messages);
    });
}

// --- Chat Sessions Management ---

// Create New Chat
async function createNewChat(uid, title = "New Chat") {
    const chatsRef = collection(db, "users", uid, "chats");
    const docRef = await addDoc(chatsRef, {
        title: title,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp()
    });
    return docRef.id;
}

// Listen to User's Chat List
function listenToChatList(uid, callback) {
    const chatsRef = collection(db, "users", uid, "chats");
    const q = query(chatsRef, orderBy("lastMessageAt", "desc"));
    
    return onSnapshot(q, (snapshot) => {
        const chats = [];
        snapshot.forEach((doc) => {
            chats.push({ id: doc.id, ...doc.data() });
        });
        callback(chats);
    });
}

// Update Chat Title
async function updateChatTitle(uid, chatId, newTitle) {
    const chatRef = doc(db, "users", uid, "chats", chatId);
    await setDoc(chatRef, { title: newTitle }, { merge: true });
}

// Update Last Message Time (to keep sorting correct)
async function updateChatTimestamp(uid, chatId) {
    const chatRef = doc(db, "users", uid, "chats", chatId);
    await setDoc(chatRef, { lastMessageAt: serverTimestamp() }, { merge: true });
}

// Delete Chat (Optional, good for cleanup)
async function deleteChat(uid, chatId) {
    const chatRef = doc(db, "users", uid, "chats", chatId);
    await deleteDoc(chatRef); 
}

// --- File Storage Management ---

// Save Uploaded File (as document)
async function saveFile(uid, fileData) {
    const filesRef = collection(db, "users", uid, "files");
    await addDoc(filesRef, {
        ...fileData,
        uploadedAt: serverTimestamp()
    });
}

// Get All Files
async function getFiles(uid) {
    const filesRef = collection(db, "users", uid, "files");
    const q = query(filesRef, orderBy("uploadedAt", "desc"));
    const snapshot = await getDocs(q);
    const files = [];
    snapshot.forEach((doc) => {
        files.push({ id: doc.id, ...doc.data() });
    });
    return files;
}

// Delete File
async function deleteFile(uid, fileId) {
    const fileRef = doc(db, "users", uid, "files", fileId);
    await deleteDoc(fileRef);
}


export { 
    auth, 
    db, 
    onAuth, 
    logout, 
    saveSettings, 
    loadSettings, 
    saveSources, 
    loadSources, 
    saveMessage, 
    listenToMessages,
    createNewChat,
    listenToChatList,
    updateChatTitle,
    updateChatTimestamp,
    deleteChat,
    saveFile,
    getFiles,
    deleteFile,
    getTechBotContext
};

// --- TechBot Integration ---
async function getTechBotContext() {
    try {
        let context = "--- TECHBOT DATA START ---\n";
        
        // 1. Events
        try {
            const eventsSnapshot = await getDocs(query(collection(db, "events"), orderBy("date", "asc")));
            if (!eventsSnapshot.empty) {
                context += "\n[EVENTS]\n";
                eventsSnapshot.forEach(doc => {
                    const data = doc.data();
                    context += `- Event: ${data.title}\n  Date: ${data.date}\n  Location: ${data.location}\n  Category: ${data.category}\n  Description: ${data.description}\n  Fees: ${data.fees || 'Free'}\n\n`;
                });
            }
        } catch (e) { console.warn("Events fetch failed", e); }

        // 2. Notifications
        try {
            const notificationsSnapshot = await getDocs(query(collection(db, "notifications"), orderBy("date", "desc")));
            if (!notificationsSnapshot.empty) {
                context += "\n[NOTIFICATIONS]\n";
                notificationsSnapshot.forEach(doc => {
                    const data = doc.data();
                    context += `- Notification: ${data.message}\n  Date: ${data.date}\n  Type: ${data.type}\n\n`;
                });
            }
        } catch (e) { console.warn("Notifications fetch failed", e); }

        // 3. Resources
        try {
            const resourcesSnapshot = await getDocs(query(collection(db, "resources"), orderBy("uploadedAt", "desc")));
            if (!resourcesSnapshot.empty) {
                context += "\n[RESOURCES]\n";
                resourcesSnapshot.forEach(doc => {
                    const data = doc.data();
                    context += `- Resource: ${data.title}\n  Description: ${data.description}\n  Type: ${data.type}\n  Link: ${data.fileUrl || data.fileData}\n\n`;
                });
            }
        } catch (e) { console.warn("Resources fetch failed", e); }

        // 4. Gallery
        try {
            const gallerySnapshot = await getDocs(query(collection(db, "gallery"), orderBy("createdAt", "desc")));
            if (!gallerySnapshot.empty) {
                context += "\n[GALLERY]\n";
                gallerySnapshot.forEach(doc => {
                    const data = doc.data();
                    context += `- Image: ${data.title}\n  Link: ${data.imageUrl || data.imageBase64}\n\n`;
                });
            }
        } catch (e) { console.warn("Gallery fetch failed", e); }
        
        context += "--- TECHBOT DATA END ---\n";
        return context;
    } catch (error) {
        console.error("Error fetching TechBot data:", error);
        return "";
    }
}
