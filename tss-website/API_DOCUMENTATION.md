# TSS API Documentation

Universal API system for Two Steps Studio - enables external AI agents, applications, and integrations to access TSS data securely.

## Overview

The TSS API provides a secure, universal interface for external clients to access TSS data. It's designed to work with:

- **Hermes Agent** - AI assistant integration
- **Claude Code** - AI coding assistant
- **Other AI Agents** - Custom AI integrations
- **Python Scripts** - Automation and data processing
- **Node.js Applications** - Backend integrations
- **Desktop Applications** - Native apps
- **Mobile Applications** - iOS and Android apps
- **n8n** - Workflow automation
- **Webhooks** - Event-driven integrations

## Architecture

```
External Client (Hermes, Claude Code, etc.)
    ↓
API Key (tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)
    ↓
TSS API (/api/v1/*)
    ↓
Authentication & Authorization
    ↓
Rate Limiting & Audit Logging
    ↓
User Isolation (API key owner context)
    ↓
Supabase (with RLS policies)
    ↓
TSS Data
```

## Authentication

### API Key Format

API keys follow the format: `tss_{type}_{32-char-random-string}`

- **Live keys**: `tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Test keys**: `tss_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Authorization Header

Use the `Authorization` header with Bearer token:

```http
Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Alternative (less preferred):
```http
X-API-Key: tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Scopes & Permissions

API keys have granular scopes to control access:

| Scope | Description |
|-------|-------------|
| `projects:read` | Read project data |
| `projects:write` | Create and modify projects |
| `tasks:read` | Read task data |
| `tasks:write` | Create and modify tasks |
| `files:read` | Read file data |
| `files:write` | Upload and modify files |
| `roadmap:read` | Read roadmap data |
| `roadmap:write` | Modify roadmap |
| `games:read` | Read games data |
| `games:write` | Modify games |
| `music:read` | Read music data |
| `music:write` | Modify music |
| `podcasts:read` | Read podcasts data |
| `podcasts:write` | Modify podcasts |
| `users:read` | Read user data |
| `profile:read` | Read profile data |
| `analytics:read` | Read analytics data |
| `settings:read` | Read settings |
| `settings:write` | Modify settings |

## Rate Limiting

- **Live keys**: 100 requests per minute
- **Test keys**: 200 requests per minute

Rate limit exceeded response:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## Endpoints

### Base URL
- Production: `https://api.twostepsstudio.com/api/v1`
- Development: `http://localhost:3000/api/v1`

### Projects

#### List Projects
```http
GET /api/v1/projects?page=1&limit=50&includeArchived=false
Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "owner_id": "user-uuid",
      "name": "My Project",
      "description": "Project description",
      "color": "#ffcb2f",
      "status": "active",
      "project_type": "general",
      "created_at": "2024-01-01T00:00:00Z",
      "user_role": "owner",
      "user_permissions": {
        "view_project": true,
        "edit_project": true,
        "manage_tasks": true,
        "delete_project": true
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "hasMore": false
  }
}
```

#### Create Project
```http
POST /api/v1/projects
Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description",
  "color": "#ffcb2f",
  "project_type": "web_application",
  "planned_end_date": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "name": "New Project",
    "description": "Project description",
    "color": "#ffcb2f",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Tasks

#### List Tasks
```http
GET /api/v1/tasks?projectId=1&status=todo&priority=high&page=1&limit=50
Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "project_id": 1,
      "title": "Task title",
      "description": "Task description",
      "status": "todo",
      "priority": "high",
      "tags": ["feature", "frontend"],
      "due_date": "2024-12-31T23:59:59Z",
      "progress_percent": 0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "hasMore": false
  }
}
```

#### Create Task
```http
POST /api/v1/tasks
Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Content-Type: application/json

