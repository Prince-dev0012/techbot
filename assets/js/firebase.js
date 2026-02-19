import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc,
    deleteDoc,
    doc,
    query, 
    orderBy, 
    limit,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
export const db = getFirestore(app);
export const storage = getStorage(app);

// Collections
const EVENTS_COLLECTION = "events";
const NOTIFICATIONS_COLLECTION = "notifications";
const RESOURCES_COLLECTION = "resources";
const GALLERY_COLLECTION = "gallery";

// --- Events Functions ---

export async function getEvents() {
    try {
        const q = query(collection(db, EVENTS_COLLECTION), orderBy("date", "asc"));
        const snapshot = await getDocs(q);
        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });
        return events;
    } catch (e) {
        console.error("Error fetching events: ", e);
        return [];
    }
}

export async function addEvent(eventData) {
    try {
        await addDoc(collection(db, EVENTS_COLLECTION), {
            ...eventData,
            createdAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error adding event: ", e);
        throw e;
    }
}

export async function updateEvent(eventId, updatedData) {
    try {
        const eventRef = doc(db, EVENTS_COLLECTION, eventId);
        await updateDoc(eventRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error updating event: ", e);
        throw e;
    }
}

export async function deleteEvent(eventId) {
    try {
        await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
        return true;
    } catch (e) {
        console.error("Error deleting event: ", e);
        throw e;
    }
}

// --- Notifications Functions ---

export async function getNotifications() {
    try {
        const q = query(collection(db, NOTIFICATIONS_COLLECTION), orderBy("createdAt", "desc"), limit(10));
        const snapshot = await getDocs(q);
        const notifications = [];
        snapshot.forEach((doc) => {
            notifications.push({ id: doc.id, ...doc.data() });
        });
        return notifications;
    } catch (e) {
        console.error("Error fetching notifications: ", e);
        return [];
    }
}

export async function addNotification(notificationData) {
    try {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            ...notificationData,
            createdAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error adding notification: ", e);
        throw e;
    }
}

export async function updateNotification(notificationId, updatedData) {
    try {
        const notifRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(notifRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error updating notification: ", e);
        throw e;
    }
}

export async function deleteNotification(notificationId) {
    try {
        await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
        return true;
    } catch (e) {
        console.error("Error deleting notification: ", e);
        throw e;
    }
}

// --- Resources (Files) Functions ---

export async function getResources() {
    try {
        const q = query(collection(db, RESOURCES_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const resources = [];
        snapshot.forEach((doc) => {
            resources.push({ id: doc.id, ...doc.data() });
        });
        return resources;
    } catch (e) {
        console.error("Error fetching resources: ", e);
        return [];
    }
}

export async function addResource(resourceData) {
    try {
        // resourceData: { title, description, fileData (base64), fileName, fileType }
        await addDoc(collection(db, RESOURCES_COLLECTION), {
            ...resourceData,
            createdAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error adding resource: ", e);
        throw e;
    }
}

export async function updateResource(resourceId, updatedData) {
    try {
        const resRef = doc(db, RESOURCES_COLLECTION, resourceId);
        await updateDoc(resRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error updating resource: ", e);
        throw e;
    }
}

export async function deleteResource(resourceId) {
    try {
        await deleteDoc(doc(db, RESOURCES_COLLECTION, resourceId));
        return true;
    } catch (e) {
        console.error("Error deleting resource: ", e);
        throw e;
    }
}

// --- Gallery (Images) Functions ---

export async function getGalleryImages() {
    try {
        const q = query(collection(db, GALLERY_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const images = [];
        snapshot.forEach((doc) => {
            images.push({ id: doc.id, ...doc.data() });
        });
        return images;
    } catch (e) {
        console.error("Error fetching gallery images: ", e);
        return [];
    }
}

export async function addGalleryImage(imageData) {
    try {
        // imageData: { title, imageBase64 }
        await addDoc(collection(db, GALLERY_COLLECTION), {
            ...imageData,
            createdAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error adding gallery image: ", e);
        throw e;
    }
}

export async function updateGalleryImage(imageId, updatedData) {
    try {
        const imgRef = doc(db, GALLERY_COLLECTION, imageId);
        await updateDoc(imgRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Error updating gallery image: ", e);
        throw e;
    }
}

export async function deleteGalleryImage(imageId) {
    try {
        await deleteDoc(doc(db, GALLERY_COLLECTION, imageId));
        return true;
    } catch (e) {
        console.error("Error deleting gallery image: ", e);
        throw e;
    }
}

// --- Storage Functions ---
export async function uploadFile(file, path) {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (e) {
        console.error("Error uploading file to storage: ", e);
        throw e;
    }
}
