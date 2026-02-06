/**
 * Half Dozen Gmail Sync - Gmail Add-on
 *
 * Contextual add-on that syncs the current email to Notion Interactions.
 * Automatically creates contacts for unknown senders, matches against
 * both primary and secondary email fields, and supports re-linking
 * to existing contacts when a client uses a different address.
 */

// ═══════════════════════════════════════════════════════════════
// CONTEXTUAL TRIGGER
// ═══════════════════════════════════════════════════════════════

/**
 * Fires when the user opens an email with the add-on active.
 * Checks sync status and builds the sidebar card.
 *
 * @param {Object} e - Gmail event object with e.gmail.messageId
 * @returns {CardService.Card[]}
 */
function onGmailMessageOpen(e) {
  var messageId = e.gmail.messageId;
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var message = GmailApp.getMessageById(messageId);
  var from = message.getFrom();
  var subject = message.getSubject();
  var date = message.getDate();
  var parsedFrom = parseFromHeader(from);
  var direction = detectDirection(parsedFrom.email);

  // Check if already synced
  try {
    var checkResult = workerFetch('/api/check', { gmail_id: messageId });

    if (checkResult.exists) {
      return [buildAlreadySyncedCard(subject, parsedFrom, direction, date, checkResult.page_url)];
    }
  } catch (err) {
    return [buildErrorCard('Could not check sync status: ' + err.message)];
  }

  return [buildSyncCard(messageId, subject, parsedFrom, direction, date)];
}

// ═══════════════════════════════════════════════════════════════
// SYNC ACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Called when the user clicks "Sync to Notion".
 * Reads the full email and sends it to the worker.
 *
 * @param {Object} e - Action event with parameters
 * @returns {CardService.ActionResponse}
 */
function onSyncClick(e) {
  var messageId = e.parameters.message_id;
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var message = GmailApp.getMessageById(messageId);
  var parsedFrom = parseFromHeader(message.getFrom());
  var direction = detectDirection(parsedFrom.email);

  // Get recipients (preserve full addresses, don't re-parse)
  var toEmails = (message.getTo() || '').split(',').map(function(t) {
    return t.trim();
  }).filter(Boolean);

  // Get plain text body
  var body = message.getPlainBody() || '';

  var payload = {
    subject: message.getSubject(),
    from: parsedFrom,
    to: toEmails,
    date: message.getDate().toISOString(),
    body: body,
    gmail_id: messageId,
    direction: direction,
  };

  try {
    var result = workerFetch('/api/sync', payload);

    if (result.skipped) {
      var card = buildAlreadySyncedCard(
        message.getSubject(), parsedFrom, direction, message.getDate(), result.page_url
      );
      return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().updateCard(card))
        .build();
    }

    var card = buildSuccessCard(result, parsedFrom, message.getSubject());
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  } catch (err) {
    var card = buildErrorCard('Sync failed: ' + err.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  }
}

// ═══════════════════════════════════════════════════════════════
// THREAD SYNC
// ═══════════════════════════════════════════════════════════════

/**
 * Syncs all messages in the current thread to Notion.
 * Dedup ensures already-synced messages are skipped.
 *
 * @param {Object} e - Action event with parameters
 * @returns {CardService.ActionResponse}
 */
function onSyncThreadClick(e) {
  var messageId = e.parameters.message_id;
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var message = GmailApp.getMessageById(messageId);
  var thread = message.getThread();
  var messages = thread.getMessages();

  var synced = 0;
  var skipped = 0;
  var failed = 0;
  var lastResult = null;

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    var parsedFrom = parseFromHeader(msg.getFrom());
    var direction = detectDirection(parsedFrom.email);

    var toEmails = (msg.getTo() || '').split(',').map(function(t) {
      return t.trim();
    }).filter(Boolean);

    var payload = {
      subject: msg.getSubject(),
      from: parsedFrom,
      to: toEmails,
      date: msg.getDate().toISOString(),
      body: msg.getPlainBody() || '',
      gmail_id: msg.getId(),
      direction: direction,
    };

    try {
      var result = workerFetch('/api/sync', payload);
      if (result.skipped) {
        skipped++;
      } else {
        synced++;
        lastResult = result;
      }
    } catch (err) {
      failed++;
    }
  }

  var card = buildThreadSummaryCard(messages.length, synced, skipped, failed, lastResult);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}

// ═══════════════════════════════════════════════════════════════
// LINK TO EXISTING CONTACT
// ═══════════════════════════════════════════════════════════════

/**
 * Called when the user wants to search for an existing contact to link to.
 * Shows a search form.
 *
 * @param {Object} e - Action event with parameters
 * @returns {CardService.ActionResponse}
 */
