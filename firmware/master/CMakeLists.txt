cmake_minimum_required(VERSION 3.16)

# Version explicite : le projet peut être compilé hors dépôt Git (archive ZIP).
set(PROJECT_VER "6.0.0")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_lab_master)
