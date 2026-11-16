# systems: C, C++, Rust no_std, assembly

Small, tested samples to start low-level work from, and a runner that builds and tests what your machine can. Read
`DISCLAIMER.md`: nothing here is certified for safety-critical use.

```
deno task systems              # everything the machine can build; skipped steps say what is missing
deno task systems c cpp        # pick targets: c, cpp, asm, rust
deno task systems:firmware     # also compiles the Embassy firmware for STM32F401RE
```

| Folder               | What                                                                                         | Tests                                            | Licences |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------- |
| `c/`                 | `ringbuf`: fixed-capacity byte ring buffer, CMake                                            | Unity v2.6.1 (MIT), fetched at configure time    | MIT      |
| `cpp/`               | `checked_math.hpp`: overflow-checked int64 add/mul, CMake, C++20                             | doctest v2.4.12 (MIT), fetched at configure time | MIT      |
| `asm/x86_64/`        | `sum_u64` in NASM (System V and Microsoft x64, ELF/Mach-O/PE)                                | C harness `asm/test/test_sum.c`                  | MIT      |
| `asm/arm64/`         | the same routine in GNU as syntax (AArch64 Linux, AAPCS64)                                   | same harness                                     | MIT      |
| `rust-embedded/core` | `fw-core`: CRC-16 and a debouncer, `no_std`, host-tested, builds for `thumbv7em-none-eabihf` | `cargo test`                                     | MIT      |
| `rust-embedded/app`  | Embassy (MIT/Apache-2.0) blink-with-button firmware for an STM32F401RE (Nucleo)              | compiles; needs a board to run                   | MIT      |

## What was verified, and where

The samples were built and run on Windows x64 with CMake 4.4, Ninja, Zig 0.17 (as the C/C++ compiler), NASM 2.16 and
Rust 1.99: Unity and doctest suites pass, the x86-64 routine passes natively (`win64` format), the ELF64 object and the
ARM64 routine assemble and link (ARM64 was **not executed**: no QEMU on that machine), the Rust core tests pass,
`fw-core` builds for Cortex-M4F, and the Embassy firmware compiles. Not run anywhere yet: macOS (`macho64` path), real
hardware, `clang-tidy`/`cppcheck` (not installed there). Run `deno task systems` on your machine and trust that output
over this paragraph.

## Toolchains

- C/C++: `cmake` plus gcc, clang or MSVC (Windows: Visual Studio Build Tools). Zig can stand in: set
  `CC="zig cc" CXX="zig c++"`; CMake needs an archiver, so also pass
  `CMAKE_ARGS="-DCMAKE_AR=<path to a script running 'zig ar'>"`.
- Assembly: `nasm` (BSD-2-Clause) and a C compiler. ARM64 on an x86 host: `zig cc` cross-compiles and links statically;
  run with `qemu-aarch64` (`qemu-user` package). `clang --target=aarch64-linux-gnu` can assemble, but linking needs an
  ARM64 sysroot (`--sysroot`) or a cross gcc (`aarch64-linux-gnu-gcc`).
- Rust: `rustup target add thumbv7em-none-eabihf` (change the target and chip features for your board). Flash with
  `probe-rs` (uncomment the `runner` line in `app/.cargo/config.toml`).

## Static analysis (run before every merge)

```
cmake -S systems/c -B build/c -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
clang-tidy -p build/c systems/c/src/*.c           # checks in systems/c/.clang-tidy
cppcheck --enable=warning,style,performance,portability --inline-suppr \
  --suppressions-list=systems/c/.cppcheck-suppressions --error-exitcode=1 systems/c/src systems/cpp/src
cargo clippy --manifest-path systems/rust-embedded/core/Cargo.toml -- -D warnings
```

clang-tidy (Apache-2.0 with LLVM exception) and cppcheck (GPL-3.0) are external tools run on your code; nothing from
them is copied here. Add sanitizers on the host builds: `-fsanitize=address,undefined` (gcc/clang). For parsers and
protocols add fuzzing (libFuzzer, AFL++, `cargo fuzz`).

## Cross-compilation and QEMU notes

- Pick the triple first (`aarch64-linux-gnu`, `arm-none-eabi`, `riscv64-unknown-elf`, `thumbv7em-none-eabihf`). One
  CMake toolchain file per target (`-DCMAKE_TOOLCHAIN_FILE=`), never edit the main `CMakeLists.txt` per target.
- Linux user-mode emulation (`qemu-aarch64 -L <sysroot> ./test`, or build with `-static`) runs unit tests without
  hardware. Register the interpreter with `binfmt_misc` and `ctest` runs them transparently.
- Bare metal: system emulation (`qemu-system-arm -M lm3s6965evb -kernel fw.elf -nographic -semihosting`) runs firmware
  tests in CI; unit-test pure logic on the host (as `fw-core` does) and keep hardware access thin.
- QEMU peripherals are approximations. A passing emulator run does not prove timing, interrupt or electrical behaviour.
- Keep the same C harness for host, QEMU and on-target runs so a routine is tested the same way everywhere.

## Assembly rules of thumb

Write assembly only where a measured need exists (a hot loop, an instruction C cannot express, a boot stub). State the
ABI, clobbered registers and stack alignment in the header comment, test empty and wraparound inputs, and keep a C
reference implementation to compare against, as `test_sum.c` does.
