const videoElement = document.getElementById('vertical-player');

if (videoElement) {
    videoElement.addEventListener('fullscreenchange', handleFullscreen);
    videoElement.addEventListener('webkitfullscreenchange', handleFullscreen);
    videoElement.addEventListener('mozfullscreenchange', handleFullscreen);
    videoElement.addEventListener('msfullscreenchange', handleFullscreen);

    const mainVideoObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting && !videoElement.paused) {
                videoElement.pause();
            }
        });
    }, { threshold: 0.5 });

    mainVideoObserver.observe(videoElement);
}

function handleFullscreen() {
    const isFullscreen = document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

    if (isFullscreen) {
        videoElement.classList.remove('object-cover');
        videoElement.classList.add('object-contain');
    } else {
        videoElement.classList.remove('object-contain');
        videoElement.classList.add('object-cover');
    }
}