{
  "project_id": 1,
  "title": "New Task",
  "description": "Task description",
  "status": "todo",
  "priority": "medium",
  "tags": ["feature"],
  "due_date": "2024-12-31T23:59:59Z",
  "estimated_hours": 8
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `KEY_REVOKED` | 401 | API key has been revoked |
| `KEY_EXPIRED` | 401 | API key has expired |
| `INSUFFICIENT_SCOPE` | 403 | API key lacks required scope |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

## API Key Management

### Creating API Keys

API keys are created through the TSS web interface:

1. Navigate to **Settings** → **Developer** → **API Keys**
2. Click **Create New API Key**
3. Fill in the details:
   - **Name**: Descriptive name (e.g., "Hermes", "Claude Code")
   - **Type**: `live` or `test`
   - **Scopes**: Select required permissions
   - **Description**: Optional description
   - **Expiration**: Optional expiration date
4. Click **Create**

**Important**: The full API key is shown only once. Store it securely!

### Managing API Keys

- **List Keys**: View all your API keys with usage statistics
- **Revoke**: Temporarily disable a key soft-delete
- **Delete**: Permanently remove a key
- **View Logs**: See API request history for each key

## Client Configuration

### Hermes Agent

```python
# Hermes configuration
TSS_API_KEY = "tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
TSS_API_BASE = "https://api.twostepsstudio.com/api/v1"

# Example request
import requests

headers = {
    "Authorization": f"Bearer {TSS_API_KEY}",
    "Content-Type": "application/json"
}

response = requests.get(
    f"{TSS_API_BASE}/projects",
    headers=headers
)

projects = response.json()
```

### Claude Code

```typescript
// Claude Code configuration
const TSS_API_KEY = "tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const TSS_API_BASE = "https://api.twostepsstudio.com/api/v1";

// Example request
const response = await fetch(`${TSS_API_BASE}/projects`, {
  headers: {
    "Authorization": `Bearer ${TSS_API_KEY}`,
    "Content-Type": "application/json"
  }
});

const projects = await response.json();
```

### Python Script

```python
import requests
import os

TSS_API_KEY = os.environ.get("TSS_API_KEY")
TSS_API_BASE = "https://api.twostepsstudio.com/api/v1"

def get_projects():
    headers = {
        "Authorization": f"Bearer {TSS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(
        f"{TSS_API_BASE}/projects",
        headers=headers
    )
    
    response.raise_for_status()
    return response.json()

# Usage
projects = get_projects()
print(projects)
```

### Node.js Application

```javascript
const axios = require('axios');

const TSS_API_KEY = process.env.TSS_API_KEY;
const TSS_API_BASE = 'https://api.twostepsstudio.com/api/v1';

async function getProjects() {
  try {
    const response = await axios.get(`${TSS_API_BASE}/projects`, {
      headers: {
        'Authorization': `Bearer ${TSS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
getProjects().then(projects => console.log(projects));
```

### cURL Examples

```bash
# List projects
curl https://api.twostepsstudio.com/api/v1/projects \
  -H "Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Create project
curl -X POST https://api.twostepsstudio.com/api/v1/projects \
  -H "Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "description": "Project description"
  }'

# List tasks
curl "https://api.twostepsstudio.com/api/v1/tasks?projectId=1" \
  -H "Authorization: Bearer tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

## Security Features

### User Isolation

All API requests are automatically scoped to the API key owner:
- Users can only access their own data
- No cross-user data access possible
- Project membership enforced via existing RLS policies

### Audit Logging

Every API request is logged with:
- API key ID (masked)
- User ID
- HTTP method and endpoint
- Response status code
- Response time
- IP address
- User agent
- Error messages (if any)

### Rate Limiting

- Per-API-key rate limiting
- Different limits for live vs test keys
- Configurable retry-after headers

### Secure Key Storage

- API keys are hashed using SHA-256
- Full keys never stored in plaintext
- Keys shown only once during creation
- Revocation and expiration support

### RLS Integration

- API respects existing Supabase RLS policies
- No bypass of security model
- Service role only used with proper authorization

## OpenAPI Documentation

Complete OpenAPI 3.x specification available at:

```
GET /api/v1/openapi
```

Or download the JSON specification:
```
GET /api/v1/openapi.json
```

## Best Practices

### API Key Security

1. **Never commit API keys to git**
2. **Use environment variables** for storing keys
3. **Rotate keys regularly** (every 90 days)
4. **Use test keys** for development
5. **Revoke compromised keys immediately**
6. **Use minimal scopes** (principle of least privilege)

### Error Handling

```python
import requests
from requests.exceptions import HTTPError

try:
    response = requests.get(
        f"{TSS_API_BASE}/projects",
        headers={"Authorization": f"Bearer {TSS_API_KEY}"}
    )
    response.raise_for_status()
    return response.json()
except HTTPError as e:
    if e.response.status_code == 401:
        print("Authentication failed - check API key")
    elif e.response.status_code == 403:
        print("Access denied - check scopes")
    elif e.response.status_code == 429:
        print("Rate limit exceeded - implement backoff")
    else:
        print(f"API Error: {e.response.json()}")
```

### Pagination

```python
def get_all_projects():
    page = 1
    limit = 50
    all_projects = []
    
    while True:
        response = requests.get(
            f"{TSS_API_BASE}/projects",
            headers={"Authorization": f"Bearer {TSS_API_KEY}"},
            params={"page": page, "limit": limit}
        )
        data = response.json()
        all_projects.extend(data["data"])
        
        if not data["meta"]["hasMore"]:
            break
            
        page += 1
    
    return all_projects
```

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check API key is correct
- Verify key hasn't been revoked
- Check key hasn't expired

**403 Forbidden**
- Verify API key has required scopes
- Check user has access to requested resource
- Verify project membership

**429 Rate Limit Exceeded**
- Implement exponential backoff
- Check `Retry-After` header
- Consider upgrading plan for higher limits

**500 Internal Server Error**
- Check API status page
- Report issue with request details
- Implement retry logic

## Support

For API support and issues:
- Documentation: https://docs.twostepsstudio.com/api
- Status page: https://status.twostepsstudio.com
- Support: api-support@twostepsstudio.com
