const btn = document.getElementById('menu-btn');
const menu = document.getElementById('mobile-menu');

function toggleMenu() {
    if (!menu) {
        return;
    }

    menu.classList.toggle('open');
}

if (btn) {
    btn.addEventListener('click', toggleMenu);
}

function closeMenu() {
    if (menu) {
        menu.classList.remove('open');
    }
}

function handleSamePageAnchorLinks() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach((link) => {
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') {
            return;
        }

        const target = document.querySelector(hash);
        if (!target) {
            return;
        }

        link.addEventListener('click', (event) => {
            event.preventDefault();
            closeMenu();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.pushState(null, '', hash);
        });
    });
}

function revealFadeInElements() {
    const elements = document.querySelectorAll('.fade-in-up');
    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') {
        return;
    }

    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, activeObserver) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                activeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    elements.forEach((element) => {
        observer.observe(element);
    });
}

handleSamePageAnchorLinks();
revealFadeInElements();
