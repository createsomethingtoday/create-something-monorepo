#!/bin/bash
# Seed ARCHITECTURAL DWELLING channel from NAH blocks
# Run after deploying ltd package changes

API_BASE="${API_BASE:-https://createsomething.ltd}"
CHANNEL="architectural-dwelling"

# Block IDs to connect (curated from NAH channel)
BLOCKS=(
  40986758  # notes - "design for rain, design for moss"
  40979640  # NOT A HOTEL DESIGN COMPETITION 2024
  40983316  # NOT A HOTEL DESIGN COMPETITION 2026 (Yakushima)
  40987494  # KITAKARUIZAWA BASE L interior
  40987495  # KITAKARUIZAWA BASE L interior 2
  40987604  # Bathroom/spa space
  41073792  # Exterior overview
  40987605  # Outdoor living/terrace
  40987607  # Floor plan
  41073454  # Wonderwall project
  41073464  # Pilotis rendering
  41074787  # nasu-masterpiece
  41075170  # KITAKARUIZAWA IRORI
  41101433  # Making of La Casa Nell'erba
  41129489  # Material texture reference
  41132810  # YOOEHWA ARCHITECTS: Sihojae
  41132863  # Sihojae Interior
  41132976  # Sayama Lakeside Cemetery Community Hall
  41134531  # Vessel Of Light
)

echo "Seeding $CHANNEL with ${#BLOCKS[@]} blocks from NAH..."
echo ""

for block_id in "${BLOCKS[@]}"; do
  echo "Connecting block $block_id..."
  response=$(curl -s -X POST "$API_BASE/api/arena/connect" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"$CHANNEL\", \"blockId\": $block_id}")

  success=$(echo "$response" | grep -o '"success":true')
  if [ -n "$success" ]; then
    echo "  ✓ Connected"
  else
    error=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    echo "  ✗ Failed: $error"
  fi

  # Rate limit - don't hammer the API
  sleep 1
done

echo ""
echo "Done. Run sync to pull into D1:"
echo "  curl $API_BASE/api/arena/sync?channel=$CHANNEL"
