import os
import subprocess
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
JWT_KEY_PATH = BACKEND_ROOT / "jwt_key.txt"


class AuthSecretFallbackTest(unittest.TestCase):
    def test_auth_module_uses_jwt_key_file_when_env_is_missing(self):
        env = os.environ.copy()
        env.pop("JWT_SECRET_KEY", None)

        result = subprocess.run(
            [
                sys.executable,
                "-c",
                (
                    "import auth; "
                    "from pathlib import Path; "
                    "print(auth.SECRET_KEY); "
                    "print(Path('jwt_key.txt').read_text().strip())"
                ),
            ],
            cwd=BACKEND_ROOT,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )

        secret_key, file_secret = result.stdout.strip().splitlines()
        self.assertEqual(secret_key, file_secret)


if __name__ == "__main__":
    unittest.main()
