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
  isSupportMode: boolean;
  exitSupportMode: () => void;
  setCurrentEvent: (event: Event | null) => void;
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentEvent, setCurrentEventState] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSupportMode, setIsSupportMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('meuboda_support_mode') === 'true';
    }
    return false;
  });

  const exitSupportMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('meuboda_support_mode');
      localStorage.removeItem('meuboda_support_event_title');
      localStorage.removeItem('meuboda_selected_event_id');
    }
    setIsSupportMode(false);
  }, []);

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
      const mergedEvents: Event[] = fetchedEvents.map((e) => {
        let templateId = e.template_id;
        if (typeof window !== 'undefined') {
          const localTemplate = localStorage.getItem(`template_${e.id}`);
          if (localTemplate) {
            templateId = localTemplate;
          }
        }
        const resolvedCanva = resolveCanvaConfig(e.id, e.template_config, null, null, e);
        return {
          ...e,
          template_id: templateId,
          template_config: {
            ...(e.template_config || {}),
            ...resolvedCanva,
          },
        };
      });

      // Check Support Mode (Modo Espelho)
      const supportModeActive = typeof window !== 'undefined' && localStorage.getItem('meuboda_support_mode') === 'true';
      setIsSupportMode(supportModeActive);
      const storedEventId = typeof window !== 'undefined' ? localStorage.getItem('meuboda_selected_event_id') : null;

      let matchedEvent: Event | null = null;
      let finalEvents: Event[] = [...mergedEvents];

      if (supportModeActive && storedEventId) {
        // Fetch target customer event directly by ID
        const targetEvent = await EventRepository.getById(storedEventId);
        if (targetEvent) {
          const resolvedCanva = resolveCanvaConfig(targetEvent.id, targetEvent.template_config, null, null, targetEvent);
          const fullSupportEvent: Event = {
            ...targetEvent,
            template_config: {
              ...(targetEvent.template_config || {}),
              ...resolvedCanva,
            },
          };
          matchedEvent = fullSupportEvent;
          if (!finalEvents.some(e => e.id === fullSupportEvent.id)) {
            finalEvents = [fullSupportEvent, ...finalEvents];
          }
        }
      }

      if (!matchedEvent) {
        matchedEvent = finalEvents.find((e) => e.id === storedEventId) || null;
      }

      setEvents(finalEvents);

      if (matchedEvent) {
        setCurrentEventState(matchedEvent);
      } else if (finalEvents.length > 0) {
        setCurrentEventState(finalEvents[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('meuboda_selected_event_id', finalEvents[0].id);
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
        const resolvedCanva = resolveCanvaConfig(event.id, event.template_config, null, null, event);
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
        isSupportMode,
        exitSupportMode,
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
