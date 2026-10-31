export default {
  fetch() {
    return Response.json({
      service: 'PCN starter',
      mode: 'educational',
      providerIntegrations: false
    });
  }
};
