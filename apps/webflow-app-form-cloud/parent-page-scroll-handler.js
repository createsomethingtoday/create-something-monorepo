// Add this code to the Webflow page that embeds the form iframe
// This should be placed in a Custom Code embed or in the page's <head> or before </body>

window.addEventListener('message', function(event) {
  // Handle form submission scroll request
  if (event.data.type === 'SCROLL_TO_FORM') {
    console.log('Received scroll request from form iframe');

    // Option 1: Scroll to the iframe element
    const iframe = document.querySelector('iframe[src*="webflow-form"]');
    if (iframe) {
      iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('Scrolled to iframe');
    }

    // Option 2: Alternatively, scroll to top of page
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle successful form submission (optional)
  if (event.data.type === 'FORM_SUBMITTED') {
    console.log('Form submitted successfully', event.data);
    // You can add additional actions here, like:
    // - Show a confirmation banner
    // - Track analytics event
    // - etc.
  }
});
