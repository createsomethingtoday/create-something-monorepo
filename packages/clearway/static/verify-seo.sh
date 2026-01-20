#!/bin/bash
# CLEARWAY SEO/AEO Verification Script
# Run this after deployment to verify all SEO assets are accessible

DOMAIN="https://clearway.pages.dev"

echo "🔍 CLEARWAY SEO/AEO Verification"
echo "=================================="
echo ""

# Test robots.txt
echo "📄 Testing robots.txt..."
ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/robots.txt")
if [ "$ROBOTS_STATUS" = "200" ]; then
  echo "✅ robots.txt: Accessible ($ROBOTS_STATUS)"
else
  echo "❌ robots.txt: Failed ($ROBOTS_STATUS)"
fi

# Test sitemap.xml
echo "📄 Testing sitemap.xml..."
SITEMAP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/sitemap.xml")
if [ "$SITEMAP_STATUS" = "200" ]; then
  echo "✅ sitemap.xml: Accessible ($SITEMAP_STATUS)"
else
  echo "❌ sitemap.xml: Failed ($SITEMAP_STATUS)"
fi

# Test manifest.json
echo "📄 Testing manifest.json..."
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/manifest.json")
if [ "$MANIFEST_STATUS" = "200" ]; then
  echo "✅ manifest.json: Accessible ($MANIFEST_STATUS)"
else
  echo "❌ manifest.json: Failed ($MANIFEST_STATUS)"
fi

# Test favicon.svg
echo "📄 Testing favicon.svg..."
FAVICON_SVG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/favicon.svg")
if [ "$FAVICON_SVG_STATUS" = "200" ]; then
  echo "✅ favicon.svg: Accessible ($FAVICON_SVG_STATUS)"
else
  echo "❌ favicon.svg: Failed ($FAVICON_SVG_STATUS)"
fi

# Test OG image
echo "📄 Testing og-image.svg..."
OG_IMAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/og-image.svg")
if [ "$OG_IMAGE_STATUS" = "200" ]; then
  echo "✅ og-image.svg: Accessible ($OG_IMAGE_STATUS)"
else
  echo "❌ og-image.svg: Failed ($OG_IMAGE_STATUS)"
fi

# Test homepage meta tags
echo ""
echo "📄 Testing homepage meta tags..."
curl -s "$DOMAIN" | grep -q "CLEARWAY - Pickleball Court Booking Made Simple"
if [ $? -eq 0 ]; then
  echo "✅ Homepage title: Correct"
else
  echo "❌ Homepage title: Missing or incorrect"
fi

curl -s "$DOMAIN" | grep -q "og:image"
if [ $? -eq 0 ]; then
  echo "✅ Open Graph image tag: Present"
else
  echo "❌ Open Graph image tag: Missing"
fi

curl -s "$DOMAIN" | grep -q "twitter:card"
if [ $? -eq 0 ]; then
  echo "✅ Twitter card tag: Present"
else
  echo "❌ Twitter card tag: Missing"
fi

echo ""
echo "=================================="
echo "🎯 Verification Complete"
echo ""
echo "Next steps:"
echo "1. Generate PNG/ICO files (see ASSET_GENERATION.md)"
echo "2. Submit sitemap to Google Search Console"
echo "3. Test social sharing on Slack, Twitter, LinkedIn"
echo "4. Validate meta tags: https://metatags.io"
