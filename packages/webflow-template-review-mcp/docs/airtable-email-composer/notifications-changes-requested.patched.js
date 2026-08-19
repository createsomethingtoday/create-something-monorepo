// Instantiate input variables
let inputConfig = input.config();
let requestURL = 'ZAPIER_CATCH_HOOK_URL_REDACTED — live value stays in the Airtable automation script';

// Instantiate tables
let assetVersionsTable = base.getTable(`tblHxZ2hgSFLZxsZu`);

// Escape HTML special characters so literal tags in feedback (e.g. <script>) render as
// text instead of being parsed as markup — unescaped tags get stripped by Zendesk's
// sanitizer along with ALL content after them, silently truncating the email.
function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Function to convert Markdown to HTML with improved list handling
function markdownToHTML(markdown) {
    if (!markdown) return '';

    // Escape raw HTML first; all tags below are generated from markdown, never passed through
    let html = escapeHTML(markdown);

    // Handle inline code (after escaping, so `<script>` renders as visible code)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle basic formatting
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');

    // Handle links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/&lt;(https?:\/\/[^\s]+?)&gt;/g, '<a href="$1">$1</a>');
    
    // Process lists with better nesting support
    let lines = html.split('\n');
    let listStack = []; // Track current list state: [type, level]
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Check for various list formats
        let mainOrderedMatch = line.match(/^(\d+)\.\s+(.*)/); // Main numbered list: 1. Item
        let subLetterMatch = line.match(/^([a-z])\.\s+(.*)/);  // Letter sublist: a. Item
        let unorderedMatch = line.match(/^-\s+(.*)/);        // Unordered list: - Item
        
        if (mainOrderedMatch || subLetterMatch || unorderedMatch) {
            let content = '';
            let listType = '';
            let listLevel = 0;
            
            if (mainOrderedMatch) {
                content = mainOrderedMatch[2];
                listType = 'ol';
                listLevel = 0;
            } else if (subLetterMatch) {
                content = subLetterMatch[2];
                listType = 'ol';
                listLevel = 1;
            } else if (unorderedMatch) {
                content = unorderedMatch[1];
                listType = 'ul';
                listLevel = listStack.length > 0 ? 1 : 0; // Bullet points are usually sublists in this context
            }
            
            // Handle list stack
            if (listStack.length === 0) {
                // Start a new list
                result.push(`<${listType}>`);
                listStack.push({ type: listType, level: listLevel });
                result.push(`<li>${content}`);
            } else {
                let currentList = listStack[listStack.length - 1];
                
                if (currentList.type === listType && currentList.level === listLevel) {
                    // Continue current list
                    result.push(`</li>`);
                    result.push(`<li>${content}`);
                } else if (listLevel > currentList.level) {
                    // Start a nested list inside current item
                    result.push(`<${listType}>`);
                    listStack.push({ type: listType, level: listLevel });
                    result.push(`<li>${content}`);
                } else {
                    // Close current lists until we reach appropriate level
                    while (listStack.length > 0 && listStack[listStack.length - 1].level >= listLevel) {
                        let list = listStack.pop();
                        result.push(`</li>`);
                        result.push(`</${list.type}>`);
                    }
                    
                    // Start new list at current level
                    result.push(`<${listType}>`);
                    listStack.push({ type: listType, level: listLevel });
                    result.push(`<li>${content}`);
                }
            }
        } else {
            // Not a list item - close all open lists
            while (listStack.length > 0) {
                let list = listStack.pop();
                result.push(`</li>`);
                result.push(`</${list.type}>`);
            }
            
            // Add the regular line
            result.push(line);
        }
    }
    
    // Close any remaining open lists
    while (listStack.length > 0) {
        let list = listStack.pop();
        result.push(`</li>`);
        result.push(`</${list.type}>`);
    }
    
    // Join all lines with appropriate spacing
    html = result.join('');
    
    // Clean up potential empty lines
    html = html.replace(/<br><br>/g, '<br>');
    html = html.replace(/^<br>|<br>$/g, '');
    
    // Handle screenshots and videos
    html = html.replace(/\[screenshot\]\((.*?)\)/g, '<a href="$1">screenshot</a>');
    html = html.replace(/\[video\]\((.*?)\)/g, '<a href="$1">video</a>');
    
    return html;
}

let assetTypeForZendesk = `Asset`;
let publicGuidelinesURLForZendesk = `guide`;
if(inputConfig.assetType.findIndex(item => item.includes(`App`)) !== -1){
    assetTypeForZendesk = `App`;
    publicGuidelinesURLForZendesk = `<a href="https://docs.developers.webflow.com/docs/marketplace-guidelines">App Submission Guidelines</a>`;
} else if(inputConfig.assetType.findIndex(item => item.includes(`Library`)) !== -1){
    assetTypeForZendesk = `Library`;
    publicGuidelinesURLForZendesk = `<a href="https://webflow-marketplace-v1.webflow.io/libraries-2/creator-guide">Library Submission Guidelines</a> (Password: wf-lib-guide-beta1)`;
} else if(inputConfig.assetType.findIndex(item => item.includes(`Template`)) !== -1){
    assetTypeForZendesk = `Template`;
    publicGuidelinesURLForZendesk = `<a href="https://webflow.com/templates/submission-guidelines">Template Submission Guidelines</a>`;
}

// Define the message bodies here
let slackMessage = `📤 Review feedback has been shared with the asset creator.`;

// Convert to HTML format
let zendeskMessage = `Hi ${inputConfig.creatorName},<br><br>
Thanks again for submitting ${inputConfig.assetName} to Webflow's Marketplace!<br><br>`;

