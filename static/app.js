const TOPICS = [
  { name: "Academics",      q: "Whom should I contact for academic problems?",           icon: "M4 6l8-3 8 3-8 3-8-3zm2 5v4c0 1.5 3 3 6 3s6-1.5 6-3v-4l-6 2.3L6 11z" },
  { name: "Examinations",   q: "Where can I find the examination timetable?",            icon: "M7 2v3M17 2v3M4 8h16M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" },
  { name: "Placements",     q: "Whom should I contact for placement training?",          icon: "M3 8h18v11H3zM9 8V5h6v3M3 13h18" },
  { name: "Hostel",         q: "How can I raise a hostel complaint?",                    icon: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { name: "Library",        q: "How can I access library resources?",                    icon: "M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z" },
  { name: "Administration", q: "How do I get a certificate or my student records?",      icon: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" },
];
const STARTERS = [
  "Whom should I contact for placement training?",
  "Where can I find the examination timetable?",
  "How can I raise a hostel complaint?",
  "What is the exact date of my next examination?",
];

const $ = (id) => document.getElementById(id);
const log = $("log"), form = $("form"), input = $("q"), sendBtn = $("send");
let history = [];   // {role, content} — sent to the server for follow-up context
let busy = false;

// --- build topic rail + starter chips
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
TOPICS.forEach((t) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "topic"; b.innerHTML = svg(t.icon) + "<span></span>";
  b.lastChild.textContent = t.name;
  b.addEventListener("click", () => ask(t.q));
  $("topics").appendChild(b);
});
STARTERS.forEach((s) => $("starters").appendChild(chip(s)));

function chip(text) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.textContent = text;
  b.addEventListener("click", () => ask(text));
  return b;
}

const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const scroll = () => { log.scrollTop = log.scrollHeight; };
function hideWelcome() { const w = $("welcome"); if (w) w.remove(); }

function addUser(text) {
  hideWelcome();
  const m = document.createElement("div"); m.className = "msg user";
  const b = document.createElement("div"); b.className = "bubble"; b.textContent = text;
  const t = document.createElement("div"); t.className = "time"; t.textContent = now();
  m.append(b, t); log.appendChild(m); scroll();
}

function addTyping() {
  const m = document.createElement("div"); m.className = "msg bot typing";
  m.innerHTML = '<div class="bubble" aria-label="Helpdesk is typing"><i></i><i></i><i></i></div>';
  log.appendChild(m); scroll(); return m;
}

function addBot({ answer, category, found, suggestions }, isError = false) {
  const m = document.createElement("div");
  m.className = "msg bot" + (isError ? " err" : "") + (!isError && found === false ? " unknown" : "");
  if (!isError) {
    const tag = document.createElement("div"); tag.className = "tag";
    tag.textContent = found === false ? "Not in the information I have" : (category || "Campus Helpdesk");
    m.appendChild(tag);
  }
  const b = document.createElement("div"); b.className = "bubble"; b.textContent = answer; m.appendChild(b);
  const t = document.createElement("div"); t.className = "time"; t.textContent = now(); m.appendChild(t);

  if (!isError) {
    const extra = document.createElement("div"); extra.className = "extra";
    (suggestions || []).forEach((s) => extra.appendChild(chip(s)));
    const fb = document.createElement("div"); fb.className = "fb";
    fb.innerHTML = "<span>Was this helpful?</span>";
    ["Yes", "No"].forEach((v) => {
      const btn = document.createElement("button"); btn.type = "button"; btn.textContent = v;
      btn.addEventListener("click", () => { fb.innerHTML = '<span class="done">Thanks for the feedback.</span>'; });
      fb.appendChild(btn);
    });
    extra.appendChild(fb); m.appendChild(extra);
  }
  log.appendChild(m); scroll();
}

async function ask(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; sendBtn.disabled = true; input.value = "";
  addUser(text);
  const typing = addTyping();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });
    const data = await res.json().catch(() => ({}));
    typing.remove();
    if (!res.ok) { addBot({ answer: data.error || "Something went wrong. Please try again." }, true); return; }
    addBot(data);
    history.push({ role: "user", content: text }, { role: "assistant", content: data.answer });
    history = history.slice(-12);
  } catch {
    typing.remove();
    addBot({ answer: "Can't reach the helpdesk server. Check your connection and try again." }, true);
  } finally {
    busy = false; sendBtn.disabled = false; input.focus();
  }
}

form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
$("clear").addEventListener("click", () => {
  history = [];
  log.innerHTML = "";
  const w = document.createElement("div"); w.id = "welcome"; w.className = "welcome";
  w.innerHTML = "<h2>What do you need help with?</h2><p>Type a question in your own words, or start with one of these.</p><div id='starters' class='starters'></div>";
  log.appendChild(w);
  STARTERS.forEach((s) => w.querySelector("#starters").appendChild(chip(s)));
  input.focus();
});
