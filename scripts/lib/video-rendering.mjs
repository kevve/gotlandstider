import { loadTemplate } from "./article-rendering.mjs";

const SITE_URL = "https://www.gotlandstider.se";
const CSS_HREF = "/output.css?v=20260313-2";
const FAVICON_HREF = "/favicon-v2.svg";

export { loadTemplate };

export function renderVideoArchivePage({ template, videos }) {
  const videoCards = videos
    .map((video) => {
      const providerLabel = video.provider === "legacy-local" ? "Video" : "Embed";

      return `
        <article class="group overflow-hidden rounded-[2rem] border border-gotland-stoneDark bg-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <a href="${escapeAttribute(video.urlPath)}" class="block">
            <div class="aspect-[4/5] overflow-hidden bg-gotland-stoneDark/30">
              <img
                src="${escapeAttribute(video.thumbnail)}"
                alt="${escapeAttribute(video.title)}"
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
            </div>
            <div class="space-y-5 p-6 md:p-8">
              <div class="space-y-3">
                <p class="text-xs font-bold uppercase tracking-[0.2em] text-gotland-rust">${providerLabel} • ${formatDate(
                  video.publishedAt,
                )}</p>
                <h2 class="font-serif text-3xl leading-tight text-gotland-deep transition-colors group-hover:text-gotland-pine">${escapeHtml(
                  video.title,
                )}</h2>
                <p class="text-base leading-8 text-gotland-deep/80">${escapeHtml(video.excerpt)}</p>
              </div>
              <span class="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-gotland-deep">
                Titta vidare
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </a>
        </article>
      `;
    })
    .join("");

  return injectTemplate(template, {
    pageTitle: "Videor | Gotlandstider",
    metaDescription:
      "Videor från Gotlandstider med upplevelser, tips och berättelser från Gotland och livet på ön.",
    canonicalUrl: `${SITE_URL}/videos/`,
    ogTitle: "Videor | Gotlandstider",
    ogDescription:
      "Utforska videor från Gotlandstider om Gotland, utflykter, loppisar, mat och livet på ön.",
    ogImage: `${SITE_URL}${videos[0]?.thumbnail ?? "/content/hero-coastline.webp"}`,
    cssHref: CSS_HREF,
    faviconHref: FAVICON_HREF,
    pageHeading: "Videor från ön",
    lead:
      "Ett växande videoarkiv med tips, guider och glimtar från Gotland, Ljugarn och våra favoritplatser på ön.",
    videoCards,
  });
}

export function renderVideoDetailPage({ template, video }) {
  const mediaBlock = video.provider === "legacy-local" ? renderLegacyVideo(video) : renderEmbeddedVideo(video);
  const socialLinks = renderSocialLinks(video.socialLinks);

  return injectTemplate(template, {
    pageTitle: `${video.title} | Gotlandstider`,
    metaDescription: video.excerpt,
    canonicalUrl: `${SITE_URL}${video.urlPath}`,
    ogTitle: `${video.title} | Gotlandstider`,
    ogDescription: video.excerpt,
    ogImage: `${SITE_URL}${video.thumbnail}`,
    cssHref: CSS_HREF,
    faviconHref: FAVICON_HREF,
    videoTitle: video.title,
    publishedLabel: formatDate(video.publishedAt),
    providerLabel: video.provider === "legacy-local" ? "Lokalt videoarkiv" : "Extern videospelare",
    videoExcerpt: video.excerpt,
    thumbnail: video.thumbnail,
    thumbnailAlt: video.title,
    mediaBlock,
    socialLinks,
  });
}

export function toVideoPageModel(video) {
  return {
    title: video.data.title,
    slug: video.data.slug,
    excerpt: video.data.excerpt,
    publishedAt: video.data.publishedAt,
    thumbnail: video.data.thumbnail,
    provider: video.data.provider,
    embedUrl: video.data.embedUrl,
    socialLinks: video.data.socialLinks,
    featured: video.data.featured,
    draft: video.data.draft,
    legacySources: video.data.legacySources,
    urlPath: `/videos/${video.data.slug}/`,
  };
}

function renderLegacyVideo(video) {
  return `
    <div class="overflow-hidden rounded-[2rem] border border-gotland-stoneDark bg-gotland-deep shadow-xl">
      <div class="mx-auto max-w-[420px]">
        <div class="aspect-[9/16]">
          <video
            class="h-full w-full object-cover"
            controls
            playsinline
            preload="metadata"
            poster="${escapeAttribute(video.thumbnail)}"
          >
            <source src="${escapeAttribute(video.legacySources.webm)}" type="video/webm">
            <source src="${escapeAttribute(video.legacySources.mp4)}" type="video/mp4">
          </video>
        </div>
      </div>
    </div>
  `;
}

function renderEmbeddedVideo(video) {
  return `
    <div class="overflow-hidden rounded-[2rem] border border-gotland-stoneDark bg-gotland-deep shadow-xl">
      <div class="aspect-video">
        <iframe
          class="h-full w-full"
          src="${escapeAttribute(video.embedUrl)}"
          title="${escapeAttribute(video.title)}"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
        ></iframe>
      </div>
    </div>
  `;
}

function renderSocialLinks(socialLinks) {
  const links = Object.entries(socialLinks ?? {})
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const label = key === "instagram" ? "Instagram" : key === "tiktok" ? "TikTok" : key;
      return `<a href="${escapeAttribute(value)}" class="rounded-full border border-gotland-stoneDark bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-gotland-deep transition-colors hover:text-gotland-rust">${escapeHtml(
        label,
      )}</a>`;
    })
    .join("");

  if (!links) {
    return "";
  }

  return `
    <div class="flex flex-wrap gap-3">
      ${links}
    </div>
  `;
}

function injectTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    return typeof value === "string" ? value : "";
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
