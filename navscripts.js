// MENU NAVIGATION
const btn = document.getElementById('menu-btn');
const menu = document.getElementById('mobile-menu');
function toggleMenu() { menu.classList.toggle('open'); }
btn.addEventListener('click', toggleMenu);

const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in-up').forEach((el) => {
    observer.observe(el);
});

// FULLSCREEN LOGIK FÖR VERTIKAL VIDEO
const videoElement = document.getElementById('vertical-player');

if (videoElement) {
    // Lyssna på när helskärmsläget ändras
    videoElement.addEventListener('fullscreenchange', handleFullscreen);
    videoElement.addEventListener('webkitfullscreenchange', handleFullscreen); // Safari support
    videoElement.addEventListener('mozfullscreenchange', handleFullscreen);    // Firefox support
    videoElement.addEventListener('msfullscreenchange', handleFullscreen);     // IE/Edge support
}

function handleFullscreen() {
    // Kolla om vi är i helskärmsläge just nu
    const isFullscreen = document.fullscreenElement || 
                            document.webkitFullscreenElement || 
                            document.mozFullScreenElement || 
                            document.msFullscreenElement;

    if (isFullscreen) {
        // VID HELSKÄRM: 
        // Byt till 'contain' så hela 9:16 videon syns på en 16:9 skärm.
        // Detta förhindrar att toppen och botten beskärs.
        videoElement.classList.remove('object-cover');
        videoElement.classList.add('object-contain');
    } else {
        // TILLBAKA PÅ SIDAN:
        // Återgå till 'cover' för att fylla ut vår snygga design-ruta.
        videoElement.classList.remove('object-contain');
        videoElement.classList.add('object-cover');
    }
}