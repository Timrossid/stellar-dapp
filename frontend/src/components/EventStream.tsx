import React, { useEffect, useState, useCallback } from 'react';
import { streamContractEvents, formatEventName } from '../services/events';
import type { ContractEvent } from '../services/events';

interface EventStreamProps {
  contractIds: string[];
  isActive: boolean;
}

export function EventStream({ contractIds, isActive }: EventStreamProps) {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onEvent = useCallback((event: ContractEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    if (!isActive || contractIds.length === 0) return;

    const cleanups: (() => void)[] = [];

    for (const contractId of contractIds) {
      const cleanupPromise = streamContractEvents(
        contractId,
        onEvent,
        (err) => setError(err.message),
        undefined
      );
      cleanupPromise.then((cleanup) => cleanups.push(cleanup));
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [contractIds, isActive, onEvent]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="event-stream">
      <div className="event-stream-header">
        <h3>Live Events</h3>
        <span className="event-count">{events.length} events</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="event-list">
        {events.length === 0 ? (
          <p className="text-muted">Waiting for events...</p>
        ) : (
          events.map((event, i) => (
            <div className="event-item" key={`${event.txHash}-${i}`}>
              <div className="event-topic">
                {formatEventName(event.topic)}
              </div>
              <div className="event-value mono">{event.value}</div>
              <div className="event-tx mono">
                Tx: {event.txHash.slice(0, 8)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
