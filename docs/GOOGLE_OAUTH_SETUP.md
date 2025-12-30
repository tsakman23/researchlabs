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
   - Add scopes: `email` and `profile`
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: ResearchLabs Local Development
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://127.0.0.1:54321`
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback`
     - `http://127.0.0.1:54321/auth/v1/callback`
7. Click **Create** and save your Client ID and Client Secret

## 2. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Google OAuth credentials:
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret-here
   ```

## 3. Restart Supabase

After configuring the environment variables, restart Supabase to apply the changes:

```bash
npx supabase stop
npx supabase start
```

## 4. Test Google OAuth

1. Navigate to `http://localhost:3000/auth/login`
2. Click "Sign in with Google"
3. You should be redirected to Google's login page
4. After successful authentication, you'll be redirected back to the dashboard

## Important Notes

- The `.env.local` file is git-ignored for security
- For production deployment, set these environment variables in your hosting platform (Vercel, Netlify, etc.)
- Make sure to update the authorized redirect URIs when deploying to production
- The `skip_nonce_check = true` setting in `config.toml` is required for local development with Google OAuth

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Ensure all redirect URIs are correctly added in Google Cloud Console
- Check that you're using the exact URLs (http vs https, localhost vs 127.0.0.1)

### Error: "Access blocked: This app's request is invalid"
- Complete the OAuth consent screen configuration
- Add test users if using "External" user type during development

### User profile not created
- The database trigger `handle_new_user()` automatically creates user profiles
- Check Supabase logs if profiles aren't being created: `npx supabase logs`
