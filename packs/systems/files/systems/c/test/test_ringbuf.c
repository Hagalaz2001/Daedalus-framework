#include "ringbuf.h"
#include "unity.h"

static uint8_t storage[4];
static ringbuf_t rb;

void setUp(void) { TEST_ASSERT_EQUAL_INT(0, ringbuf_init(&rb, storage, sizeof storage)); }
void tearDown(void) {}

static void test_init_rejects_bad_arguments(void) {
    TEST_ASSERT_EQUAL_INT(-1, ringbuf_init(&rb, NULL, 4));
    TEST_ASSERT_EQUAL_INT(-1, ringbuf_init(&rb, storage, 0));
    TEST_ASSERT_EQUAL_INT(-1, ringbuf_init(NULL, storage, 4));
}

static void test_fifo_order(void) {
    uint8_t out = 0;
    for (uint8_t i = 1; i <= 3; i++) TEST_ASSERT_EQUAL_INT(0, ringbuf_push(&rb, i));
    for (uint8_t i = 1; i <= 3; i++) {
        TEST_ASSERT_EQUAL_INT(0, ringbuf_pop(&rb, &out));
        TEST_ASSERT_EQUAL_UINT8(i, out);
    }
}

static void test_full_buffer_refuses_and_keeps_data(void) {
    uint8_t out = 0;
    for (uint8_t i = 0; i < 4; i++) TEST_ASSERT_EQUAL_INT(0, ringbuf_push(&rb, i));
    TEST_ASSERT_EQUAL_INT(-1, ringbuf_push(&rb, 99));
    TEST_ASSERT_EQUAL_UINT(4, ringbuf_count(&rb));
    TEST_ASSERT_EQUAL_INT(0, ringbuf_pop(&rb, &out));
    TEST_ASSERT_EQUAL_UINT8(0, out);
}

static void test_empty_pop_leaves_output_untouched(void) {
    uint8_t out = 0xAB;
    TEST_ASSERT_EQUAL_INT(-1, ringbuf_pop(&rb, &out));
    TEST_ASSERT_EQUAL_UINT8(0xAB, out);
}

static void test_wraps_around(void) {
    uint8_t out = 0;
    for (int round = 0; round < 10; round++) {
        TEST_ASSERT_EQUAL_INT(0, ringbuf_push(&rb, (uint8_t)round));
        TEST_ASSERT_EQUAL_INT(0, ringbuf_pop(&rb, &out));
        TEST_ASSERT_EQUAL_UINT8((uint8_t)round, out);
    }
    TEST_ASSERT_EQUAL_UINT(0, ringbuf_count(&rb));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_init_rejects_bad_arguments);
    RUN_TEST(test_fifo_order);
    RUN_TEST(test_full_buffer_refuses_and_keeps_data);
    RUN_TEST(test_empty_pop_leaves_output_untouched);
    RUN_TEST(test_wraps_around);
    return UNITY_END();
}
