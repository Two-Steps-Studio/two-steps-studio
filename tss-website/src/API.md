# API Documentation

This document provides comprehensive documentation for the Two Steps Studio API endpoints.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Authentication](#authentication)
  - [User Profile](#user-profile)
  - [Shop](#shop)
  - [Admin](#admin)
  - [Utilities](#utilities)

## Base URL

```
https://tss-website.vercel.app/api
```

Or for local development:

```
http://localhost:3000/api
```

## Authentication

### Headers

Most endpoints require authentication:

```typescript
{
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionToken}`
  }
}
```

### Sessions

- Sessions are managed by Supabase Auth
- Cookie-based authentication
- Automatic session refresh
- 30-day session expiry

### Middleware Protection

Protected routes are enforced by middleware:
- `/profile` - User profile page
- `/ustawienia` - Settings page
- `/notifications` - Notifications page

## Endpoints

### Authentication

#### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "exampleuser",
  "confirm_password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "userId": "uuid-value"
}
```

#### POST /api/auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "sessionToken": "token-value"
}
```

#### POST /api/auth/logout

Logout and invalidate session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### User Profile

#### GET /api/profilee/:userId

Get user profile information.

**Request:**
```typescript
const response = await fetch(`/api/profilee/${userId}`);
const profile = await response.json();
```

**Response:**
```json
{
  "id": "uuid-value",
  "discord_id": "user-discord-id",
  "username": "ExampleUser",
  "xp": 1500,
  "level": 12,
  "money": 500,
  "bank": 1000,
  "background": "default",
  "pln_balance": 0,
  "vip_status": false,
  "svip_status": false,
  "mvip_status": false,
  "discord_roles": ["Level 10", "Level 5"],
  "updated_at": "2026-03-13T12:00:00Z"
}
```

#### PUT /api/profilee/:userId

Update user profile.

**Request:**
```json
{
  "username": "NewUsername",
  "background": "new_background_name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### Shop

#### GET /api/shop

Get shop inventory.

**Request:**
```typescript
const response = await fetch('/api/shop');
const shop = await response.json();
```

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "item-1",
      "name": "Premium Role",
      "type": "role",
      "price": 100,
      "description": "Special Discord role",
      "image": "https://example.com/image.png",
      "category": "roles"
    }
  ]
}
```

#### GET /api/shop/categories

Get shop categories.

**Response:**
```json
{
  "categories": [
    {
      "name": "Roles",
      "icon": "🎭",
      "description": "Special Discord roles"
    },
    {
      "name": "Decorations",
      "icon": "🎨",
      "description": "Profile decorations"
    }
  ]
}
```

#### POST /api/shop/buy

Purchase an item from the shop.

**Request:**
```json
{
  "itemId": "item-id",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase successful",
  "remainingMoney": 400,
  "transactionId": "txn-id"
}
```

### Admin

#### POST /api/admin/exec

Execute admin command.

**Request:**
```json
{
  "command": "kick",
  "arguments": ["user-id", "reason"],
  "reason": "spamming"
}
```

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "action": "kick executed successfully",
  "userId": "user-id"
}
```

#### GET /api/admin/stats

Get server statistics.

**Response:**
```json
{
  "online_users": 45,
  "total_members": 523,
  "active_channels": 12,
  "site_accounts": 1234,
  "messages_today": 156,
  "guild_id": "guild-id"
}
```

### Utilities

#### GET /api/news

Get news feed.

**Response:**
```json
{
  "success": true,
  "news": [
    {
      "id": "news-1",
      "title": "New Features Released",
      "content": "We've added new RPG features...",
      "date": "2026-03-13",
      "author": "Admin"
    }
  ]
}
```

#### POST /api/avatars/upload

Upload avatar image.

