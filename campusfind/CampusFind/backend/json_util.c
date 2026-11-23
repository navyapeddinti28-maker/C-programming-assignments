#include "json_util.h"
#include <ctype.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void safe_strcpy(char *dest, const char *src, size_t destSize) {
    if (!dest || destSize == 0) return;
    if (!src) {
        dest[0] = '\0';
        return;
    }
    size_t i = 0;
    while (i < destSize - 1 && src[i] != '\0') {
        dest[i] = src[i];
        i++;
    }
    dest[i] = '\0';
}

void trim_inplace(char *str) {
    if (!str) return;
    size_t len = strlen(str);
    size_t start = 0;
    while (start < len && isspace((unsigned char)str[start])) {
        start++;
    }
    size_t end = len;
    while (end > start && isspace((unsigned char)str[end - 1])) {
        end--;
    }
    if (start > 0) {
        memmove(str, str + start, end - start);
    }
    str[end - start] = '\0';
}

void str_to_lower(char *dest, const char *src, size_t destSize) {
    if (!dest || destSize == 0) return;
    if (!src) {
        dest[0] = '\0';
        return;
    }
    size_t i = 0;
    while (i < destSize - 1 && src[i] != '\0') {
        dest[i] = (char)tolower((unsigned char)src[i]);
        i++;
    }
    dest[i] = '\0';
}

int str_contains_ci(const char *haystack, const char *needle) {
    if (!haystack || !needle) return 0;
    if (needle[0] == '\0') return 1;
    char hLower[512];
    char nLower[256];
    str_to_lower(hLower, haystack, sizeof(hLower));
    str_to_lower(nLower, needle, sizeof(nLower));
    return strstr(hLower, nLower) != NULL;
}

int str_equals_ci(const char *a, const char *b) {
    if (!a || !b) return 0;
    while (*a && *b) {
        if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) {
            return 0;
        }
        a++;
        b++;
    }
    return *a == '\0' && *b == '\0';
}

void json_escape(const char *input, char *output, size_t outSize) {
    if (!output || outSize == 0) return;
    if (!input) {
        output[0] = '\0';
        return;
    }
    size_t j = 0;
    for (size_t i = 0; input[i] != '\0' && j < outSize - 1; i++) {
        unsigned char c = (unsigned char)input[i];
        const char *esc = NULL;
        switch (c) {
            case '\"': esc = "\\\""; break;
            case '\\': esc = "\\\\"; break;
            case '\b': esc = "\\b"; break;
            case '\f': esc = "\\f"; break;
            case '\n': esc = "\\n"; break;
            case '\r': esc = "\\r"; break;
            case '\t': esc = "\\t"; break;
            default:
                if (c < 0x20) {
                    continue; /* skip unsafe control chars */
                }
                output[j++] = (char)c;
                continue;
        }
        size_t elen = strlen(esc);
        if (j + elen < outSize) {
            memcpy(output + j, esc, elen);
            j += elen;
        } else {
            break;
        }
    }
    output[j] = '\0';
}

void sb_init(StrBuf *sb, size_t initialCap) {
    if (initialCap < 256) initialCap = 256;
    sb->data = (char *)malloc(initialCap);
    sb->len = 0;
    sb->cap = sb->data ? initialCap : 0;
    sb->error = sb->data ? 0 : 1;
    if (sb->data) sb->data[0] = '\0';
}

void sb_free(StrBuf *sb) {
    if (sb && sb->data) {
        free(sb->data);
        sb->data = NULL;
        sb->len = 0;
        sb->cap = 0;
    }
}

static int sb_ensure(StrBuf *sb, size_t extra) {
    if (sb->error) return 0;
    if (sb->len + extra + 1 <= sb->cap) return 1;
    size_t newCap = sb->cap * 2;
    while (newCap < sb->len + extra + 1) {
        newCap *= 2;
    }
    char *newBuf = (char *)realloc(sb->data, newCap);
    if (!newBuf) {
        sb->error = 1;
        return 0;
    }
    sb->data = newBuf;
    sb->cap = newCap;
    return 1;
}

void sb_append(StrBuf *sb, const char *text) {
    if (!text) return;
    size_t tlen = strlen(text);
    if (!sb_ensure(sb, tlen)) return;
    memcpy(sb->data + sb->len, text, tlen);
    sb->len += tlen;
    sb->data[sb->len] = '\0';
}

void sb_appendf(StrBuf *sb, const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    va_list argsCopy;
    va_copy(argsCopy, args);
    int needed = vsnprintf(NULL, 0, fmt, args);
    va_end(args);
    if (needed < 0) {
        va_end(argsCopy);
        return;
    }
    if (!sb_ensure(sb, (size_t)needed)) {
        va_end(argsCopy);
        return;
    }
    vsnprintf(sb->data + sb->len, (size_t)needed + 1, fmt, argsCopy);
    va_end(argsCopy);
    sb->len += (size_t)needed;
}

