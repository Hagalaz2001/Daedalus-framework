import tempfile
import unittest
from pathlib import Path

from prompts import prompts


class PromptTests(unittest.TestCase):
    def test_latest_version_by_default_and_pinning(self):
        self.assertEqual(prompts.load("summarize").version, 2)
        self.assertEqual(prompts.load("summarize", 1).ref, "summarize@v1")
        with self.assertRaises(FileNotFoundError):
            prompts.load("summarize", 9)
        with self.assertRaises(FileNotFoundError):
            prompts.load("missing")

    def test_hash_changes_with_content(self):
        self.assertNotEqual(prompts.load("summarize", 1).sha256, prompts.load("summarize", 2).sha256)

    def test_render_fails_on_missing_variable(self):
        p = prompts.load("summarize")
        self.assertIn("hello", p.render(message="hello"))
        with self.assertRaises(KeyError):
            p.render()

    def test_versions_sorted_numerically(self):
        with tempfile.TemporaryDirectory() as d:
            for v in (2, 10, 1):
                (Path(d) / f"x.v{v}.md").write_text("t")
            self.assertEqual(prompts.versions("x", Path(d)), [1, 2, 10])


if __name__ == "__main__":
    unittest.main()
