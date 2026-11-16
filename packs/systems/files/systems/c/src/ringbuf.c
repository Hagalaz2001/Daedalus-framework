#include "ringbuf.h"

int ringbuf_init(ringbuf_t *rb, uint8_t *storage, size_t capacity) {
    if (rb == NULL || storage == NULL || capacity == 0) {
        return -1;
    }
    rb->data = storage;
    rb->capacity = capacity;
    rb->head = rb->tail = rb->count = 0;
    return 0;
}

int ringbuf_push(ringbuf_t *rb, uint8_t byte) {
    if (rb->count == rb->capacity) {
        return -1;
    }
    rb->data[rb->head] = byte;
    rb->head = (rb->head + 1) % rb->capacity;
    rb->count++;
    return 0;
}

int ringbuf_pop(ringbuf_t *rb, uint8_t *out) {
    if (rb->count == 0) {
        return -1;
    }
    *out = rb->data[rb->tail];
    rb->tail = (rb->tail + 1) % rb->capacity;
    rb->count--;
    return 0;
}

size_t ringbuf_count(const ringbuf_t *rb) {
    return rb->count;
}
