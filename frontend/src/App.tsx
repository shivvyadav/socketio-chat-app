import {useEffect, useRef, useState} from "react";
import {connectWS} from "./ws";
import {Send} from "lucide-react";

type Message = {
  id: number;
  sender: string;
  text: string;
  ts: number;
};

export default function App() {
  const socket = useRef<ReturnType<typeof connectWS> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showNamePopup, setShowNamePopup] = useState(true);
  const [entryName, setEntryName] = useState("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typers, setTypers] = useState<string[]>([]);

  // socket setup
  useEffect(() => {
    socket.current = connectWS();

    socket.current.on("message", (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });

    socket.current.on("typing", (userName: string) => {
      setTypers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
    });

    socket.current.on("stopTyping", (userName: string) => {
      setTypers((prev) => prev.filter((u) => u !== userName));
    });

    return () => {
      socket.current?.disconnect();
    };
  }, []);

  // typing indicator
  useEffect(() => {
    if (!entryName || !socket.current) return;

    if (!text.trim()) {
      socket.current.emit("stopTyping", entryName);
      return;
    }

    socket.current.emit("typing", entryName);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.current?.emit("stopTyping", entryName);
    }, 1000);

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [text, entryName]);

  function formatTime(ts: number) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entryName.trim()) return;

    socket.current?.emit("joinChat", entryName);
    setShowNamePopup(false);
  }

  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || !socket.current) return;

    socket.current.emit("stopTyping", entryName);

    const msg: Message = {
      id: Date.now(),
      sender: entryName,
      text: trimmed,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, msg]);
    socket.current.emit("message", msg);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-black p-4'>
      {showNamePopup && (
        <div className='fixed inset-0 flex items-center justify-center'>
          <form
            onSubmit={handleNameSubmit}
            className='bg-neutral-900 p-6 rounded-xl border border-neutral-700'>
            <h1 className='text-white text-lg mb-3'>Enter your name</h1>
            <input
              autoFocus
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              className='w-full bg-neutral-800 text-white px-3 py-2 rounded'
            />
            <button className='mt-3 bg-white px-4 py-1 rounded'>Continue</button>
          </form>
        </div>
      )}

      {!showNamePopup && (
        <div className='w-full max-w-2xl h-[90vh] bg-neutral-900 rounded-xl flex flex-col text-white'>
          <div className='px-4 py-3 border-b border-neutral-700'>
            <div className='text-sm'>Realtime group chat</div>
            {typers.length > 0 && (
              <div className='text-xs text-gray-300'>{typers.join(", ")} typing...</div>
            )}
          </div>

          <div className='flex-1 overflow-y-auto p-4 space-y-3'>
            {messages.map((m) => {
              const mine = m.sender === entryName;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] p-3 rounded-xl text-sm ${
                      mine ? "bg-green-200 text-black" : "bg-white text-black"
                    }`}>
                    <div>{m.text}</div>
                    <div className='text-[11px] text-gray-600 mt-1 flex justify-between'>
                      <span>{m.sender}</span>
                      <span>{formatTime(m.ts)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className='p-3 border-t border-neutral-700 flex gap-2'>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className='flex-1 bg-neutral-800 px-3 py-2 rounded resize-none'
              placeholder='Type a message...'
            />
            <button onClick={sendMessage} className='bg-neutral-700 px-3 rounded'>
              <Send />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
