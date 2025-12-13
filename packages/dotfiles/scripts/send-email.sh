#!/bin/bash
# Send email via Gmail SMTP
# Uses the same app passwords as neomutt
#
# Usage:
#   send-email.sh --to "recipient@example.com" --subject "Subject" --body "Body"
#   send-email.sh --to "recipient@example.com" --subject "Subject" < body.txt
#   echo "Body" | send-email.sh --to "recipient@example.com" --subject "Subject"
#
# Account selection:
#   --account createsomething  (default)
#   --account halfdozen
#   --account webflow
#
# Claude Code can invoke this to send email on your behalf.

set -e

# Defaults
ACCOUNT="createsomething"
CREDS_DIR="$HOME/.config/neomutt/credentials"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --to) TO="$2"; shift 2 ;;
    --cc) CC="$2"; shift 2 ;;
    --subject) SUBJECT="$2"; shift 2 ;;
    --body) BODY="$2"; shift 2 ;;
    --account) ACCOUNT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Read body from stdin if not provided
if [ -z "$BODY" ]; then
  BODY=$(cat)
fi

# Validate required fields
if [ -z "$TO" ] || [ -z "$SUBJECT" ]; then
  echo "Usage: send-email.sh --to <recipient> --subject <subject> [--body <body>] [--account <name>]"
  echo ""
  echo "Accounts: createsomething, halfdozen, webflow"
  exit 1
fi

# Account configuration
case $ACCOUNT in
  createsomething)
    FROM="micah@createsomething.io"
    USER="micah@createsomething.io"
    PASS_FILE="$CREDS_DIR/createsomething.pass"
    ;;
  halfdozen)
    FROM="mj@halfdozen.co"
    USER="mj@halfdozen.co"
    PASS_FILE="$CREDS_DIR/halfdozen.pass"
    ;;
  webflow)
    FROM="micah@webflow.com"
    USER="micah@webflow.com"
    PASS_FILE="$CREDS_DIR/webflow.pass"
    ;;
  *)
    echo "Unknown account: $ACCOUNT"
    echo "Available: createsomething, halfdozen, webflow"
    exit 1
    ;;
esac

# Check credentials exist
if [ ! -f "$PASS_FILE" ]; then
  echo "Error: Credentials not found at $PASS_FILE"
  exit 1
fi

PASSWORD=$(cat "$PASS_FILE")

# Build email
EMAIL_CONTENT="From: $FROM
To: $TO"

if [ -n "$CC" ]; then
  EMAIL_CONTENT="$EMAIL_CONTENT
Cc: $CC"
fi

EMAIL_CONTENT="$EMAIL_CONTENT
Subject: $SUBJECT
Content-Type: text/plain; charset=utf-8

$BODY"

# Send via curl to Gmail SMTP
echo "$EMAIL_CONTENT" | curl -s --ssl-reqd \
  --url "smtps://smtp.gmail.com:465" \
  --user "$USER:$PASSWORD" \
  --mail-from "$FROM" \
  --mail-rcpt "$TO" \
  ${CC:+--mail-rcpt "$CC"} \
  --upload-file - \
  && echo "Email sent to $TO from $FROM"
