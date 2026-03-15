# Video Architecture Investigation

**Task**: R2 Asset Upload (Task 3 of Outerfields Production Deployment)
**Loom**: lm-ebb3
**Beads**: csm-w0jnb
**Status**: BLOCKED - Architecture decisions required
**Date**: 2026-01-21

---

## Summary

Investigation into R2 video upload requirements discovered **fundamental architecture mismatches** across four layers: infrastructure configuration, component code, generation workflow, and data alignment.

**Key Finding**: Cannot proceed with Task 3 as originally planned because no MP4 files exist to upload, and three separate video delivery systems are incompatible with each other.

---

## The Architecture Conflict

### Four Layers of Incompatibility

#### 1. Infrastructure Layer (wrangler.toml)
```toml
# R2 Bucket for video assets (videos and thumbnails)
[[r2_buckets]]
binding = "VIDEO_ASSETS"
bucket_name = "outerfields-videos"
preview_bucket_name = "outerfields-videos-preview"
```

**Finding**: R2 is configured. NO Cloudflare Stream binding exists.

#### 2. Code Layer (Component Expectations)

**FeaturedVideos.svelte** (lines 19-76):
```typescript
const CDN_BASE = 'https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev';

const videos: Video[] = [
  {
    id: 'v1',
    title: 'Weatherford, TX Promo',
    src: `${CDN_BASE}/videos/weatherford-promo.mp4`  // Expects R2 MP4
  }
];
```

