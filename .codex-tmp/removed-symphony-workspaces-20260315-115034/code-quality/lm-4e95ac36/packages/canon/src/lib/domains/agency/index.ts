/**
 * Canon Domain: .agency (Client Services)
 * 
 * Components specific to createsomething.agency that don't depend on agency-specific modules.
 * 
 * Components that depend on $lib/stores or $lib/services have been moved to
 * packages/agency/src/lib/components/ where they can access agency-specific modules.
 */

// Booking components
export { default as BookingConfirmation } from './booking/BookingConfirmation.svelte';
export { default as BookingForm } from './booking/BookingForm.svelte';
export { default as DatePicker } from './booking/DatePicker.svelte';
export { default as TimeSlotPicker } from './booking/TimeSlotPicker.svelte';

// Main components (self-contained)
export { default as ArticleContent } from './ArticleContent.svelte';
export { default as AssessmentStep } from './AssessmentStep.svelte';
export { default as EmailCaptureModal } from './EmailCaptureModal.svelte';
export { default as ProgressIndicator } from './ProgressIndicator.svelte';
export { default as RevelationLine } from './RevelationLine.svelte';
export { default as SavvyCalButton } from './SavvyCalButton.svelte';
export { default as SocialProofStrip } from './SocialProofStrip.svelte';
export { default as Terminal } from './Terminal.svelte';
export { default as Terminal3DBackground } from './Terminal3DBackground.svelte';
export { default as TextRevelation } from './TextRevelation.svelte';

// Components moved to packages/agency/src/lib/components/:
// - Wizard components (BusinessInfo, ContentSetup, ReviewConfirm, SubdomainPicker, TemplateSelector)
// - ArticleHeader (depends on $lib/types)
// - AssessmentRuntime (depends on $lib/services)
// - HeroSection (depends on $lib/types)
// - InsightReveal (depends on $lib/services)
