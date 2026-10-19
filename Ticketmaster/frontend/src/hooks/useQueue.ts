import { useState, useEffect, useCallback } from 'react';
import { joinQueue, getQueueStatus, leaveQueue, triggerBatchAdmit } from '../api/queue';
import { QueueStatusResponse } from '../api/types';

interface UseQueueProps {
  eventId: string | undefined;
  enabled?: boolean;
  onAdmitted?: () => void;
}

export function useQueue({ eventId, enabled = false, onAdmitted }: UseQueueProps) {
  const [queueData, setQueueData] = useState<QueueStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await getQueueStatus(eventId);
      setQueueData(res);
      if (res.admitted && onAdmitted) {
        onAdmitted();
      }
    } catch (err: any) {
      setError(err?.message || 'Error checking queue status');
    }
  }, [eventId, onAdmitted]);

  const enterQueue = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await joinQueue(eventId);
      setQueueData(res);
      if (res.admitted && onAdmitted) {
        onAdmitted();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to enter queue');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, onAdmitted]);

  const exitQueue = useCallback(async () => {
    if (!eventId) return;
    try {
      await leaveQueue(eventId);
      setQueueData(null);
    } catch (err: any) {
      console.error('Failed to leave queue', err);
    }
  }, [eventId]);

  const admitDemoBatch = useCallback(async () => {
    if (!eventId) return;
    try {
      await triggerBatchAdmit(eventId, 50);
      await fetchStatus();
    } catch (err: any) {
      console.error('Failed to trigger batch admit', err);
    }
  }, [eventId, fetchStatus]);

  // Polling while waiting in line
  useEffect(() => {
    if (!enabled || !eventId) return;

    if (!queueData) {
      enterQueue();
    }

    const interval = setInterval(() => {
      if (queueData && !queueData.admitted) {
        fetchStatus();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [enabled, eventId, queueData, enterQueue, fetchStatus]);

  return {
    queueData,
    isLoading,
    error,
    isAdmitted: queueData?.admitted || false,
    position: queueData?.position || 0,
    totalQueued: queueData?.total_queued || 0,
    estimatedWaitSeconds: queueData?.estimated_wait_seconds || 0,
    enterQueue,
    exitQueue,
    refreshStatus: fetchStatus,
    admitDemoBatch,
  };
}
