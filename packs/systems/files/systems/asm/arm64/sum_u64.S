// uint64_t sum_u64(const uint64_t *values, size_t count)
// AArch64 (Linux, AAPCS64): x0 = pointer, x1 = count, result in x0. Wraps modulo 2^64.
// Assemble with GNU as or clang: clang --target=aarch64-linux-gnu -c sum_u64.S
    .text
    .global sum_u64
    .type   sum_u64, %function
    .p2align 2
sum_u64:
    mov     x2, #0              // sum = 0
    cbz     x1, 2f              // count == 0: return 0 without touching memory
1:  ldr     x3, [x0], #8        // x3 = *values++
    add     x2, x2, x3
    subs    x1, x1, #1
    b.ne    1b
2:  mov     x0, x2
    ret
    .size   sum_u64, .-sum_u64
    .section .note.GNU-stack,"",%progbits
