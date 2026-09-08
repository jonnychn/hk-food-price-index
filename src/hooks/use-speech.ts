"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognizer(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as Window & { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec })
      .SpeechRecognition ||
    (window as Window & { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

export function speechSupported() {
  if (typeof window === "undefined") return false;
  const w = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function useSpeech(lang: Lang, onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    setSupported(speechSupported());
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const rec = getRecognizer();
    if (!rec) return;
    recRef.current?.abort();
    rec.lang = lang === "zh" ? "zh-HK" : "en-HK";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) callbackRef.current(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang]);

  useEffect(() => stop, [stop]);

  return { supported, listening, start, stop };
}
