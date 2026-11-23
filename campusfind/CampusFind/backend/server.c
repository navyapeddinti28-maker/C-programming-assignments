#include "server.h"
#include "auth.h"
#include "claims.h"
#include "items.h"
#include "json_util.h"
#include "matching.h"
#include "models.h"
#include "search.h"
#include "storage.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
  #ifndef WIN32_LEAN_AND_MEAN
  #define WIN32_LEAN_AND_MEAN
  #endif
  #include <winsock2.h>
  #include <ws2tcpip.h>
  typedef SOCKET sock_t;
  #define CLOSE_SOCK(s) closesocket(s)
  #define INVALID_SOCK INVALID_SOCKET
#else
  #include <arpa/inet.h>
  #include <netinet/in.h>
  #include <sys/socket.h>
  #include <unistd.h>
  typedef int sock_t;
  #define CLOSE_SOCK(s) close(s)
  #define INVALID_SOCK (-1)
#endif

#define MAX_REQ_SIZE 32768

static const char *status_text(int code) {
    switch (code) {
        case 200: return "OK";
        case 201: return "Created";
        case 400: return "Bad Request";
        case 401: return "Unauthorized";
        case 403: return "Forbidden";
        case 404: return "Not Found";
        case 405: return "Method Not Allowed";
        case 409: return "Conflict";
        case 413: return "Payload Too Large";
        default: return "Internal Server Error";
    }
}

