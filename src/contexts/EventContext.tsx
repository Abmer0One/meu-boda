'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Event } from '@/types';
import { EventRepository } from '@/repositories/event.repository';
import { useAuth } from './AuthContext';

import { resolveCanvaConfig } from '@/utils/canvaConfig';

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
      
      // Merge local template selections & Canva config from all storage layers
      const mergedEvents = fetchedEvents.map((e) => {
        let templateId = e.template_id;
        if (typeof window !== 'undefined') {
          const localTemplate = localStorage.getItem(`template_${e.id}`);
          if (localTemplate) {
            templateId = localTemplate;
          }
        }
        const resolvedCanva = resolveCanvaConfig(e.id, e.template_config, null, e.background_image);
        return {
          ...e,
          template_id: templateId,
          template_config: {
            ...(e.template_config || {}),
            ...resolvedCanva,
          },
        };
      });
      setEvents(mergedEvents);

      // Restore last selected event or default to the first one
      const storedEventId = typeof window !== 'undefined' ? localStorage.getItem('meuboda_selected_event_id') : null;
      const matchedEvent = mergedEvents.find((e) => e.id === storedEventId);

      if (matchedEvent) {
        setCurrentEventState(matchedEvent);
      } else if (mergedEvents.length > 0) {
        setCurrentEventState(mergedEvents[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('meuboda_selected_event_id', mergedEvents[0].id);
        }
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
    if (event) {
      if (typeof window !== 'undefined') {
        const localTemplate = localStorage.getItem(`template_${event.id}`);
        const resolvedCanva = resolveCanvaConfig(event.id, event.template_config, null, event.background_image);
        const merged = {
          ...event,
          template_id: localTemplate || event.template_id,
          template_config: {
            ...(event.template_config || {}),
            ...resolvedCanva,
          },
        };
        setCurrentEventState(merged);
        localStorage.setItem('meuboda_selected_event_id', event.id);
      } else {
        setCurrentEventState(event);
      }
    } else {
      setCurrentEventState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('meuboda_selected_event_id');
      }
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