function onLinkContactSearch(e) {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Link to Existing Contact'))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextInput()
            .setFieldName('search_name')
            .setTitle('Search by name')
            .setHint('Enter contact name to search')
        )
        .addWidget(
          CardService.newTextButton()
            .setText('Search')
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('onContactSearchSubmit')
                .setParameters({
                  interaction_id: e.parameters.interaction_id,
                  auto_created_contact_id: e.parameters.auto_created_contact_id || '',
                  sender_email: e.parameters.sender_email || '',
                })
            )
        )
    )
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Executes the contact search and displays results.
 *
 * @param {Object} e - Action event with formInputs
 * @returns {CardService.ActionResponse}
 */
function onContactSearchSubmit(e) {
  var searchName = e.formInputs.search_name[0] || '';
  var interactionId = e.parameters.interaction_id;
  var autoCreatedId = e.parameters.auto_created_contact_id;
  var senderEmail = e.parameters.sender_email;

  if (!searchName) {
    var card = buildErrorCard('Please enter a name to search.');
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  }

  try {
    var result = workerFetch('/api/contact/find', { name: searchName });

    if (!result.found || result.contacts.length === 0) {
      var card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle('No Contacts Found'))
        .addSection(
          CardService.newCardSection()
            .addWidget(
              CardService.newTextParagraph()
                .setText('No contacts matching "' + searchName + '" were found.')
            )
        )
        .build();

      return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().updateCard(card))
        .build();
    }

    // Build results card
    var section = CardService.newCardSection()
      .setHeader('Select the correct contact:');

    result.contacts.forEach(function(contact) {
      var label = contact.name;
      if (contact.email) label += ' (' + contact.email + ')';

      section.addWidget(
        CardService.newDecoratedText()
          .setText(label)
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('onContactSelected')
              .setParameters({
                interaction_id: interactionId,
                contact_id: contact.id,
                contact_name: contact.name,
                auto_created_contact_id: autoCreatedId,
                sender_email: senderEmail,
              })
          )
      );
    });

    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Search Results'))
      .addSection(section)
      .build();

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  } catch (err) {
    var card = buildErrorCard('Search failed: ' + err.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  }
}

/**
 * Called when the user selects a contact from search results.
 * Re-links the Interaction and saves alias.
 *
 * @param {Object} e - Action event with parameters
 * @returns {CardService.ActionResponse}
 */
function onContactSelected(e) {
  var interactionId = e.parameters.interaction_id;
  var contactId = e.parameters.contact_id;
  var contactName = e.parameters.contact_name;
  var autoCreatedId = e.parameters.auto_created_contact_id;
  var senderEmail = e.parameters.sender_email;

  try {
    var payload = {
      interaction_id: interactionId,
      contact_id: contactId,
    };

    if (senderEmail) {
      payload.sender_email = senderEmail;
    }
    if (autoCreatedId) {
      payload.delete_auto_created_contact_id = autoCreatedId;
    }

    var result = workerFetch('/api/link-contact', payload);

    // Build confirmation card
    var section = CardService.newCardSection();
    section.addWidget(
      CardService.newTextParagraph()
        .setText('Linked to <b>' + contactName + '</b>')
    );

    if (result.alias_saved) {
      section.addWidget(
        CardService.newTextParagraph()
          .setText('Saved ' + senderEmail + ' as secondary email')
      );
    } else if (result.alias_note) {
      section.addWidget(
        CardService.newTextParagraph()
          .setText(result.alias_note)
      );
    }

    if (result.auto_created_archived) {
      section.addWidget(
        CardService.newTextParagraph()
          .setText('Auto-created duplicate contact archived')
      );
    }

    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Contact Linked'))
      .addSection(section)
      .build();

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().popToRoot().updateCard(card))
      .build();
  } catch (err) {
    var card = buildErrorCard('Link failed: ' + err.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(card))
      .build();
  }
}

// ═══════════════════════════════════════════════════════════════
// CARD BUILDERS
// ═══════════════════════════════════════════════════════════════

/**
 * Build the main card shown when the email has NOT been synced yet.
 */
function buildSyncCard(messageId, subject, parsedFrom, direction, date) {
  var fromDisplay = parsedFrom.name
    ? parsedFrom.name + ' <' + parsedFrom.email + '>'
    : parsedFrom.email;

  var dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM d, yyyy');

  var infoSection = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('From')
      .setText(fromDisplay))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Date')
      .setText(dateStr))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Direction')
      .setText(direction));

  var actionSection = CardService.newCardSection()
    .addWidget(
      CardService.newTextButton()
        .setText('Sync to Notion')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('onSyncClick')
            .setParameters({ message_id: messageId })
        )
    )
    .addWidget(
      CardService.newTextButton()
        .setText('Sync Entire Thread')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('onSyncThreadClick')
            .setParameters({ message_id: messageId })
        )
    );

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Half Dozen Sync')
        .setSubtitle(truncate(subject, 60))
    )
    .addSection(infoSection)
    .addSection(actionSection)
    .build();
}

