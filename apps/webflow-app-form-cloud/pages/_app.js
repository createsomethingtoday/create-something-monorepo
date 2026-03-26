import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

// Error handling for common iframe issues
function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Prevent common DOM errors when embedded
    const handleError = (error) => {
      console.log('Handled error:', error.message);
      // Don't propagate these specific errors
      if (error.message.includes('querySelectorAll') ||
          error.message.includes('parentNode') ||
          error.message.includes('quillArea')) {
        error.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;