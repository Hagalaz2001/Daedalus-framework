"""Versioned prompts: prompts/<name>.v<N>.md, immutable once released. Log name@version with every model call."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from pathlib import Path

_DIR = Path(__file__).parent


@dataclass(frozen=True)
class Prompt:
    name: str
    version: int
    text: str

    @property
    def ref(self) -> str:
        return f"{self.name}@v{self.version}"

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.text.encode()).hexdigest()

    def render(self, **values: str) -> str:
        """Fails with KeyError on a missing variable instead of sending a broken prompt."""
        return self.text.format_map(_Strict(values))


class _Strict(dict):
    def __missing__(self, key: str) -> str:
        raise KeyError(f"prompt variable {key!r} was not provided")


def versions(name: str, directory: Path = _DIR) -> list[int]:
    found = [int(m.group(1)) for p in directory.glob(f"{name}.v*.md") if (m := re.fullmatch(rf"{re.escape(name)}\.v(\d+)\.md", p.name))]
    return sorted(found)


def load(name: str, version: int | None = None, directory: Path = _DIR) -> Prompt:
    have = versions(name, directory)
    if not have:
        raise FileNotFoundError(f"no prompt named {name!r}")
    v = have[-1] if version is None else version
    if v not in have:
        raise FileNotFoundError(f"{name} has versions {have}, not {v}")
    return Prompt(name, v, (directory / f"{name}.v{v}.md").read_text(encoding="utf-8"))
