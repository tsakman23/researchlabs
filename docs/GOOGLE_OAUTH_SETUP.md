# Google OAuth Setup Instructions

To enable Google OAuth login in your ResearchLabs application, follow these steps:

## 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure the OAuth consent screen if you haven't already:
   - User Type: External (for testing) or Internal (for organization use)
   - Add your app name, user support email, and developer contact
   - Add scopes: `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: ResearchLabs Local Development
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://127.0.0.1:3000`
     - `http://127.0.0.1:54321`
   - **Authorized redirect URIs (CRITICAL)**:
     - `http://127.0.0.1:54321/auth/v1/callback` (Supabase local auth endpoint)
     - `http://localhost:54321/auth/v1/callback` (Alternative)
   - **Note**: These redirect to Supabase's auth service, which then redirects to your app automatically
7. Click **Create** and save your Client ID and Client Secret

## 2. Configure Environment Variables

The OAuth credentials need to be loaded into Supabase's Docker containers.

1. Edit `.env.local` in the **root** directory (not apps/web):
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
   ```

2. The `supabase/config.toml` is already configured with:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
   skip_nonce_check = true
   ```

## 3. Restart Supabase

After setting the environment variables, restart Supabase to load them:

```bash
npx supabase stop
npx supabase start
```

## 4. Test Google OAuth

1. Navigate to `http://localhost:3000/auth/login`
2. Click "Sign in with Google"
3. You should be redirected to Google's login page
4. After authentication, Google redirects to: `http://127.0.0.1:54321/auth/v1/callback?code=...`
5. Supabase processes the OAuth code and redirects to: `http://localhost:3000/auth/callback?code=...`
6. Your app exchanges the code for a session and redirects to the dashboard

## How OAuth Flow Works

```
User clicks "Sign in with Google"
    ↓
App redirects to Google OAuth (with Supabase redirect URI)
    ↓
User authenticates with Google
    ↓
Google redirects to: http://127.0.0.1:54321/auth/v1/callback?code=XXX
    ↓
Supabase Auth processes OAuth code
    ↓
Supabase redirects to: http://localhost:3000/auth/callback?code=YYY
    ↓
Your app's /auth/callback route exchanges code for session
    ↓
User is logged in and redirected to dashboard
```

## Important Notes

- The redirect URI must be **exactly** `http://127.0.0.1:54321/auth/v1/callback` in Google Console
- Use `127.0.0.1` instead of `localhost` for consistency
- The `.env.local` variables are loaded by Docker when Supabase starts
- For production, update redirect URIs to your production Supabase URL

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verify the redirect URI in Google Console is exactly: `http://127.0.0.1:54321/auth/v1/callback`
- Make sure you're accessing the app via the same domain (localhost vs 127.0.0.1)

### Error: "flow_state_not_found"
- This means Supabase wasn't restarted after setting environment variables
- Run: `npx supabase stop && npx supabase start`
- Check that environment variables are loaded: `docker exec supabase_auth_researchlabs env | grep GOOGLE`

### Error: "Access blocked: This app's request is invalid"
- Complete the OAuth consent screen configuration in Google Console
- Add test users if using "External" user type during development

### User profile not created
- The database trigger `handle_new_user()` automatically creates user profiles
- Check Supabase logs: `npx supabase logs`
