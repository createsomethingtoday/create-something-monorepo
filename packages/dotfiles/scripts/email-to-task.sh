#!/bin/bash
# Email → Task extraction
# Zuhandenheit: email is capture mechanism, tasks flow OUT
#
# Usage: pipe email to this script from neomutt
# macro index,pager \ct '<pipe-message>email-to-task.sh<enter>' "Create task from email"

# Extract headers
from=$(grep -m1 "^From:" | sed 's/From: //')
subject=$(grep -m1 "^Subject:" | sed 's/Subject: //')
date=$(grep -m1 "^Date:" | sed 's/Date: //')
message_id=$(grep -m1 "^Message-ID:" | sed 's/Message-ID: //')

# Create task with email reference
task add "$subject" \
  +email \
  from:"$from" \
  email_date:"$date" \
  message_id:"$message_id"

echo "Task created: $subject"
