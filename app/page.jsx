'use client';

import { useState, useRef, useCallback } from "react";

const MODES = {
  MATCH: "match",
  DIRECTOR: "director",
  TRAINING: "training",
  SCOUTING: "scouting",
};

const SYSTEM_PROMPT = `Eres un Director Deportivo de élite, analista táctico profesional, scout avanzado y estratega especializado en Online Soccer Manager (OSM). Tu único objetivo es maximizar matemáticamente las probabilidades de ganar la liga del usuario.

REGLAS DE RESPUESTA:
- Siempre responde en español
- Usa formato estructurado con secciones claras usando emojis y separadores
- Sé ultra-específico, no des consejos genéricos
- Justifica SIEMPRE cada recomendación táctica con lógica
- Usa datos numéricos y porcentajes cuando sea posible
- Piensa como un entrenador de élite obsesionado con ganar

FORMATO DE RESPUESTA OBLIGATORIO para análisis de partido:
1. 🔍 ANÁLISIS DEL RIVAL (formación detectada, calidad, debilidades)
2. ⚡ PLAN DE PARTIDO (táctica ideal, formación recomendada)
3. 🎯 INSTRUCCIONES DETALLADAS (presión, pases, ritmo, marcaje, fuera de juego, entradas)
4. 👥 ALINEACIÓN IDEAL (XI recomendado)
5. ⚠️ RIESGOS TÁCTICOS
6. 📊 PROBABILIDAD DE VICTORIA (con justificación)
7. 🏆 PUNTOS CLAVE PARA GANAR

Analiza TODAS las capturas que el usuario suba. Si hay imágenes, extrae TODA la información visual.`;

const MATCH_PROMPT = `El usuario sube capturas para preparar un partido en OSM. Analiza TODO con máximo detalle.`;
const DIRECTOR_PROMPT = `El usuario sube capturas para análisis de mercado y gestión de plantilla en OSM.`;
const TRAINING_PROMPT = `El usuario sube capturas para optimizar entrenamientos en OSM.`;
const SCOUTING_PROMPT = `El usuario sube capturas para scouting y análisis de rivales en la liga.`;

function getSystemForMode(mode) {
  const extras = {
    [MODES.MATCH]: MATCH_PROMPT,
    [MODES.DIRECTOR]: DIRECTOR_PROMPT,
    [MODES.TRAINING]: TRAINING_PROMPT,
    [MODES.SCOUTING]: SCOUTING_PROMPT,
  };
  return SYSTEM_PROMPT + "\n\n" + (extras[mode] || "");
}

function ModeButton({ mode, current, onClick, icon, label, sub }) {
  const active = mode === current;
  return (
    <button
      onClick={() => onClick(mode)}
      style={{
        background: active ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
        border: active ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1, minWidth: 0, transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#10b981" : "#9ca3af" }}>{label}</span>
      <span style={{ fontSize: 9, color: active ? "#6ee7b7" : "#4b5563" }}>{sub}</span>
    </button>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 8, padding: "6px 12px", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 70 }}>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 9, color: "#6b7280", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

function ImagePreview({ images, onRemove }) {
  if (!images.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: "relative" }}>
          <img src={img.url} alt={img.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)" }} />
          <button onClick={() => onRemove(i)} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", color: "#fff", fontSize: 10 }}>×</button>
        </div>
      ))}
    </div>
  );
}

function AnalysisMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16 }}>
      <div style={{
        maxWidth: "85%",
        background: isUser ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
        border: isUser ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
      }}>
        {msg.text && <div style={{ fontSize: 13, lineHeight: 1.7, color: isUser ? "#d1fae5" : "#e5e7eb", whiteSpace: "pre-wrap" }}>{msg.text}</div>}
        {msg.loading && <div style={{ color: "#10b981" }}>Analizando...</div>}
      </div>
    </div>
  );
}

function DropZone({ onFiles }) {
  const inputRef = useRef();
  return (
    <div onClick={() => inputRef.current.click()} style={{ border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: "14px", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.02)", marginBottom: 8 }}>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => onFiles(Array.from(e.target.files))} />
      <div style={{ fontSize: 22 }}>📸</div>
      <div style={{ fontSize: 11, color: "#6b7280" }}>Sube capturas de OSM</div>
    </div>
  );
}

export default function OSMEliteAssistant() {
  const [mode, setMode] = useState(MODES.MATCH);
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ analyses: 0 });
  const messagesEndRef = useRef();
  const historyRef = useRef([]);

  const handleFiles = useCallback(files => {
    const readers = files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ url: e.target.result, name: file.name, base64: e.target.result.split(",")[1], type: file.type });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(results => setImages(prev => [...prev, ...results]));
  }, []);

  const handleSend = async () => {
    if (loading || (!text.trim() && !images.length)) return;

    const userMsg = { role: "user", text: text.trim() || "Analizando capturas...", images: [...images] };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // Formatear contenido para la API
    const userContent = [];
    images.forEach(img => userContent.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.base64 } }));
    userContent.push({ type: "text", text: text.trim() || "Analiza estas capturas." });

    const apiMessage = { role: "user", content: userContent };
    historyRef.current = [...historyRef.current, apiMessage];

    setImages([]); setText("");

    try {
      // LLAMADA AL PUENTE API LOCAL
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: getSystemForMode(mode),
          messages: historyRef.current,
        }),
      });

      const data = await response.json();
      const assistantText = data.content?.[0]?.text || "Error en respuesta.";
      
      setMessages(prev => [...prev, { role: "assistant", text: assistantText }]);
      historyRef.current = [...historyRef.current, { role: "assistant", content: assistantText }];
      setStats(s => ({ analyses: s.analyses + 1 }));
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "❌ Error de conexión." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e5e7eb", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(16,185,129,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }}>OSM ELITE ASSISTANT</div>
        <StatBadge label="ANÁLISIS" value={stats.analyses} color="#10b981" />
      </div>

      <div style={{ padding: "10px", display: "flex", gap: 5 }}>
        <ModeButton mode={MODES.MATCH} current={mode} onClick={setMode} icon="⚔️" label="PARTIDO" sub="Táctica" />
        <ModeButton mode={MODES.DIRECTOR} current={mode} onClick={setMode} icon="💼" label="DIRECTOR" sub="Mercado" />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {messages.map((msg, i) => <AnalysisMessage key={i} msg={msg} />)}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: "20px", background: "rgba(0,0,0,0.5)" }}>
        <ImagePreview images={images} onRemove={i => setImages(img => img.filter((_, idx) => idx !== i))} />
        <DropZone onFiles={handleFiles} />
        <div style={{ display: "flex", gap: 8 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Escribe aquí..." style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px", color: "#fff" }} />
          <button onClick={handleSend} style={{ background: "#10b981", border: "none", borderRadius: 10, width: 50, color: "#fff", fontSize: 20 }}>{loading ? "⏳" : "⚡"}</button>
        </div>
      </div>
    </div>
  );
}
