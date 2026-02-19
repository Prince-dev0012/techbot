import { getNotifications } from './firebase.js';

(function() {
    setupNavigation();
    setupScrollEffects();
    setupNotifications();
    setupAIButton();
    setupHeroParticles();
})();

function setupNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

function setupScrollEffects() {
    const header = document.querySelector('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Back to top button logic if exists
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.style.display = 'block';
            } else {
                backToTop.style.display = 'none';
            }
        });
        
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

async function setupNotifications() {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;

    // Show loading skeleton or spinner
    notificationList.innerHTML = '<div class="notification-item">Loading notifications...</div>';

    const notifications = await getNotifications();
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="notification-item">No new notifications.</div>';
        return;
    }

    notificationList.innerHTML = '';
    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        
        const date = notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
        
        item.innerHTML = `
            <h4>${notif.title}</h4>
            <p>${notif.message}</p>
            <span class="notification-date">${date}</span>
        `;
        notificationList.appendChild(item);
    });
}

function setupAIButton() {
    const btn = document.querySelector('.floating-ai-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            window.location.href = 'ask.html';
        });
    }
}

function setupHeroParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particlesArray = [];
    const numberOfParticles = 100;

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 1 - 0.5;
            this.speedY = Math.random() * 1 - 0.5;
            this.color = 'rgba(100, 255, 218, 0.5)';
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.size > 0.2) this.size -= 0.1; // Shrink
            if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
            if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function init() {
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
            // Reset particles that are too small
            if (particlesArray[i].size <= 0.3) {
                particlesArray[i].x = Math.random() * canvas.width;
                particlesArray[i].y = Math.random() * canvas.height;
                particlesArray[i].size = Math.random() * 3 + 1;
            }
        }
        requestAnimationFrame(animate);
    }

    init();
    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}
