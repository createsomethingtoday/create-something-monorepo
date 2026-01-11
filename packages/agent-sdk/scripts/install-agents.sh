#!/bin/bash
# Install CREATE SOMETHING agent launchd schedules
#
# Usage: ./install-agents.sh [--uninstall]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_DIR="$(dirname "$SCRIPT_DIR")"
LAUNCHD_DIR="$SDK_DIR/launchd"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

AGENTS=(
    "io.createsomething.monitor"
    "io.createsomething.coordinator"
    "io.createsomething.content"
    "io.createsomething.review"
    "io.createsomething.canon-audit"
    "io.createsomething.dry-check"
    "io.createsomething.resolution"
)

uninstall() {
    echo "Uninstalling CREATE SOMETHING agents..."
    for agent in "${AGENTS[@]}"; do
        plist="$LAUNCH_AGENTS_DIR/$agent.plist"
        if [ -f "$plist" ]; then
            echo "  Unloading $agent..."
            launchctl unload "$plist" 2>/dev/null || true
            rm -f "$plist"
            echo "  ✓ Removed $agent"
        fi
    done
    echo ""
    echo "All agents uninstalled."
}

install() {
    echo "Installing CREATE SOMETHING agents..."
    echo ""

    # Ensure LaunchAgents directory exists
    mkdir -p "$LAUNCH_AGENTS_DIR"

    for agent in "${AGENTS[@]}"; do
        src="$LAUNCHD_DIR/$agent.plist"
        dst="$LAUNCH_AGENTS_DIR/$agent.plist"

        if [ ! -f "$src" ]; then
            echo "  ✗ Missing: $src"
            continue
        fi

        # Unload if already loaded
        if launchctl list | grep -q "$agent"; then
            launchctl unload "$dst" 2>/dev/null || true
        fi

        # Copy plist
        cp "$src" "$dst"

        # Load the agent
        launchctl load "$dst"
        echo "  ✓ Installed $agent"
    done

    echo ""
    echo "Installation complete!"
    echo ""
    echo "Schedules:"
    echo "  • Monitor:     Every hour at :00"
    echo "  • Coordinator: Daily at 8:00 AM"
    echo "  • Canon Audit: Daily at 9:00 AM (CSS/design compliance)"
    echo "  • Content:     Tue-Fri at 9:00 AM"
    echo "  • Review:      Monday at 10:00 AM (Subtractive Triad audit)"
    echo "  • DRY Check:   Tue/Fri at 10:00 AM (duplication analysis)"
    echo "  • Resolution:  Mon/Tue/Fri at 11:00 AM (fix review findings)"
    echo ""
    echo "Review → Resolution Flow:"
    echo "  Monday:   10am Review → 11am Resolution"
    echo "  Tuesday:  10am DRY Check → 11am Resolution"
    echo "  Friday:   10am DRY Check → 11am Resolution"
    echo ""
    echo "Commands:"
    echo "  launchctl list | grep createsomething    # Check status"
    echo "  launchctl start io.createsomething.monitor  # Run now"
    echo "  tail -f /tmp/createsomething-*.log          # View logs"
    echo ""
    echo "To uninstall: $0 --uninstall"
}

# Parse arguments
if [ "$1" = "--uninstall" ] || [ "$1" = "-u" ]; then
    uninstall
else
    install
fi
