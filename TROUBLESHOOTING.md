# Troubleshooting Guide

This guide provides solutions for common issues encountered when working with Two Steps Studio.

## Table of Contents

- [General Issues](#general-issues)
- [Website Issues](#website-issues)
- [Discord Bot Issues](#discord-bot-issues)
- [Database Issues](#database-issues)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)
- [Security Issues](#security-issues)

## General Issues

### Issue: Git Issues

**Problem:** Git commands not working or repository not accessible.

**Solution:**

```bash
# Check git installation
git --version

# Clone repository
git clone <repository-url>

# Pull latest changes
git pull

# Reset repository
git reset --hard HEAD
git clean -fdx
git pull origin main
```

### Issue: Dependencies Installation Fails

**Problem:** `npm install` fails with missing packages.

**Solution:**

```bash
# Delete package-lock.json and reinstall
rm package-lock.json
npm install

# Check network connectivity
ping npmjs.com

# Clear npm cache
npm cache clean --force
npm install

# Use npm registry mirror (if needed)
npm config set registry https://registry.npmmirror.com
npm install
```

## Website Issues

### Issue: Build Fails

**Problem:** `npm run build` fails with errors.

**Common Causes:**
- Outdated Node.js
- Missing dependencies
- Corrupted build cache
- TypeScript errors

**Solution:**

```bash
# Check Node version
node --version
# Should be 18.x or higher

# Delete build cache
rm -rf .next node_modules

# Reinstall dependencies
npm install

# Check for TypeScript errors
npm run typecheck

# Build again
npm run build
```

### Issue: Supabase Connection Error

**Problem:** `SupabaseError: Invalid API key` or connection timeout.

**Solution:**

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify Supabase project is active
# Go to https://supabase.com/dashboard

# Update environment file
cd tss-website
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" > .env
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env

# Restart dev server
npm run dev
```

### Issue: Authentication Redirects

**Problem:** Login redirects to wrong page or auth not working.

**Solution:**

```bash
# Clear browser cache and cookies
# In Chrome DevTools > Application > Storage > Clear site data

# Check cookie settings
# Ensure cookies are enabled in browser

# Check Supabase auth settings
# Go to https://supabase.com/dashboard/project/your-project/auth

# Verify session expiry time
# Should be 30 days by default
```

### Issue: Profile Page Not Loading

**Problem:** Profile page shows loading spinner indefinitely.

**Solution:**

```bash
# Check network tab in DevTools
# Verify Supabase connection

# Check browser console for errors
# Look for CORS errors or Supabase errors

# Verify Supabase URL is correct
# Go to Supabase dashboard > Settings > API

# Restart dev server
npm run dev
```

## Discord Bot Issues

### Issue: Bot Not Coming Online

**Problem:** Bot shows as "Offline" in Discord.

**Solution:**

```bash
# Check Discord bot permissions
# Go to Discord Developer Portal > Your App > OAuth2 > scopes
# Ensure 'bot' scope is selected

# Check Discord bot token
# Go to Discord Developer Portal > Bot > Reset Token
# Copy new token and update .env

# Restart bot
cd tss-dc-bot
npm start
```

### Issue: Commands Not Responding

**Problem:** Bot commands not executing or showing error.

**Solution:**

```bash
# Check bot logs
tail -f logs/bot.log

# Check command prefix
# Go to Discord server settings > Bot settings

# Verify bot permissions
# Ensure bot has MANAGE_MESSAGES permission

# Restart bot process
npm start
```

### Issue: Profile Cards Not Generating

**Problem:** Profile cards show error or blank image.

**Solution:**

```bash
# Check canvas installation
npm list @napi-rs/canvas

# Reinstall canvas
npm install --save-dev @napi-rs/canvas

# Check Node system dependencies
# On Windows:
choco install vcpkg
vcpkg install libjpeg-turbo

# On macOS:
brew install libpng

# On Linux:
sudo apt-get install libjpeg-dev libpng-dev

# Restart bot
npm start
```

### Issue: Voice Rewards Not Working

**Problem:** Voice XP not being awarded.

**Solution:**

```bash
# Check voice state events
# Add debug command to bot

# Verify Supabase connection
# Check database connection string

# Check event listeners
# Add to index.js:

client.on('voiceStateUpdate', (oldState, newState) => {
  console.log('Voice state update:', {
    channelId: newState.channelId,
    guildId: newState.channelId,
    member: newState.member?.user.username
  });
});
```

## Database Issues

### Issue: Supabase Connection Failed

**Problem:** `PooledConnection: createPool failed` or timeout errors.

**Solution:**

```bash
# Check Supabase project is active
# Go to https://supabase.com/dashboard

# Verify connection string
echo $SUPABASE_URL

# Check API keys
echo $SUPABASE_SERVICE_ROLE_KEY

# Increase pool size (if needed)
# Edit supabase/index.ts:

const client = new SupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      max: 20,
      poolTimeout: 20000,
    },
  }
);
```

### Issue: Database Migration Fails

**Problem:** `Migration failed` or schema not synced.

**Solution:**

```bash
# Run migrations via Supabase dashboard
# Go to https://supabase.com/dashboard/project/your-project/sql

# Or use CLI:
npx supabase db push

# Check for syntax errors in migration files

# Reset and re-migrate (for development only)
npx supabase db reset
```

### Issue: Row-Level Security Violation

**Problem:** `RLS policy violation` errors.

**Solution:**

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Grant permissions (for development)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create or update policy
CREATE POLICY "Enable all for authenticated users"
  ON profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

## Deployment Issues

### Issue: Vercel Deployment Fails

**Problem:** Build fails on Vercel.

**Solution:**

```bash
# Check build logs in Vercel dashboard
# Look for missing dependencies

# Ensure .gitignore excludes:
# .env
node_modules/
.next/

# Check build command
# In vercel.json:
{
  "buildCommand": "npm run build"
}

# Test build locally
npm run build
```

### Issue: Docker Build Fails

**Problem:** Docker build fails or container won't start.

**Solution:**

```bash
# Check Docker installation
docker --version

# Build image
docker build -t tss-app .

# Run container
docker run -p 3000:3000 tss-app

# Check logs
docker logs tss-app

# View Dockerfile
cat Dockerfile
```

### Issue: WebSocket Connection Fails

**Problem:** `WebSocket is not defined` or connection closed.

**Solution:**

```bash
# Ensure server has WebSocket support
# Vercel: Enable Edge Functions
# Netlify: Configure Edge Functions

# For local development:
npm install ws

# Check firewall settings
# Ensure port 80/443 is open

# Verify SSL certificate
openssl s_client -connect your-domain.com:443
```

## Performance Issues

### Issue: Slow Page Load

**Problem:** Website loads slowly or takes >10 seconds.

**Solution:**

```bash
# Optimize images
# Use Next.js Image component:
<Image src="/large-image.jpg" width={100} height={100} />

# Enable compression
# Vercel automatically compresses

# Check Lighthouse score
npm run build
npm run serve

# Analyze with Lighthouse
npm run lint
```

### Issue: High CPU Usage

**Problem:** CPU usage >80% on server.

**Solution:**

```bash
# Identify slow queries
# Check Supabase logs

# Optimize database queries
# Add indexes:

ALTER TABLE profiles ADD INDEX idx_discord_id (discord_id);
ALTER TABLE profiles ADD INDEX idx_updated_at (updated_at);

# Enable caching
# Use Redis or Supabase cache

# Monitor with tools
npm install next-vitalsource
```

### Issue: Memory Leak

**Problem:** Application crashes with OOM error.

**Solution:**

```bash
# Check for unclosed connections
# Close database connections properly

# Use connection pool:

const client = new SupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    db: {
      max: 20,
      poolTimeout: 20000,
    },
  }
);

