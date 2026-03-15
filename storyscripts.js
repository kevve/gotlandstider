const HOMEPAGE_CONTENT_URL = "/generated/content/homepage.json";

let storiesDB = [];
let activeHouseImageTrigger = null;

const modal = document.getElementById("story-modal");
const modalContent = document.getElementById("modal-content");
const houseImageModal = document.getElementById("house-image-modal");
const houseImageModalMedia = document.getElementById("house-image-modal-media");

const featuredStoryHeading = document.getElementById("featured-story-heading");
const featuredStoryDescription = document.getElementById("featured-story-description");
const featuredStoryHighlights = document.getElementById("featured-story-highlights");
const featuredStoryPreload = document.getElementById("featured-story-preload");
const featuredStoryInstagram = document.getElementById("featured-story-instagram");
const featuredStoryTiktok = document.getElementById("featured-story-tiktok");
const archiveScrollContainer = document.getElementById("archive-scroll-container");
const archiveDots = document.getElementById("archive-dots");
const featuredVideoElement = document.getElementById("vertical-player");
const featuredVideoSourceWebm = document.getElementById("featured-story-source-webm");
const featuredVideoSourceMp4 = document.getElementById("featured-story-source-mp4");

document.addEventListener("DOMContentLoaded", () => {
    initializeHomepageStories();
    initializeHouseImageModal();
    initializeArchiveInteractions();
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (houseImageModal && !houseImageModal.classList.contains("hidden")) {
        closeHouseImageModal();
        return;
    }

    if (modal && !modal.classList.contains("hidden")) {
        closeStory();
    }
});

async function initializeHomepageStories() {
    try {
        const response = await fetch(HOMEPAGE_CONTENT_URL, {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to load homepage content (${response.status})`);
        }

        const homepage = await response.json();
        applyHomepageContent(homepage);
    } catch (error) {
        console.warn("Could not load generated homepage content, using static fallback.", error);
    } finally {
        initializeArchiveDots();
        maybeOpenStoryFromHash();
    }
}

function applyHomepageContent(homepage) {
    if (homepage.featuredVideo) {
        renderFeaturedStory(homepage.featuredVideo);
    }

    if (Array.isArray(homepage.storyArchive) && homepage.storyArchive.length > 0) {
        storiesDB = homepage.storyArchive.map((story) => ({
            ...story,
            text: story.excerpt,
        }));
        renderArchiveStories(homepage.storyArchive);
    }
}

function renderFeaturedStory(featuredVideo) {
    if (featuredStoryHeading) {
        const accent = featuredVideo.heading?.accent
            ? ` <span class="italic text-gotland-pine">${escapeHtml(featuredVideo.heading.accent)}</span>`
            : "";
        featuredStoryHeading.innerHTML = `${escapeHtml(featuredVideo.heading?.prefix ?? featuredVideo.title)}${accent}`;
    }

    if (featuredStoryDescription && featuredVideo.description) {
        featuredStoryDescription.textContent = featuredVideo.description;
    }

    if (featuredVideoElement) {
        featuredVideoElement.poster = featuredVideo.thumbnail;
        if (featuredVideoSourceWebm && featuredVideo.legacySources?.webm) {
            featuredVideoSourceWebm.src = featuredVideo.legacySources.webm;
        }
        if (featuredVideoSourceMp4 && featuredVideo.legacySources?.mp4) {
            featuredVideoSourceMp4.src = featuredVideo.legacySources.mp4;
        }
        featuredVideoElement.load();
    }

    if (featuredStoryPreload && featuredVideo.thumbnail) {
        featuredStoryPreload.href = featuredVideo.thumbnail;
    }

    setLinkState(featuredStoryInstagram, featuredVideo.socialLinks?.instagram);
    setLinkState(featuredStoryTiktok, featuredVideo.socialLinks?.tiktok);

    if (featuredStoryHighlights && Array.isArray(featuredVideo.highlights)) {
        featuredStoryHighlights.innerHTML = featuredVideo.highlights
            .map(
                (highlight) => `
                    <div class="group border-l-2 border-gotland-stoneDark pl-4 hover:border-gotland-rust transition-colors">
                        <span class="text-xs font-bold text-gotland-pine uppercase tracking-wider block mb-1">${escapeHtml(
                            highlight.label,
                        )}</span>
                        <h4 class="font-serif text-xl group-hover:text-gotland-rust transition-colors">${escapeHtml(
                            highlight.title,
                        )}</h4>
                        <p class="text-sm text-gray-600 mt-1">${escapeHtml(highlight.description)}</p>
                    </div>
                `,
            )
            .join("");
    }
}

function renderArchiveStories(stories) {
    if (!archiveScrollContainer) return;

    archiveScrollContainer.innerHTML = stories
        .map(
            (story) => `
                <article class="min-w-[75vw] md:min-w-0 snap-center group">
                    <a href="${escapeAttribute(story.urlPath)}" data-story-link data-story-id="${story.id}" class="block cursor-pointer">
                        <div class="relative aspect-video overflow-hidden rounded-sm mb-4">
                            <div class="absolute inset-0 bg-gotland-deep/10 group-hover:bg-transparent transition-colors z-10"></div>
                            <div class="absolute top-3 left-3 z-20 ${
                                story.badge === "Tips"
                                    ? "bg-gotland-stone/90 text-gotland-deep"
                                    : "bg-gotland-rust/90 text-white"
                            } backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                ${escapeHtml(story.badge)}
                            </div>
                            <img src="${escapeAttribute(story.thumbnail)}" alt="${escapeAttribute(
                                story.title,
                            )}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out">
                        </div>
                        <div class="space-y-2">
                            <span class="text-xs text-gotland-moss font-medium uppercase tracking-wide">${escapeHtml(
                                story.subtitle,
                            )}</span>
                            <h4 class="font-serif text-xl leading-snug group-hover:text-gotland-rust transition-colors">${escapeHtml(
                                story.title,
                            )}</h4>
                            <p class="text-sm text-gray-600 line-clamp-2">${escapeHtml(story.excerpt)}</p>
                        </div>
                    </a>
                </article>
            `,
        )
        .join("");
}

function initializeArchiveInteractions() {
    if (!archiveScrollContainer) return;

    archiveScrollContainer.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-story-link]");
        if (!trigger) return;

        const storyId = Number.parseInt(trigger.dataset.storyId ?? "", 10);
        const story = storiesDB.find((entry) => entry.id === storyId);

        if (!story) {
            return;
        }

        event.preventDefault();
        openStory(storyId);
    });
}

function initializeArchiveDots() {
    if (!archiveScrollContainer || !archiveDots) return;

    const items = archiveScrollContainer.querySelectorAll("article");
    if (!items.length) return;

    archiveDots.innerHTML = "";

    for (let i = 0; i < items.length; i += 1) {
        const dot = document.createElement("div");
        dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            i === 0 ? "bg-gotland-deep scale-110" : "bg-gotland-deep/20 scale-100"
        }`;
        archiveDots.appendChild(dot);
    }

    const dots = archiveDots.children;

    archiveScrollContainer.addEventListener("scroll", () => {
        const cardWidth = items[0].offsetWidth + 24;
        const activeIndex = Math.round(archiveScrollContainer.scrollLeft / cardWidth);

        for (let i = 0; i < dots.length; i += 1) {
            dots[i].className = `w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "bg-gotland-deep scale-110" : "bg-gotland-deep/20 scale-100"
            }`;
        }
    });
}

