import { useState, useEffect } from 'react';

interface UseBookingTimerProps {
  expiresAt?: string | null;
  initialSeconds?: number;
  onExpire?: () => void;
}

export function useBookingTimer({ expiresAt, initialSeconds = 600, onExpire }: UseBookingTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (expiresAt) {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      return diff;
    }
    return initialSeconds;
  });

  useEffect(() => {
    if (expiresAt) {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
    }
  }, [expiresAt]);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const totalWindow = initialSeconds || 600;
  const progressPercent = Math.min(100, Math.max(0, (secondsRemaining / totalWindow) * 100));
  const isWarning = secondsRemaining <= 120 && secondsRemaining > 0;
  const isExpired = secondsRemaining <= 0;

  return {
    secondsRemaining,
    formattedTime,
    progressPercent,
    isWarning,
    isExpired,
  };
}
