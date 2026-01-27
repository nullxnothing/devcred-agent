# Environment Setup Guide

This guide details how to acquire the necessary API keys and configuration values for your `.env` file.

## 1. Supabase & Database
Supabase provides both the database connection and the authentication/storage API keys.

1.  **Create a Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Get URL and Keys**:
    *   Go to **Project Settings** (cog icon) -> **API**.
    *   Find the `Project URL`. This is your `NEXT_PUBLIC_SUPABASE_URL`.
    *   Find the `anon` / `public` key. This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
    *   Find the `service_role` / `secret` key. This is your `SUPABASE_SERVICE_ROLE_KEY`.
        *   > **WARNING**: Never expose the `service_role` key on the client side.
3.  **Get Database URL**:
    *   Go to **Project Settings** -> **Database**.
    *   Under **Connection string**, make sure "URI" is selected.
    *   Copy the connection string. It will look like `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`.
    *   Replace `[password]` with the database password you created in step 1.
    *   Set this as your `DATABASE_URL`.
    *   *Note: For serverless environments (like Vercel/Next.js), use the "Transaction Pooler" connection string (port 6543) if available, or the "Session" mode (port 5432) if you need direct connections.*

## 2. Helius API (Solana)
Helius provides the RPC connection to the Solana blockchain.

1.  **Sign Up**: Go to [Helius.xyz](https://www.helius.dev/) and sign up.
2.  **Create API Key**:
    *   Go to the Dashboard.
    *    Generate a new API Key (or use the default one).
3.  **Configure**:
    *   Copy the API Key.
    *   Set it for both `HELIUS_API_KEY` and `NEXT_PUBLIC_HELIUS_API_KEY`.

## 3. NextAuth.js
Configuration for the authentication handler.

1.  **NEXTAUTH_URL**:
    *   For local development, set this to: `http://localhost:3500` (or whatever port you are running on, your `.env.example` suggests 3500).
    *   For production (e.g., Vercel), set it to your canonical domain (e.g., `https://your-project.vercel.app`).
2.  **NEXTAUTH_SECRET**:
    *   This is a random string used to encrypt session tokens.
    *   You can generate one using the terminal command:
        ```bash
        openssl rand -base64 32
        ```
    *   Or simply type a long random string if you don't have openssl handy (though a secure random string is recommended).

## 4. Twitter OAuth 2.0
Required for "Sign in with Twitter".

1.  **Developer Portal**: Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard).
2.  **Create Project/App**:
    *   Create a "Free" account if you haven't (or Basic).
    *   Create a new **Project** and an associated **App**.
3.  **User Authentication Settings**:
    *   Navigate to your App settings -> **User authentication settings** -> **Edit**.
    *   **App permissions**: Select "Read and write" (or just "Read" if you only need login).
    *   **Type of App**: Select "Native App" or "Web App". For NextAuth, **Web App, Automated App or Bot** is usually appropriate.
    *   **App info**:
        *   **Callback URI / Redirect URL**: This is crucial. It must match your NextAuth route.
            *   Local: `http://localhost:3500/api/auth/callback/twitter`
            *   Production: `https://your-domain.com/api/auth/callback/twitter`
        *   **Website URL**: Your website homepage (e.g., `http://localhost:3500`).
    *   Save settings.
4.  **Get Keys**:
    *   Go to the **Keys and tokens** tab.
    *   Look for **OAuth 2.0 Client ID and Client Secret**.
    *   Copy the **Client ID** to `TWITTER_CLIENT_ID`.
    *   Copy the **Client Secret** to `TWITTER_CLIENT_SECRET`.
    *   *Note: Do not confuse this with the "Consumer Keys" (API Key and Secret). NextAuth usually uses OAuth 2.0 now, but check if your implementation specifically requires OAuth 1.0. The variable names `CLIENT_ID` usually imply OAuth 2.0.*

## Summary Checklist
- [ ] `DATABASE_URL` (Supabase DB Connection String)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `HELIUS_API_KEY`
- [ ] `NEXT_PUBLIC_HELIUS_API_KEY`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `TWITTER_CLIENT_ID`
- [ ] `TWITTER_CLIENT_SECRET`
