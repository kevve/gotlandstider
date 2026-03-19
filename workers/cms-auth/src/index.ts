import { buildAuthorizeUrl, exchangeCodeForToken } from "./oauth";

interface Env {
  GITHUB_OAUTH_ID: string;
  GITHUB_OAUTH_SECRET: string;
  GITHUB_REPO_PRIVATE?: string;
}

const OAUTH_STATE_COOKIE = "decap_oauth_state";
const OAUTH_PROVIDER = "github";
const OAUTH_STATE_TTL_SECONDS = 600;

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/favicon.ico") {
    return new Response(null, {
      status: 204,
    });
  }

  if (url.pathname === "/auth") {
    return handleAuth(url, env);
  }

  if (url.pathname === "/callback") {
    return handleCallback(request, url, env);
  }

  return new Response("Gotlandstider Decap OAuth Worker is running.", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function handleAuth(url: URL, env: Env) {
  const provider = url.searchParams.get("provider");

  if (provider !== OAUTH_PROVIDER) {
    return textResponse("Invalid provider", 400);
  }

  const redirectUri = buildRedirectUri(url);
  const state = randomHex(16);
  const scope = isPrivateRepo(env) ? "repo,user" : "public_repo,user";
  const location = buildAuthorizeUrl({
    clientId: env.GITHUB_OAUTH_ID,
    redirectUri,
    scope,
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Set-Cookie": serializeCookie(OAUTH_STATE_COOKIE, state, OAUTH_STATE_TTL_SECONDS),
    },
  });
}

async function handleCallback(request: Request, url: URL, env: Env) {
  const provider = url.searchParams.get("provider");

  if (provider !== OAUTH_PROVIDER) {
    return textResponse("Invalid provider", 400);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookies(request.headers.get("Cookie"));
  const cookieState = cookies[OAUTH_STATE_COOKIE];

  if (!code) {
    return renderErrorPage("Missing GitHub OAuth code.");
  }

  if (!state || !cookieState || state !== cookieState) {
    return renderErrorPage("OAuth state validation failed. Start the login flow again from /admin/.");
  }

  try {
    const token = await exchangeCodeForToken({
      clientId: env.GITHUB_OAUTH_ID,
      clientSecret: env.GITHUB_OAUTH_SECRET,
      code,
      redirectUri: buildRedirectUri(url),
    });

    return new Response(renderCallbackHtml(token), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": serializeCookie(OAUTH_STATE_COOKIE, "", 0),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub OAuth exchange failed.";
    return new Response(renderErrorHtml(message), {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": serializeCookie(OAUTH_STATE_COOKIE, "", 0),
      },
    });
  }
}

function buildRedirectUri(url: URL) {
  return `${url.origin}/callback?provider=${OAUTH_PROVIDER}`;
}

function renderCallbackHtml(token: string) {
  const content = escapeForInlineScript(JSON.stringify({ token }));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authorizing Decap CMS</title>
    <style>
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f1e8;
        color: #2f241d;
      }

      main {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
      }

      article {
        max-width: 32rem;
        background: #fffdf9;
        border: 1px solid #d9c9b4;
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 18px 50px rgba(47, 36, 29, 0.08);
      }

      h1 {
        margin-top: 0;
        font-size: 1.25rem;
      }

      p {
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <article>
        <h1>Connecting to Gotlandstider CMS</h1>
        <p id="status">The popup is handing your GitHub token back to Decap CMS.</p>
      </article>
    </main>
    <script>
      (() => {
        const content = ${content};
        const statusNode = document.getElementById("status");

        if (!window.opener) {
          statusNode.textContent = "No opener window was found. Return to /admin/ and try again.";
          return;
        }

        const receiveMessage = (message) => {
          window.opener.postMessage(
            \`authorization:github:success:\${JSON.stringify(content)}\`,
            message.origin,
          );

          window.removeEventListener("message", receiveMessage, false);
          statusNode.textContent = "Authorization complete. You can close this window.";
          window.close();
        };

        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");

        window.setTimeout(() => {
          statusNode.textContent = "Waiting for the CMS window to finish the authorization handshake...";
        }, 5000);
      })();
    </script>
  </body>
</html>`;
}

function renderErrorPage(message: string) {
  return new Response(renderErrorHtml(message), {
    status: 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": serializeCookie(OAUTH_STATE_COOKIE, "", 0),
    },
  });
}

function renderErrorHtml(message: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Decap OAuth Error</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #2f241d;
        color: #fff8ef;
      }

      article {
        max-width: 32rem;
      }
    </style>
  </head>
  <body>
    <article>
      <h1>GitHub sign-in failed</h1>
      <p>${escapeHtml(message)}</p>
      <p>Go back to <code>/admin/</code> and start the sign-in flow again.</p>
    </article>
  </body>
</html>`;
}

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");
        if (separatorIndex === -1) {
          return [entry, ""];
        }

        return [entry.slice(0, separatorIndex), decodeURIComponent(entry.slice(separatorIndex + 1))];
      }),
  );
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax; Secure`;
}

function isPrivateRepo(env: Env) {
  return env.GITHUB_REPO_PRIVATE != null && env.GITHUB_REPO_PRIVATE !== "0";
}

function randomHex(bytes: number) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("");
}

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function escapeForInlineScript(value: string) {
  return value.replace(/</g, "\\u003c");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
