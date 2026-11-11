import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = await readFile(
  fileURLToPath(new URL("../functions/api/chat.js", import.meta.url)),
  "utf8",
);
const { onRequestPost } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

test("validates questions before calling Gemini", async () => {
  const missingKey = await onRequestPost({
    request: new Request("https://helpdesk.example/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Where is the library?" }),
    }),
    env: {},
  });
  assert.equal(missingKey.status, 503);

  const invalidQuestion = await onRequestPost({
    request: new Request("https://helpdesk.example/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: " " }),
    }),
    env: { GEMINI_API_KEY: "test-key" },
  });
  assert.equal(invalidQuestion.status, 400);
});

test("sends a private-key Gemini request and returns normalized chat data", async () => {
  const answer = {
    answer: "Contact your faculty advisor.",
    category: "Academics",
    found: true,
    suggestions: ["Where can I find exam information?", "Extra suggestion"],
  };
  let upstreamRequest;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    upstreamRequest = { url: String(url), options };
    return Response.json({
      candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }],
    });
  };

  try {
    const response = await onRequestPost({
      request: new Request("https://helpdesk.example/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Who can help with academics?",
          history: [
            { role: "user", content: "I need academic help." },
            { role: "assistant", content: "Contact your faculty advisor." },
          ],
        }),
      }),
      env: { GEMINI_API_KEY: "test-secret", GEMINI_MODEL: "test-model" },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ...answer,
      suggestions: ["Where can I find exam information?", "Extra suggestion"],
    });
    assert.equal(upstreamRequest.url, "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent");
    assert.equal(upstreamRequest.options.headers["x-goog-api-key"], "test-secret");
    assert.equal(upstreamRequest.url.includes("test-secret"), false);
    const body = JSON.parse(upstreamRequest.options.body);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(body.contents.map((message) => message.role), ["user", "model", "user"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a generic error if Gemini is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("provider details", { status: 401 });

  try {
    const response = await onRequestPost({
      request: new Request("https://helpdesk.example/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Where is the library?" }),
      }),
      env: { GEMINI_API_KEY: "test-key" },
    });
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), /provider details/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
