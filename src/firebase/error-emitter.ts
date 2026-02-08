'use client';

type Listener = (...args: any[]) => void;

class EventEmitter {
  private events: { [key: string]: Listener[] } = {};

  on(eventName: string, listener: Listener): () => void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);

    // Return a function to unsubscribe
    return () => {
      this.events[eventName] = this.events[eventName].filter(
        (l) => l !== listener
      );
    };
  }

  emit(eventName: string, ...args: any[]) {
    const listeners = this.events[eventName];
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
  }
}

export const errorEmitter = new EventEmitter();
