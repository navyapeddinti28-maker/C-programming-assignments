#include "auth.h"
#include "server.h"
#include "storage.h"
#include <stdio.h>
#include <stdlib.h>

/*
 * CampusFind - Main Entry Point
 * Initializes binary .dat storage, administrator session engine,
 * and starts the C HTTP/1.1 server.
 */
int main(int argc, char *argv[]) {
    int port = 8080;
    const char *envPort = getenv("CAMPUSFIND_PORT");
    if (envPort && envPort[0] != '\0') {
        int p = atoi(envPort);
        if (p > 0 && p <= 65535) port = p;
    }

    const char *envDataDir = getenv("CAMPUSFIND_DATA_DIR");
    if (envDataDir && envDataDir[0] != '\0') {
        storage_set_data_dir(envDataDir);
    } else if (argc > 1 && argv[1][0] != '\0') {
        storage_set_data_dir(argv[1]);
    }

    if (!storage_init()) {
        fprintf(stderr, "Error: Could not initialize CampusFind data directory.\n");
        return 1;
    }

    auth_init();
    return server_start(port);
}
