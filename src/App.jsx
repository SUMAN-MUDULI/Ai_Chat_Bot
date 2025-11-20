// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { GEMINI_API_KEY } from "./config";
import { FiSun, FiMoon } from "react-icons/fi";
import { CiPaperplane } from "react-icons/ci";
import { FaMicrophone, FaStop, FaPlay } from "react-icons/fa";

const MODEL_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

export default function App() {
  // theme
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  // chat
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role:'user'|'ai', text}
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState(""); // typing effect
  // voice
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const messagesRef = useRef(null);

  // theme toggling: attach CSS class for root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark-mode");
      root.classList.add("light-mode");
    } else {
      root.classList.remove("light-mode");
      root.classList.add("dark-mode");
    }
  }, [theme]);

  // autoscroll when messages or stream change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight + 200,
        behavior: "smooth",
      });
    }
  }, [messages, streamText]);

  // simple typing effect (reveal characters)
  const typeStream = async (text) => {
    setStreamText("");
    for (let i = 0; i < text.length; i++) {
      setStreamText((s) => s + text[i]);
      // small random speed to look natural
      await new Promise((r) => setTimeout(r, 8 + Math.random() * 16));
    }
    setStreamText("");
  };

  const loadVoices = () => {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices.length !== 0) {
      resolve(voices);
    } else {
      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
};

  // speak TTS - manual trigger only (Play button)
const speak = async (txt) => {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = "en-IN";
  u.pitch = 1.05;
  u.rate = 0.96;
  u.volume = 1;

  const voices = await loadVoices();

  // FEMALE voice list priority
  const femaleVoices = voices.filter(v =>
    /female|Samantha|Jenny|Zira|Aria|Natasha|Sara|Google US English/i.test(v.name)
  );

  if (femaleVoices.length > 0) {
    u.voice = femaleVoices[0]; // pick first female
  } else {
    // fallback: pick any english voice at least
    u.voice = voices.find(v => /en-|IN|US|GB/i.test(v.lang)) || voices[0];
  }

  window.speechSynthesis.speak(u);
};



  // voice recognition toggle
  const toggleListen = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support Speech Recognition.");
      return;
    }

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript;
      setInput(text);
      if (e.results[e.results.length - 1].isFinal) {
        rec.stop();
        // optionally auto-send after final result:
        // send(); // <-- commented (you didn't want auto-send)
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (err) => {
      console.error(err);
      setListening(false);
    };

    recogRef.current = rec;
    rec.start();
    setListening(true);
  };

  // call Gemini REST (frontend)
  const callGemini = async (prompt) => {
    const url = MODEL_URL(GEMINI_API_KEY);
    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "API error");
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text;
  };

  // send message handler
  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    // push user message
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const aiText = await callGemini(trimmed);
      // typing effect (no auto-speak)
      await typeStream(aiText);
      setMessages((m) => [...m, { role: "ai", text: aiText }]);
      // NOTE: no speak(aiText) here — manual Play required
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Error: " + (err.message || "Something went wrong") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="w-full h-full">
      <div className="max-w-full rounded-xl h-full shadow-soft-lg overflow-hidden bg-[var(--panel)]">
        <div className="flex h-full">
          {/* LEFT - narrow sidebar */}
          <aside className="w-72 bg-[rgba(255,255,255,0.02)] p-5 flex flex-col gap-4 border-r border-[rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-white font-semibold">A</div>
              <div>
                <div className="text-lg font-semibold">AssistMe</div>
                <div className="text-xs text-[var(--muted)]">Apple-style chat</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setMessages([]);
                }}
                className="py-2 px-3 rounded-xl bg-[rgba(255,255,255,0.03)] text-sm"
              >
                + New chat
              </button>

              <button
                onClick={() => setInput("Explain closures in JavaScript like I'm 12.")}
                className="py-2 px-3 rounded-xl bg-[rgba(255,255,255,0.02)] text-sm"
              >
                Example: JS closures
              </button>
            </div>

            <div className="mt-auto">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">Theme</div>
                <button
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                  title="Toggle theme"
                >
                  {theme === "dark" ? <FiSun /> : <FiMoon />}
                </button>
              </div>
              <div className="text-xs text-[var(--muted)] mt-3">Frontend demo • API key visible</div>
            </div>
          </aside>

          {/* RIGHT - main */}
          <main className="flex-1 flex flex-col">
            {/* header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.03)]">
              <h1 className="text-lg font-semibold">AssistMe</h1>
              <div className="text-sm text-[var(--muted)]">Voice • Typing effect • Manual TTS</div>
            </header>

            {/* messages */}
            <div
              ref={messagesRef}
              className="flex-1 p-6 overflow-y-auto space-y-4 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.02))]"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[72%] p-3 rounded-2xl ${m.role === "user" ? "msg-user" : "msg-ai"}`}>
                    <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>

                    {/* Play button only for AI messages */}
                    {m.role === "ai" && (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => speak(m.text)}
                          className="inline-flex items-center gap-2 text-xs opacity-90 hover:opacity-100 transition bg-[rgba(255,255,255,0.02)] px-3 py-1 rounded-full border border-[rgba(255,255,255,0.04)]"
                          aria-label={`Play answer ${i}`}
                        >
                          <FaPlay size={12} />
                          Play Answer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* stream bubble while loading */}
              {loading && streamText ? (
                <div className="flex justify-start">
                  <div className="max-w-[72%] p-3 rounded-2xl msg-ai">
                    <div className="text-sm">{streamText}<span className="inline-block animate-pulse">▌</span></div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* input */}
            <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.03)] flex items-center gap-3">
              <button
                onClick={toggleListen}
                className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)]"
                title={listening ? "Stop" : "Voice input"}
                aria-pressed={listening}
              >
                {listening ? <FaStop /> : <FaMicrophone />}
              </button>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Type a message or use voice..."
                className="flex-1 resize-none bg-[rgba(255,255,255,0.05)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-3 text-sm shadow-lg focus:outline-none focus:border-cyan-400 transition"
                aria-label="Message input"
              />

              <button
                onClick={send}
                disabled={loading}
                className="ml-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-white flex items-center gap-2"
                title="Send message"
              >
                <CiPaperplane size={18} />
                <span className="text-sm">{loading ? "Thinking…" : "Send"}</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
