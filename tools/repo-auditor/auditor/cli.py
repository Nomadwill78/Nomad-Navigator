"""CLI entry point for the repository auditor."""

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from .agents import run_audit


def _validate_github_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc.lower() != "github.com":
        raise ValueError("Only https://github.com/<owner>/<repo> URLs are supported.")
    path = parsed.path.rstrip("/")
    if not path or path.count("/") != 2:
        raise ValueError("Expected a GitHub repository URL such as https://github.com/owner/repo")
    return f"https://github.com{path}.git"


def _clone_repo(url: str, branch: str | None, token: str | None) -> Path:
    """Clone without putting the token in the git command line or clone URL."""
    clone_url = _validate_github_url(url)
    destination = Path(tempfile.mkdtemp(prefix="nomad-audit-")) / "repo"

    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"

    askpass = None
    if token:
        askpass = destination.parent / "git-askpass.sh"
        askpass.write_text(
            "#!/bin/sh\n"
            "case \"$1\" in\n"
            "*Username*) printf '%s\\n' 'x-access-token' ;;\n"
            "*) printf '%s\\n' \"$GITHUB_TOKEN\" ;;\n"
            "esac\n",
            encoding="utf-8",
        )
        askpass.chmod(0o700)
        env["GITHUB_TOKEN"] = token
        env["GIT_ASKPASS"] = str(askpass)

    cmd = ["git", "clone", "--depth", "1"]
    if branch:
        cmd += ["--branch", branch]
    cmd += [clone_url, str(destination)]

    try:
        subprocess.run(cmd, check=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return destination
    finally:
        if askpass:
            askpass.unlink(missing_ok=True)
        env.pop("GITHUB_TOKEN", None)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an autonomous repository assurance audit.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--repo", type=Path, help="Local repository checkout.")
    source.add_argument("--url", help="Public or private GitHub repository URL.")
    parser.add_argument("--branch", default=None, help="Branch to clone when --url is used.")
    parser.add_argument("--output", type=Path, default=Path("audit-report.md"))
    parser.add_argument("--model", default=os.getenv("AUDIT_MODEL", "gpt-5.6-sol"))
    args = parser.parse_args()

    temporary = False
    repo = args.repo.resolve() if args.repo else None
    if args.url:
        repo = _clone_repo(args.url, args.branch, os.getenv("GITHUB_TOKEN"))
        temporary = True

    try:
        report = asyncio.run(run_audit(repo, model=args.model))
        args.output.write_text(report, encoding="utf-8")
        print(f"Audit complete: {args.output.resolve()}")
    finally:
        if temporary and repo:
            shutil.rmtree(repo.parent, ignore_errors=True)


if __name__ == "__main__":
    main()
