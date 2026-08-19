// Instantiate input variables
let inputConfig = input.config();
let requestURL = 'ZAPIER_CATCH_HOOK_URL_REDACTED — live value stays in the Airtable automation script';

// Escape HTML special characters so literal tags in feedback (e.g. <script>) render as
// text instead of being parsed as markup — unescaped tags get stripped by Zendesk's
// sanitizer along with ALL content after them, silently truncating the email.
function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Function to convert Markdown to HTML
function markdownToHTML(markdown) {
    if (!markdown) return '';

    // Escape raw HTML first; all tags below are generated from markdown, never passed through
    let html = escapeHTML(markdown);

    // Handle inline code (after escaping, so `<script>` renders as visible code)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle ordered lists
    html = html.replace(/^\d+\.\s+(.*?)$/gm, '<li>$1</li>');
    if (html.includes('<li>') && html.match(/^\d+\./m)) {
        html = html.replace(/(<li>.*?<\/li>)+/g, '<ol>$&</ol>');
    }
    
    // Handle unordered lists
    html = html.replace(/^-\s+(.*?)$/gm, '<li>$1</li>');
    if (html.match(/<li>.*?<\/li>/g) && !html.includes('<ol>') && html.match(/^-/m)) {
        html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    }
    
    // Handle links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // Replace newlines with <br> tags for Zendesk dark mode compatibility
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Set conditional for message copy
let assetTypeForZendesk = `Assets`;
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

console.log(publicGuidelinesURLForZendesk);

// Define the message bodies here
let slackMessage = [
  `❌Version has been rejected by ${inputConfig.assetReviewer}.`,
  `Reason: ${inputConfig.assetReviewReason}`,
].join('\n\n')

// Paige's final wording keeps "quality standards"; for Apps the phrase links to
// the Marketplace Guidelines doc (her 👍 on linking out to docs; Shea's doc-title
// point satisfied by the link target). Other asset types stay plain — templates
// cite the quality rubric in the next sentence. #wg-app-marketplace 2026-08-10.
let qualityBarPhrase = assetTypeForZendesk === `App`
    ? `<a href="https://docs.developers.webflow.com/docs/marketplace-guidelines">quality standards</a>`
    : `quality standards`;

// HTML formatted Zendesk message
let zendeskMessage = `Hi ${inputConfig.creatorName},<br><br>
Thanks again for submitting ${inputConfig.assetName} to Webflow's Marketplace. After completing our review, we found that your submission needs the following update(s) in order to meet our ${qualityBarPhrase}.<br><br>`;

// Template-specific Section
if (inputConfig.assetType.findIndex(item => item.includes("Template")) !== -1) {
    zendeskMessage += `As a reminder, your ${assetTypeForZendesk} must score at least "Good" in all categories of our <a href="https://webflow.com/templates/grading-rubric">quality rubric</a> to be published.<br><br>`;
}

// Improvement Areas Section
if (inputConfig.assetImprovementAreas.length > 0) {
    zendeskMessage += `The following areas of your ${assetTypeForZendesk} were rated as "Satisfactory" or below:<br>`;
    zendeskMessage += `<ul>`;
    inputConfig.assetImprovementAreas.forEach(element => {
        zendeskMessage += `<li>${escapeHTML(element).replace(/template:/i, '')}</li>`;
    });
    zendeskMessage += `</ul><br>`;
}

// Rejection Feedback Section - Convert Markdown to HTML
if (inputConfig.assetRejectionFeedback) {
    zendeskMessage += `Additionally, the review team had the following feedback:<br><br>
${markdownToHTML(inputConfig.assetRejectionFeedback)}<br><br>`;
}

// App rejections expect a fixed resubmission (new bundle); the "submit a new asset /
// do not resubmit" language is template-oriented and reads as a permanent rejection
// (creator feedback: Wistia, ZD 1170775, 2026-08-10). No "please" — neutral tone for
// required changes (Shea + Paige's edited wording, 2026-08-10).
if (inputConfig.assetType.findIndex(item => item.includes("App")) !== -1) {
    zendeskMessage += `Once you've addressed the required feedback necessary for approval, <a href="https://developers.webflow.com/submit">submit a new bundle</a> for review.<br><br>`;
} else {
    zendeskMessage += `We appreciate your desire to contribute to the Webflow Marketplace and encourage you to submit a new asset. Please do not resubmit the same asset without making significant changes to the design.<br><br>`;
}

zendeskMessage += `As always, refer to our ${publicGuidelinesURLForZendesk} and check them thoroughly before submitting for review.<br><br>
The Webflow Marketplace Team`;

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

