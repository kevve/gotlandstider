// --- 1. DATABAS --- video_only, video_text, image_text
// Här lägger du in specifika länkar till varje klipp
const storiesDB = [
    {
        id: 1,
        type: 'video_text',
        title: "Årets loppis-favoriter",
        subtitle: "Gotland • Inredning",
        text: "Vi har åkt Gotland runt för att hitta de bästa loppisarna. Här visas även Henrik upp årets fynd.",
        mediaSrc: "story-loppisar-gotland.webm", 
        poster: "story-loppisar-gotland.jpg",
        instagramLink: "https://www.instagram.com/reel/DSuzAP-iPaz/",
        tiktokLink: "https://vm.tiktok.com/ZNRMUJLMq/"
    },
    {
        id: 2,
        type: 'video_text',
        title: "Musikquiz och god mat vid stranden",
        subtitle: "Ljugarn • Mat & Dryck",
        text: "Du åker hit om du vill umgås med nära och kära i en gotländsk atmosfär.",
        mediaSrc: "story-brunan-ljugarn.webm",
        poster: "story-brunan-ljugarn.webp",
        instagramLink: "https://www.instagram.com/reel/DJUQIC3opEw/",
        tiktokLink: "https://vm.tiktok.com/ZNRMUctkA/"
    },
    {
        id: 3,
        type: 'video_text',
        title: "En strand för stora & små",
        subtitle: "Visby • Stränder",
        text: "Ett stenkast från Visby hittar du stranden Snäck, där möjligheterna är oändliga.",
        mediaSrc: "story-strand-snack.webm",
        poster: "story-strand-snack.webp",
        instagramLink: "https://www.instagram.com/reel/DMQItODIMPC/",
        tiktokLink: "https://vm.tiktok.com/ZNRMUYotA/"
    }
];

// ELEMENT
const modal = document.getElementById('story-modal');
const modalContent = document.getElementById('modal-content');

// --- 2. HJÄLPFUNKTION FÖR KNAPPAR ---
// Nu tar den emot specifika URLer (igUrl, ttUrl) istället för att hårdkoda dem
function getSocialButtons(igUrl, ttUrl, isDarkMode = false) {
    
    const textColor = isDarkMode ? 'text-white' : 'text-gotland-deep';
    const iconColor = isDarkMode ? 'text-white' : 'text-gotland-deep';

    return `
    <div class="flex flex-row gap-3 w-full justify-center mt-2 mb-5">
        <!-- Instagram -->
        <a href="${igUrl}" target="_blank" class="flex-1 group relative flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 py-3 rounded-xl border border-white/40 bg-white/20 backdrop-blur-md hover:bg-white/40 hover:border-white/60 transition-all duration-300 min-w-0">
            <svg class="w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span class="text-[10px] md:text-xs font-bold uppercase tracking-widest ${textColor} group-hover:text-gotland-rust transition-colors">Instagram</span>
        </a>

        <!-- TikTok -->
        <a href="${ttUrl}" target="_blank" class="flex-1 group relative flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 py-3 rounded-xl border border-white/40 bg-white/20 backdrop-blur-md hover:bg-white/40 hover:border-white/60 transition-all duration-300 min-w-0">
            <svg class="w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            <span class="text-[10px] md:text-xs font-bold uppercase tracking-widest ${textColor} group-hover:text-gotland-rust transition-colors">TikTok</span>
        </a>
    </div>
    `;
}

