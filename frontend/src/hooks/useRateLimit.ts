import { useState, useEffect } from 'react';

export const useRateLimit = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    const handleRateLimit = (event: CustomEvent) => {
      const { retryAfter } = event.detail;
      setIsRateLimited(true);
      setRetryAfter(retryAfter);

      // Start countdown
      const interval = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev <= 1) {
            setIsRateLimited(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    };

    window.addEventListener('rateLimitExceeded', handleRateLimit as EventListener);
    
    return () => {
      window.removeEventListener('rateLimitExceeded', handleRateLimit as EventListener);
    };
  }, []);

  return { isRateLimited, retryAfter };
};