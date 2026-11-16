/* Test harness for sum_u64: the same C file tests the x86-64 and the ARM64 implementation. Exit code 0 = pass. */
#include <inttypes.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

#ifdef __APPLE__
uint64_t sum_u64(const uint64_t *values, size_t count) __asm__("_sum_u64");
#endif
uint64_t sum_u64(const uint64_t *values, size_t count);

static int failures;
#define EXPECT(name, got, want)                                                                      \
    do {                                                                                             \
        uint64_t g_ = (got), w_ = (want);                                                            \
        if (g_ != w_) {                                                                              \
            printf("FAIL %s: got %" PRIu64 ", want %" PRIu64 "\n", name, g_, w_);                    \
            failures++;                                                                              \
        } else {                                                                                     \
            printf("ok   %s\n", name);                                                               \
        }                                                                                            \
    } while (0)

static uint64_t reference(const uint64_t *v, size_t n) {
    uint64_t s = 0;
    for (size_t i = 0; i < n; i++) s += v[i];
    return s;
}

int main(void) {
    const uint64_t one[] = {42};
    const uint64_t few[] = {1, 2, 3, 4, 5};
    const uint64_t wrap[] = {UINT64_MAX, 1};
    const uint64_t big[] = {UINT64_C(0x8000000000000000), UINT64_C(0x8000000000000000), 7};
    uint64_t many[1000];
    for (size_t i = 0; i < 1000; i++) many[i] = i * UINT64_C(0x9E3779B97F4A7C15);

    EXPECT("empty (NULL pointer is never read)", sum_u64(NULL, 0), 0);
    EXPECT("single value", sum_u64(one, 1), 42);
    EXPECT("small array", sum_u64(few, 5), 15);
    EXPECT("wraps modulo 2^64", sum_u64(wrap, 2), 0);
    EXPECT("carry out of the top bit", sum_u64(big, 3), 7);
    EXPECT("1000 values vs C reference", sum_u64(many, 1000), reference(many, 1000));
    EXPECT("start offset by one element", sum_u64(many + 1, 999), reference(many + 1, 999));
    return failures ? 1 : 0;
}
