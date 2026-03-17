import fs from "node:fs/promises";
import path from "node:path";

const NAV_DEFAULT_CLASS = "hover:text-gotland-rust transition-colors";
const NAV_ACTIVE_CLASS = "font-semibold text-gotland-rust transition-colors";
const MOBILE_DEFAULT_CLASS = "hover:text-gotland-rust py-2";
const MOBILE_ACTIVE_CLASS = "text-gotland-rust font-bold py-2";

export async function loadSiteShell(rootDir) {
  const [headerTemplate, footerTemplate] = await Promise.all([
    fs.readFile(path.join(rootDir, "templates", "site-header.html"), "utf8"),
    fs.readFile(path.join(rootDir, "templates", "site-footer.html"), "utf8"),
  ]);

  return {
    headerTemplate,
    footerTemplate,
  };
}

export function renderSiteShell({ headerTemplate, footerTemplate, brandHref, activeNavKey = null }) {
  return {
    siteHeader: headerTemplate
      ? injectTemplate(headerTemplate, {
      brandHref,
      experiencesClass: getNavClass(null, activeNavKey),
      houseClass: getNavClass(null, activeNavKey),
      archiveClass: getNavClass("archive", activeNavKey),
      experiencesMobileClass: getMobileNavClass(null, activeNavKey),
      houseMobileClass: getMobileNavClass(null, activeNavKey),
      archiveMobileClass: getMobileNavClass("archive", activeNavKey),
    })
      : "",
    siteFooter: footerTemplate ?? "",
    siteScripts: `
    <script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>
    <script type="text/javascript" src="/navscripts.js"></script>
    `,
  };
}

function injectTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];
    return typeof value === "string" ? value : "";
  });
}

function getNavClass(activeKey, currentKey) {
  return activeKey && currentKey === activeKey ? NAV_ACTIVE_CLASS : NAV_DEFAULT_CLASS;
}

function getMobileNavClass(activeKey, currentKey) {
  return activeKey && currentKey === activeKey ? MOBILE_ACTIVE_CLASS : MOBILE_DEFAULT_CLASS;
}
