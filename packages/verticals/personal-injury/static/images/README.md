# Law Firm Template Images

Images for the Morrison & Associates demo law firm template.

## Required Images

Generate these images using Google Imagen 3 Pro:

### Hero Image
- **File**: `hero-office.jpg`
- **Prompt**: "Professional law office interior with floor-to-ceiling windows overlooking San Francisco skyline, modern minimalist design, warm lighting, legal books on shelves, high-end corporate aesthetic, photorealistic"
- **Size**: 1920x1080

### Attorney Headshots
- **File**: `attorney-morrison.jpg`
- **Prompt**: "Professional headshot of a confident woman attorney in her mid-40s, dark professional attire, neutral studio background, warm lighting, photorealistic"

- **File**: `attorney-chen.jpg`
- **Prompt**: "Professional headshot of an Asian American male attorney in his mid-30s, dark suit and tie, neutral studio background, warm lighting, photorealistic"

- **File**: `attorney-gonzalez.jpg`
- **Prompt**: "Professional headshot of a Latina woman attorney in her early 30s, professional attire, neutral studio background, warm lighting, photorealistic"

## Generation Command

```bash
# Authenticate first
gcloud auth application-default login

# Generate images via Vertex AI Imagen 3
ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
PROJECT_ID="your-project-id"

curl -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"instances":[{"prompt":"YOUR_PROMPT"}],"parameters":{"sampleCount":1}}' \
  | jq -r '.predictions[0].bytesBase64Encoded' | base64 -d > output.jpg
```

## Placeholder Alternative

For development, use placeholder images:
- https://placehold.co/1920x1080/111111/ffffff?text=Hero+Image
- https://placehold.co/600x800/111111/ffffff?text=Attorney