**Request:**
```typescript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('image_id', 'user-image-id');

const response = await fetch('/api/avatars/upload', {
  method: 'POST',
  body: formData,
  headers: {
    // No Content-Type header - browser sets it
  }
});
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://example.com/avatars/user-image.png",
  "fileSize": 102400,
  "dimensions": {
    "width": 1024,
    "height": 1024
  }
}
```

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "error-code",
  "status": 400
}
```

### Common Error Codes

| Code | Description | Status |
|------|-------------|--------|
| `UNAUTHENTICATED` | No valid session | 401 |
| `INVALID_INPUT` | Request validation failed | 400 |
| `INSUFFICIENT_FUNDS` | Not enough money in account | 400 |
| `ITEM_UNAVAILABLE` | Shop item not found | 404 |
| `RATE_LIMITED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

### Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Response**:
  ```json
  {
    "error": "Too many requests. Please try again later.",
    "status": 429,
    "retryAfter": 60
  }
  ```

## Request/Response Examples

### Example: Buy Shop Item

**Request:**
```typescript
const response = await fetch('/api/shop/buy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  },
  body: JSON.stringify({
    itemId: 'premium-role',
    quantity: 1
  })
});

const result = await response.json();
// {
//   success: true,
//   message: 'Purchase successful',
//   remainingMoney: 400,
//   transactionId: 'txn-123'
// }

### Example: Get Profile

**Request:**
```typescript
const response = await fetch(`/api/profilee/${userId}`, {
  headers: {
    'Authorization': `Bearer ${sessionToken}`
  }
});

const profile = await response.json();
// {
//   id: 'uuid-123',
//   discord_id: '876543210987654321',
//   username: 'ExampleUser',
//   xp: 1500,
//   level: 12,
//   money: 500,
//   bank: 1000,
//   background: 'default'
// }
```

## API Rate Limiting

All endpoints are protected by rate limiting:

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 100;
const WINDOW_MS = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now < record.resetTime) {
    if (record && record.count >= MAX_REQUESTS) {
      return false;
    }
    return true;
  }

  if (record && record.count >= MAX_REQUESTS) {
    return false;
  }

  rateLimitStore.set(ip, { count: record.count + 1, resetTime: resetTime });
  return true;
}
```

## WebSocket Endpoints

Real-time data streaming via Supabase Realtime:

```typescript
// Subscribe to profile updates
supabase
  .channel('profile-updates')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
    // Profile update logged by Supabase
  })
  .subscribe();
```

## WebSocket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `profile-updates` | `{ id, type, schema, table, snapshot, new, old }` | Profile data changes |
| `discord_stats` | `{ online_users, member_count, ... }` | Server statistics updates |
| `fishing_gear` | `{ user_id, ... }` | Gear updates |

## CORS Configuration

```typescript
// Allowed origins
NEXT_PUBLIC_CORS_ALLOWED_ORIGINS: [
  'https://tss-website.vercel.app',
  'https://tss-app.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
]
```

## Security Headers

All API responses include security headers:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## API Versioning

Current version: **v1**

Future versions will be prefixed with version numbers:
- `/api/v2/shop`
- `/api/v2/profilee`

## Deprecation Policy

API endpoints are deprecated with a **6-month notice** before removal:
1. Add `@deprecated` documentation
2. Emit deprecation warnings in responses
3. Provide migration guide
4. Remove after deprecation period

## Testing

### API Testing

```bash
# Test API endpoints
curl -X GET "http://localhost:3000/api/news" \
  -H "Authorization: Bearer ${sessionToken}"

# Test shop purchase
curl -X POST "http://localhost:3000/api/shop/buy" \
  -H "Authorization: Bearer ${sessionToken}" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "premium-role", "quantity": 1}'
```

### Example Test Script

```typescript
// test-api.ts
import fetch from 'node-fetch';

const testProfile = async (token: string) => {
  const response = await fetch('http://localhost:3000/api/profilee/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const profile = await response.json();
  console.log('Profile:', profile);
};
```

## Changelog

### Version 1.0.0 (2026-03-13)

- Initial API release
- Authentication endpoints
- Shop endpoints
- Admin endpoints
- Profile endpoints
- News feed

---

## Additional Resources

- [Supabase API Reference](https://supabase.com/docs/reference)
- [Discord.js API Reference](https://discord.js.org/#/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Next.js API Routes](https://nextjs.org/docs/routing/route-handlers)

## Support

For API-related questions:
- GitHub Issues
- API documentation discussions
- Email support
