CXX := clang++
CXXFLAGS := -std=c++20 -Wall -Wextra -O2

INCLUDES := -Ilib

SRC := main.cpp
OBJ := $(SRC:.cpp=.o)
BIN := bin/image2pixels

all: $(BIN)

$(BIN): $(OBJ)
	$(CXX) $(OBJ) -o $@

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -f $(OBJ)

run: all
	./$(BIN)