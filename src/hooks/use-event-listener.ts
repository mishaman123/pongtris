
import { useRef, useEffect } from 'react';

// Define a type for the element that can be window, document, or HTMLElement
type TargetElement = Window | Document | HTMLElement | null;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: TargetElement
) {
  const savedHandler = useRef<(event: WindowEventMap[K]) => void>();

  // Store the handler ref
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Define the target element, defaulting to window if not provided
    const targetElement: TargetElement = element === undefined ? window : element;

    // Check if the target element and addEventListener are available (client-side check)
    const isSupported = targetElement && targetElement.addEventListener;
    if (!isSupported) {
      return;
    }

    // Create event listener that calls handler function stored in ref
    const eventListener = (event: Event) => {
      // Check if the current handler exists before calling it
      savedHandler.current?.(event as WindowEventMap[K]);
    };

    // Add event listener
    targetElement.addEventListener(eventName, eventListener);

    // Remove event listener on cleanup
    return () => {
      targetElement.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element]); // Re-run effect if eventName or element changes
}
