#pragma once
#include <cstdint>
#include <limits>
#include <optional>

namespace checked {

// Overflow-checked integer arithmetic: returns nullopt instead of wrapping or invoking undefined behaviour.
constexpr std::optional<std::int64_t> add(std::int64_t a, std::int64_t b) {
    if ((b > 0 && a > std::numeric_limits<std::int64_t>::max() - b) ||
        (b < 0 && a < std::numeric_limits<std::int64_t>::min() - b)) {
        return std::nullopt;
    }
    return a + b;
}

constexpr std::optional<std::int64_t> mul(std::int64_t a, std::int64_t b) {
    if (a == 0 || b == 0) {
        return 0;
    }
    constexpr auto lo = std::numeric_limits<std::int64_t>::min();
    constexpr auto hi = std::numeric_limits<std::int64_t>::max();
    if ((a == -1 && b == lo) || (b == -1 && a == lo)) {
        return std::nullopt;
    }
    if ((a > 0) == (b > 0) ? (a > 0 ? a > hi / b : a < hi / b) : (a > 0 ? b < lo / a : a < lo / b)) {
        return std::nullopt;
    }
    return a * b;
}

}  // namespace checked
