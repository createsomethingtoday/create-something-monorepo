#!/bin/bash
# Generate architecture images using Cloudflare Workers AI (Flux)
#
# Usage: ./scripts/generate-images.sh

set -e

ACCOUNT_ID="9645bd52e640b8a4f40a3a55ff1dd75a"
OUTPUT_DIR="$(dirname "$0")/../static/projects"

# Style prefix for consistency
STYLE="Professional architectural photography, minimalist modern architecture, natural materials wood glass concrete, integration with natural landscape, warm interior lighting at golden hour, clean editorial style, high dynamic range, ultra sharp details, photorealistic"

generate_image() {
    local filename="$1"
    local prompt="$2"
    local output_path="$OUTPUT_DIR/$filename"

    echo "Generating: $filename..."

    # Call Cloudflare AI API via wrangler
    response=$(curl -s -X POST \
        "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai/run/@cf/black-forest-labs/flux-1-schnell" \
        -H "Authorization: Bearer $(wrangler whoami --experimental-output-format=json 2>/dev/null | jq -r '.api_token // empty')" \
        -H "Content-Type: application/json" \
        -d "{\"prompt\": \"$STYLE. $prompt\"}")

    # Extract base64 image and save
    echo "$response" | jq -r '.result.image' | base64 -d > "$output_path"

    if [ -s "$output_path" ]; then
        echo "  ✓ Saved: $output_path ($(du -h "$output_path" | cut -f1))"
    else
        echo "  ✗ Failed: $filename"
        rm -f "$output_path"
    fi

    # Rate limit
    sleep 2
}

echo "Architecture Studio Image Generator (Cloudflare Flux)"
echo "======================================================"
echo ""

mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/../team"

# Forest Cabin
generate_image "hero-forest-cabin.jpg" "Stunning glass pavilion house nestled among tall pine trees in a Scandinavian forest, floor-to-ceiling windows, black steel frame, warm amber interior lighting glowing at dusk, pine trees frame composition, misty atmosphere"

generate_image "forest-cabin-01.jpg" "Interior of modern forest cabin, double-height living space with floor-to-ceiling windows overlooking pine forest, minimalist furniture, concrete floor, wood-clad ceiling, warm afternoon light"

generate_image "forest-cabin-02.jpg" "Modern kitchen in forest cabin, open plan with island counter, black cabinetry, concrete countertops, large window with forest view, copper pendant lights"

generate_image "forest-cabin-03.jpg" "Exterior detail of modern cabin, junction of black steel frame and floor-to-ceiling glass, pine trees reflected, clean geometric lines"

# Hillside Residence
generate_image "exterior-hillside.jpg" "Dramatic cantilevered modern house on steep hillside, concrete and glass construction, floating above landscape, sweeping valley views, dramatic clouds, golden hour"

generate_image "hillside-01.jpg" "Open plan living space in hillside home with panoramic floor-to-ceiling windows, polished concrete floors, built-in walnut shelving, valley views"

generate_image "hillside-02.jpg" "Master bedroom in hillside residence with glass wall overlooking mountains, floating bed platform, oak floors, pure white linens, morning light"

# Coastal Retreat
generate_image "exterior-coastal.jpg" "Modernist beach house with horizontal lines, white concrete walls, large overhanging roof, infinity pool merging with ocean horizon, blue sky"

generate_image "coastal-01.jpg" "Living room interior with ocean view, white walls, natural linen furniture, floor-to-ceiling sliding glass doors open to terrace"

generate_image "coastal-02.jpg" "Outdoor deck of coastal home with built-in seating, fire pit, ocean view at sunset, wooden decking"

# Meadow Studio
generate_image "exterior-meadow.jpg" "Low-slung modernist pavilion in wildflower meadow, black timber cladding, large glass walls, flat roof with deep overhang, golden grasses, mountains in distance"

generate_image "meadow-01.jpg" "Artist studio interior with north-facing skylights, white walls, concrete floor, large canvas on easel, natural diffused light"

generate_image "meadow-02.jpg" "Entry sequence to meadow pavilion, covered walkway with timber slats creating shadow patterns, meadow grasses visible"

# Woodland House
generate_image "exterior-woodland.jpg" "Contemporary timber house among deciduous trees in autumn, vertical cedar cladding weathered to silver-grey, large windows, fallen leaves"

generate_image "woodland-01.jpg" "Double-height living room with timber frame exposed, wood-burning stove, floor-to-ceiling bookshelf, autumn forest through windows"

generate_image "woodland-02.jpg" "Home library in woodland house, built-in oak shelving, leather reading chair by window, forest view, afternoon light"

generate_image "woodland-03.jpg" "Construction detail showing timber joinery of woodland house, mortise and tenon joints, natural wood grain, craftsmanship"

# Team and OG
generate_image "../team/principal.jpg" "Professional headshot portrait of distinguished architect in 50s, salt and pepper hair, black turtleneck, modern white studio, soft natural lighting, warm expression"

generate_image "../og-image.jpg" "Aerial view of cluster of modern glass and concrete houses nestled in forested hillside, harmony between architecture and nature, golden hour"

echo ""
echo "Generation complete!"
