#!/bin/bash
set -e

API_KEY="AIzaSyDUGN6Z1cnkWzhSGajLhgKyI-ONdI9vMZ8"
OUTPUT_DIR="$(dirname "$0")"

generate_image() {
    local prompt="$1"
    local output="$2"
    local aspect="${3:-1:1}"

    echo "Generating: $output"

    response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"instances\": [{\"prompt\": \"$prompt\"}],
            \"parameters\": {\"sampleCount\": 1, \"aspectRatio\": \"$aspect\"}
        }")

    # Check for error
    if echo "$response" | grep -q '"error"'; then
        echo "Error: $response"
        return 1
    fi

    # Extract and save image
    echo "$response" | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
if 'predictions' in data and len(data['predictions']) > 0:
    img_data = data['predictions'][0].get('bytesBase64Encoded', '')
    if img_data:
        sys.stdout.buffer.write(base64.b64decode(img_data))
" > "${OUTPUT_DIR}/${output}"

    echo "Saved: ${OUTPUT_DIR}/${output}"
}

echo "=== Generating Martinez & Rivera Images ==="

# Hero
generate_image "Professional photograph of San Diego downtown skyline at golden hour dusk, Coronado bridge visible, scales of justice silhouette subtly overlaid in dramatic sky, modern law firm aesthetic, orange and blue sunset colors, photorealistic, cinematic lighting, architectural photography" "hero-justice.png" "16:9"

# Carlos Martinez - Latino male, mid-40s, Founding Partner
generate_image "Professional headshot portrait of a confident Latino male attorney in his mid-40s, salt and pepper hair, wearing dark navy suit with burgundy tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style" "attorney-martinez.png" "3:4"

# Elena Rivera - Latina female, late 30s, Managing Partner
generate_image "Professional headshot portrait of a confident Latina woman attorney in her late 30s, dark hair pulled back professionally, wearing black blazer with white blouse, neutral dark gray studio background, warm professional lighting, photorealistic, approachable expression" "attorney-rivera.png" "3:4"

# Marcus Johnson - Black male, early 30s, Senior Associate
generate_image "Professional headshot portrait of a confident African American male attorney in his early 30s, short hair with neat fade, wearing charcoal gray suit with light blue tie, neutral dark gray studio background, warm professional lighting, photorealistic, confident expression" "attorney-johnson.png" "3:4"

echo "=== Done ==="
ls -la "${OUTPUT_DIR}"/*.png
