import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL } from '@/lib/api';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface SSEOptions {
  onMessage?: (data: any) => void;
  reconnectInterval?: number;
}

export function useSSE<T>(endpoint: string, options: SSEOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!endpoint) return;

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStatus('reconnecting');
      
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (isMounted) {
          setStatus('connected');
          setError(null);
          console.log('SSE Connected to', url);
        }
      };

      eventSource.addEventListener('result_update', (event) => {
        if (isMounted) {
          try {
            const parsedData = JSON.parse(event.data);
            setData(parsedData);
            options.onMessage?.(parsedData);
          } catch (err) {
            console.error('Failed to parse SSE data', err);
          }
        }
      });

      eventSource.addEventListener('snapshot', (event) => {
        if (isMounted) {
          try {
            const parsedData = JSON.parse(event.data);
            setData(parsedData);
            options.onMessage?.(parsedData);
          } catch (err) {
            console.error('Failed to parse SSE snapshot data', err);
          }
        }
      });

      eventSource.onmessage = (event) => {
        if (isMounted) {
          try {
            const parsedData = JSON.parse(event.data);
            // Handle vote_update events sent without explicit event type
            if (parsedData && (parsedData.event === 'vote_update' || parsedData.timestamp)) {
              setData(parsedData);
              options.onMessage?.(parsedData);
            }
          } catch (err) {
            console.error('Failed to parse SSE message data', err);
          }
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        if (isMounted) {
          setStatus('disconnected');
          setError(new Error('SSE connection failed'));
          eventSource.close();
          
          // Attempt reconnect
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, options.reconnectInterval || 3000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [endpoint, options.reconnectInterval]);

  return { data, status, error };
}
