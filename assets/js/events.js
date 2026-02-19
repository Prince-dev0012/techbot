import { getEvents } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const eventsGrid = document.getElementById('events-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('event-search');
    const modal = document.getElementById('event-modal');
    const closeModal = document.querySelector('.close-modal');
    
    let allEvents = [];

    // Load Events
    if (eventsGrid) {
        eventsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Loading events...</div>';
        allEvents = await getEvents();
        renderEvents(allEvents);
    }

    // Render Function
    function renderEvents(events) {
        if (events.length === 0) {
            eventsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">No events found.</div>';
            return;
        }

        eventsGrid.innerHTML = events.map(event => `
            <div class="event-card glass-hover" data-category="${event.category}">
                <div class="event-image" style="background-image: url('${event.imageUrl || 'https://via.placeholder.com/300'}');">
                    <span class="category-badge">${event.category}</span>
                </div>
                <div class="event-details">
                    <h3>${event.title}</h3>
                    <div class="event-meta">
                        <i class="far fa-calendar"></i> ${event.date} <br>
                        <i class="fas fa-map-marker-alt"></i> ${event.venue}
                    </div>
                    <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.9rem;">${event.shortDescription || 'No description available.'}</p>
                    <div class="card-footer">
                        <button class="btn btn-primary view-details-btn" data-id="${event.id}">View Details</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Attach Event Listeners to new buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.getAttribute('data-id');
                const event = allEvents.find(ev => ev.id === eventId);
                openModal(event);
            });
        });
    }

    // Filter Logic
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add to current
            btn.classList.add('active');
            
            const category = btn.getAttribute('data-filter');
            filterEvents(category, searchInput.value);
        });
    });

    // Search Logic
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-filter');
            filterEvents(activeCategory, e.target.value);
        });
    }

    function filterEvents(category, searchTerm) {
        const term = searchTerm.toLowerCase();
        const filtered = allEvents.filter(event => {
            const matchesCategory = category === 'all' || event.category === category;
            const matchesSearch = event.title.toLowerCase().includes(term) || 
                                  (event.description && event.description.toLowerCase().includes(term));
            return matchesCategory && matchesSearch;
        });
        renderEvents(filtered);
    }

    // Modal Logic
    function openModal(event) {
        if (!event) return;
        
        const modalContent = modal.querySelector('.modal-content') || modal;
        modalContent.innerHTML = `
                <span class="close-modal">&times;</span>
                <div class="modal-header">
                    <img src="${event.imageUrl || 'assets/images/event-placeholder.jpg'}" alt="${event.title}">
                </div>
                <div class="modal-body">
                    <div class="modal-category">${event.category}</div>
                    <h2>${event.title}</h2>
                    <div class="modal-meta">
                        <span><i class="far fa-calendar-alt"></i> ${event.date}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${event.venue}</span>
                        <span style="color: var(--accent-color); font-weight: bold;"><i class="fas fa-tag"></i> Fees: ${event.fees || 'Free'}</span>
                    </div>
                    <div class="modal-description">
                        ${event.description || 'No details available.'}
                    </div>
                    <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="alert('Registered for ${event.title}! (Demo)')">Register Now</button>
                </div>
            `;

        // Re-attach close listener
        const newClose = modalContent.querySelector('.close-modal');
        if (newClose) {
            newClose.addEventListener('click', () => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
})();
