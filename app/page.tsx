'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * Type definitions for the Web Speech API
 */
declare global {
  /** Core SpeechRecognition interface */
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start: () => void;
    stop: () => void;
  }

  /** Event fired when a speech recognition error occurs */
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  /** Represents a single speech recognition result */
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  /** Represents a list of speech recognition results */
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  /** Represents a list of speech recognition results */
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  /** Event fired when speech recognition results are available */
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  /** Window interface extensions for speech recognition */
  interface Window {
    webkitSpeechRecognition: { new (): SpeechRecognition };
    SpeechRecognition: { new (): SpeechRecognition };
  }
}

/**
 * SpeechToText component that provides real-time speech-to-text conversion
 * @returns {JSX.Element} The rendered component
 */
const SpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'es-ES'>('en-US');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInitializedRef = useRef(false);
  const isStartingRef = useRef(false);

  /**
   * Safely stops the speech recognition
   */
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors from stopping an already stopped recognition
      }
      isInitializedRef.current = false;
      setIsListening(false);
    }
  };

  /**
   * Initializes the speech recognition instance
   */
  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser');
      return;
    }

    // Clean up existing recognition if it exists
    stopRecognition();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const final = results
        .filter(result => result.isFinal)
        .map(result => result[0].transcript)
        .join(' ');
      
      const interim = results
        .filter(result => !result.isFinal)
        .map(result => result[0].transcript)
        .join('');

      if (final) {
        setSpokenText(prev => prev + final + ' ');
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onend = () => {
      isStartingRef.current = false;
      setIsListening(false);
      isInitializedRef.current = false;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message);
      isStartingRef.current = false;
      setIsListening(false);
      isInitializedRef.current = false;
    };

    recognitionRef.current = recognition;
    isInitializedRef.current = true;
  };

  useEffect(() => {
    initializeRecognition();
    return () => {
      stopRecognition();
    };
  }, [language]);

  /**
   * Toggles speech recognition on/off
   */
  const toggleListening = async () => {
    if (!recognitionRef.current || isStartingRef.current) return;
    
    try {
      if (!isListening) {
        isStartingRef.current = true;
        if (!isInitializedRef.current) {
          initializeRecognition();
        }
        // Add a small delay to ensure the previous instance is fully stopped
        await new Promise(resolve => setTimeout(resolve, 100));
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        stopRecognition();
      }
    } catch (error) {
      console.error('Error toggling speech recognition:', error instanceof Error ? error.message : 'Unknown error');
      isStartingRef.current = false;
      setIsListening(false);
      isInitializedRef.current = false;
    }
  };

  /**
   * Handles language change and restarts recognition if active
   */
  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as 'en-US' | 'es-ES';
    setLanguage(newLang);

    if (isListening && recognitionRef.current) {
      try {
        stopRecognition();
        // Add a small delay before reinitializing
        await new Promise(resolve => setTimeout(resolve, 300));
        initializeRecognition();
        if (isListening) {
          isStartingRef.current = true;
          recognitionRef.current.start();
        }
      } catch (error) {
        console.error('Error handling language change:', error instanceof Error ? error.message : 'Unknown error');
        isStartingRef.current = false;
        setIsListening(false);
        isInitializedRef.current = false;
      }
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-xl font-semibold">Speech to Text</h2>
        <select
          value={language}
          onChange={handleLanguageChange}
          className="border border-gray-300 rounded px-3 py-1"
        >
          <option value="en-US">English</option>
          <option value="es-ES">Spanish</option>
        </select>
        <button
          onClick={toggleListening}
          className={`p-2 rounded-full text-white cursor-pointer ${
            isListening ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {isListening ? <Mic /> : <MicOff />}
        </button>
      </div>

      <div className="p-4 bg-gray-100 text-gray-800 rounded min-h-[150px] font-mono text-lg whitespace-pre-wrap">
        {spokenText}
        <span className="animate-pulse text-gray-500">{interimText}</span>
      </div>
    </div>
  );
};

export default SpeechToText;