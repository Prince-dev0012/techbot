import { 
    addEvent, updateEvent, deleteEvent, getEvents, 
    addNotification, updateNotification, deleteNotification, getNotifications,
    addResource, updateResource, deleteResource, getResources,
    addGalleryImage, updateGalleryImage, deleteGalleryImage, getGalleryImages,
    uploadFile
} from './firebase.js';

(async function() {
    
    // --- Event Form Logic ---
    const eventForm = document.getElementById('add-event-form');
    let isEditingEvent = false;
    let editingEventId = null;
    const publishEventBtn = document.getElementById('publish-event-btn');
    const cancelEventEditBtn = document.getElementById('cancel-edit-btn');

    // Load All Manage Lists
    await loadManageEvents();
    await loadManageNotifications();
    await loadManageResources();
    await loadManageGallery();

    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = publishEventBtn;
            const statusDiv = document.getElementById('event-status');
            
            // Disable button
            btn.disabled = true;
            btn.textContent = isEditingEvent ? 'Updating...' : 'Publishing...';
            
            try {
                // Get values
                const title = document.getElementById('event-title').value;
                const dateVal = document.getElementById('event-date').value;
                const timeVal = document.getElementById('event-time').value;
                const venue = document.getElementById('event-venue').value;
                const fees = document.getElementById('event-fees').value;
                const category = document.getElementById('event-category').value;
                const imageUrl = document.getElementById('event-image').value;
                const shortDesc = document.getElementById('event-short-desc').value;
                const desc = document.getElementById('event-desc').value;
                
                // Format Date
                const dateObj = new Date(dateVal + (timeVal ? 'T' + timeVal : ''));
                const formattedDate = dateObj.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    hour: timeVal ? 'numeric' : undefined,
                    minute: timeVal ? 'numeric' : undefined,
                });

                const eventData = {
                    title,
                    date: formattedDate,
                    rawDate: dateVal,
                    rawTime: timeVal,
                    venue,
                    fees,
                    category,
                    imageUrl,
                    shortDescription: shortDesc,
                    description: desc
                };

                if (isEditingEvent) {
                    await updateEvent(editingEventId, eventData);
                    statusDiv.textContent = 'Event updated successfully!';
                } else {
                    await addEvent(eventData);
                    statusDiv.textContent = 'Event published successfully!';
                }
                
                // Success
                statusDiv.className = 'status-msg status-success';
                statusDiv.style.display = 'block';
                resetEventForm();
                await loadManageEvents();
                
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
                
            } catch (error) {
                console.error(error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status-msg status-error';
                statusDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = isEditingEvent ? 'Update Event' : 'Publish Event';
            }
        });
    }

    if (cancelEventEditBtn) {
        cancelEventEditBtn.addEventListener('click', resetEventForm);
    }

    function resetEventForm() {
        eventForm.reset();
        isEditingEvent = false;
        editingEventId = null;
        publishEventBtn.textContent = 'Publish Event';
        cancelEventEditBtn.style.display = 'none';
        document.querySelector('#add-event-form h2 i').className = 'fas fa-calendar-plus';
    }

    async function loadManageEvents() {
        const listContainer = document.getElementById('manage-events-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem;">Loading events...</div>';
        try {
            const events = await getEvents();
            if (events.length === 0) {
                listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--text-secondary);">No events found.</div>';
                return;
            }

            listContainer.innerHTML = events.map(event => `
                <div class="glass" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-radius: 5px;">
                    <div>
                        <strong>${event.title}</strong><br>
                        <small style="color: var(--text-secondary);">${event.date}</small>
                    </div>
                    <div>
                        <button class="btn edit-event-btn" data-id="${event.id}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; margin-right: 5px;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn delete-event-btn" data-id="${event.id}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(255, 0, 0, 0.2); border: 1px solid rgba(255, 0, 0, 0.4);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Attach listeners
            document.querySelectorAll('.edit-event-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const event = events.find(e => e.id === id);
                    if (event) populateEventForm(event);
                });
            });

            document.querySelectorAll('.delete-event-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('Are you sure you want to delete this event?')) {
                        const id = btn.getAttribute('data-id');
                        await deleteEvent(id);
                        await loadManageEvents();
                    }
                });
            });

        } catch (e) {
            console.error(e);
            listContainer.innerHTML = 'Error loading events.';
        }
    }

    function populateEventForm(event) {
        isEditingEvent = true;
        editingEventId = event.id;
        
        document.getElementById('event-title').value = event.title || '';
        document.getElementById('event-date').value = event.rawDate || '';
        document.getElementById('event-time').value = event.rawTime || '';
        document.getElementById('event-venue').value = event.venue || '';
        document.getElementById('event-fees').value = event.fees || '';
        document.getElementById('event-category').value = event.category || 'Technical';
        document.getElementById('event-image').value = event.imageUrl || '';
        document.getElementById('event-short-desc').value = event.shortDescription || '';
        document.getElementById('event-desc').value = event.description || '';

        publishEventBtn.textContent = 'Update Event';
        cancelEventEditBtn.style.display = 'inline-block';
        
        eventForm.scrollIntoView({ behavior: 'smooth' });
    }

    // --- Notification Form Logic ---
    const notifForm = document.getElementById('add-notification-form');
    let isEditingNotif = false;
    let editingNotifId = null;
    const sendNotifBtn = document.getElementById('send-notif-btn');
    const cancelNotifEditBtn = document.getElementById('cancel-notif-edit-btn');

    if (notifForm) {
        notifForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = sendNotifBtn;
            const statusDiv = document.getElementById('notif-status');
            
            btn.disabled = true;
            btn.textContent = isEditingNotif ? 'Updating...' : 'Sending...';
            
            try {
                const title = document.getElementById('notif-title').value;
                const message = document.getElementById('notif-message').value;
                
                if (isEditingNotif) {
                    await updateNotification(editingNotifId, { title, message });
                    statusDiv.textContent = 'Notification updated successfully!';
                } else {
                    await addNotification({ title, message });
                    statusDiv.textContent = 'Notification sent successfully!';
                }
                
                statusDiv.className = 'status-msg status-success';
                statusDiv.style.display = 'block';
                resetNotifForm();
                await loadManageNotifications();
                
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
                
            } catch (error) {
                console.error(error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status-msg status-error';
                statusDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = isEditingNotif ? 'Update Notification' : 'Send Notification';
            }
        });
    }

    if (cancelNotifEditBtn) {
        cancelNotifEditBtn.addEventListener('click', resetNotifForm);
    }

    function resetNotifForm() {
        notifForm.reset();
        isEditingNotif = false;
        editingNotifId = null;
        sendNotifBtn.textContent = 'Send Notification';
        cancelNotifEditBtn.style.display = 'none';
    }

    async function loadManageNotifications() {
        const listContainer = document.getElementById('manage-notifications-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem;">Loading notifications...</div>';
        try {
            const notifs = await getNotifications();
            if (notifs.length === 0) {
                listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--text-secondary);">No notifications found.</div>';
                return;
            }

            listContainer.innerHTML = notifs.map(notif => `
                <div class="glass" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-radius: 5px;">
                    <div>
                        <strong>${notif.title}</strong><br>
                        <small style="color: var(--text-secondary);">${notif.message.substring(0, 50)}...</small>
                    </div>
                    <div>
                        <button class="btn edit-notif-btn" data-id="${notif.id}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; margin-right: 5px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn delete-notif-btn" data-id="${notif.id}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(255, 0, 0, 0.2); border: 1px solid rgba(255, 0, 0, 0.4);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Listeners
            document.querySelectorAll('.edit-notif-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const notif = notifs.find(n => n.id === id);
                    if (notif) populateNotifForm(notif);
                });
            });

            document.querySelectorAll('.delete-notif-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('Delete this notification?')) {
                        await deleteNotification(btn.getAttribute('data-id'));
                        await loadManageNotifications();
                    }
                });
            });

        } catch (e) {
            console.error(e);
            listContainer.innerHTML = 'Error loading notifications.';
        }
    }

    function populateNotifForm(notif) {
        isEditingNotif = true;
        editingNotifId = notif.id;
        document.getElementById('notif-title').value = notif.title || '';
        document.getElementById('notif-message').value = notif.message || '';
        sendNotifBtn.textContent = 'Update Notification';
        cancelNotifEditBtn.style.display = 'inline-block';
        notifForm.scrollIntoView({ behavior: 'smooth' });
    }

    // --- Resource Form Logic ---
    const resourceForm = document.getElementById('add-resource-form');
    let isEditingResource = false;
    let editingResourceId = null;
    const uploadResourceBtn = document.getElementById('upload-resource-btn');
    const cancelResourceEditBtn = document.getElementById('cancel-resource-edit-btn');

    if (resourceForm) {
        resourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = uploadResourceBtn;
            const statusDiv = document.getElementById('resource-status');
            const fileInput = document.getElementById('resource-file');
            
            // Validation
            if (!isEditingResource && fileInput.files.length === 0) {
                alert("Please select a file.");
                return;
            }
            
            // Check file size if selected
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 50 * 1024 * 1024) { // 50MB limit
                    alert("File too large! Max 50MB allowed.");
                    return;
                }
            }

            btn.disabled = true;
            btn.textContent = isEditingResource ? 'Updating...' : 'Uploading...';

            try {
                const title = document.getElementById('resource-title').value;
                const desc = document.getElementById('resource-desc').value;
                let resourceData = { title, description: desc };

                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    // Upload to Storage instead of Base64
                    const fileUrl = await uploadFile(file, `resources/${Date.now()}_${file.name}`);
                    resourceData.fileName = file.name;
                    resourceData.fileType = file.type;
                    resourceData.fileUrl = fileUrl; // Store URL
                }

                if (isEditingResource) {
                    await updateResource(editingResourceId, resourceData);
                    statusDiv.textContent = 'Resource updated successfully!';
                } else {
                    await addResource(resourceData);
                    statusDiv.textContent = 'Resource uploaded successfully!';
                }

                statusDiv.className = 'status-msg status-success';
                statusDiv.style.display = 'block';
                resetResourceForm();
                await loadManageResources();
                
                setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);

            } catch (error) {
                console.error(error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status-msg status-error';
                statusDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = isEditingResource ? 'Update Resource' : 'Upload Resource';
            }
        });
    }

    if (cancelResourceEditBtn) {
        cancelResourceEditBtn.addEventListener('click', resetResourceForm);
    }

    function resetResourceForm() {
        resourceForm.reset();
        isEditingResource = false;
        editingResourceId = null;
        uploadResourceBtn.textContent = 'Upload Resource';
        cancelResourceEditBtn.style.display = 'none';
        document.getElementById('resource-file').required = true; // Required for new uploads
    }

    async function loadManageResources() {
        const listContainer = document.getElementById('manage-resources-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem;">Loading resources...</div>';
        try {
            const resources = await getResources();
            if (resources.length === 0) {
                listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--text-secondary);">No resources found.</div>';
                return;
            }

            listContainer.innerHTML = resources.map(res => `
                <div class="glass" style="padding: 1rem; display: flex; justify-content: space-between; align-items: center; border-radius: 5px;">
                    <div>
                        <strong>${res.title}</strong><br>
                        <small style="color: var(--text-secondary);">${res.fileName}</small>
                    </div>
                    <div>
                        <button class="btn edit-resource-btn" data-id="${res.id}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; margin-right: 5px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn delete-resource-btn" data-id="${res.id}" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; background: rgba(255, 0, 0, 0.2); border: 1px solid rgba(255, 0, 0, 0.4);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.edit-resource-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const res = resources.find(r => r.id === id);
                    if (res) populateResourceForm(res);
                });
            });

            document.querySelectorAll('.delete-resource-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('Delete this resource?')) {
                        await deleteResource(btn.getAttribute('data-id'));
                        await loadManageResources();
                    }
                });
            });
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = 'Error loading resources.';
        }
    }

    function populateResourceForm(resource) {
        isEditingResource = true;
        editingResourceId = resource.id;
        document.getElementById('resource-title').value = resource.title || '';
        document.getElementById('resource-desc').value = resource.description || '';
        document.getElementById('resource-file').value = ''; // Clear file input
        document.getElementById('resource-file').required = false; // Not required for update
        
        uploadResourceBtn.textContent = 'Update Resource';
        cancelResourceEditBtn.style.display = 'inline-block';
        resourceForm.scrollIntoView({ behavior: 'smooth' });
    }

    // --- Gallery Form Logic ---
    const galleryForm = document.getElementById('add-gallery-form');
    let isEditingGallery = false;
    let editingGalleryId = null;
    const uploadGalleryBtn = document.getElementById('upload-gallery-btn');
    const cancelGalleryEditBtn = document.getElementById('cancel-gallery-edit-btn');

    if (galleryForm) {
        galleryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = uploadGalleryBtn;
            const statusDiv = document.getElementById('gallery-status');
            const fileInput = document.getElementById('gallery-file');

            // Validation
            if (!isEditingGallery && fileInput.files.length === 0) {
                alert("Please select an image.");
                return;
            }

            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 50 * 1024 * 1024) { // 50MB limit
                    alert("Image too large! Max 50MB allowed.");
                    return;
                }
            }

            btn.disabled = true;
            btn.textContent = isEditingGallery ? 'Updating...' : 'Uploading...';

            try {
                const title = document.getElementById('gallery-title').value;
                let galleryData = { title };

                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    // Upload to Storage instead of Base64
                    const imageUrl = await uploadFile(file, `gallery/${Date.now()}_${file.name}`);
                    galleryData.imageUrl = imageUrl;
                }

                if (isEditingGallery) {
                    await updateGalleryImage(editingGalleryId, galleryData);
                    statusDiv.textContent = 'Image updated successfully!';
                } else {
                    await addGalleryImage(galleryData);
                    statusDiv.textContent = 'Image uploaded successfully!';
                }

                statusDiv.className = 'status-msg status-success';
                statusDiv.style.display = 'block';
                resetGalleryForm();
                await loadManageGallery();
                
                setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);

            } catch (error) {
                console.error(error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status-msg status-error';
                statusDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = isEditingGallery ? 'Update Image' : 'Upload Image';
            }
        });
    }

    if (cancelGalleryEditBtn) {
        cancelGalleryEditBtn.addEventListener('click', resetGalleryForm);
    }

    function resetGalleryForm() {
        galleryForm.reset();
        isEditingGallery = false;
        editingGalleryId = null;
        uploadGalleryBtn.textContent = 'Upload Image';
        cancelGalleryEditBtn.style.display = 'none';
        document.getElementById('gallery-file').required = true;
    }

    async function loadManageGallery() {
        const listContainer = document.getElementById('manage-gallery-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem;">Loading gallery...</div>';
        try {
            const images = await getGalleryImages();
            if (images.length === 0) {
                listContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--text-secondary);">No images found.</div>';
                return;
            }

            listContainer.innerHTML = images.map(img => `
                <div class="glass" style="border-radius: 5px; overflow: hidden; position: relative;">
                    <img src="${img.imageUrl || img.imageBase64}" style="width: 100%; height: 100px; object-fit: cover; display: block;">
                    <button class="btn delete-gallery-btn" data-id="${img.id}" style="position: absolute; top: 5px; right: 5px; padding: 0.25rem 0.5rem; font-size: 0.8rem; background: rgba(255, 0, 0, 0.6); border: none; color: white;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn edit-gallery-btn" data-id="${img.id}" style="position: absolute; top: 5px; right: 40px; padding: 0.25rem 0.5rem; font-size: 0.8rem; background: rgba(0, 123, 255, 0.6); border: none; color: white;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <div style="padding: 0.5rem; font-size: 0.8rem; text-align: center;">${img.title}</div>
                </div>
            `).join('');

            document.querySelectorAll('.edit-gallery-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    const img = images.find(i => i.id === id);
                    if (img) populateGalleryForm(img);
                });
            });

            document.querySelectorAll('.delete-gallery-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if(confirm('Delete this image?')) {
                        await deleteGalleryImage(btn.getAttribute('data-id'));
                        await loadManageGallery();
                    }
                });
            });
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = 'Error loading gallery.';
        }
    }

    function populateGalleryForm(image) {
        isEditingGallery = true;
        editingGalleryId = image.id;
        document.getElementById('gallery-title').value = image.title || '';
        document.getElementById('gallery-file').value = '';
        document.getElementById('gallery-file').required = false;

        uploadGalleryBtn.textContent = 'Update Image';
        cancelGalleryEditBtn.style.display = 'inline-block';
        galleryForm.scrollIntoView({ behavior: 'smooth' });
    }

})();

function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
