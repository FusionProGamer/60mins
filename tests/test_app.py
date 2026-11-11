import json
import os
import unittest
from types import SimpleNamespace
from unittest import mock

import app as helpdesk


class ChatEndpointTests(unittest.TestCase):
    def setUp(self):
        helpdesk.app.config["TESTING"] = True
        helpdesk._hits.clear()
        self.client = helpdesk.app.test_client()

    def test_chat_requires_gemini_api_key(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            response = self.client.post("/api/chat", json={"message": "Where is the library?"})

        self.assertEqual(response.status_code, 503)
        self.assertIn("GEMINI_API_KEY", response.get_json()["error"])

    def test_chat_rejects_empty_question(self):
        response = self.client.post("/api/chat", json={"message": "  "})

        self.assertEqual(response.status_code, 400)

    def test_chat_returns_model_answer_with_gemini_config(self):
        answer = {
            "answer": "Contact the faculty advisor.",
            "category": "Academics",
            "found": True,
            "suggestions": [],
        }
        client = mock.Mock()
        client.models.generate_content.return_value = SimpleNamespace(text=json.dumps(answer))

        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
            with mock.patch.object(helpdesk, "get_client", return_value=client):
                response = self.client.post(
                    "/api/chat",
                    json={
                        "message": "Who can help with academics?",
                        "history": [
                            {"role": "user", "content": "I need academic help."},
                            {"role": "assistant", "content": "Contact your faculty advisor."},
                        ],
                    },
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), answer)
        call = client.models.generate_content.call_args.kwargs
        config = call["config"]
        self.assertEqual(config.system_instruction, helpdesk.SYSTEM_PROMPT)
        self.assertEqual(config.response_mime_type, "application/json")
        self.assertEqual(
            [content.role for content in call["contents"]], ["user", "model", "user"]
        )


if __name__ == "__main__":
    unittest.main()
