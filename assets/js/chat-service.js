import { db } from './firebase.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    serverTimestamp,
    doc,
    updateDoc,
    deleteDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CHATS_COLLECTION = "chats";

export function subscribeToChats(onUpdate) {
    const q = query(collection(db, CHATS_COLLECTION), orderBy("lastUpdated", "desc"));
    return onSnapshot(q, (snapshot) => {
        const chats = [];
        snapshot.forEach((doc) => {
            chats.push({ id: doc.id, ...doc.data() });
        });
        onUpdate(chats);
    });
}

export async function createNewChat(firstMessage = null) {
    try {
        const chatData = {
            title: firstMessage ? (firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage) : "New Chat",
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            messages: []
        };
        
        if (firstMessage) {
            chatData.messages.push({
                role: 'user',
                content: firstMessage,
                timestamp: Date.now()
            });
        }
        
        const docRef = await addDoc(collection(db, CHATS_COLLECTION), chatData);
        return docRef.id;
    } catch (e) {
        console.error("Error creating chat: ", e);
        throw e;
    }
}

export async function saveMessage(chatId, messageData) {
    try {
        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        await updateDoc(chatRef, {
            messages: arrayUnion(messageData),
            lastUpdated: serverTimestamp()
        });
    } catch (e) {
        console.error("Error saving message: ", e);
        throw e;
    }
}

export async function deleteChat(chatId) {
    try {
        await deleteDoc(doc(db, CHATS_COLLECTION, chatId));
    } catch (e) {
        console.error("Error deleting chat: ", e);
        throw e;
    }
}

export async function updateChatTitle(chatId, newTitle) {
    try {
        const chatRef = doc(db, CHATS_COLLECTION, chatId);
        await updateDoc(chatRef, { title: newTitle });
    } catch (e) {
        console.error("Error updating chat title: ", e);
        throw e;
    }
}
