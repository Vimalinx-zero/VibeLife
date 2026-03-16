import os
import sys
import tempfile
import unittest
from pathlib import Path

TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent
TEMP_DIR = tempfile.TemporaryDirectory()

os.environ["VIBELIFE_DB_PATH"] = str(Path(TEMP_DIR.name) / "test-vibelife.db")

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from main import app  # noqa: E402


class LegacyCleanupEndpointsTest(unittest.TestCase):
    def test_legacy_leaderboard_endpoint_is_removed(self):
        paths = {route.path for route in app.routes if hasattr(route, "path")}

        self.assertNotIn("/api/leaderboard", paths)


if __name__ == "__main__":
    unittest.main()
