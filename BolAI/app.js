import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    getAdditionalUserInfo,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

// UI Elements
const loginCard = document.getElementById('login-card');
const signupCard = document.getElementById('signup-card');
const forgotPasswordCard = document.getElementById('forgot-password-card');
const authWrapper = document.getElementById('auth-wrapper');
const loader = document.getElementById('loader');

const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');
const showForgotPasswordBtn = document.getElementById('show-forgot-password');
const backToLoginBtn = document.getElementById('back-to-login');
const userEmailSpan = document.getElementById('user-email');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');

// Loader Logic
function showLoader() {
    if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
    if (loader) loader.classList.add('hidden');
}

// Navigation Logic
function showCard(card) {
    loginCard.classList.add('hidden');
    signupCard.classList.add('hidden');
    forgotPasswordCard.classList.add('hidden');
    // Don't hide loader here, loader is an overlay
    card.classList.remove('hidden');
}

showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showCard(signupCard);
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showCard(loginCard);
});

showForgotPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showCard(forgotPasswordCard);
});

backToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showCard(loginCard);
});

// Password Toggle Logic
document.querySelectorAll('.password-toggle').forEach(toggle => {
    const input = toggle.parentElement.querySelector('input');
    if (!input) return;

    // Helper to show password
    const showPassword = (e) => {
        e.preventDefault(); // Prevent default touch/click behavior
        input.type = 'text';
        toggle.style.color = 'var(--primary-accent)'; // Visual feedback
    };

    // Helper to hide password
    const hidePassword = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        input.type = 'password';
        toggle.style.color = ''; // Reset color
    };

    // Desktop/Mouse events
    toggle.addEventListener('mousedown', showPassword);
    toggle.addEventListener('mouseup', hidePassword);
    toggle.addEventListener('mouseleave', hidePassword);

    // Mobile/Touch events
    toggle.addEventListener('touchstart', showPassword, { passive: false }); // passive: false needed for preventDefault
    toggle.addEventListener('touchend', hidePassword);
    toggle.addEventListener('touchcancel', hidePassword);
});

// Auth Logic
// Track if it's the initial load to avoid flashing loader unnecessarily or to handle it gracefully
let isInitialLoad = true;

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        // Show loader first
        showLoader();
        
        // Hide all cards while loading
        loginCard.classList.add('hidden');
        signupCard.classList.add('hidden');
        forgotPasswordCard.classList.add('hidden');
        authWrapper.classList.add('hidden');

        // Simulate 5s delay or data load
        setTimeout(() => {
            // Redirect to chatbot page
            window.location.href = 'chatbot.html';
        }, 3000); // Reduced to 3s for better UX, originally 5000

    } else {
        // User is signed out
        hideLoader();
        authWrapper.classList.remove('hidden'); // Show auth wrapper
        showCard(loginCard);
    }
    isInitialLoad = false;
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the UI transition and loader
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const errorDiv = document.getElementById('signup-error');
    errorDiv.textContent = '';

    if (password !== confirmPassword) {
        errorDiv.textContent = "Passwords do not match";
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the UI transition and loader
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// Forgot Password
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const messageDiv = document.getElementById('reset-message');
    const errorDiv = document.getElementById('reset-error');
    messageDiv.textContent = '';
    errorDiv.textContent = '';

    try {
        await sendPasswordResetEmail(auth, email);
        messageDiv.textContent = "Password reset email sent! Check your inbox.";
    } catch (error) {
        errorDiv.textContent = error.message;
    }
});

// Google Login (Allow new or existing users)
googleLoginBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';

    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle redirect
    } catch (error) {
        console.error(error);
        errorDiv.textContent = error.message;
    }
});

// Google Signup (Allow new or existing users)
googleSignupBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    const errorDiv = document.getElementById('signup-error');
    errorDiv.textContent = '';

    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle redirect
    } catch (error) {
        console.error(error);
        errorDiv.textContent = error.message;
    }
});

// Logout - Not needed on this page, but keeping for reference or if we add a logout button to landing
// logoutBtn.addEventListener('click', async () => {
//     try {
//         await signOut(auth);
//     } catch (error) {
//         console.error(error);
//     }
// });
