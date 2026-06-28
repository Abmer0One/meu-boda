'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Event } from '@/types';
import { EventRepository } from '@/repositories/event.repository';
import { useAuth } from './AuthContext';

interface EventContextType {
  currentEvent: Event | null;
  events: Event[];
  loading: boolean;
  setCurrentEvent: (event: Event | null) => void;
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentEvent, setCurrentEventState] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      setCurrentEventState(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetchedEvents = await EventRepository.getByUserId(user.id);
      setEvents(fetchedEvents);

      // Restore last selected event or default to the first one
      const storedEventId = localStorage.getItem('meuboda_selected_event_id');
      const matchedEvent = fetchedEvents.find((e) => e.id === storedEventId);

      if (matchedEvent) {
        setCurrentEventState(matchedEvent);
      } else if (fetchedEvents.length > 0) {
        setCurrentEventState(fetchedEvents[0]);
        localStorage.setItem('meuboda_selected_event_id', fetchedEvents[0].id);
      } else {
        setCurrentEventState(null);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const setCurrentEvent = (event: Event | null) => {
    setCurrentEventState(event);
    if (event) {
      localStorage.setItem('meuboda_selected_event_id', event.id);
    } else {
      localStorage.removeItem('meuboda_selected_event_id');
    }
  };

  return (
    <EventContext.Provider
      value={{
        currentEvent,
        events,
        loading,
        setCurrentEvent,
        refreshEvents,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
