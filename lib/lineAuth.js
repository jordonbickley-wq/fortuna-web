const crypto = require('crypto');
const site = require('../config/site.json');

const AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const PROFILE_URL = 'https://api.line.me/v2/profile';

function randomState() {
  return crypto.randomBytes(16).toString('hex');
}

function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: site.lineLogin.channelId,
    redirect_uri: site.lineLogin.redirectUri,
    state,
    scope: 'profile openid',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// Exchanges the authorization code LINE sent back for an access token.
// NOTE: built against LINE Login's documented OAuth2 flow - verify field
// names against the current LINE Developers docs if this errors, since
// this hasn't been tested against a live channel from this environment.
async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: site.lineLogin.redirectUri,
    client_id: site.lineLogin.channelId,
    client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LINE token exchange failed: ${res.status} ${errText}`);
  }
  return res.json(); // { access_token, id_token, ... }
}

async function fetchProfile(accessToken) {
  const res = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LINE profile fetch failed: ${res.status} ${errText}`);
  }
  return res.json(); // { userId, displayName, pictureUrl }
}

module.exports = { randomState, buildAuthorizeUrl, exchangeCodeForToken, fetchProfile };
