# Multi-Image Upload Architecture

**Status**: 🎨 Design Complete
**Priority**: P2
**Issue**: csm-hkc80
**Created**: January 7, 2026

## Overview

This document defines the architecture for multi-image upload functionality in webflow-dashboard, supporting carousel images and secondary thumbnails with Cloudflare R2 storage.

## Requirements

### Functional Requirements

1. **Carousel Images**: 3-8 images per asset for showcasing template features
2. **Secondary Thumbnails**: 1-2 additional promotional images
3. **WebP-Only Validation**: All uploads must be WebP format with magic byte verification
4. **Aspect Ratio Validation**: Secondary thumbnails must be 150:199 (width:height)
5. **File Size Limit**: Maximum 10MB per image
6. **Drag-and-Drop UI**: Intuitive multi-file upload with progress tracking
7. **Image Management**: View, reorder, and delete uploaded images

### Non-Functional Requirements

1. **Performance**: Parallel uploads with progress indication
2. **Error Handling**: Clear validation feedback for failed uploads
3. **Accessibility**: Keyboard navigation and screen reader support
4. **Mobile**: Responsive design for mobile uploads

## Architecture

### Component Hierarchy

```
EditAssetModal.svelte
├── CarouselUploader.svelte           # NEW
│   └── ImageUploader.svelte (reused)
└── SecondaryThumbnailUploader.svelte # NEW
    └── ImageUploader.svelte (reused)
```

### Data Flow

```
User Upload → Client Validation → Server Validation → R2 Storage → Airtable Update
```

## Components

### 1. CarouselUploader.svelte

**Purpose**: Multi-image upload for carousel (3-8 images)

**Props**:
```typescript
interface Props {
  value: string[];           // Array of existing URLs
  onchange: (urls: string[]) => void;
  minImages?: number;        // Default: 3
  maxImages?: number;        // Default: 8
  disabled?: boolean;
}
```

**Features**:
- Multiple file selection and drag-and-drop
- Upload queue with parallel processing (max 3 concurrent)
- Progress tracking per image
- Drag-to-reorder uploaded images
- Individual image delete buttons
- Validation: 3-8 images required

**UI States**:
1. Empty state: "Drop 3-8 images or click to upload"
2. Uploading: Progress bars for each image
3. Complete: Grid of images with reorder/delete controls
4. Error: Inline error messages per failed image

**Implementation Pattern**:
```svelte
<script lang="ts">
  let { value = [], onchange, minImages = 3, maxImages = 8 }: Props = $props();

  let uploadQueue = $state<UploadItem[]>([]);
  let isDragOver = $state(false);

  async function handleMultipleFiles(files: File[]) {
    // Validate count
    if (value.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Add to queue
    uploadQueue = files.map(file => ({
      file,
      status: 'pending',
      progress: 0,
      error: null
    }));

    // Process queue (max 3 concurrent)
    await processUploadQueue();
  }

  async function processUploadQueue() {
    const concurrent = 3;
    const chunks = chunkArray(uploadQueue.filter(i => i.status === 'pending'), concurrent);

    for (const chunk of chunks) {
      await Promise.all(chunk.map(item => uploadSingleImage(item)));
    }
  }

  async function uploadSingleImage(item: UploadItem) {
    item.status = 'uploading';

    // Validate client-side
    const validationError = await validateFile(item.file);
    if (validationError) {
      item.status = 'error';
      item.error = validationError;
      return;
    }

    // Upload with progress tracking
    try {
      const url = await uploadFileWithProgress(item.file, (progress) => {
        item.progress = progress;
      });

      item.status = 'complete';
      onchange([...value, url]);
    } catch (err) {
      item.status = 'error';
      item.error = err.message;
    }
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    const newUrls = [...value];
    const [removed] = newUrls.splice(fromIndex, 1);
    newUrls.splice(toIndex, 0, removed);
    onchange(newUrls);
  }

  function handleDelete(index: number) {
    const newUrls = value.filter((_, i) => i !== index);
    onchange(newUrls);
  }
</script>

<div class="carousel-uploader">
  {#if value.length < maxImages}
    <div
      class="dropzone multi"
      class:drag-over={isDragOver}
      ondragover={handleDragOver}
      ondrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="image/webp"
        onchange={handleFileSelect}
      />
      <p>Drop {minImages}-{maxImages} images or click to upload</p>
    </div>
  {/if}

  {#if uploadQueue.length > 0}
    <div class="upload-queue">
      {#each uploadQueue as item}
        <UploadProgressCard {item} />
      {/each}
    </div>
  {/if}

  {#if value.length > 0}
    <div class="image-grid">
      {#each value as url, index}
        <ImageCard
          {url}
          {index}
          onreorder={handleReorder}
          ondelete={handleDelete}
        />
      {/each}
    </div>
  {/if}

  {#if value.length < minImages}
    <p class="requirement-hint">
      {minImages - value.length} more image(s) required
    </p>
  {/if}
</div>
```