static void send_json_response(sock_t client, int statusCode, const char *jsonBody) {
    if (!jsonBody) jsonBody = "{}";
    size_t bodyLen = strlen(jsonBody);

    char header[512];
    int hlen = snprintf(
        header, sizeof(header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: application/json; charset=utf-8\r\n"
        "Content-Length: %zu\r\n"
        "Cache-Control: no-store\r\n"
        "X-Content-Type-Options: nosniff\r\n"
        "Connection: close\r\n\r\n",
        statusCode, status_text(statusCode), bodyLen
    );

    send(client, header, (int)hlen, 0);
    size_t sent = 0;
    while (sent < bodyLen) {
        int n = send(client, jsonBody + sent, (int)(bodyLen - sent), 0);
        if (n <= 0) break;
        sent += (size_t)n;
    }
}

static void send_error(sock_t client, int code, const char *msg) {
    StrBuf sb;
    sb_init(&sb, 256);
    sb_append(&sb, "{");
    sb_append_json_str(&sb, "error", msg, 0);
    sb_append(&sb, "}");
    send_json_response(client, code, sb.data);
    sb_free(&sb);
}

static void extract_header_value(const char *headers, const char *headerName, char *outVal, size_t outSize) {
    outVal[0] = '\0';
    size_t nameLen = strlen(headerName);
    const char *line = headers;
    while (line && *line) {
        const char *eol = strstr(line, "\r\n");
        size_t lineLen = eol ? (size_t)(eol - line) : strlen(line);
        if (lineLen == 0) break;

        if (lineLen > nameLen + 1 && line[nameLen] == ':') {
            int match = 1;
            for (size_t i = 0; i < nameLen; i++) {
                if (tolower((unsigned char)line[i]) != tolower((unsigned char)headerName[i])) {
                    match = 0;
                    break;
                }
            }
            if (match) {
                const char *valStart = line + nameLen + 1;
                while (*valStart == ' ' || *valStart == '\t') valStart++;
                size_t valLen = (size_t)(line + lineLen - valStart);
                if (valLen >= outSize) valLen = outSize - 1;
                memcpy(outVal, valStart, valLen);
                outVal[valLen] = '\0';
                trim_inplace(outVal);
                return;
            }
        }
        if (!eol) break;
        line = eol + 2;
    }
}

static void handle_request(sock_t client, const char *method, const char *path, const char *query, const char *headers, const char *body) {
    char authHeader[256];
    char adminUser[64];
    extract_header_value(headers, "Authorization", authHeader, sizeof(authHeader));
    int isAdmin = auth_verify_bearer(authHeader, adminUser, sizeof(adminUser));

    /* 1. Health check */
    if (strcmp(method, "GET") == 0 && strcmp(path, "/api/health") == 0) {
        send_json_response(client, 200, "{\"status\":\"ok\",\"backend\":\"CampusFind C HTTP Server\"}");
        return;
    }

    /* 2. Dashboard statistics */
    if (strcmp(method, "GET") == 0 && strcmp(path, "/api/dashboard/stats") == 0) {
        StrBuf sb;
        sb_init(&sb, 512);
        items_build_dashboard_stats_json(&sb);
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    /* 3. Admin auth endpoints */
    if (strcmp(method, "GET") == 0 && strcmp(path, "/api/admin/status") == 0) {
        StrBuf sb;
        sb_init(&sb, 256);
        sb_append(&sb, "{");
        sb_append(&sb, "\"configured\":");
        sb_append(&sb, auth_is_configured() ? "true," : "false,");
        sb_append(&sb, "\"authenticated\":");
        sb_append(&sb, isAdmin ? "true," : "false,");
        sb_append_json_str(&sb, "username", isAdmin ? adminUser : "", 0);
        sb_append(&sb, "}");
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    if (strcmp(method, "POST") == 0 && strcmp(path, "/api/admin/setup") == 0) {
        char username[64], password[128], err[160];
        json_get_string(body, "username", username, sizeof(username));
        json_get_string(body, "password", password, sizeof(password));
        trim_inplace(username);
        if (!auth_setup_initial_admin(username, password, err, sizeof(err))) {
            send_error(client, auth_is_configured() ? 403 : 400, err);
            return;
        }
        char token[65], loggedUser[64];
        if (auth_login(username, password, token, sizeof(token), loggedUser, sizeof(loggedUser))) {
            StrBuf sb;
            sb_init(&sb, 256);
            sb_append(&sb, "{");
            sb_append_json_str(&sb, "message", "Admin account initialized and stored in admin.dat.", 1);
            sb_append_json_str(&sb, "token", token, 1);
            sb_append_json_str(&sb, "username", loggedUser, 0);
            sb_append(&sb, "}");
            send_json_response(client, 201, sb.data);
            sb_free(&sb);
        } else {
            send_error(client, 500, "Admin created but login failed.");
        }
        return;
    }

    if (strcmp(method, "POST") == 0 && strcmp(path, "/api/admin/login") == 0) {
        if (!auth_is_configured()) {
            send_error(client, 400, "Admin account has not been configured yet. Complete first-run setup.");
            return;
        }
        char username[64], password[128], token[65], loggedUser[64];
        json_get_string(body, "username", username, sizeof(username));
        json_get_string(body, "password", password, sizeof(password));
        trim_inplace(username);
        if (!auth_login(username, password, token, sizeof(token), loggedUser, sizeof(loggedUser))) {
            send_error(client, 401, "Invalid administrator credentials.");
            return;
        }
        StrBuf sb;
        sb_init(&sb, 256);
        sb_append(&sb, "{");
        sb_append_json_str(&sb, "token", token, 1);
        sb_append_json_str(&sb, "username", loggedUser, 0);
        sb_append(&sb, "}");
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    if (strcmp(method, "POST") == 0 && strcmp(path, "/api/admin/logout") == 0) {
        auth_logout(authHeader);
        send_json_response(client, 200, "{\"message\":\"Logged out successfully.\"}");
        return;
    }

    if (strcmp(method, "GET") == 0 && strcmp(path, "/api/admin/reports") == 0) {
        if (!isAdmin) {
            send_error(client, 401, "Administrator authentication required.");
            return;
        }
        StrBuf sb;
        sb_init(&sb, 2048);
        items_build_admin_reports_json(&sb);
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    /* 4. Lost items endpoints */
    if (strcmp(method, "GET") == 0 && strcmp(path, "/api/lost/mine") == 0) {
        char studentId[ID_LEN];
        query_get_param(query, "studentId", studentId, sizeof(studentId));
        trim_inplace(studentId);
        if (strlen(studentId) < 2) {
            send_error(client, 400, "Please provide a valid Student ID.");
            return;
        }
        Item all[MAX_ITEMS], mine[MAX_ITEMS];
        int total = storage_load_items(0, all, MAX_ITEMS);
        int count = 0;
        for (int i = total - 1; i >= 0; i--) {
            if (str_equals_ci(all[i].reporter.studentId, studentId)) {
                mine[count++] = all[i];
            }
        }
        StrBuf sb;
        sb_init(&sb, 2048);
        items_array_to_json(&sb, mine, count, 1);
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    if (strcmp(path, "/api/lost") == 0) {
        if (strcmp(method, "GET") == 0) {
            Item items[MAX_ITEMS];
            int count = search_filter_items(0, "", "", "", "", "newest", items, MAX_ITEMS);
            StrBuf sb;
            sb_init(&sb, 4096);
            items_array_to_json(&sb, items, count, isAdmin);
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "POST") == 0) {
            Item created;
            char err[160];
            if (!items_create_from_json(0, body, &created, err, sizeof(err))) {
                send_error(client, 400, err);
                return;
            }
            MatchResult matches[MAX_MATCHES];
            int matchCount = matching_find_for_lost(&created, matches, 5);

            StrBuf sb;
            sb_init(&sb, 2048);
            sb_append(&sb, "{\"item\":");
            items_append_json(&sb, &created, 1);
            sb_append(&sb, ",\"matches\":");
            matching_results_to_json(&sb, matches, matchCount, 0);
            sb_append(&sb, "}");
            send_json_response(client, 201, sb.data);
            sb_free(&sb);
            return;
        }
    }

    if (strncmp(path, "/api/lost/", 10) == 0) {
        const char *id = path + 10;
        if (strcmp(method, "GET") == 0) {
            Item it;
            if (!storage_find_item_by_id(0, id, &it)) {
                send_error(client, 404, "Lost item not found.");
                return;
            }
            StrBuf sb;
            sb_init(&sb, 1024);
            items_append_json(&sb, &it, isAdmin);
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "PUT") == 0) {
            if (!isAdmin) {
                send_error(client, 401, "Administrator authorization required to update records.");
                return;
            }
            Item updated;
            char err[160];
            if (!items_update_from_json(0, id, body, &updated, err, sizeof(err))) {
                send_error(client, 404, err);
                return;
            }
            StrBuf sb;
            sb_init(&sb, 1024);
            items_append_json(&sb, &updated, 1);
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "DELETE") == 0) {
            if (!isAdmin) {
                send_error(client, 401, "Administrator authorization required to delete records.");
                return;
            }
            if (!storage_delete_item(0, id)) {
                send_error(client, 404, "Lost item not found.");
                return;
            }
            send_json_response(client, 200, "{\"message\":\"Lost item record deleted from lost.dat.\"}");
            return;
        }
    }

    /* 5. Found items endpoints */
    if (strcmp(path, "/api/found") == 0) {
        if (strcmp(method, "GET") == 0) {
            Item items[MAX_ITEMS];
            int count = search_filter_items(1, "", "", "", "", "newest", items, MAX_ITEMS);
            StrBuf sb;
            sb_init(&sb, 4096);
            items_array_to_json(&sb, items, count, isAdmin);
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "POST") == 0) {
            Item created;
            char err[160];
            if (!items_create_from_json(1, body, &created, err, sizeof(err))) {
                send_error(client, 400, err);
                return;
            }
            MatchResult matches[MAX_MATCHES];
            int matchCount = matching_find_for_found(&created, matches, 5);

            StrBuf sb;
            sb_init(&sb, 2048);
            sb_append(&sb, "{\"item\":");
            items_append_json(&sb, &created, 1);
            sb_append(&sb, ",\"possibleLostMatches\":");
            matching_results_to_json(&sb, matches, matchCount, 0);
            sb_append(&sb, "}");
            send_json_response(client, 201, sb.data);
            sb_free(&sb);
            return;
        }
    }

    if (strncmp(path, "/api/found/", 11) == 0) {
        const char *id = path + 11;
        if (strcmp(method, "GET") == 0) {
            Item it;
            if (!storage_find_item_by_id(1, id, &it)) {
                send_error(client, 404, "Found item not found.");
                return;
            }
            MatchResult lostMatches[MAX_MATCHES];
            int lmCount = matching_find_for_found(&it, lostMatches, 5);

            StrBuf sb;
            sb_init(&sb, 2048);
            sb_append(&sb, "{\"item\":");
            items_append_json(&sb, &it, isAdmin);
            sb_append(&sb, ",\"possibleLostMatches\":");
            matching_results_to_json(&sb, lostMatches, lmCount, isAdmin);
            sb_append(&sb, "}");
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "PUT") == 0) {
            if (!isAdmin) {
                send_error(client, 401, "Administrator authorization required to update records.");
                return;
            }
            Item updated;
            char err[160];
            if (!items_update_from_json(1, id, body, &updated, err, sizeof(err))) {
                send_error(client, 404, err);
                return;
            }
            StrBuf sb;
            sb_init(&sb, 1024);
            items_append_json(&sb, &updated, 1);
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "DELETE") == 0) {
            if (!isAdmin) {
                send_error(client, 401, "Administrator authorization required to delete records.");
                return;
            }
            if (!storage_delete_item(1, id)) {
                send_error(client, 404, "Found item not found.");
                return;
            }
            send_json_response(client, 200, "{\"message\":\"Found item record deleted from found.dat.\"}");
            return;
        }
    }

    /* 6. Search & Matching */
    if (strcmp(method, "GET") == 0 && strcmp(path, "/api/search") == 0) {
        char q[128], cat[40], loc[96], status[24], sort[16], type[16];
        query_get_param(query, "q", q, sizeof(q));
        query_get_param(query, "category", cat, sizeof(cat));
        query_get_param(query, "location", loc, sizeof(loc));
        query_get_param(query, "status", status, sizeof(status));
        query_get_param(query, "sort", sort, sizeof(sort));
        query_get_param(query, "type", type, sizeof(type));

        int isFound = str_equals_ci(type, "lost") ? 0 : 1;
        Item items[MAX_ITEMS];
        int count = search_filter_items(isFound, q, cat, loc, status, sort, items, MAX_ITEMS);
        StrBuf sb;
        sb_init(&sb, 4096);
        items_array_to_json(&sb, items, count, isAdmin);
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    if (strcmp(method, "GET") == 0 && strncmp(path, "/api/matches/", 13) == 0) {
        const char *lostId = path + 13;
        Item lostItem;
        if (!storage_find_item_by_id(0, lostId, &lostItem)) {
            send_error(client, 404, "Lost report ID not found.");
            return;
        }
        MatchResult matches[MAX_MATCHES];
        int matchCount = matching_find_for_lost(&lostItem, matches, MAX_MATCHES);
        StrBuf sb;
        sb_init(&sb, 4096);
        sb_append(&sb, "{\"lostItem\":");
        items_append_json(&sb, &lostItem, isAdmin);
        sb_append(&sb, ",\"matches\":");
        matching_results_to_json(&sb, matches, matchCount, isAdmin);
        sb_append(&sb, "}");
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    /* 7. Claims */
    if (strcmp(path, "/api/claims") == 0) {
        if (strcmp(method, "GET") == 0) {
            char studentId[ID_LEN], statusFilter[24];
            query_get_param(query, "studentId", studentId, sizeof(studentId));
            query_get_param(query, "status", statusFilter, sizeof(statusFilter));
            trim_inplace(studentId);
            trim_inplace(statusFilter);

            if (!isAdmin && strlen(studentId) < 2) {
                send_error(client, 400, "Provide your Student ID to track claims, or sign in as Administrator.");
                return;
            }

            Claim all[MAX_CLAIMS], filtered[MAX_CLAIMS];
            int total = storage_load_claims(all, MAX_CLAIMS);
            int count = 0;
            for (int i = total - 1; i >= 0; i--) {
                if (!isAdmin && !str_equals_ci(all[i].studentId, studentId)) continue;
                if (isAdmin && studentId[0] != '\0' && !str_equals_ci(all[i].studentId, studentId)) continue;
                if (statusFilter[0] != '\0' && !str_equals_ci(statusFilter, "All") && !str_equals_ci(all[i].claimStatus, statusFilter)) continue;
                filtered[count++] = all[i];
            }

            StrBuf sb;
            sb_init(&sb, 4096);
            claims_array_to_json(&sb, filtered, count, 1);
            send_json_response(client, 200, sb.data);
            sb_free(&sb);
            return;
        }
        if (strcmp(method, "POST") == 0) {
            Claim created;
            char err[160];
            int httpCode = 400;
            if (!claims_create_from_json(body, &created, err, sizeof(err), &httpCode)) {
                send_error(client, httpCode, err);
                return;
            }
            StrBuf sb;
            sb_init(&sb, 1024);
            claims_append_json(&sb, &created, 1);
            send_json_response(client, 201, sb.data);
            sb_free(&sb);
            return;
        }
    }

    if (strncmp(path, "/api/claims/", 12) == 0 && strcmp(method, "PUT") == 0) {
        if (!isAdmin) {
            send_error(client, 401, "Only an authorized Administrator can approve, reject, or complete claims.");
            return;
        }
        const char *claimId = path + 12;
        Claim updated;
        char err[160];
        if (!claims_update_status(claimId, body, &updated, err, sizeof(err))) {
            send_error(client, 400, err);
            return;
        }
        StrBuf sb;
        sb_init(&sb, 1024);
        claims_append_json(&sb, &updated, 1);
        send_json_response(client, 200, sb.data);
        sb_free(&sb);
        return;
    }

    send_error(client, 404, "Endpoint not found.");
}

static void process_client(sock_t client) {
    char *req = (char *)malloc(MAX_REQ_SIZE + 1);
    if (!req) {
        CLOSE_SOCK(client);
        return;
    }

    int totalRead = 0;
    char *headerEnd = NULL;
    int contentLength = 0;

    while (totalRead < MAX_REQ_SIZE) {
        int n = recv(client, req + totalRead, MAX_REQ_SIZE - totalRead, 0);
        if (n <= 0) break;
        totalRead += n;
        req[totalRead] = '\0';

        if (!headerEnd) {
            headerEnd = strstr(req, "\r\n\r\n");
            if (headerEnd) {
                char clBuf[32];
                extract_header_value(req, "Content-Length", clBuf, sizeof(clBuf));
                contentLength = clBuf[0] ? atoi(clBuf) : 0;
                if (contentLength < 0) contentLength = 0;
                if (contentLength > MAX_REQ_SIZE - (int)(headerEnd + 4 - req)) {
                    send_error(client, 413, "Request payload too large.");
                    free(req);
                    CLOSE_SOCK(client);
                    return;
                }
            }
        }
        if (headerEnd) {
            int bodyHave = totalRead - (int)(headerEnd + 4 - req);
            if (bodyHave >= contentLength) break;
        }
    }

    if (totalRead <= 0 || !headerEnd) {
        free(req);
        CLOSE_SOCK(client);
        return;
    }

    /* Parse request line: METHOD /path?query HTTP/1.1 */
    char *lineEnd = strstr(req, "\r\n");
    if (!lineEnd) {
        send_error(client, 400, "Malformed HTTP request line.");
        free(req);
        CLOSE_SOCK(client);
        return;
    }
    *lineEnd = '\0';

    char method[16] = {0};
    char rawTarget[512] = {0};
    if (sscanf(req, "%15s %511s", method, rawTarget) != 2) {
        send_error(client, 400, "Malformed HTTP request.");
        free(req);
        CLOSE_SOCK(client);
        return;
    }

    char path[256] = {0};
    char query[256] = {0};
    char *qmark = strchr(rawTarget, '?');
    if (qmark) {
        *qmark = '\0';
        safe_strcpy(path, rawTarget, sizeof(path));
        safe_strcpy(query, qmark + 1, sizeof(query));
    } else {
        safe_strcpy(path, rawTarget, sizeof(path));
    }

    const char *headers = lineEnd + 2;
    const char *body = headerEnd + 4;
    handle_request(client, method, path, query, headers, body);

    free(req);
    CLOSE_SOCK(client);
}

int server_start(int port) {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        fprintf(stderr, "WSAStartup failed.\n");
        return 1;
    }
#endif

    sock_t serverSock = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSock == INVALID_SOCK) {
        fprintf(stderr, "Failed to create server socket.\n");
        return 1;
    }

    int opt = 1;
    setsockopt(serverSock, SOL_SOCKET, SO_REUSEADDR, (const char *)&opt, sizeof(opt));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons((unsigned short)port);

    if (bind(serverSock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        fprintf(stderr, "Failed to bind port %d.\n", port);
        CLOSE_SOCK(serverSock);
        return 1;
    }

    if (listen(serverSock, 32) < 0) {
        fprintf(stderr, "Listen failed.\n");
        CLOSE_SOCK(serverSock);
        return 1;
    }

    printf("CampusFind C Backend listening on http://127.0.0.1:%d\n", port);
    printf("Binary storage directory: %s\n", storage_get_data_dir());
    fflush(stdout);

    while (1) {
        struct sockaddr_in clientAddr;
        socklen_t clientLen = sizeof(clientAddr);
        sock_t client = accept(serverSock, (struct sockaddr *)&clientAddr, &clientLen);
        if (client == INVALID_SOCK) continue;
        process_client(client);
    }

    CLOSE_SOCK(serverSock);
#ifdef _WIN32
    WSACleanup();
#endif
    return 0;
}