function maybeOpenStoryFromHash() {
    const hash = window.location.hash;
    if (!hash.startsWith("#story-")) return;

    const id = Number.parseInt(hash.replace("#story-", ""), 10);
    if (Number.isNaN(id)) return;

    openStory(id);
}

function getSocialButtons(igUrl, ttUrl, isDarkMode = false) {
    const textColor = isDarkMode ? "text-white" : "text-gotland-deep";
    const iconColor = isDarkMode ? "text-white" : "text-gotland-deep";
    const buttons = [];

    if (igUrl) {
        buttons.push(`
            <a href="${escapeAttribute(igUrl)}" target="_blank" class="flex-1 group relative flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 py-3 rounded-xl border border-white/40 bg-white/20 backdrop-blur-md hover:bg-white/40 hover:border-white/60 transition-all duration-300 min-w-0">
                <svg class="w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span class="text-[10px] md:text-xs font-bold uppercase tracking-widest ${textColor} group-hover:text-gotland-rust transition-colors">Instagram</span>
            </a>
        `);
    }

    if (ttUrl) {
        buttons.push(`
            <a href="${escapeAttribute(ttUrl)}" target="_blank" class="flex-1 group relative flex items-center justify-center gap-2 md:gap-3 px-2 md:px-6 py-3 rounded-xl border border-white/40 bg-white/20 backdrop-blur-md hover:bg-white/40 hover:border-white/60 transition-all duration-300 min-w-0">
                <svg class="w-5 h-5 ${iconColor} group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <span class="text-[10px] md:text-xs font-bold uppercase tracking-widest ${textColor} group-hover:text-gotland-rust transition-colors">TikTok</span>
            </a>
        `);
    }

    if (!buttons.length) {
        return "";
    }

    return `<div class="flex flex-row gap-3 w-full justify-center mt-2 mb-5">${buttons.join("")}</div>`;
}

