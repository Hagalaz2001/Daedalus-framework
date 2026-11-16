#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "checked_math.hpp"
#include "doctest/doctest.h"

using checked::add;
using checked::mul;
constexpr auto kMax = std::numeric_limits<std::int64_t>::max();
constexpr auto kMin = std::numeric_limits<std::int64_t>::min();

TEST_CASE("add returns the sum when it fits") {
    CHECK(add(2, 3) == 5);
    CHECK(add(kMax, 0) == kMax);
    CHECK(add(kMin, kMax) == -1);
}

TEST_CASE("add detects overflow in both directions") {
    CHECK_FALSE(add(kMax, 1).has_value());
    CHECK_FALSE(add(kMin, -1).has_value());
}

TEST_CASE("mul returns the product when it fits") {
    CHECK(mul(6, 7) == 42);
    CHECK(mul(-6, 7) == -42);
    CHECK(mul(0, kMax) == 0);
    CHECK(mul(kMax, 1) == kMax);
    CHECK(mul(kMin, 1) == kMin);
}

TEST_CASE("mul detects overflow, including the min * -1 corner") {
    CHECK_FALSE(mul(kMax, 2).has_value());
    CHECK_FALSE(mul(kMin, -1).has_value());
    CHECK_FALSE(mul(-1, kMin).has_value());
    CHECK_FALSE(mul(kMin, 2).has_value());
    CHECK_FALSE(mul(3037000500LL, 3037000500LL).has_value());
    CHECK(mul(3037000499LL, 3037000499LL).has_value());
}

static_assert(add(1, 2) == 3, "usable at compile time");
