import { getResources, getGalleryImages } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- Load Resources ---
    const resourcesGrid = document.getElementById('resources-grid');
    if (resourcesGrid) {
        resourcesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Loading resources...</div>';
        
        try {
            const resources = await getResources();
            
            if (resources.length === 0) {
                resourcesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">No resources available.</div>';
            } else {
                resourcesGrid.innerHTML = resources.map(res => `
                    <div class="info-card glass glass-hover">
                        <div class="info-icon"><i class="fas fa-file-alt"></i></div>
                        <h3>${res.title}</h3>
                        <p>${res.description || ''}</p>
                        <a href="${res.fileUrl || res.fileData}" download="${res.fileName}" target="_blank" class="btn btn-primary" style="margin-top: 1rem; width: 100%; display: block; text-align: center;">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error(e);
            resourcesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Error loading resources.</div>';
        }
    }

    // --- Load Gallery ---
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Loading gallery...</div>';
        
        try {
            const images = await getGalleryImages();
            
            if (images.length === 0) {
                galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">No images available.</div>';
            } else {
                galleryGrid.innerHTML = images.map(img => `
                    <div class="gallery-item glass" style="border-radius: 10px; overflow: hidden; position: relative;">
                        <img src="${img.imageUrl || img.imageBase64}" alt="${img.title}" style="width: 100%; height: 200px; object-fit: cover; display: block;">
                        <div style="padding: 1rem;">
                            <h4>${img.title}</h4>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error(e);
            galleryGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Error loading gallery.</div>';
        }
    }

})();
