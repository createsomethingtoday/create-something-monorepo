# Listing & submission

## Listing assets

| Asset | Spec |
|---|---|
| **App avatar / icon** | 512×512, 1:1 aspect ratio |
| **Detailed description** | Specific about what the App does and the benefit to users. Avoid vagueness and marketing filler. |
| **Screenshots** | 3–5 images at **1280×846**, showing real features with clear visuals |
| **Demo video** | A 2–5 minute walkthrough from install to usage. **Data Client Apps must** show a working OAuth flow with the user **approving and denying** the request, and describe your integration with Webflow. Private link to Loom, YouTube (unlisted), or Google Drive. |
| **Homepage URL** | Valid HTTPS |
| **Designer Extension source** | Upload the `bundle.zip` (built via `webflow extension bundle`) through the App version manager. Webflow may request source maps or equivalent review artifacts; these need not ship in the public production bundle unless Webflow requires it. |

## Privacy & data protection

The guidelines require you to:

- **Respect user privacy** and handle personal data per relevant privacy laws. Apps that infringe privacy rights or misuse data are removed.
- **Provide clear and transparent information** to users about the collection, storage, and use of their data within your App — publish a privacy policy that actually covers what you collect.
- **Implement appropriate security measures** to protect user data from unauthorized access or breaches.

Practical consequence most Apps miss: if your backend stores customer data, **uninstall should delete or anonymize it**, not just remove your scripts from the site. Removing injected code and disposing of retained data are two separate obligations.

## Technical requirements before you submit

- **Two-factor authentication** is enabled on an admin account of the submitting Workspace.
- The App is **thoroughly tested and fully functional** — no crashes, no bugs surfaced by basic use.
- **Clear documentation and error handling** for end users.
- Follows Webflow's **security best practices and privacy guidelines**.
- **Backend services / APIs are live and accessible** for the entire review period.
- **Demo access provided**: an active demo account, a fully-featured demo mode, or credentials to any resources the reviewer needs.
- End users get a **fully functional experience free of placeholder content and test data**.
- **Designer Extensions:** upload the client-side **source code** through the App version manager (reviewers read it).

## What gets an App rejected or removed

- False information, plagiarism, deceitful manipulation of user files, or data theft → rejection **and a ban on publishing future Apps**.
- Attempts to exploit the Marketplace APIs or the review process → permanent prohibition.
- Requiring users to install separate packages that manipulate Webflow, or using anything other than official Webflow APIs.
- Impersonating a company as the App author.
- Using more than one developer account.
- Ads, hidden charges, undisclosed fees or subscriptions.
- Persistent performance problems, being error-prone, or not being actively maintained (grounds for **removal** even after approval).

## Complete, not beta

Marketplace Apps should be complete, functional, and ready for their intended audience at submission. **Beta, incomplete, or pre-release Apps should not be published.**

To validate an App with external users before publishing, use Webflow's **user testing process** — this is *separate from* creating a private App. A private App is a workspace-specific/custom App that still goes through the **same rigorous review as public Apps**; it is not a testing tier or a way to skip the quality bar.

## Process & timeline

- Submit through the App submission form: <https://developers.webflow.com/submit>.
- Review decision typically within **10–15 business days**; you're notified by email.
- On rejection, you get an email with a brief explanation, and you can **address the feedback and resubmit**.

Each failed round costs another 10–15 business days — which is why the pre-submission quality gate exists.

## App updates

Any material change to the reviewed experience — App functionality, user-facing behavior, requested permissions, submitted bundles, integrations, or scripts delivered via the Custom Code API — is an **App update** and goes through the same review. Submit the same form and select **"App Update"** as the submission type; only App Name and Client ID are required. For Designer Extensions, publish a new bundle version from your Workspace.

Reference: <https://developers.webflow.com/apps/docs/marketplace-guidelines> · <https://developers.webflow.com/data/docs/submitting-your-app> · <https://developers.webflow.com/apps/docs/private-apps>
