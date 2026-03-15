import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    const firstName = formData.get('first_name')?.toString().trim();
    const lastName = formData.get('last_name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const phone = formData.get('phone')?.toString().trim();
    const message = formData.get('message')?.toString().trim();

    // Basic validation
    if (!firstName || !lastName || !email || !phone || !message) {
      return fail(400, {
        error: 'All fields are required',
        values: { firstName, lastName, email, phone, message }
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(400, {
        error: 'Invalid email address',
        values: { firstName, lastName, email, phone, message }
      });
    }

    // Here you would typically:
    // 1. Send an email notification
    // 2. Store in database
    // 3. Forward to CRM
    // For now, we'll log and return success

    console.log('Contact form submission:', {
      firstName,
      lastName,
      email,
      phone,
      message,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  }
};
