CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -O2
SRCS = main.c server.c storage.c items.c search.c matching.c claims.c auth.c json_util.c

ifeq ($(OS),Windows_NT)
	TARGET = campusfind_server.exe
	LDFLAGS = -lws2_32
else
	TARGET = campusfind_server
	LDFLAGS =
endif

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(CFLAGS) $(SRCS) -o $(TARGET) $(LDFLAGS)

clean:
	rm -f $(TARGET) campusfind_server campusfind_server.exe
