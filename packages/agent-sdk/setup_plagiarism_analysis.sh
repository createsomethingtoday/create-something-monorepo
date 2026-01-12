#!/bin/bash
# Setup script for Multi-Modal Plagiarism Analysis

set -e

echo "🔧 Setting up Multi-Modal Plagiarism Analysis"
echo "=============================================="
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
echo "✅ Python $PYTHON_VERSION found"
echo ""

# Check for required environment variables
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo "⚠️  WARNING: Neither ANTHROPIC_API_KEY nor GOOGLE_API_KEY is set"
    echo "   You'll need one of these to run visual analysis"
    echo ""
    echo "   Set with:"
    echo "   export ANTHROPIC_API_KEY='your-key'  # For Claude"
    echo "   export GOOGLE_API_KEY='your-key'     # For Gemini"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -q -r requirements-plagiarism.txt

echo "✅ Python dependencies installed"
echo ""

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
python3 -m playwright install chromium

echo "✅ Playwright chromium installed"
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x agents/plagiarism_visual_agent.py
chmod +x test_padelthon_case.py

echo "✅ Scripts are now executable"
echo ""

# Create screenshots directory
mkdir -p screenshots
echo "✅ Screenshots directory created"
echo ""

echo "=============================================="
echo "🎉 Setup complete!"
echo "=============================================="
echo ""
echo "Quick test:"
echo "  python3 test_padelthon_case.py --quick"
echo ""
echo "Comprehensive test (all 6 templates):"
echo "  python3 test_padelthon_case.py --comprehensive"
echo ""
echo "Custom comparison:"
echo "  python3 agents/plagiarism_visual_agent.py URL1 URL2"
echo ""
