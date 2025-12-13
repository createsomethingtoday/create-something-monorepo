#!/bin/bash
# Generate images for Martinez & Rivera Personal Injury template
# Using Google Imagen 3 Pro via Vertex AI

set -e

cd "$(dirname "$0")"

ACCESS_TOKEN=$(gcloud auth application-default print-access-token)
PROJECT_ID="dulcet-antler-443415-r6"
API_URL="https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict"

generate_image() {
    local prompt="$1"
    local output="$2"
    local aspect="${3:-1:1}"

    echo "Generating: $output"

    curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"instances\":[{\"prompt\":\"$prompt\"}],\"parameters\":{\"sampleCount\":1,\"aspectRatio\":\"$aspect\"}}" \
        > /tmp/imagen-response.json

    # Check for errors
    if jq -e '.error' /tmp/imagen-response.json > /dev/null 2>&1; then
        echo "Error generating $output:"
        jq '.error' /tmp/imagen-response.json
        return 1
    fi

    # Extract and decode image
    jq -r '.predictions[0].bytesBase64Encoded' /tmp/imagen-response.json | base64 -d -o "$output"
    echo "Saved: $output ($(ls -lh "$output" | awk '{print $5}'))"
}

echo "=== Martinez & Rivera Image Generation ==="
echo ""

# Hero Image - San Diego skyline
generate_image \
    "Professional photograph of San Diego downtown skyline at golden hour dusk, Coronado bridge visible, scales of justice silhouette subtly overlaid in dramatic sky, modern law firm aesthetic, orange and blue sunset colors, photorealistic, cinematic lighting, architectural photography style" \
    "hero-justice.png" \
    "16:9"

echo ""

# Attorney: Carlos Martinez - Founding Partner, Latino male, mid-40s
generate_image \
    "Professional headshot portrait of a confident Latino male attorney in his mid-40s, salt and pepper hair, wearing a dark navy suit with burgundy tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style, sharp focus on face" \
    "attorney-martinez.png" \
    "3:4"

echo ""

# Attorney: Elena Rivera - Managing Partner, Latina female, late 30s
generate_image \
    "Professional headshot portrait of a confident Latina woman attorney in her late 30s, dark hair pulled back professionally, wearing a black blazer with white blouse, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style, approachable expression" \
    "attorney-rivera.png" \
    "3:4"

echo ""

# Attorney: Marcus Johnson - Senior Associate, Black male, early 30s
generate_image \
    "Professional headshot portrait of a confident African American male attorney in his early 30s, short hair with neat fade, wearing a charcoal gray suit with light blue tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate professional style, confident expression" \
    "attorney-johnson.png" \
    "3:4"

echo ""
echo "=== All images generated ==="
