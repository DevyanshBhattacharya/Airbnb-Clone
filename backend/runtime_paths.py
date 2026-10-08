"""Choose writable defaults for local and serverless deployments."""

import os
from pathlib import Path


def uses_ephemeral_storage(module_path: Path | None = None) -> bool:
    """Return whether this app is running in a read-only serverless bundle."""
    path = (module_path or Path(__file__)).absolute()
    # VERCEL is optional when automatic system variables are disabled. The
    # Python function bundle still lives under /var/task in that case.
    return bool(os.getenv("VERCEL")) or path.is_relative_to("/var/task")
