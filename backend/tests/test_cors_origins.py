import sys
import unittest
from pathlib import Path


TEST_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = TEST_ROOT.parent

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from cors_config import get_allowed_origins


class CorsOriginsConfigTest(unittest.TestCase):
    def test_default_origins_include_high_dev_ports(self):
        origins = get_allowed_origins(None)

        self.assertIn("http://127.0.0.1:43173", origins)
        self.assertIn("http://127.0.0.1:43174", origins)
        self.assertIn("http://127.0.0.1:49173", origins)

    def test_custom_origins_are_trimmed_and_keep_defaults(self):
        origins = get_allowed_origins(" http://localhost:9999 , http://127.0.0.1:43174 ")

        self.assertIn("http://localhost:9999", origins)
        self.assertEqual(origins.count("http://127.0.0.1:43174"), 1)


if __name__ == "__main__":
    unittest.main()