### 2. SecondaryThumbnailUploader.svelte

**Purpose**: Upload 1-2 additional promotional images with 150:199 aspect ratio validation

**Props**:
```typescript
interface Props {
  value: string[];           // Array of 0-2 URLs
  onchange: (urls: string[]) => void;
  maxImages?: number;        // Default: 2
  disabled?: boolean;
}
```

**Features**:
- Single or dual image upload
- Aspect ratio validation: 150:199 (thumbnail format)
- Reuses ImageUploader.svelte with aspect ratio prop
- Individual delete buttons

**Implementation Pattern**:
```svelte
<script lang="ts">
  import ImageUploader from './ImageUploader.svelte';

  let { value = [], onchange, maxImages = 2 }: Props = $props();

  function handleImageChange(index: number, url: string | null) {
    if (url === null) {
      // Delete
      const newUrls = value.filter((_, i) => i !== index);
      onchange(newUrls);
    } else {
      // Add/Update
      const newUrls = [...value];
      newUrls[index] = url;
      onchange(newUrls);
    }
  }
</script>

<div class="secondary-uploader">
  <label>Secondary Thumbnails (Optional)</label>
  <p class="description">
    Add 1-2 promotional images (150:199 aspect ratio)
  </p>

  <div class="thumbnail-grid">
    {#each Array(maxImages) as _, index}
      <ImageUploader
        value={value[index] || null}
        onchange={(url) => handleImageChange(index, url)}
        uploadType="thumbnail"
        aspectRatio={{ width: 150, height: 199 }}
        label={`Thumbnail ${index + 1}`}
      />
    {/each}
  </div>
</div>
```

### 3. Enhanced ImageUploader.svelte

**Current State**: Already implements single-image upload with validation

**Required Enhancements**:
1. Add `uploadProgress` callback prop for external progress tracking
2. Expose `isUploading` state via prop
3. Support optional drag-and-drop disable

**Proposed Changes**:
```typescript
interface Props {
  // Existing props...
  value?: string | null;
  onchange?: (url: string | null) => void;

  // NEW: Progress tracking
  onprogress?: (progress: number) => void;

  // NEW: Upload state
  onuploadstatechange?: (isUploading: boolean) => void;

  // NEW: Disable drag-and-drop (for inline use in grids)
  disableDragDrop?: boolean;
}
```

## API Endpoints

### 1. Enhanced Upload Endpoint

**Existing**: `/api/upload` supports single file upload

**Enhancement Needed**: Add batch upload support

```typescript
// POST /api/upload
// Supports both single and batch uploads

// Single file (existing)
FormData {
  file: File
  type: 'image' | 'thumbnail'
  width?: string
  height?: string
}

// Batch files (NEW)
FormData {
  files: File[]           // NEW: multiple files
  type: 'carousel' | 'thumbnail'
}

// Response (NEW)
{
  success: boolean;
  uploads: Array<{
    url: string;
    key: string;
    size: number;
    index: number;        // Preserves upload order
    error?: string;       // Individual file error
  }>;
  errors?: string[];      // Overall errors
}
```

**Implementation**:
```typescript
// src/routes/api/upload/+server.ts (enhanced)

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  const formData = await request.formData();

  // Detect single vs batch upload
  const files = formData.getAll('files');
  const singleFile = formData.get('file');

  if (files.length > 0) {
    // Batch upload
    return handleBatchUpload(files, formData, locals, platform);
  } else if (singleFile) {
    // Single upload (existing)
    return handleSingleUpload(singleFile, formData, locals, platform);
  } else {
    throw error(400, 'No files provided');
  }
};

async function handleBatchUpload(
  files: FormDataEntryValue[],
  formData: FormData,
  locals: App.Locals,
  platform: Readonly<App.Platform> | undefined
) {
  const type = formData.get('type')?.toString() || 'image';
  const uploads: Array<{
    url: string;
    key: string;
    size: number;
    index: number;
    error?: string;
  }> = [];

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!(file instanceof File)) {
      uploads.push({
        url: '',
        key: '',
        size: 0,
        index: i,
        error: 'Invalid file'
      });
      continue;
    }

    try {
      // Validate and upload
      await validateFile(file);
      const result = await uploadToR2(platform!.env.UPLOADS, file, {
        userEmail: locals.user!.email,
        contentType: 'image/webp',
        metadata: { uploadType: type }
      });

      uploads.push({
        url: result.url,
        key: result.key,
        size: result.size,
        index: i
      });
    } catch (err) {
      uploads.push({
        url: '',
        key: '',
        size: 0,
        index: i,
        error: err.message || 'Upload failed'
      });
    }
  }

  return json({
    success: uploads.every(u => !u.error),
    uploads
  });
}
```

