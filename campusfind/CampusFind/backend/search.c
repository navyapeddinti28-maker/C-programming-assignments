#include "search.h"
#include "storage.h"
#include "json_util.h"
#include <string.h>

static void sort_items_by_date(Item *arr, int count, int newestFirst) {
    for (int i = 0; i < count - 1; i++) {
        for (int j = 0; j < count - i - 1; j++) {
            int cmp = strcmp(arr[j].date, arr[j + 1].date);
            int shouldSwap = newestFirst ? (cmp < 0) : (cmp > 0);
            if (shouldSwap) {
                Item temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int search_filter_items(
    int isFound,
    const char *query,
    const char *category,
    const char *location,
    const char *statusFilter,
    const char *sortOrder,
    Item *outItems,
    int maxOut
) {
    Item all[MAX_ITEMS];
    int total = storage_load_items(isFound, all, MAX_ITEMS);
    int matched = 0;

    for (int i = 0; i < total && matched < maxOut; i++) {
        const Item *it = &all[i];

        if (category && category[0] != '\0' && !str_equals_ci(category, "All")) {
            if (!str_equals_ci(it->category, category)) continue;
        }
        if (location && location[0] != '\0' && !str_equals_ci(location, "All")) {
            if (!str_contains_ci(it->location, location)) continue;
        }
        if (statusFilter && statusFilter[0] != '\0' && !str_equals_ci(statusFilter, "All")) {
            if (!str_equals_ci(it->status, statusFilter)) continue;
        }
        if (query && query[0] != '\0') {
            int hit = str_contains_ci(it->itemName, query) ||
                      str_contains_ci(it->description, query) ||
                      str_contains_ci(it->location, query) ||
                      str_contains_ci(it->itemId, query);
            if (!hit) continue;
        }

        outItems[matched++] = *it;
    }

    int newestFirst = (!sortOrder || !str_equals_ci(sortOrder, "oldest"));
    sort_items_by_date(outItems, matched, newestFirst);
    return matched;
}
