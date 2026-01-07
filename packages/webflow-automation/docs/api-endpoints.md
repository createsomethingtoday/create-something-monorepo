# API Endpoints Documentation

Documentation for Mongo API endpoints used by Airtable automations.

## Authentication

All API calls use Bearer token authentication:

```
Authorization: Bearer {API_KEY}
```

**Environments:**
- **Acceptance:** `https://webflowtest.com`
- **Production:** `https://webflow.com`

## Experts Marketplace Profile

### Create/Update Expert Profile

**Endpoint:** `/api/v1/marketplace/profile`  
**Methods:** `POST` (create), `PUT` (update)  
**Authentication:** Bearer token

#### Request Body

```typescript
{
  workspaceId: string;
  name: string;
  
  // Optional fields (required for PUT, omitted for POST)
  bio?: string;
  businessType?: 'FREELANCER' | 'AGENCY' | 'STARTUP';
  city?: string;
  country?: string;
  featuredAssets?: Array<{
    type: 'COVER_IMAGE' | 'MADE_IN_WEBFLOW';
    slug?: string; // Required for MADE_IN_WEBFLOW
    coverImageMetadata?: {
      imageUrl: string;
      filename: string;
      title: string;
      websiteUrl: string;
    };
  }>;
  inquiryEmailAddress?: string;
  languages?: string[];
  thumbnailImage?: {
    url: string;
    filename: string;
  };
  websiteUrl?: string;
  
  expertsMetadata: {
    airtableId: string;
    expertSince: string; // ISO date
    expertType?: 'PARTNER' | 'EXPERT' | 'CERTIFIED';
    partnerType?: string; // New system
    
    // Additional metadata (PUT only)
    availabilityLastUpdated?: string;
    availabilityStatus?: string;
    directoryImage?: {
      url: string;
      filename: string;
    };
    directoryTagline?: string;
    hourlyDesignRate?: {
      value: number;
      unit: 'USD';
    };
    hourlyDevelopmentRate?: {
      value: number;
      unit: 'USD';
    };
    industrySpecialties?: string[];
    lastAvailabilityResponse?: string;
    migratablePlatforms?: string[];
    partnerstackEmail?: string;
    projectMinimum: {
      value: number;
      unit: 'USD';
    };
    reviews?: string | null;
    servicesOffered: Array<{
      name: string;
      type: string;
    }>;
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
    typicalProjectSize?: {
      value: number;
      unit: 'USD';
    };
    unavailableUntilDate?: string; // ISO date
  };
}
```

#### Response (Success - POST)

```typescript
{
  id: string;
  slug: string;
  createdOn: string; // ISO timestamp
  updatedOn: string; // ISO timestamp
  // ... other profile fields
}
```

#### Response (Success - PUT)

```typescript
{
  updatedOn: string; // ISO timestamp
  // ... other profile fields
}
```

#### Response (Error)

```typescript
{
  code: string; // Error code
  message: string; // Human-readable error
  details?: any; // Additional error context
}
```

## EPP Enrollment

### Enroll Workspace in Expanded Partner Program

**Endpoint:** `/api/v1/marketplace/profile` (shared with Experts)  
**Method:** `POST`  
**Authentication:** Bearer token

> ℹ️ Uses the same unified profile API as Experts sync

#### Request Body (Draft)

```typescript
{
  workspaceSlug: string; // 3-63 chars, alphanumeric + hyphens/underscores
  submitterEmail: string;
  submitterName: string;
  enrollmentSource: 'airtable_form' | 'direct' | 'other';
  timestamp: string; // ISO timestamp
}
```

#### Response (Success - Draft)

```typescript
{
  success: true;
  workspaceId: string;
  enrolledDate: string; // ISO timestamp
  programDetails: {
    benefits: string[];
    effectiveDate: string;
  };
}
```

#### Response (Error - Draft)

```typescript
{
  error: string;
  message: string;
  code?: 'INVALID_SLUG' | 'DUPLICATE_ENROLLMENT' | 'WORKSPACE_NOT_FOUND' | 'API_ERROR';
}
```

#### Error Codes (Expected)

- `INVALID_SLUG` - Workspace slug format is invalid or doesn't exist
- `DUPLICATE_ENROLLMENT` - Workspace already enrolled in program
- `WORKSPACE_NOT_FOUND` - Workspace doesn't exist in Webflow
- `API_ERROR` - Generic server error

## Error Handling

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created (POST)
- `400 Bad Request` - Invalid request body/parameters
- `401 Unauthorized` - Invalid/missing API key
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate/conflict error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Retry Strategy

For failed API calls:

1. **4xx errors (except 429):** Don't retry, fix request
2. **429 (rate limit):** Exponential backoff, retry
3. **5xx errors:** Retry up to 3 times with backoff
4. **Network errors:** Retry up to 3 times

```javascript
async function callWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) return response;
      
      // Don't retry client errors (except rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // Exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

## Rate Limits

**Current limits (TODO: Confirm with team):**
- Experts API: 100 requests/minute per API key
- EPP API: 50 requests/minute per API key

If rate limited:
- Wait for `Retry-After` header (if provided)
- Or implement exponential backoff
- Or queue requests in Airtable

## Testing

### Acceptance Environment

Use acceptance credentials to test without affecting production:

```javascript
const acceptanceUrl = 'https://webflowtest.com/api/v1/marketplace/profile';
const acceptanceKey = 'Bearer ACCEPTANCE_API_KEY';
```

### Test Data

Create test records in Airtable acceptance base:
- Use test workspace IDs/slugs
- Use team email addresses (not real users)
- Mark clearly as "TEST" in name fields
- Clean up after testing

### Validation

Before deploying:
- [ ] Test successful enrollment
- [ ] Test invalid slug error
- [ ] Test duplicate enrollment
- [ ] Test API timeout/failure
- [ ] Test notification triggers
- [ ] Verify Iterable/Marketo integration

## Support

**For API issues:**
- Check API status page (if available)
- Review error response for details
- Contact: Aaron Resnick or [Engineering team]

**For authentication issues:**
- Verify API key is correct
- Check key hasn't expired
- Ensure Bearer token format: `Bearer {KEY}`
- Contact: [DevOps/Security team]

