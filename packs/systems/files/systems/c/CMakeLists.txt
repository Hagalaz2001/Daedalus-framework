cmake_minimum_required(VERSION 3.20)
project(ringbuf C)
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # clang-tidy and IDEs read compile_commands.json

add_library(ringbuf src/ringbuf.c)
target_include_directories(ringbuf PUBLIC include)
target_compile_options(ringbuf PRIVATE -Wall -Wextra -Wpedantic -Wconversion -Werror)

# Unity (MIT, https://github.com/ThrowTheSwitch/Unity), fetched at configure time, pinned to a release tag.
include(FetchContent)
FetchContent_Declare(unity GIT_REPOSITORY https://github.com/ThrowTheSwitch/Unity.git GIT_TAG v2.6.1)
FetchContent_MakeAvailable(unity)

enable_testing()
add_executable(test_ringbuf test/test_ringbuf.c)
target_link_libraries(test_ringbuf PRIVATE ringbuf unity)
add_test(NAME ringbuf COMMAND test_ringbuf)