// --- ÖPPNA MODAL ---
function openStory(id) {
    
    // Pausar huvudvideon
    if (typeof videoElement !== 'undefined' && videoElement && !videoElement.paused) {
        videoElement.pause();
    }
    
    const story = storiesDB.find(s => s.id === id);
    if (!story) return;

    history.pushState(null, null, `#story-${id}`);

    let html = '';

    // FIX: Generate fallback logic for iPhone. 
    // We strip the extension and explicitly add both WebM and MP4 source tags.
    // This ensures Safari finds the mp4 file it needs.
    const baseSrc = story.mediaSrc.substring(0, story.mediaSrc.lastIndexOf('.'));
    
    // The <source> tags block:
    const sourcesHTML = `
        <source src="${baseSrc}.webm" type="video/webm">
        <source src="${baseSrc}.mp4" type="video/mp4">
    `;

    // --- CASE 1: BARA VIDEO ---
    if (story.type === 'video_only') {
        html = `
            <div class="w-full h-[80vh] md:h-[90vh] bg-black flex justify-center items-center">
                <div class="relative aspect-[9/16] h-full w-full max-w-sm md:max-w-none">
                    <video id="modal-video-player" class="w-full h-full object-contain md:object-cover" controls playsinline poster="${story.poster}">
                        ${sourcesHTML}
                    </video>
                    <div class="absolute top-0 left-0 right-0 z-20 px-4">
                        ${getSocialButtons(story.instagramLink, story.tiktokLink, true)} 
                    </div>
                </div>
            </div>
        `;
    } 
    
    // --- CASE 2: VIDEO + TEXT ---
    else if (story.type === 'video_text') {
        html = `
            <div class="w-full md:w-1/2 bg-black flex justify-center items-center h-[50vh] md:h-auto">
                <div class="relative aspect-[9/16] h-full max-h-[90vh] w-full max-w-sm md:max-w-none">
                    <video id="modal-video-player" class="w-full h-full object-contain md:object-cover" controls playsinline poster="${story.poster}">
                        ${sourcesHTML}
                    </video>
                </div>
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-gotland-stone">
                <span class="text-xs font-bold text-gotland-moss uppercase tracking-[0.2em] mb-3">${story.subtitle}</span>
                <h2 class="font-serif text-3xl md:text-4xl text-gotland-deep mb-3">${story.title}</h2>
                ${getSocialButtons(story.instagramLink, story.tiktokLink, false)}
                <p class="text-gray-700 leading-relaxed mb-3">${story.text}</p>
            </div>
        `;
    }

    // --- CASE 3: BILD + TEXT ---
    else if (story.type === 'image_text') {
        html = `
            <div class="w-full md:w-1/2 h-[40vh] md:h-auto relative">
                <img src="${story.mediaSrc}" class="w-full h-full object-cover absolute inset-0">
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-gotland-stone">
                <span class="text-xs font-bold text-gotland-moss uppercase tracking-[0.2em] mb-3">${story.subtitle}</span>
                <h2 class="font-serif text-3xl md:text-4xl text-gotland-deep mb-3">${story.title}</h2>
                ${getSocialButtons(story.instagramLink, story.tiktokLink, false)}
                <p class="text-gray-700 leading-relaxed mb-3">${story.text}</p>
            </div>
        `;
    }

    modalContent.innerHTML = html;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 

    // === SAFARI FIX ===
    const modalVideo = document.getElementById('modal-video-player');
    if (modalVideo) {
        
        // Fullscreen logic
        const handleModalFullscreen = () => {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
            if (isFullscreen) {
                modalVideo.classList.remove('object-cover');
                modalVideo.classList.add('object-contain');
            } else {
                modalVideo.classList.remove('object-contain');
                modalVideo.classList.add('object-cover');
            }
        };

        modalVideo.addEventListener('fullscreenchange', handleModalFullscreen);
        modalVideo.addEventListener('webkitfullscreenchange', handleModalFullscreen);

        modalVideo.load(); 
        const playPromise = modalVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {}).catch(error => { console.log("Autoplay prevented:", error); });
        }
    }

}

// --- STÄNG MODAL ---
function closeStory() {
    modal.classList.add('hidden');
    modalContent.innerHTML = ''; 
    document.body.style.overflow = '';
    
    // Ta bort #story-id från URLen utan att sidan hoppar
    history.pushState("", document.title, window.location.pathname + window.location.search);
}

// Stäng med ESC
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") closeStory();
});

// --- DEEP LINKING (Lyssna vid sidladdning) ---
// Detta kollar om någon kommer in via en länk, t.ex. gotlandstider.se/#story-1
window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash; // t.ex. "#story-1"
    if (hash && hash.startsWith('#story-')) {
        const idString = hash.replace('#story-', '');
        const id = parseInt(idString, 10);
        
        // Öppna modalen automatiskt
        if (!isNaN(id)) {
            openStory(id);
        }
    }
});

// --- MOBILE ARCHIVE SCROLL DOTS ---
document.addEventListener('DOMContentLoaded', () => {
    const scrollContainer = document.getElementById('archive-scroll-container');
    const dotsContainer = document.getElementById('archive-dots');

    if (scrollContainer && dotsContainer) {
        // 1. Calculate number of items based on articles inside
        const items = scrollContainer.querySelectorAll('article');
        const itemCount = items.length;

        // 2. Generate Dots
        for (let i = 0; i < itemCount; i++) {
            const dot = document.createElement('div');
            // Basic styling for dots (inactive state)
            dot.className = `w-2 h-2 rounded-full transition-colors duration-300 ${i === 0 ? 'bg-gotland-deep' : 'bg-gotland-stoneDark'}`;
            dotsContainer.appendChild(dot);
        }

        const dots = dotsContainer.children;

        // 3. Update Dots on Scroll
        scrollContainer.addEventListener('scroll', () => {
            // Calculate which item index is currently mostly visible
            // We use the container's scroll position divided by the width of one card (approximate)
            // Or better: logical calculation based on scroll width vs client width
            
            const cardWidth = items[0].offsetWidth + 24; // Width + Gap (gap-6 is 24px)
            const scrollLeft = scrollContainer.scrollLeft;
            
            // Round to nearest index
            const activeIndex = Math.round(scrollLeft / cardWidth);

            // Update classes
            for (let i = 0; i < dots.length; i++) {
                if (i === activeIndex) {
                    dots[i].classList.remove('bg-gotland-stoneDark');
                    dots[i].classList.add('bg-gotland-deep'); // Active color
                } else {
                    dots[i].classList.remove('bg-gotland-deep');
                    dots[i].classList.add('bg-gotland-stoneDark'); // Inactive color
                }
            }
        });
    }
});