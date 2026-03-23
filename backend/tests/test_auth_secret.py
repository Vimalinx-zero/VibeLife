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

    def test_auth_module_syncs_jwt_key_file_with_env_secret(self):
        original_secret = JWT_KEY_PATH.read_text(encoding="utf-8") if JWT_KEY_PATH.exists() else None
        env = os.environ.copy()
        env["JWT_SECRET_KEY"] = "test-env-secret-sync"

        try:
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
        finally:
            if original_secret is None:
                JWT_KEY_PATH.unlink(missing_ok=True)
            else:
                JWT_KEY_PATH.write_text(original_secret, encoding="utf-8")

        secret_key, file_secret = result.stdout.strip().splitlines()
        self.assertEqual(secret_key, env["JWT_SECRET_KEY"])
        self.assertEqual(file_secret, env["JWT_SECRET_KEY"])


if __name__ == "__main__":
    unittest.main()
