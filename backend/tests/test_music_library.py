import io
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent
TEMP_DIR = tempfile.TemporaryDirectory()

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-music-library.db")
os.environ["VIBELIFE_MUSIC_STORAGE_ROOT"] = str(Path(TEMP_DIR.name) / "music-storage")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from main import app  # noqa: E402


class MusicLibraryApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def register_user(self):
        suffix = str(time.time_ns())
        payload = {
            "username": f"music-{suffix}",
            "email": f"music-{suffix}@example.com",
            "password": "secret123",
            "full_name": "Music User",
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        return body["user_id"], body["access_token"], {"Authorization": f"Bearer {body['access_token']}"}

    def test_import_list_and_stream_music_files(self):
        user_id, token, headers = self.register_user()

        response = self.client.post(
            "/api/music/import",
            headers=headers,
            files=[
                ("files", ("Deep Focus.mp3", io.BytesIO(b"fake-audio-one"), "audio/mpeg")),
                ("files", ("Night Wind.wav", io.BytesIO(b"fake-audio-two"), "audio/wav")),
            ],
        )

        self.assertEqual(response.status_code, 200, response.text)
        created_tracks = response.json()["tracks"]
        self.assertEqual(len(created_tracks), 2)
        self.assertEqual({item["title"] for item in created_tracks}, {"Deep Focus", "Night Wind"})
        self.assertTrue(all(item["user_id"] == user_id for item in created_tracks))
        self.assertTrue(all(item["stream_path"].startswith("/api/music/files/") for item in created_tracks))

        library_response = self.client.get("/api/music/library", headers=headers)
        self.assertEqual(library_response.status_code, 200, library_response.text)
        library_tracks = library_response.json()["tracks"]
        self.assertEqual(len(library_tracks), 2)
        self.assertEqual(
            [item["original_filename"] for item in library_tracks],
            ["Deep Focus.mp3", "Night Wind.wav"],
        )

        track_id = created_tracks[0]["id"]
        stream_response = self.client.get(f"/api/music/files/{track_id}", headers=headers)
        self.assertEqual(stream_response.status_code, 200, stream_response.text)
        self.assertEqual(stream_response.content, b"fake-audio-one")

        query_stream_response = self.client.get(f"/api/music/files/{track_id}?token={token}")
        self.assertEqual(query_stream_response.status_code, 200, query_stream_response.text)
        self.assertEqual(query_stream_response.content, b"fake-audio-one")

    def test_music_library_is_user_isolated(self):
        _user_a_id, _token_a, headers_a = self.register_user()
        _user_b_id, _token_b, headers_b = self.register_user()

        import_response = self.client.post(
            "/api/music/import",
            headers=headers_a,
            files=[
                ("files", ("Private Song.mp3", io.BytesIO(b"private-song"), "audio/mpeg")),
            ],
        )
        self.assertEqual(import_response.status_code, 200, import_response.text)
        track_id = import_response.json()["tracks"][0]["id"]

        library_response_b = self.client.get("/api/music/library", headers=headers_b)
        self.assertEqual(library_response_b.status_code, 200, library_response_b.text)
        self.assertEqual(library_response_b.json()["tracks"], [])

        stream_response_b = self.client.get(f"/api/music/files/{track_id}", headers=headers_b)
        self.assertEqual(stream_response_b.status_code, 404, stream_response_b.text)


if __name__ == "__main__":
    unittest.main()
