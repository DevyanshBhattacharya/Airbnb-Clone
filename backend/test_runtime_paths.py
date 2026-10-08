"""Regression coverage for Vercel deployments without exposed system variables."""

import os
import unittest
from pathlib import Path
from unittest.mock import patch

import runtime_paths

from runtime_paths import uses_ephemeral_storage


class RuntimePathsTest(unittest.TestCase):
    def test_vercel_function_path_uses_tmp_without_vercel_env(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertTrue(uses_ephemeral_storage(Path("/var/task/runtime_paths.py")))

    def test_local_checkout_keeps_local_storage(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(uses_ephemeral_storage(Path(__file__)))

    def test_import_uses_tmp_defaults_in_vercel_bundle(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(
            runtime_paths, "__file__", "/var/task/runtime_paths.py"
        ):
            import database
            from routers.uploads import UPLOAD_DIR

            self.assertEqual(database.DATABASE_URL, "sqlite:////tmp/airbnb.db")
            self.assertEqual(UPLOAD_DIR, Path("/tmp/uploads"))


if __name__ == "__main__":
    unittest.main()
