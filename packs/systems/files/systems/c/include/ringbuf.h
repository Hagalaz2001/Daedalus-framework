#ifndef RINGBUF_H
#define RINGBUF_H

#include <stddef.h>
#include <stdint.h>

/* Fixed-capacity byte ring buffer. No allocation: the caller owns the storage. Not thread-safe. */
typedef struct {
    uint8_t *data;
    size_t capacity;
    size_t head; /* next write */
    size_t tail; /* next read */
    size_t count;
} ringbuf_t;

/* Returns 0 on success, -1 when data is NULL or capacity is 0. */
int ringbuf_init(ringbuf_t *rb, uint8_t *storage, size_t capacity);
/* Returns 0 on success, -1 when full (the byte is not stored). */
int ringbuf_push(ringbuf_t *rb, uint8_t byte);
/* Returns 0 on success, -1 when empty (*out is untouched). */
int ringbuf_pop(ringbuf_t *rb, uint8_t *out);
size_t ringbuf_count(const ringbuf_t *rb);

#endif