function openStory(id) {
    if (typeof videoElement !== "undefined" && videoElement && !videoElement.paused) {
        videoElement.pause();
    }

    const story = storiesDB.find((entry) => entry.id === id);
    if (!story) return;

    history.pushState(null, null, `#story-${id}`);

    let html = "";

    if (story.provider === "legacy-local") {
        const sourcesHTML = `
            <source src="${escapeAttribute(story.legacySources.webm)}" type="video/webm">
            <source src="${escapeAttribute(story.legacySources.mp4)}" type="video/mp4">
        `;

        html = `
            <div class="w-full md:w-1/2 bg-black flex justify-center items-center h-[50vh] md:h-auto">
                <div class="relative aspect-[9/16] h-full max-h-[90vh] w-full max-w-sm md:max-w-none">
                    <video id="modal-video-player" class="w-full h-full object-contain md:object-cover" controls playsinline poster="${escapeAttribute(story.thumbnail)}">
                        ${sourcesHTML}
                    </video>
                </div>
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-gotland-stone">
                <span class="text-xs font-bold text-gotland-moss uppercase tracking-[0.2em] mb-3">${escapeHtml(story.subtitle)}</span>
                <h2 class="font-serif text-3xl md:text-4xl text-gotland-deep mb-3">${escapeHtml(story.title)}</h2>
                ${getSocialButtons(story.socialLinks?.instagram, story.socialLinks?.tiktok, false)}
                <p class="text-gray-700 leading-relaxed mb-3">${escapeHtml(story.text)}</p>
            </div>
        `;
    } else {
        html = `
            <div class="w-full md:w-1/2 bg-black flex justify-center items-center h-[50vh] md:h-auto">
                <div class="relative aspect-video h-full w-full">
                    <iframe
                        class="w-full h-full"
                        src="${escapeAttribute(story.embedUrl)}"
                        title="${escapeAttribute(story.title)}"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                        referrerpolicy="strict-origin-when-cross-origin"
                    ></iframe>
                </div>
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-gotland-stone">
                <span class="text-xs font-bold text-gotland-moss uppercase tracking-[0.2em] mb-3">${escapeHtml(story.subtitle)}</span>
                <h2 class="font-serif text-3xl md:text-4xl text-gotland-deep mb-3">${escapeHtml(story.title)}</h2>
                ${getSocialButtons(story.socialLinks?.instagram, story.socialLinks?.tiktok, false)}
                <p class="text-gray-700 leading-relaxed mb-3">${escapeHtml(story.text)}</p>
            </div>
        `;
    }

    modalContent.innerHTML = html;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const modalVideo = document.getElementById("modal-video-player");
    if (modalVideo) {
        const handleModalFullscreen = () => {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
            if (isFullscreen) {
                modalVideo.classList.remove("object-cover");
                modalVideo.classList.add("object-contain");
            } else {
                modalVideo.classList.remove("object-contain");
                modalVideo.classList.add("object-cover");
            }
        };

        modalVideo.addEventListener("fullscreenchange", handleModalFullscreen);
        modalVideo.addEventListener("webkitfullscreenchange", handleModalFullscreen);
        modalVideo.load();
        const playPromise = modalVideo.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.log("Autoplay prevented:", error);
            });
        }
    }
}

function closeStory() {
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    modalContent.innerHTML = "";
    document.body.style.overflow = "";
    history.pushState("", document.title, window.location.pathname + window.location.search);
}

function initializeHouseImageModal() {
    const houseImageTriggers = document.querySelectorAll("[data-house-modal-trigger]");
    if (!houseImageTriggers.length) return;

    houseImageTriggers.forEach((trigger) => {
        const image = trigger.querySelector("img");
        if (!image) return;

        trigger.tabIndex = 0;
        trigger.setAttribute("role", "button");
        trigger.setAttribute("aria-haspopup", "dialog");
        trigger.setAttribute("aria-label", `Öppna bild i helskärm: ${image.alt}`);

        trigger.addEventListener("click", () => {
            openHouseImageModal(image);
        });

        trigger.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openHouseImageModal(image);
            }
        });
    });
}

function openHouseImageModal(imageElement) {
    if (!houseImageModal || !houseImageModalMedia || !imageElement) return;

    activeHouseImageTrigger = imageElement;
    houseImageModalMedia.src = imageElement.currentSrc || imageElement.src;
    houseImageModalMedia.alt = imageElement.alt || "Bild från projekt Ljugarn";

    houseImageModal.classList.remove("hidden");
    houseImageModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeHouseImageModal() {
    if (!houseImageModal || !houseImageModalMedia) return;

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    houseImageModal.classList.add("hidden");
    houseImageModal.setAttribute("aria-hidden", "true");
    houseImageModalMedia.src = "";
    houseImageModalMedia.alt = "";

    if (!modal || modal.classList.contains("hidden")) {
        document.body.style.overflow = "";
    }

    if (activeHouseImageTrigger) {
        activeHouseImageTrigger.focus();
        activeHouseImageTrigger = null;
    }
}

function setLinkState(element, href) {
    if (!element) return;

    if (!href) {
        element.classList.add("hidden");
        element.removeAttribute("href");
        return;
    }

    element.classList.remove("hidden");
    element.href = href;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}