# Monitor memory usage
node --inspect app.js
```

## Security Issues

### Issue: Rate Limiting Triggered

**Problem:** `429 Too Many Requests` errors.

**Solution:**

```bash
# Wait for rate limit to reset
# Or increase limit in middleware.ts

const MAX_REQUESTS = 100; // Increase this
const WINDOW_MS = 60000; // Increase this

# Or use Redis for persistent rate limiting
```

### Issue: Authentication Error

**Problem:** `401 Unauthorized` or session expired.

**Solution:**

```bash
# Regenerate session token
# Log out and log back in

# Check session expiry
# Should be 30 days by default

# Clear old sessions
# In Supabase dashboard:
# Authentication > Sessions > Revoke all sessions
```

### Issue: CSRF Token Mismatch

**Problem:** CSRF token validation failed.

**Solution:**

```bash
# Ensure CSRF token is generated on each page load

# Check CSRF configuration:

const csrfToken = new NextCookie(
  '__csrf',
  '',
  {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  }
);
```

## Common Error Messages

### Error: `SupabaseError: Invalid API key`

**Cause:** Wrong API key in environment variables.

**Fix:**
```bash
# Check .env file
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify with Supabase dashboard
# Go to Settings > API
```

### Error: `WebSocket is not defined`

**Cause:** Missing WebSocket package or connection failed.

**Fix:**
```bash
# Install WebSocket
npm install ws

# Check server configuration
# Ensure WebSocket is enabled
```

### Error: `Rate limit exceeded`

**Cause:** Too many requests in short time.

**Fix:**
```bash
# Wait for rate limit to reset
# Or increase limit in code

const MAX_REQUESTS = 200; // Increase from 100
```

### Error: `Row-level security policy violation`

**Cause:** RLS policy blocking access.

**Fix:**
```sql
-- Check policies
SELECT * FROM pg_policies;

-- Grant access (if needed)
GRANT SELECT ON profiles TO "authenticated";
```

## Additional Troubleshooting Steps

### Check Logs

```bash
# Website logs
cat tss-website/logs/app.log

# Bot logs
cat tss-dc-bot/logs/bot.log

# Supabase logs
# Go to https://supabase.com/dashboard > Logs
```

### Check Browser Console

```bash
# Open DevTools (F12)
# Check Console tab for errors
# Check Network tab for failed requests
```

### Clear Cache

```bash
# Clear Node cache
rm -rf node_modules/.cache

# Clear build cache
rm -rf .next

# Clear browser cache
# In browser > Settings > Privacy > Clear browsing data
```

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs** - Review error messages
2. **Search existing issues** - Check GitHub Issues
3. **Create new issue** - Include error logs and steps to reproduce
4. **Community support** - Ask in Discord or forums

---

**Two Steps Studio - Create. Build. Inspire.**