#include <atomic>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_RESIZE_IMPLEMENTATION
#include "stb_image_resize2.h"

constexpr int FRAME_WIDTH = 64;
constexpr int FRAME_HEIGHT = 64;
constexpr int FRAME_CHANNELS = 4;
constexpr size_t FRAME_SIZE = FRAME_WIDTH * FRAME_HEIGHT * FRAME_CHANNELS;

struct Frame {
  std::vector<unsigned char> pixels;
};

std::vector<std::string> getFilesInDirectory(const char *path) {
  namespace fs = std::filesystem;

  std::vector<std::string> result;

  try {
    for (const auto &entry : fs::directory_iterator(path)) {
      if (!entry.is_regular_file())
        continue;

      auto ext = entry.path().extension().string();
      std::transform(ext.begin(), ext.end(), ext.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
      });

      if (ext == ".png") {
        result.push_back(entry.path().string());
      }
    }
  } catch (const fs::filesystem_error &e) {
    std::cerr << "Filesystem error: " << e.what() << "\n";
  }

  std::sort(result.begin(), result.end());
  return result;
}

void writeFramesAsJSON(std::vector<Frame> frames) {
  std::string filename = "output/frame_data.json";

  std::filesystem::create_directories("output");
  std::ofstream file(filename);

  std::cout << "Writing frames to " << filename << "\n";
  std::cout << "Frames size: " << frames.size() << "\n";
  std::cout << "Frame size: " << FRAME_SIZE << "\n";
  std::cout << "Frame channels: " << FRAME_CHANNELS << "\n";
  std::cout << "Frame width: " << FRAME_WIDTH << "\n";
  std::cout << "Frame height: " << FRAME_HEIGHT << "\n";

  file << "{\n";
  file << "  \"width\": " << FRAME_WIDTH << ",\n";
  file << "  \"height\": " << FRAME_HEIGHT << ",\n";
  file << "  \"channels\": " << FRAME_CHANNELS << ",\n";
  file << "  \"frames\": [\n";

  for (size_t i = 0; i < frames.size(); i++) {
    Frame &frame = frames[i];
    file << "    [";

    for (int j = 0; j < (int)FRAME_SIZE; j += FRAME_CHANNELS) {
      file << "[";
      for (int c = 0; c < FRAME_CHANNELS; c++) {
        file << (int)frame.pixels[j + c]
             << (c + 1 == FRAME_CHANNELS ? "" : ", ");
      }
      file << "]" << (j + FRAME_CHANNELS == FRAME_SIZE ? "" : ",") << "";
    }
    file << "  ]" << (i + 1 == frames.size() ? "" : ",") << "\n";
  }

  file << "  ]\n";
  file << "}\n";
  file.close();
}

int main(int argc, char **argv) {
  if (argc < 2) {
    std::cerr << "Usage: image2pixels <input-directory>\n";
    return 1;
  }

  const char *inputDirectory = argv[1];
  std::vector<std::string> files = getFilesInDirectory(inputDirectory);

  if (files.empty()) {
    std::cerr << "No files found\n";
    return 1;
  }

  std::vector<Frame> frames(files.size());

  std::atomic<size_t> nextIndex{0};
  unsigned int threadCount = std::thread::hardware_concurrency();
  if (threadCount == 0)
    threadCount = 4;

  std::vector<std::thread> workers;
  workers.reserve(threadCount);

  for (unsigned int t = 0; t < threadCount; ++t) {
    std::cout << "Starting thread " << t + 1 << " of " << threadCount << "\n";
    workers.emplace_back([&]() {
      for (;;) {
        size_t i = nextIndex.fetch_add(1, std::memory_order_relaxed);
        if (i >= files.size())
          break;

        int w = 0, h = 0, c = 0;
        unsigned char *data = stbi_load(files[i].c_str(), &w, &h, &c, 4);
        if (!data) {
          std::cerr << "Failed to load " << files[i] << "\n";
          continue;
        }

        Frame f;
        f.pixels.resize(FRAME_SIZE);

        unsigned char *ok = stbir_resize_uint8_linear(
            data, w, h, 0, f.pixels.data(), 64, 64, 0, STBIR_RGBA);

        stbi_image_free(data);

        if (!ok) {
          std::cerr << "Resize failed for " << files[i] << "\n";
          continue;
        }

        frames[i] = std::move(f);
      }
    });
  }

  for (auto &th : workers) {
    th.join();
  }

  writeFramesAsJSON(frames);

  return 0;
}