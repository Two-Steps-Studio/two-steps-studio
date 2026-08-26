// Discord OAuth Configuration and Helper Functions
// Add these environment variables to your .env.local:
// DISCORD_CLIENT_ID=your_discord_client_id
// DISCORD_CLIENT_SECRET=your_discord_client_secret
// DISCORD_REDIRECT_URI=http://localhost:6767/api/integrations/discord/callback

export const DISCORD_CONFIG = {
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:6767/api/integrations/discord/callback',
  scopes: ['identify', 'email'],
  apiUrl: 'https://discord.com/api/v10',
  authUrl: 'https://discord.com/oauth2/authorize',
  tokenUrl: 'https://discord.com/api/v10/oauth2/token',
};

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email: string | null;
  verified: boolean;
  locale: string | null;
  flags: number;
  premium_type: number;
  public_flags: number;
}

export interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/**
 * Generate Discord OAuth authorization URL
 */
export function getDiscordAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId,
    redirect_uri: DISCORD_CONFIG.redirectUri,
    response_type: 'code',
    scope: DISCORD_CONFIG.scopes.join(' '),
    state: state,
  });

  return `${DISCORD_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
  const response = await fetch(DISCORD_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: DISCORD_CONFIG.clientId,
      client_secret: DISCORD_CONFIG.clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: DISCORD_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for token: ${error}`);
  }

  return response.json();
}

/**
 * Get Discord user data using access token
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_CONFIG.apiUrl}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Discord user: ${error}`);
  }

  return response.json();
}

/**
 * Get Discord avatar URL
 */
export function getDiscordAvatarUrl(userId: string, avatar: string | null): string {
  if (!avatar) {
    // Return default avatar
    const discriminator = parseInt(userId) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${discriminator}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
}

/**
 * Generate cryptographically secure random state for OAuth flow
 */
export function generateState(): string {
  // Use crypto API for secure random generation
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for environments without crypto API
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}
