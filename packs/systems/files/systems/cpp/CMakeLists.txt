cmake_minimum_required(VERSION 3.20)
project(checked_math CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_library(checked_math INTERFACE)
target_include_directories(checked_math INTERFACE src)

# doctest (MIT, https://github.com/doctest/doctest), fetched at configure time, pinned to a release tag.
include(FetchContent)
FetchContent_Declare(doctest GIT_REPOSITORY https://github.com/doctest/doctest.git GIT_TAG v2.4.12)
FetchContent_MakeAvailable(doctest)

enable_testing()
add_executable(test_checked_math test/test_checked_math.cpp)
target_link_libraries(test_checked_math PRIVATE checked_math doctest::doctest)
target_compile_options(test_checked_math PRIVATE -Wall -Wextra -Werror)
add_test(NAME checked_math COMMAND test_checked_math)
