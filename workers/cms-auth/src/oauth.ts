const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

type BuildAuthorizeUrlOptions = {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
};

type ExchangeCodeForTokenOptions = {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
};

type AccessTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export function buildAuthorizeUrl({ clientId, redirectUri, scope, state }: BuildAuthorizeUrlOptions) {
  const url = new URL(GITHUB_AUTHORIZE_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeCodeForToken({
  clientId,
  clientSecret,
  code,
  redirectUri,
}: ExchangeCodeForTokenOptions) {
  const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "gotlandstider-cms-auth",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AccessTokenResponse;

  if (!payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "GitHub token exchange returned no access token");
  }

  return payload.access_token;
}
