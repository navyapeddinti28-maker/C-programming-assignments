#ifndef SEARCH_H
#define SEARCH_H

#include "models.h"

/*
 * Search, filter, and sort items using 1D arrays and pointer-based comparisons
 * (CSA02 Unit II & Unit III).
 */
int search_filter_items(
    int isFound,
    const char *query,
    const char *category,
    const char *location,
    const char *statusFilter,
    const char *sortOrder,
    Item *outItems,
    int maxOut
);

#endif
