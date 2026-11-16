- Systems code (`systems/`): C11/C++20, Rust `no_std`. Warnings are errors (`-Wall -Wextra -Wconversion -Werror`). Run
  `deno task systems` and the static analysers (`systems/README.md`) before saying done.
- Memory and integer safety first: no `gets`/`strcpy`/`sprintf`, check every size and index, no signed overflow, no
  unchecked casts. Prefer fixed-size buffers owned by the caller in firmware. Every function states who owns what.
- Assembly: document the calling convention, which registers are clobbered and the stack alignment at the top of the
  file; keep routines tiny; every routine has a C-harness test including empty input and wraparound.
- Do not guess register maps, timings or errata. Cite the datasheet or reference manual; if you cannot, say so.
- Never flash, erase or reconfigure real hardware, fuses or bootloaders, and never run untested firmware on
  safety-relevant equipment. A human does that. Safety standards (ISO 26262, IEC 61508, DO-178C, IEC 62304) need
  qualified process and people; the code here is not certified.
