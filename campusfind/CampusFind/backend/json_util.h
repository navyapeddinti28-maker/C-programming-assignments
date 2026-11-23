#ifndef JSON_UTIL_H
#define JSON_UTIL_H

#include <stddef.h>

/* Safe bounded string copy */
void safe_strcpy(char *dest, const char *src, size_t destSize);

/* Trim leading/trailing whitespace in-place */
void trim_inplace(char *str);

/* Case-insensitive substring check */
int str_contains_ci(const char *haystack, const char *needle);

/* Case-insensitive equality */
int str_equals_ci(const char *a, const char *b);

/* Lowercase copy helper */
void str_to_lower(char *dest, const char *src, size_t destSize);

/* Escape a string for safe JSON output */
void json_escape(const char *input, char *output, size_t outSize);

/* Append formatted text safely to a growing dynamic/fixed buffer */
typedef struct {
    char *data;
    size_t len;
    size_t cap;
    int error;
} StrBuf;

void sb_init(StrBuf *sb, size_t initialCap);
void sb_free(StrBuf *sb);
void sb_append(StrBuf *sb, const char *text);
void sb_appendf(StrBuf *sb, const char *fmt, ...);
void sb_append_json_str(StrBuf *sb, const char *key, const char *val, int trailingComma);
void sb_append_json_int(StrBuf *sb, const char *key, int val, int trailingComma);

/* Extract a JSON string value by key from a JSON request body */
int json_get_string(const char *json, const char *key, char *outVal, size_t outSize);

/* URL query/param decoding */
void url_decode(const char *src, char *dest, size_t destSize);
int query_get_param(const char *query, const char *key, char *outVal, size_t outSize);

#endif
