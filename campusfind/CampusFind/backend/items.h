#ifndef ITEMS_H
#define ITEMS_H

#include "models.h"
#include "json_util.h"

/* Serialize one Item into JSON (includePrivate=1 only for Admin or owner lookup) */
void items_append_json(StrBuf *sb, const Item *item, int includePrivate);

/* Serialize an array of Items into JSON array */
void items_array_to_json(StrBuf *sb, const Item *items, int count, int includePrivate);

/* Validate and create a Lost or Found item from JSON body */
int items_create_from_json(int isFound, const char *jsonBody, Item *outItem, char *errBuf, size_t errSize);

/* Update an existing Lost or Found item (Admin only) */
int items_update_from_json(int isFound, const char *itemId, const char *jsonBody, Item *outItem, char *errBuf, size_t errSize);

/* Compute dashboard summary statistics from binary files */
void items_build_dashboard_stats_json(StrBuf *sb);

/* Build admin analytical report (category counts, recovery rate, recent items) */
void items_build_admin_reports_json(StrBuf *sb);

#endif
