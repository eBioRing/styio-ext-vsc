#!/usr/bin/env python3
"""Repository hygiene gate for styio-ext-vsc."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


FORBIDDEN_PARTS = {
    "node_modules",
    "out",
    "dist",
    ".vscode-test",
    ".cache",
    "__pycache__",
    ".pytest_cache",
}

FORBIDDEN_SUFFIXES = {
    ".vsix",
    ".log",
    ".tmp",
    ".exe",
    ".dll",
    ".dylib",
    ".so",
    ".a",
    ".lib",
    ".obj",
    ".o",
    ".pdb",
    ".ilk",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
}

ALLOWED_GENERATED = {
    "syntaxes/styio.tmLanguage.json",
    "package-lock.json",
}


def run_git(args: list[str]) -> list[str]:
    completed = subprocess.run(
        ["git", *args],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return [line.strip() for line in completed.stdout.splitlines() if line.strip()]


def tracked_files() -> list[str]:
    return run_git(["ls-files"])


def staged_files() -> list[str]:
    return run_git(["diff", "--cached", "--name-only"])


def push_files(git_range: str) -> list[str]:
    return run_git(["diff", "--name-only", git_range])


def path_parts(path: str) -> set[str]:
    return {part for part in Path(path).parts if part}


def check_paths(files: list[str]) -> list[str]:
    errors: list[str] = []
    for file in files:
        normalized = file.replace("\\", "/")
        if normalized in ALLOWED_GENERATED:
            continue

        parts = path_parts(normalized)
        forbidden_parts = sorted(parts & FORBIDDEN_PARTS)
        if forbidden_parts:
            errors.append(f"{normalized}: forbidden generated/cache path part {forbidden_parts[0]}")

        suffix = Path(normalized).suffix.lower()
        if suffix in FORBIDDEN_SUFFIXES:
            errors.append(f"{normalized}: forbidden generated/binary/archive suffix {suffix}")
    return errors


def check_required_files(root: Path) -> list[str]:
    required = [
        ".gitignore",
        ".vscodeignore",
        "package.json",
        "tsconfig.json",
        "syntaxes/styio.tmLanguage.yaml",
        "syntaxes/styio.tmLanguage.json",
        "scripts/checkpoint-health.sh",
        "docs/plans/STYIO-VSCODE-LANGUAGE-SUPPORT-PLAN.md",
        "docs/specs/REPOSITORY-MAP.md",
        "docs/specs/DEPENDENCY-USAGE.md",
    ]
    return [f"{path}: required file is missing" for path in required if not (root / path).exists()]


def check_grammar_sync() -> list[str]:
    if not Path("node_modules").exists():
        return ["node_modules is missing; run npm ci before grammar sync validation"]

    completed = subprocess.run(
        ["node", "scripts/check-grammar.mjs"],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if completed.returncode != 0:
        return [completed.stderr.strip() or completed.stdout.strip()]
    return []


def check_push_blobs(git_range: str) -> list[str]:
    errors: list[str] = []
    objects = run_git(["rev-list", "--objects", git_range])
    if not objects:
        return errors

    process = subprocess.run(
        ["git", "cat-file", "--batch-check=%(objecttype) %(objectsize) %(rest)"],
        input="\n".join(objects),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    for line in process.stdout.splitlines():
        fields = line.split(maxsplit=2)
        if len(fields) < 3 or fields[0] != "blob":
            continue
        size = int(fields[1])
        path = fields[2]
        if size >= 20_000_000:
            errors.append(f"{path}: blob is {size} bytes, above the 20 MB soft limit")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["tracked", "staged", "push"], default="tracked")
    parser.add_argument("--range", dest="git_range")
    args = parser.parse_args()

    root = Path.cwd()
    if args.mode == "tracked":
        files = tracked_files()
    elif args.mode == "staged":
        files = staged_files()
    else:
        if not args.git_range:
            print("--range is required in push mode", file=sys.stderr)
            return 2
        files = push_files(args.git_range)

    errors = check_paths(files)
    if args.mode == "tracked":
        errors.extend(check_required_files(root))
        errors.extend(check_grammar_sync())
    if args.mode == "push" and args.git_range:
        errors.extend(check_push_blobs(args.git_range))

    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    print(f"repo hygiene passed in {args.mode} mode")
    return 0


if __name__ == "__main__":
    os.chdir(Path(__file__).resolve().parents[1])
    raise SystemExit(main())
