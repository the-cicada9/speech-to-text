'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import Link from 'next/link';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
}

const SpeechToLetter = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'es-ES'>('en-US');

  const recognitionRef = useRef<any>(null);

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setSpokenText((prev) => prev + final);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  useEffect(() => {
    initializeRecognition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // re-initialize when language changes

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (!isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value as 'en-US' | 'es-ES';

    if (isListening && recognitionRef.current) {
      recognitionRef.current.onend = () => {
        setLanguage(selectedLang);
        initializeRecognition();
        recognitionRef.current.start();
        recognitionRef.current.onend = () => setIsListening(false); // restore default
      };

      recognitionRef.current.stop();
    } else {
      setLanguage(selectedLang);
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

export default SpeechToLetter;