### 2. Delete Endpoint (NEW)

**Purpose**: Delete images from R2 storage

```typescript
// DELETE /api/upload
// Delete one or more images by key

// Request
{
  keys: string[];   // R2 storage keys
}

// Response
{
  success: boolean;
  deleted: string[];
  errors?: Array<{
    key: string;
    error: string;
  }>;
}
```

**Implementation**:
```typescript
// src/routes/api/upload/+server.ts

export const DELETE: RequestHandler = async ({ request, locals, platform }) => {
  if (!locals.user?.email) {
    throw error(401, 'Unauthorized');
  }

  const bucket = platform?.env.UPLOADS;
  if (!bucket) {
    throw error(500, 'Storage not configured');
  }

  const { keys } = await request.json();

  if (!Array.isArray(keys)) {
    throw error(400, 'Keys must be an array');
  }

  const results = await Promise.allSettled(
    keys.map(key => deleteFromR2(bucket, key))
  );

  const deleted: string[] = [];
  const errors: Array<{ key: string; error: string }> = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      deleted.push(keys[i]);
    } else {
      errors.push({
        key: keys[i],
        error: result.reason.message
      });
    }
  });

  return json({
    success: errors.length === 0,
    deleted,
    errors: errors.length > 0 ? errors : undefined
  });
};
```

## Validation

### Client-Side Validation

Reuses existing utilities from `src/lib/utils/upload-validation.ts`:

1. **WebP Format**: `validateWebP()` - Magic byte check
2. **File Size**: `validateFileSize()` - Max 10MB
3. **MIME Type**: `validateMimeType()` - Must be `image/webp`
4. **Aspect Ratio**: `validateAspectRatio()` or `validateThumbnailAspectRatio()`

### Server-Side Validation

Reuses existing validation in `/api/upload`:

1. Authentication check
2. WebP format validation
3. File size validation
4. Aspect ratio validation (for thumbnails)

## Data Model

### Airtable Asset Record

**Existing Fields**:
```typescript
interface Asset {
  id: string;
  name: string;
  thumbnailUrl?: string;              // Main thumbnail (150:199)
  secondaryThumbnailUrl?: string;     // Single secondary (existing)
  // ... other fields
}
```

**New Fields Required**:
```typescript
interface Asset {
  // ... existing fields

  // NEW: Carousel images (3-8 URLs)
  carouselImages?: string[];

  // ENHANCED: Multiple secondary thumbnails (1-2 URLs)
  secondaryThumbnails?: string[];     // Replaces secondaryThumbnailUrl
}
```

**Airtable Field Mappings**:
```typescript
// Existing
'fldO8FNHDkVZNDhfE': thumbnailUrl (single attachment)
'fldzKxNCXcgCnEwxu': secondaryThumbnailUrl (single attachment)

// NEW: Need to add these fields in Airtable
'fld...': carouselImages (multiple attachments)
'fld...': secondaryThumbnails (multiple attachments, max 2)
```

**Migration Strategy**:
1. Add new Airtable fields for `carouselImages` and `secondaryThumbnails`
2. Update `src/lib/server/airtable.ts` to map new fields
3. Keep `secondaryThumbnailUrl` for backward compatibility
4. In UI, populate `secondaryThumbnails[0]` from `secondaryThumbnailUrl` if present

## R2 Storage Structure

### Folder Organization

```
uploads/
└── {userPrefix}/
    └── {timestamp}_{random}_{filename}.webp

Example:
uploads/
└── micahjohnson/
    ├── 1704672000000_123456789_hero-carousel-1.webp
    ├── 1704672000001_987654321_hero-carousel-2.webp
    └── 1704672000002_456789123_secondary-thumb-1.webp
```

### Metadata

Each R2 object includes custom metadata:

```typescript
{
  uploadedBy: string;      // User email
  uploadedAt: string;      // ISO timestamp
  uploadType: string;      // 'carousel' | 'secondary' | 'thumbnail'
  assetId?: string;        // Optional: Link to Airtable record
}
```