// Template-specific Rating Section
if (inputConfig.assetType.findIndex(item => item.includes("Template")) !== -1 && inputConfig.assetQualityScore) {
    zendeskMessage += `We have reviewed your ${assetTypeForZendesk} and rated it as "${inputConfig.assetQualityScore}" using our <a href="https://webflow.com/templates/grading-rubric">quality rubric</a>.<br><br>`;
    
    if (inputConfig.assetQualityScore.includes("Exceptional") || inputConfig.assetQualityScore.includes("Good")) {
        zendeskMessage += `Based on this rating, your ${assetTypeForZendesk} is on track to be published once you've addressed a few pieces of feedback.<br><br>`;
    } else {
        if (inputConfig.creatorTrustLevel > 1) {
            zendeskMessage += `Based on this rating, your ${assetTypeForZendesk} still needs significant improvements before it can be published.<br><br>`;
        } else {
            zendeskMessage += `Based on this rating and limitations on review team bandwidth, we can only provide one additional courtesy review of your ${assetTypeForZendesk}.<br><br>`;
        }
    }
}

// Improvement Areas Section
if (inputConfig.assetImprovementAreas.length > 0 && inputConfig.assetQualityScore) {
    if (!inputConfig.assetQualityScore.includes("Exceptional")) {
        zendeskMessage += `As a reminder, templates must score "Good" or above across all categories of our quality rubric in order to be published.<br><br>`;
    }
    
    zendeskMessage += `The following areas of your template ${inputConfig.assetQualityScore.includes("Exceptional") || inputConfig.assetQualityScore.includes("Good") ? "could" : "must"} be improved:<br>`;
    
    zendeskMessage += `<ul>`;
    inputConfig.assetImprovementAreas.forEach(element => {
        zendeskMessage += `<li>${escapeHTML(element).replace(/template:/i, '')}</li>`;
    });
    zendeskMessage += `</ul><br>`;
}

// Review Feedback Section - Convert Markdown to HTML
zendeskMessage += `Below are some specific items that we'd love to see addressed before your asset can be listed in the Marketplace:<br><br>
${markdownToHTML(inputConfig.assetReviewFeedback)}<br><br>`;

// Outro — Apps resubmit via a new bundle upload, not an email reply; wording approved
// from Wistia's feedback on rejection comms (Paige Conrad, 2026-08-10, ZD 1170775).
// No "please" — neutral tone for required changes (Shea + Paige's edit, 2026-08-10).
if (inputConfig.assetType.findIndex(item => item.includes("Template")) !== -1) {
    zendeskMessage += `Please review the feedback above along with our <a href="https://webflow.com/templates/grading-rubric">quality rubric</a> and <a href="https://webflow.com/templates/submission-guidelines">submission guidelines</a>, then update your ${assetTypeForZendesk} accordingly. Once you are satisfied with your changes, respond to this email and we will conduct another review.<br><br>`;
} else if (inputConfig.assetType.findIndex(item => item.includes("App")) !== -1) {
    zendeskMessage += `Once you've addressed the required feedback necessary for approval, <a href="https://developers.webflow.com/submit">submit a new bundle</a> for review.<br><br>`;
} else {
    zendeskMessage += `Please review the feedback above and update your ${assetTypeForZendesk} accordingly. Once you are satisfied with your changes, respond to this email and we will conduct another review.<br><br>`;
}

zendeskMessage += `The Webflow Marketplace Team`;

console.log(slackMessage);
console.log(zendeskMessage);

// Define which systems should recieve messages here
let messageSystems = [
    `zendesk`, // External Notification to Creator
    `slack`, // Internal Notification to Review team
];

// Iterate through message queue
let i = 0
for (const messageSystem of messageSystems) {
    console.log(`Now processing message ${i + 1} of ${messageSystems.length}...`);
    console.log(messageSystem);
    
    // Check whether notifications are suppressed
    if( inputConfig.messageSystemsToSuppress.includes(messageSystem) ){
        console.log(`Skipping ${messageSystem} notifications`);
    } else {
        // Make call to Zapier
        let r = await fetch(requestURL, {
            method: 'POST',
            body: JSON.stringify({
                'airtableRecordID': inputConfig.airtableRecordID,
                'creatorEmail': inputConfig.creatorEmail,
                'creatorName': inputConfig.creatorName,
                'messageSystem': messageSystem,
                'slackAction': inputConfig.slackAction,
                'slackChannel': inputConfig.slackChannel,
                'slackMessageBody': slackMessage,
                'slackTimestamp': inputConfig.slackTimestamp,
                'zendeskAction': inputConfig.zendeskAction,
                'zendeskID': inputConfig.zendeskID,
                'zendeskMessageBody': zendeskMessage,
                'zendeskNewStatus': inputConfig.zendeskStatusNew,
                'zendeskPreviousStatus': inputConfig.zendeskStatusPrevious,
                'zendeskSubject': inputConfig.zendeskSubject,
                'zendeskTag': inputConfig.zendeskTag,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Parse Response
        let response = await r.json()
        console.log(response);
    }
    i += 1
}

// Stamp Timestamps
if(!inputConfig.dateTimeForStatus){
    console.log('setting timestamp');
    console.log(inputConfig.dateTimeForStatus);
    
    let recordPayload = {};
    recordPayload[inputConfig.dateTimeFieldID] = inputConfig.currentTime;
    
    // @ts-ignore
    let newQueryRecordId = await assetVersionsTable.updateRecordAsync(inputConfig.airtableRecordID, recordPayload);
}

