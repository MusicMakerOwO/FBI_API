const AUTH_KEY = 'Basic ' + Buffer.from(process.env.APP_ID + ':' + process.env.DISCORD_SECRET).toString('base64');

export async function ExchangeOAuthCode(code: string) {
	const AccessTokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: AUTH_KEY,
		},
		body: new URLSearchParams({
			code: code,
			grant_type: 'authorization_code',
			redirect_uri: 'https://api.notfbi.dev/auth',
		})
	}).then(res => res.json()) as { access_token: string, token_type: string, expires_in: number, refresh_token: string, scope: string } | { error: string, error_description: string };

	if ('error' in AccessTokenResponse) {
		console.log('OAuth2 Error:', AccessTokenResponse);
		throw new Error(`Error exchanging OAuth2 code: ${AccessTokenResponse.error} - ${AccessTokenResponse.error_description}`);
	}

	const expiresAt = Date.now() + (AccessTokenResponse.expires_in * 1000);
	const scopes = AccessTokenResponse.scope.split(' ');

	return {
		// Bearer <token>
		token: AccessTokenResponse.access_token,
		refreshToken: AccessTokenResponse.refresh_token,
		issuedAt: new Date(),
		expiresAt: new Date(expiresAt),
		scopes: scopes,
	};
}