## Progress Tracking

### Upload Queue State

```typescript
interface UploadItem {
  file: File;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  progress: number;        // 0-100
  url?: string;            // Result URL
  error?: string;          // Error message
}
```

### Concurrent Upload Strategy

1. Max 3 concurrent uploads to prevent overwhelming the browser
2. Process in chunks: `[file1, file2, file3]`, then `[file4, file5, file6]`
3. Use `Promise.all()` for parallel processing within chunks
4. Update progress state reactively for each file

### Progress Calculation

For simulated progress (fetch API doesn't expose upload progress):

```typescript
function simulateProgress(item: UploadItem) {
  const interval = setInterval(() => {
    if (item.progress < 90) {
      item.progress += 10;
    }
  }, 100);

  return () => clearInterval(interval);
}
```

For real progress (requires XMLHttpRequest):

```typescript
async function uploadWithProgress(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.url);
      } else {
        reject(new Error('Upload failed'));
      }
    });

    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}
```

## Error Handling

### Validation Errors

**Per-File Errors**:
- Invalid WebP format: "Invalid WebP file format"
- File too large: "File size must be less than 10MB"
- Invalid aspect ratio: "Invalid aspect ratio. Expected 150:199"

**Bulk Errors**:
- Too many files: "Maximum 8 images allowed"
- No files selected: "Please select at least 3 images"

### Upload Errors

**Network Errors**:
- Connection timeout: "Upload timed out. Please try again."
- Network failure: "Network error. Check your connection."

**Server Errors**:
- Storage full: "Storage limit reached"
- Authentication error: "Session expired. Please log in again."

### User Feedback

1. **Toast Notifications**: For overall success/failure
2. **Inline Errors**: Per-file error messages in upload queue
3. **Retry Actions**: "Retry" button for failed uploads
4. **Progress Indicators**: Visual feedback during upload

## Accessibility

### Keyboard Navigation

- Tab through file input, images, delete buttons
- Space/Enter to activate buttons
- Arrow keys to reorder images (with drag-and-drop alternative)

### Screen Reader Support

```svelte
<div class="image-grid" role="list" aria-label="Carousel images">
  {#each value as url, index}
    <div role="listitem" aria-label="Image {index + 1} of {value.length}">
      <img src={url} alt="Carousel image {index + 1}" />
      <button
        aria-label="Delete image {index + 1}"
        onclick={() => handleDelete(index)}
      >
        <TrashIcon />
      </button>
    </div>
  {/each}
</div>
```

### Focus Management

- After upload completes, focus on first uploaded image
- After delete, focus on next image (or previous if last)
- Announce status changes via `aria-live` regions

## Testing

### Unit Tests

```typescript
// CarouselUploader.test.ts
describe('CarouselUploader', () => {
  it('allows 3-8 images', async () => {
    const { getByRole, getByText } = render(CarouselUploader, {
      value: [],
      onchange: vi.fn()
    });

    // Upload 2 images - should show error
    await uploadFiles(['img1.webp', 'img2.webp']);
    expect(getByText('1 more image(s) required')).toBeInTheDocument();

    // Upload 1 more - should succeed
    await uploadFiles(['img3.webp']);
    expect(getByText(/required/)).not.toBeInTheDocument();

    // Try to upload 6 more (total 9) - should reject
    await uploadFiles(Array(6).fill('img.webp'));
    expect(getByText('Maximum 8 images allowed')).toBeInTheDocument();
  });

  it('processes uploads in parallel batches', async () => {
    const onchange = vi.fn();
    const { getByRole } = render(CarouselUploader, {
      value: [],
      onchange
    });

    // Upload 6 files
    const files = Array(6).fill(null).map((_, i) =>
      new File([''], `img${i}.webp`, { type: 'image/webp' })
    );

    await uploadFiles(files);

    // Should process in 2 batches (3 + 3)
    await waitFor(() => {
      expect(onchange).toHaveBeenCalledWith(
        expect.arrayContaining(Array(6).fill(expect.any(String)))
      );
    });
  });

  it('handles individual file errors gracefully', async () => {
    // Upload mix of valid and invalid files
    const files = [
      new File(['valid'], 'valid.webp', { type: 'image/webp' }),
      new File(['invalid'], 'invalid.jpg', { type: 'image/jpeg' }),
      new File(['valid'], 'valid2.webp', { type: 'image/webp' })
    ];

    await uploadFiles(files);

    // Should upload 2 valid files, show error for 1 invalid
    await waitFor(() => {
      expect(getByText('Only WebP images are allowed')).toBeInTheDocument();
    });
  });

  it('supports drag-and-drop reordering', async () => {
    const onchange = vi.fn();
    const { getAllByRole } = render(CarouselUploader, {
      value: ['url1', 'url2', 'url3'],
      onchange
    });

    const images = getAllByRole('listitem');

    // Drag first image to third position
    await dragAndDrop(images[0], images[2]);

    expect(onchange).toHaveBeenCalledWith(['url2', 'url3', 'url1']);
  });
});

// SecondaryThumbnailUploader.test.ts
describe('SecondaryThumbnailUploader', () => {
  it('validates 150:199 aspect ratio', async () => {
    const { getByRole } = render(SecondaryThumbnailUploader, {
      value: [],
      onchange: vi.fn()
    });

    // Upload image with wrong aspect ratio
    const wrongRatio = createImageFile(200, 200); // Square
    await uploadFile(wrongRatio);

    expect(getByText(/Invalid aspect ratio/)).toBeInTheDocument();

    // Upload image with correct aspect ratio
    const correctRatio = createImageFile(150, 199);
    await uploadFile(correctRatio);

    expect(getByText(/Invalid aspect ratio/)).not.toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// Multi-image upload flow
describe('Asset creation with multiple images', () => {
  it('creates asset with carousel and secondary thumbnails', async () => {
    // Navigate to create asset page
    await page.goto('/assets/create');

    // Fill basic info
    await page.fill('[name="name"]', 'Test Template');

    // Upload main thumbnail
    await uploadImage(page, 'main-thumbnail.webp');

    // Upload carousel images
    await uploadMultipleImages(page, [
      'carousel-1.webp',
      'carousel-2.webp',
      'carousel-3.webp'
    ]);

    // Upload secondary thumbnails
    await uploadImage(page, 'secondary-1.webp');

    // Submit
    await page.click('button[type="submit"]');

    // Verify asset created
    await page.waitForURL('/assets/*');
    expect(await page.locator('.carousel-image').count()).toBe(3);
    expect(await page.locator('.secondary-thumbnail').count()).toBe(1);
  });
});
```

## Implementation Checklist

### Phase 1: Foundation (Day 1)

- [ ] Enhance `/api/upload` endpoint for batch uploads
- [ ] Add DELETE endpoint for R2 cleanup
- [ ] Add Airtable fields for `carouselImages` and `secondaryThumbnails`
- [ ] Update `src/lib/server/airtable.ts` with new field mappings

### Phase 2: Components (Day 2)

- [ ] Create `CarouselUploader.svelte` component
- [ ] Create `SecondaryThumbnailUploader.svelte` component
- [ ] Add shared `UploadProgressCard` component
- [ ] Add shared `ImageCard` component with reorder/delete

### Phase 3: Integration (Day 3)

- [ ] Integrate CarouselUploader into EditAssetModal
- [ ] Integrate SecondaryThumbnailUploader into EditAssetModal
- [ ] Update asset detail page to display carousel
- [ ] Update asset list to show carousel thumbnails

### Phase 4: Testing (Day 4)

- [ ] Unit tests for CarouselUploader
- [ ] Unit tests for SecondaryThumbnailUploader
- [ ] Integration tests for upload flow
- [ ] Manual testing on mobile devices

### Phase 5: Polish (Day 5)

- [ ] Accessibility audit
- [ ] Error message refinement
- [ ] Loading state polish
- [ ] Documentation updates

## Success Metrics

1. **Upload Success Rate**: >95% of uploads succeed
2. **Validation Accuracy**: 0% false negatives (bad files accepted)
3. **Performance**: <5s for 8-image batch upload on average connection
4. **User Satisfaction**: Upload flow requires <3 clicks
5. **Error Recovery**: Users can retry failed uploads without re-selecting files

## Open Questions

1. **Image Preview Size**: What dimensions for carousel image grid?
2. **Reorder Mechanism**: Drag-and-drop only, or also up/down buttons?
3. **Delete Confirmation**: Confirm before deleting, or allow undo?
4. **R2 Cleanup**: When to delete orphaned images (e.g., upload then cancel)?
5. **Compression**: Should we compress WebP images further server-side?

## Related Documentation

- [Phase 1 Implementation Plan](./PHASE_1_IMPLEMENTATION_PLAN.md)
- [Feature Parity Analysis](./FEATURE_PARITY_ANALYSIS.md)
- [Cloudflare Patterns](../.claude/rules/cloudflare-patterns.md)
