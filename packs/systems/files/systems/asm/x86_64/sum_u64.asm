; uint64_t sum_u64(const uint64_t *values, size_t count)
; Adds count 64-bit values, wrapping modulo 2^64. Assemble with NASM:
;   nasm -f elf64 | -f win64 | -f macho64 sum_u64.asm
; Arguments: System V (Linux, macOS) rdi, rsi. Microsoft x64 (Windows) rcx, rdx. Result in rax.
; Only caller-saved registers are used, so nothing needs saving.
default rel

%ifidn __OUTPUT_FORMAT__, macho64
  %define SYM _sum_u64
%else
  %define SYM sum_u64
%endif
global SYM

section .text
SYM:
%ifidn __OUTPUT_FORMAT__, win64
    mov     r8, rcx             ; r8 = pointer
    mov     r9, rdx             ; r9 = count
%else
    mov     r8, rdi
    mov     r9, rsi
%endif
    xor     eax, eax            ; sum = 0
    test    r9, r9
    jz      .done               ; count == 0: return 0 without touching memory
.loop:
    add     rax, [r8]
    add     r8, 8
    dec     r9
    jnz     .loop
.done:
    ret

%ifidn __OUTPUT_FORMAT__, elf64
section .note.GNU-stack noalloc noexec nowrite progbits
%endif