/**
 * Build the card shown when the email is already synced.
 */
function buildAlreadySyncedCard(subject, parsedFrom, direction, date, pageUrl) {
  var dateStr = Utilities.formatDate(
    date instanceof Date ? date : new Date(date),
    Session.getScriptTimeZone(),
    'MMM d, yyyy'
  );

  var section = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Status')
      .setText('Already synced to Notion'))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Direction')
      .setText(direction));

  if (pageUrl) {
    section.addWidget(
      CardService.newTextButton()
        .setText('Open in Notion')
        .setOpenLink(CardService.newOpenLink().setUrl(pageUrl))
    );
  }

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Half Dozen Sync')
        .setSubtitle(truncate(subject, 60))
    )
    .addSection(section)
    .build();
}

/**
 * Build the success card shown after a sync completes.
 */
function buildSuccessCard(result, parsedFrom, subject) {
  var contactSection = CardService.newCardSection();

  if (result.contact_created) {
    contactSection.addWidget(
      CardService.newDecoratedText()
        .setTopLabel('Contact')
        .setText('Created: ' + (result.contact_name || parsedFrom.email))
    );
    // Offer to link to existing contact instead
    contactSection.addWidget(
      CardService.newTextButton()
        .setText('Link to Existing Contact Instead')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('onLinkContactSearch')
            .setParameters({
              interaction_id: result.page_url ? extractNotionId(result.page_url) : '',
              auto_created_contact_id: result.contact_id || '',
              sender_email: parsedFrom.email,
            })
        )
    );
  } else {
    contactSection.addWidget(
      CardService.newDecoratedText()
        .setTopLabel('Contact')
        .setText('Linked: ' + (result.contact_name || 'Found'))
    );
  }

  var actionsSection = CardService.newCardSection();
  if (result.page_url) {
    actionsSection.addWidget(
      CardService.newTextButton()
        .setText('Open in Notion')
        .setOpenLink(CardService.newOpenLink().setUrl(result.page_url))
    );
  }

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Synced')
        .setSubtitle(truncate(subject, 60))
    )
    .addSection(contactSection)
    .addSection(actionsSection)
    .build();
}

/**
 * Build a summary card after syncing an entire thread.
 */
function buildThreadSummaryCard(total, synced, skipped, failed, lastResult) {
  var section = CardService.newCardSection();

  section.addWidget(
    CardService.newDecoratedText()
      .setTopLabel('Messages in thread')
      .setText(String(total))
  );
  section.addWidget(
    CardService.newDecoratedText()
      .setTopLabel('Synced')
      .setText(String(synced))
  );

  if (skipped > 0) {
    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel('Already synced')
        .setText(String(skipped))
    );
  }

  if (failed > 0) {
    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel('Failed')
        .setText(String(failed))
    );
  }

  if (lastResult && lastResult.page_url) {
    section.addWidget(
      CardService.newTextButton()
        .setText('Open Latest in Notion')
        .setOpenLink(CardService.newOpenLink().setUrl(lastResult.page_url))
    );
  }

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Thread Synced')
        .setSubtitle(synced + ' of ' + total + ' messages synced')
    )
    .addSection(section)
    .build();
}

/**
 * Build an error card.
 */
function buildErrorCard(message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Error'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message))
    )
    .build();
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Parse "Name <email@example.com>" format into { name, email }.
 *
 * @param {string} raw - Raw From header value
 * @returns {{ name: string|undefined, email: string }}
 */
function parseFromHeader(raw) {
  if (!raw) return { email: '' };

  var match = raw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || '').trim() || undefined,
      email: (match[2] || raw).trim(),
    };
  }
  return { email: raw.trim() };
}

/**
 * Truncate a string with ellipsis.
 *
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 1) + '...' : str;
}

/**
 * Extract a Notion page ID from a notion.so URL.
 * URLs are like: https://notion.so/abc123def456...
 *
 * @param {string} url
 * @returns {string}
 */
function extractNotionId(url) {
  if (!url) return '';
  var parts = url.split('/');
  var last = parts[parts.length - 1];
  // Re-insert hyphens into the 32-char hex string to form UUID
  if (last && last.length === 32) {
    return last.substring(0, 8) + '-' + last.substring(8, 12) + '-' +
           last.substring(12, 16) + '-' + last.substring(16, 20) + '-' +
           last.substring(20);
  }
  return last || '';
}