void sb_append_json_str(StrBuf *sb, const char *key, const char *val, int trailingComma) {
    char escKey[128];
    char escVal[1024];
    json_escape(key, escKey, sizeof(escKey));
    json_escape(val ? val : "", escVal, sizeof(escVal));
    sb_appendf(sb, "\"%s\":\"%s\"%s", escKey, escVal, trailingComma ? "," : "");
}

void sb_append_json_int(StrBuf *sb, const char *key, int val, int trailingComma) {
    char escKey[128];
    json_escape(key, escKey, sizeof(escKey));
    sb_appendf(sb, "\"%s\":%d%s", escKey, val, trailingComma ? "," : "");
}

/*
 * Beginner-friendly, safe JSON key-value parser for flat JSON objects.
 * Walks quotes carefully so escaped quotes inside values do not break parsing.
 */
int json_get_string(const char *json, const char *key, char *outVal, size_t outSize) {
    if (!json || !key || !outVal || outSize == 0) return 0;
    outVal[0] = '\0';

    const char *p = json;
    size_t keyLen = strlen(key);

    while (*p) {
        if (*p == '\"') {
            p++;
            const char *keyStart = p;
            while (*p && !(*p == '\"' && *(p - 1) != '\\')) {
                p++;
            }
            size_t foundLen = (size_t)(p - keyStart);
            if (*p == '\"') p++;

            while (*p && isspace((unsigned char)*p)) p++;
            if (*p == ':') {
                p++;
                while (*p && isspace((unsigned char)*p)) p++;

                if (foundLen == keyLen && strncmp(keyStart, key, keyLen) == 0) {
                    if (*p == '\"') {
                        p++;
                        size_t outIdx = 0;
                        while (*p && *p != '\"') {
                            if (*p == '\\' && *(p + 1) != '\0') {
                                p++;
                                char ch = *p;
                                switch (*p) {
                                    case 'n': ch = '\n'; break;
                                    case 'r': ch = '\r'; break;
                                    case 't': ch = '\t'; break;
                                    case '\"': ch = '\"'; break;
                                    case '\\': ch = '\\'; break;
                                    case '/': ch = '/'; break;
                                    default: ch = *p; break;
                                }
                                if (outIdx < outSize - 1) outVal[outIdx++] = ch;
                            } else {
                                if (outIdx < outSize - 1) outVal[outIdx++] = *p;
                            }
                            p++;
                        }
                        outVal[outIdx] = '\0';
                        return 1;
                    } else if (strncmp(p, "null", 4) == 0) {
                        outVal[0] = '\0';
                        return 0;
                    } else {
                        /* Numeric or boolean literal */
                        size_t outIdx = 0;
                        while (*p && *p != ',' && *p != '}' && !isspace((unsigned char)*p)) {
                            if (outIdx < outSize - 1) outVal[outIdx++] = *p;
                            p++;
                        }
                        outVal[outIdx] = '\0';
                        return outIdx > 0 ? 1 : 0;
                    }
                } else {
                    /* Skip non-matching value */
                    if (*p == '\"') {
                        p++;
                        while (*p) {
                            if (*p == '\\' && *(p + 1) != '\0') {
                                p += 2;
                                continue;
                            }
                            if (*p == '\"') {
                                p++;
                                break;
                            }
                            p++;
                        }
                    }
                }
            }
        } else {
            p++;
        }
    }
    return 0;
}

static int hex_val(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return 10 + (c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (c - 'A');
    return -1;
}

void url_decode(const char *src, char *dest, size_t destSize) {
    if (!dest || destSize == 0) return;
    if (!src) {
        dest[0] = '\0';
        return;
    }
    size_t i = 0, j = 0;
    while (src[i] != '\0' && j < destSize - 1) {
        if (src[i] == '+') {
            dest[j++] = ' ';
            i++;
        } else if (src[i] == '%' && src[i + 1] && src[i + 2]) {
            int h1 = hex_val(src[i + 1]);
            int h2 = hex_val(src[i + 2]);
            if (h1 >= 0 && h2 >= 0) {
                dest[j++] = (char)((h1 << 4) | h2);
                i += 3;
            } else {
                dest[j++] = src[i++];
            }
        } else {
            dest[j++] = src[i++];
        }
    }
    dest[j] = '\0';
}

int query_get_param(const char *query, const char *key, char *outVal, size_t outSize) {
    if (!query || !key || !outVal || outSize == 0) return 0;
    outVal[0] = '\0';
    size_t keyLen = strlen(key);
    const char *p = query;
    while (*p) {
        const char *amp = strchr(p, '&');
        size_t pairLen = amp ? (size_t)(amp - p) : strlen(p);
        const char *eq = memchr(p, '=', pairLen);
        if (eq) {
            size_t klen = (size_t)(eq - p);
            if (klen == keyLen && strncmp(p, key, keyLen) == 0) {
                char encoded[512];
                size_t vlen = pairLen - klen - 1;
                if (vlen >= sizeof(encoded)) vlen = sizeof(encoded) - 1;
                memcpy(encoded, eq + 1, vlen);
                encoded[vlen] = '\0';
                url_decode(encoded, outVal, outSize);
                return 1;
            }
        }
        if (!amp) break;
        p = amp + 1;
    }
    return 0;
}
