import { useState, useRef, useCallback } from "react";

const MODES = {
  MATCH: "match",
  DIRECTOR: "director",
  TRAINING: "training",
  SCOUTING: "scouting",
};

const MODEL = "claude-sonnet-4-20250514";

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

FORMATO para análisis de mercado/director deportivo:
1. 💰 EVALUACIÓN DE JUGADORES
2. 📈 OPORTUNIDADES DE MERCADO
3. 🔄 RECOMENDACIONES DE COMPRA/VENTA
4. 🌱 POTENCIAL DE DESARROLLO
5. 💡 ESTRATEGIA DE PLANTILLA

FORMATO para entrenamiento:
1. 🏋️ PRIORIDADES DE ENTRENAMIENTO
2. 📊 JUGADORES A PRIORIZAR (orden)
3. ⚡ CUELLOS DE BOTELLA
4. 🌱 DESARROLLO DE JUVENILES
5. 💡 ESTRATEGIA DE CRECIMIENTO

Analiza TODAS las capturas que el usuario suba. Si hay imágenes, extrae TODA la información visual: nombres, medias, estadísticas, formaciones, valores, posiciones. Sé exhaustivo en el análisis visual.`;

const MATCH_PROMPT = `El usuario sube capturas para preparar un partido en OSM. Analiza TODO con máximo detalle:
- Si hay capturas del rival: detecta formación, calidad media, jugadores clave, debilidades
- Si hay capturas de su equipo: evalúa fortalezas disponibles
- Si hay capturas de tácticas: analiza configuración actual
Genera un informe profesional completo de preparación de partido.`;

const DIRECTOR_PROMPT = `El usuario sube capturas para análisis de mercado y gestión de plantilla en OSM. Analiza:
- Jugadores en el mercado: edad, media, potencial, precio, relación calidad/precio
- Plantilla actual: posiciones sobradas/escasas, jugadores para vender
- Oportunidades de inversión y maximización de valor
Genera recomendaciones ultra-específicas de Director Deportivo.`;

const TRAINING_PROMPT = `El usuario sube capturas para optimizar entrenamientos en OSM. Analiza:
- Estado actual de jugadores: medias, potencial, edad
- Distribución de entrenamientos óptima
- Jugadores que más se benefician de entrenar
- Orden de prioridad para maximizar crecimiento de plantilla
Genera plan de entrenamiento detallado y estratégico.`;

const SCOUTING_PROMPT = `El usuario sube capturas para scouting y análisis de rivales en la liga. Analiza:
- Clasificación y tendencias de equipos rivales
- Vulnerabilidades detectadas en rivales
- Próximos partidos críticos
- Oportunidades para maximizar puntos
Genera informe de inteligencia competitiva detallado.`;

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
        borderRadius: 10,
        padding: "10px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        flex: 1,
        minWidth: 0,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#10b981" : "#9ca3af", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 9, color: active ? "#6ee7b7" : "#4b5563", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{sub}</span>
    </button>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: 8,
      padding: "6px 12px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minWidth: 70,
    }}>
      <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: 9, color: "#6b7280", letterSpacing: 0.5, marginTop: 1 }}>{label}</span>
    </div>
  );
}

function ImagePreview({ images, onRemove }) {
  if (!images.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: "relative" }}>
          <img
            src={img.url}
            alt={img.name}
            style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)" }}
          />
          <button
            onClick={() => onRemove(i)}
            style={{
              position: "absolute", top: -6, right: -6,
              background: "#ef4444", border: "none", borderRadius: "50%",
              width: 18, height: 18, cursor: "pointer", color: "#fff",
              fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700,
            }}
          >×</button>
          <div style={{ fontSize: 8, color: "#6b7280", marginTop: 2, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
        </div>
      ))}
    </div>
  );
}

function AnalysisMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #10b981, #059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, marginRight: 10, flexShrink: 0, marginTop: 4,
        }}>⚽</div>
      )}
      <div style={{
        maxWidth: "85%",
        background: isUser
          ? "rgba(16,185,129,0.12)"
          : "rgba(255,255,255,0.04)",
        border: isUser
          ? "1px solid rgba(16,185,129,0.3)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
      }}>
        {msg.images && msg.images.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {msg.images.map((img, i) => (
              <img key={i} src={img.url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)" }} />
            ))}
          </div>
        )}
        {msg.text && (
          <div style={{
            fontSize: 13,
            lineHeight: 1.7,
            color: isUser ? "#d1fae5" : "#e5e7eb",
            whiteSpace: "pre-wrap",
            fontFamily: "'Courier New', monospace",
          }}>{msg.text}</div>
        )}
        {msg.loading && (
          <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "#10b981",
                animation: `pulse 1.4s ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
      style={{
        border: `2px dashed ${dragging ? "#10b981" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 10,
        padding: "14px 16px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s",
        marginBottom: 8,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={e => {
          const files = Array.from(e.target.files);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
      <div style={{ fontSize: 22, marginBottom: 4 }}>📸</div>
      <div style={{ fontSize: 11, color: "#6b7280" }}>
        Arrastra capturas o <span style={{ color: "#10b981" }}>haz clic</span> para subir
      </div>
      <div style={{ fontSize: 9, color: "#4b5563", marginTop: 3 }}>
        Rival · Mi equipo · Tácticas · Mercado · Stats · Clasificación
      </div>
    </div>
  );
}

export default function OSMEliteAssistant() {
  const [mode, setMode] = useState(MODES.MATCH);
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ analyses: 0, wins: 0, sessions: 0 });
  const messagesEndRef = useRef();
  const historyRef = useRef([]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleFiles = useCallback(files => {
    const readers = files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ url: e.target.result, name: file.name, base64: e.target.result.split(",")[1], type: file.type });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(results => {
      setImages(prev => [...prev, ...results]);
    });
  }, []);

  const removeImage = useCallback(i => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const getModeLabel = (m) => ({
    [MODES.MATCH]: "⚔️ Preparación de Partido",
    [MODES.DIRECTOR]: "💼 Director Deportivo",
    [MODES.TRAINING]: "🏋️ Entrenamiento",
    [MODES.SCOUTING]: "🔍 Scouting & Liga",
  }[m]);

  const buildUserContent = () => {
    const parts = [];
    images.forEach(img => {
      parts.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.base64 } });
    });
    const userText = text.trim() || `Analiza estas capturas en modo: ${getModeLabel(mode)}. Dame el análisis más detallado y accionable posible.`;
    parts.push({ type: "text", text: userText });
    return parts;
  };

  const handleSend = async () => {
    if (loading || (!text.trim() && !images.length)) return;

    const userContent = buildUserContent();
    const userMsg = { role: "user", text: text.trim() || "Analizando capturas adjuntas...", images: [...images] };

    setMessages(prev => [...prev, userMsg]);
    setImages([]);
    setText("");
    setLoading(true);
    scrollToBottom();

    const apiMessage = { role: "user", content: userContent };
    historyRef.current = [...historyRef.current, apiMessage];

    const loadingId = Date.now();
    setMessages(prev => [...prev, { id: loadingId, role: "assistant", loading: true }]);
    scrollToBottom();

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          system: getSystemForMode(mode),
          messages: historyRef.current,
        }),
      });

      const data = await response.json();
      const assistantText = data.content?.map(b => b.text || "").join("") || "Error al procesar la respuesta.";

      historyRef.current = [...historyRef.current, { role: "assistant", content: assistantText }];

      setMessages(prev => prev.map(m => m.id === loadingId
        ? { role: "assistant", text: assistantText }
        : m
      ));
      setStats(prev => ({ ...prev, analyses: prev.analyses + 1, sessions: Math.max(prev.sessions, historyRef.current.length / 2) }));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === loadingId
        ? { role: "assistant", text: "❌ Error de conexión. Verifica tu conexión e intenta de nuevo." }
        : m
      ));
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    setMessages([]);
    historyRef.current = [];
    setImages([]);
    setText("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e5e7eb",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 2px; }
        textarea { resize: none; outline: none; }
        textarea:focus { border-color: rgba(16,185,129,0.5) !important; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(16,185,129,0.2)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚽</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981", letterSpacing: 0.5 }}>OSM ELITE ASSISTANT</div>
            <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: 1 }}>DIRECTOR DEPORTIVO IA · ANÁLISIS TÁCTICO AVANZADO</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <StatBadge label="ANÁLISIS" value={stats.analyses} color="#10b981" />
          <StatBadge label="MODO" value={mode === MODES.MATCH ? "⚔️" : mode === MODES.DIRECTOR ? "💼" : mode === MODES.TRAINING ? "🏋️" : "🔍"} color="#f59e0b" />
          <button
            onClick={clearChat}
            style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              color: "#f87171", fontSize: 11, fontWeight: 600,
            }}
          >LIMPIAR</button>
        </div>
      </div>

      {/* Mode Selector */}
      <div style={{
        padding: "10px 20px",
        background: "rgba(0,0,0,0.3)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <ModeButton mode={MODES.MATCH} current={mode} onClick={setMode} icon="⚔️" label="PARTIDO" sub="Táctica vs rival" />
          <ModeButton mode={MODES.DIRECTOR} current={mode} onClick={setMode} icon="💼" label="DIRECTOR" sub="Mercado & plantilla" />
          <ModeButton mode={MODES.TRAINING} current={mode} onClick={setMode} icon="🏋️" label="ENTRENAMIENTO" sub="Optimizar jugadores" />
          <ModeButton mode={MODES.SCOUTING} current={mode} onClick={setMode} icon="🔍" label="SCOUTING" sub="Liga & rivales" />
        </div>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "40px 20px",
            animation: "fadeIn 0.5s ease",
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚽</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>
              DIRECTOR DEPORTIVO IA
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 480, lineHeight: 1.7, marginBottom: 28 }}>
              Sube capturas de pantalla de OSM y recibe análisis táctico de élite.<br/>
              El sistema detecta automáticamente formaciones, debilidades y oportunidades.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 420, width: "100%" }}>
              {[
                { icon: "📋", title: "Análisis rival", desc: "Detecta formación, debilidades y jugadores clave" },
                { icon: "🎯", title: "Táctica ideal", desc: "Formación, instrucciones y alineación óptima" },
                { icon: "💰", title: "Mercado inteligente", desc: "Compras, ventas y oportunidades de mercado" },
                { icon: "📈", title: "Desarrollo plantilla", desc: "Entrenamientos y maximización de valor" },
              ].map((card, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "14px",
                  textAlign: "left",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{card.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#d1d5db", marginBottom: 3 }}>{card.title}</div>
                  <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.5 }}>{card.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ animation: "fadeIn 0.3s ease" }}>
            <AnalysisMessage msg={msg} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "16px 20px 20px",
        background: "rgba(0,0,0,0.5)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(10px)",
      }}>
        <ImagePreview images={images} onRemove={removeImage} />
        <DropZone onFiles={handleFiles} />

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Modo: ${getModeLabel(mode)} — Escribe tu pregunta o sube capturas...`}
            rows={2}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#e5e7eb",
              fontSize: 13,
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || (!text.trim() && !images.length)}
            style={{
              background: loading || (!text.trim() && !images.length)
                ? "rgba(16,185,129,0.2)"
                : "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              borderRadius: 10,
              width: 48,
              height: 60,
              cursor: loading || (!text.trim() && !images.length) ? "not-allowed" : "pointer",
              color: "#fff",
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
          >
            {loading ? "⏳" : "⚡"}
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ fontSize: 9, color: "#374151" }}>
            Enter para enviar · Shift+Enter nueva línea · Arrastra imágenes al área de carga
          </div>
          <div style={{ fontSize: 9, color: "#374151" }}>
            {images.length > 0 && <span style={{ color: "#10b981" }}>{images.length} imagen{images.length > 1 ? "es" : ""} lista{images.length > 1 ? "s" : ""} · </span>}
            Powered by Claude Vision AI
          </div>
        </div>
      </div>
    </div>
  );
}