**ContentCategories.svelte** (lines 83-87):
```typescript
function toAssetUrl(path: string): string {
  return `${CDN_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
// Builds: https://pub-cbac02584c2c4411aa214a7070ccd208.r2.dev/videos/video.mp4
```

**Finding**: Components expect direct R2 CDN URLs with MP4 format.

#### 3. Generation Layer (AI Workflow)

**generate-veo-videos.ts** (lines 225-283):
```typescript
async function uploadToCloudflareStream(videoUrl, prompt, config) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.cfAccountId}/stream/copy`,
    { /* ... */ }
  );

  return {
    playbackUrl: `https://customer-${config.cfAccountId}.cloudflarestream.com/${video.uid}/iframe`,
    hlsUrl: `https://customer-${config.cfAccountId}.cloudflarestream.com/${video.uid}/manifest/video.m3u8`
  };
}
```

**Finding**: Generation creates Cloudflare Stream URLs (iframe embeds, HLS/DASH manifests), NOT R2 MP4 URLs.

#### 4. Data Layer (Three Separate Video Sets)

| System | Count | Videos | Status |
|--------|-------|--------|--------|
| **FeaturedVideos.svelte** | 6 | weatherford-promo, texas-state-fair, gotv-uscca, hilti-anchors, staccato-promo, uscca-expo-promo | ❌ Don't exist in DB or prompts |
| **D1 Database** | 58 | crew-call (20+), reconnecting-relationships (3), kodiak (8), lincoln-manufacturing (7-8), guns-out-tv (13), films (1), coming-soon (5) | ❌ No MP4 files exist |
| **veo-prompts.ts** | 13 | featured-hero, dev-log-14-video-player, design-8-admin-dashboard, architecture-edge-first, etc. | ❌ Not generated yet |

**Finding**: THREE separate video definitions with ZERO overlap. No video set aligns with any other.

---

## Investigation Actions (7 Total)

### Action 1: Attempted R2 Bucket Listing
```bash
wrangler r2 object list outerfields-videos --limit 50
```
**Result**: Error - Wrangler doesn't support `list` command (only get/put/delete)
**Finding**: Cannot verify R2 bucket contents via CLI

### Action 2: Searched for Local MP4 Files
```bash
find . -name "*.mp4" -type f 2>/dev/null | head -20
```
**Result**: Zero files found
**Finding**: No videos exist locally to upload

### Action 3: Listed Static Thumbnails
```bash
ls -la ./static/thumbnails/
```
**Result**: 20 items (13 JPG files + 7 category directories)
**Finding**: ✅ Thumbnails already exist in static folder - no R2 upload needed

### Action 4: Read Video Generation Script
```bash
cat ./scripts/generate-veo-videos.ts
```
**Result**: 447-line script using Google Veo 3.1 + Cloudflare Stream API
**Finding**: Videos are AI-generated and uploaded to Stream, NOT R2

### Action 5: Read Video Prompts
```bash
cat ./scripts/veo-prompts.ts
```
**Result**: 13 video definitions
**Finding**: Count mismatch - 13 prompts vs 58 in database vs 6 in FeaturedVideos

### Action 6: Checked Generated Videos Directory
```bash
ls -la ./generated-videos/
```
**Result**: Directory doesn't exist
**Finding**: Videos have not been generated yet

### Action 7: Verified Infrastructure Configuration
```bash
cat wrangler.toml | grep -i stream
```
**Result**: No Stream binding found, only R2 configured
**Finding**: Infrastructure explicitly expects R2 delivery method

---

## Blockers Preventing Task 3 Completion

1. ❌ **No MP4 files exist** locally to upload to R2
2. ❌ **Generation workflow incompatibility**: Script creates Stream URLs, components expect R2 MP4 URLs
3. ❌ **Infrastructure mismatch**: wrangler.toml configures R2 only (no Stream binding)
4. ❌ **Data misalignment**: Three separate video sets with no overlap (6 ≠ 58 ≠ 13)
5. ❌ **Unverifiable state**: Cannot check if videos already exist on R2 (no list command)
6. ❌ **Generation not executed**: `./generated-videos/` directory doesn't exist

---

## Architectural Decisions Required

### Decision 1: Video Delivery Method
**Options**:
- **Option A**: Use R2 with direct MP4 URLs (aligns with infrastructure, components)
- **Option B**: Use Cloudflare Stream with HLS/DASH (aligns with generation script)

**Current State**: Infrastructure and components expect R2, but generation uses Stream.

### Decision 2: Infrastructure Configuration
**Options**:
- **Option A**: Keep R2 only, modify generation to upload MP4s to R2
- **Option B**: Add Stream binding to wrangler.toml, update components to use Stream URLs

### Decision 3: Source of Truth for Videos
**Options**:
- **Option A**: Use FeaturedVideos.svelte definitions (6 videos)
- **Option B**: Use D1 database definitions (58 videos)
- **Option C**: Use veo-prompts.ts definitions (13 AI-generated videos)
- **Option D**: Create unified video catalog consolidating all three

**Current State**: Three separate systems with zero overlap.

### Decision 4: Code Alignment
**If R2**:
- No component changes needed
- Modify `generate-veo-videos.ts` to download MP4 from Veo and upload to R2
- Update D1 `asset_path` to point to R2 URLs

**If Stream**:
- Update `ContentCategories.svelte` and `FeaturedVideos.svelte` to use Stream iframe embeds
- Add Stream binding to wrangler.toml
- Update VideoModal to handle Stream playback

### Decision 5: Video Generation Strategy
**Options**:
- **Option A**: Generate all 13 Veo videos, ignore Featured/Database videos
- **Option B**: Source Featured/Database videos externally (client-provided)
- **Option C**: Generate Featured/Database videos with Veo (58+ videos = $400-600 cost)

---

## Recommended Path Forward

### Option 1: R2-First (Aligns with Existing Infrastructure)

**Steps**:
1. Modify `generate-veo-videos.ts` to download MP4 from Veo GCS bucket
2. Upload MP4s to R2 bucket `outerfields-videos`
3. Update D1 database with R2 URLs
4. Components work without changes

**Pros**:
- ✅ No infrastructure changes
- ✅ No component changes
- ✅ Aligns with wrangler.toml configuration

**Cons**:
- ❌ Need to modify generation script
- ❌ R2 bandwidth costs vs Stream (but predictable)

### Option 2: Stream-First (Aligns with Generation Script)

**Steps**:
1. Add Stream binding to wrangler.toml
2. Update `ContentCategories.svelte` to use Stream URLs
3. Update `FeaturedVideos.svelte` to use Stream URLs
4. Deploy with Stream configuration

**Pros**:
- ✅ No generation script changes
- ✅ Stream optimized for video delivery (HLS/DASH)

**Cons**:
- ❌ Infrastructure changes required
- ❌ Component updates required
- ❌ VideoModal may need Stream-specific playback

---

## Impact on Other Tasks

**Task 4 (Webhook)**: ⚠️ Partially blocked
- Webhook integration can proceed
- But E2E testing of video playback blocked until video architecture resolved

**Task 5 (E2E Validation)**: 🚫 Fully blocked
- Cannot test video playback without videos
- Cannot verify Featured/Content sections without video assets

---

## Files Examined

1. `wrangler.toml` (36 lines) - Infrastructure configuration
2. `./scripts/generate-veo-videos.ts` (447 lines) - Video generation workflow
3. `./scripts/veo-prompts.ts` (358 lines) - Video definitions
4. `./src/lib/components/ContentCategories.svelte` (254 lines) - DB-driven video display
5. `./src/lib/components/FeaturedVideos.svelte` (438 lines) - Hardcoded video display
6. `./static/thumbnails/` - Confirmed 20 items exist

---

## Next Steps (Awaiting Architectural Decision)

Once architectural direction is chosen:

**If R2 Path**:
1. Modify `generate-veo-videos.ts` to download and upload to R2
2. Execute generation for required videos
3. Update D1 asset_path values
4. Verify R2 URLs work in components

**If Stream Path**:
1. Add Stream binding to wrangler.toml
2. Update component URL construction
3. Test Stream iframe embeds
4. Execute generation (already Stream-compatible)

**For Either Path**:
5. Reconcile three video systems into single source of truth
6. Update migrations if needed
7. Proceed with Task 4 (Webhook) and Task 5 (E2E)

---

**Investigation Duration**: ~15 minutes (7 commands)
**Cost**: Sonnet investigation = ~$0.005
**Status**: Investigation COMPLETE, awaiting architectural guidance to unblock Task 3
