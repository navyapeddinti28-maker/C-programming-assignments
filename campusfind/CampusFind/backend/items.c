#include "items.h"
#include "storage.h"
#include <stdio.h>
#include <string.h>

static int is_valid_date(const char *d) {
    if (!d || strlen(d) != 10) return 0;
    for (int i = 0; i < 10; i++) {
        if (i == 4 || i == 7) {
            if (d[i] != '-') return 0;
        } else {
            if (d[i] < '0' || d[i] > '9') return 0;
        }
    }
    return 1;
}

void items_append_json(StrBuf *sb, const Item *item, int includePrivate) {
    char maskedDesc[DESC_LEN];
    safe_strcpy(maskedDesc, item->description, sizeof(maskedDesc));

    /* Privacy safeguard: mask sensitive ID card personal details on public views */
    if (!includePrivate && str_equals_ci(item->category, "ID Cards")) {
        safe_strcpy(maskedDesc, "Sensitive campus ID card record. Specific details are hidden for privacy and verified by CampusFind Admin upon claim.", sizeof(maskedDesc));
    }

    sb_append(sb, "{");
    sb_append_json_str(sb, "itemId", item->itemId, 1);
    sb_append_json_str(sb, "itemName", item->itemName, 1);
    sb_append_json_str(sb, "category", item->category, 1);
    sb_append_json_str(sb, "description", maskedDesc, 1);
    sb_append_json_str(sb, "location", item->location, 1);
    sb_append_json_str(sb, "date", item->date, 1);
    sb_append_json_str(sb, "status", item->status, 1);
    sb_append_json_str(sb, "createdAt", item->createdAt, 1);

    if (includePrivate) {
        sb_append_json_str(sb, "studentName", item->reporter.name, 1);
        sb_append_json_str(sb, "studentId", item->reporter.studentId, 1);
        sb_append_json_str(sb, "department", item->reporter.department, 1);
        sb_append_json_str(sb, "contact", item->reporter.contact, 0);
    } else {
        /* Public listing never exposes personal contact or student ID */
        sb_append_json_str(sb, "department", item->reporter.department[0] ? item->reporter.department : "Campus Community", 1);
        sb_append_json_str(sb, "contact", "Protected (Verify via Claim)", 0);
    }
    sb_append(sb, "}");
}

void items_array_to_json(StrBuf *sb, const Item *items, int count, int includePrivate) {
    sb_append(sb, "[");
    for (int i = 0; i < count; i++) {
        items_append_json(sb, &items[i], includePrivate);
        if (i < count - 1) sb_append(sb, ",");
    }
    sb_append(sb, "]");
}

int items_create_from_json(int isFound, const char *jsonBody, Item *outItem, char *errBuf, size_t errSize) {
    if (!jsonBody || jsonBody[0] == '\0') {
        safe_strcpy(errBuf, "Empty request body.", errSize);
        return 0;
    }

    Item item;
    memset(&item, 0, sizeof(item));
    item.magic = CF_MAGIC;
    item.version = CF_FILE_VERSION;
    item.active = 1;

    json_get_string(jsonBody, "itemName", item.itemName, sizeof(item.itemName));
    json_get_string(jsonBody, "category", item.category, sizeof(item.category));
    json_get_string(jsonBody, "description", item.description, sizeof(item.description));
    json_get_string(jsonBody, "location", item.location, sizeof(item.location));
    json_get_string(jsonBody, "date", item.date, sizeof(item.date));
    json_get_string(jsonBody, "studentName", item.reporter.name, sizeof(item.reporter.name));
    json_get_string(jsonBody, "studentId", item.reporter.studentId, sizeof(item.reporter.studentId));
    json_get_string(jsonBody, "department", item.reporter.department, sizeof(item.reporter.department));
    json_get_string(jsonBody, "contact", item.reporter.contact, sizeof(item.reporter.contact));

    trim_inplace(item.itemName);
    trim_inplace(item.category);
    trim_inplace(item.description);
    trim_inplace(item.location);
    trim_inplace(item.date);
    trim_inplace(item.reporter.name);
    trim_inplace(item.reporter.studentId);
    trim_inplace(item.reporter.department);
    trim_inplace(item.reporter.contact);

    if (strlen(item.itemName) < 2) {
        safe_strcpy(errBuf, "Item name must be at least 2 characters.", errSize);
        return 0;
    }
    if (strlen(item.category) < 2) {
        safe_strcpy(errBuf, "Category is required.", errSize);
        return 0;
    }
    if (strlen(item.description) < 8) {
        safe_strcpy(errBuf, "Description must be at least 8 characters.", errSize);
        return 0;
    }
    if (strlen(item.location) < 2) {
        safe_strcpy(errBuf, "Campus location is required.", errSize);
        return 0;
    }
    if (!is_valid_date(item.date)) {
        safe_strcpy(errBuf, "Date must be in YYYY-MM-DD format.", errSize);
        return 0;
    }
    if (strlen(item.reporter.name) < 2) {
        safe_strcpy(errBuf, isFound ? "Finder name is required." : "Student name is required.", errSize);
        return 0;
    }
    if (strlen(item.reporter.studentId) < 3) {
        safe_strcpy(errBuf, "Student ID is required (minimum 3 characters).", errSize);
        return 0;
    }
    if (strlen(item.reporter.contact) < 5) {
        safe_strcpy(errBuf, "Valid contact information (email or phone) is required.", errSize);
        return 0;
    }
    if (item.reporter.department[0] == '\0') {
        safe_strcpy(item.reporter.department, "General Campus", sizeof(item.reporter.department));
    }

    storage_generate_id(isFound ? "FND" : "LOST", isFound, 0, item.itemId, sizeof(item.itemId));
    safe_strcpy(item.status, isFound ? "Available" : "Active", sizeof(item.status));
    storage_current_timestamp(item.createdAt, sizeof(item.createdAt));

    if (!storage_append_item(isFound, &item)) {
        safe_strcpy(errBuf, "Failed to write item record to binary .dat storage.", errSize);
        return 0;
    }

    *outItem = item;
    return 1;
}

int items_update_from_json(int isFound, const char *itemId, const char *jsonBody, Item *outItem, char *errBuf, size_t errSize) {
    Item existing;
    if (!storage_find_item_by_id(isFound, itemId, &existing)) {
        safe_strcpy(errBuf, "Item record not found.", errSize);
        return 0;
    }

    char buf[DESC_LEN];
    if (json_get_string(jsonBody, "itemName", buf, sizeof(buf)) && buf[0] != '\0') {
        trim_inplace(buf);
        safe_strcpy(existing.itemName, buf, sizeof(existing.itemName));
    }
    if (json_get_string(jsonBody, "category", buf, sizeof(buf)) && buf[0] != '\0') {
        trim_inplace(buf);
        safe_strcpy(existing.category, buf, sizeof(existing.category));
    }
    if (json_get_string(jsonBody, "description", buf, sizeof(buf)) && buf[0] != '\0') {
        trim_inplace(buf);
        safe_strcpy(existing.description, buf, sizeof(existing.description));
    }
    if (json_get_string(jsonBody, "location", buf, sizeof(buf)) && buf[0] != '\0') {
        trim_inplace(buf);
        safe_strcpy(existing.location, buf, sizeof(existing.location));
    }
    if (json_get_string(jsonBody, "date", buf, sizeof(buf)) && is_valid_date(buf)) {
        safe_strcpy(existing.date, buf, sizeof(existing.date));
    }
    if (json_get_string(jsonBody, "status", buf, sizeof(buf)) && buf[0] != '\0') {
        trim_inplace(buf);
        safe_strcpy(existing.status, buf, sizeof(existing.status));
    }

    if (!storage_update_item(isFound, itemId, &existing)) {
        safe_strcpy(errBuf, "Failed to update record in .dat file.", errSize);
        return 0;
    }
    if (outItem) *outItem = existing;
    return 1;
}

void items_build_dashboard_stats_json(StrBuf *sb) {
    Item lost[MAX_ITEMS], found[MAX_ITEMS];
    Claim claims[MAX_CLAIMS];

    int lostCount = storage_load_items(0, lost, MAX_ITEMS);
    int foundCount = storage_load_items(1, found, MAX_ITEMS);
    int claimCount = storage_load_claims(claims, MAX_CLAIMS);

    int activeLost = 0, resolvedLost = 0;
    for (int i = 0; i < lostCount; i++) {
        if (str_equals_ci(lost[i].status, "Resolved")) resolvedLost++;
        else activeLost++;
    }

    int availableFound = 0, returnedItems = 0, claimedFound = 0;
    for (int i = 0; i < foundCount; i++) {
        if (str_equals_ci(found[i].status, "Returned")) returnedItems++;
        else if (str_equals_ci(found[i].status, "Claimed")) claimedFound++;
        else availableFound++;
    }

    int pendingClaims = 0, approvedClaims = 0, rejectedClaims = 0, completedClaims = 0;
    for (int i = 0; i < claimCount; i++) {
        if (str_equals_ci(claims[i].claimStatus, "Pending")) pendingClaims++;
        else if (str_equals_ci(claims[i].claimStatus, "Approved")) approvedClaims++;
        else if (str_equals_ci(claims[i].claimStatus, "Rejected")) rejectedClaims++;
        else if (str_equals_ci(claims[i].claimStatus, "Completed")) completedClaims++;
    }

    sb_append(sb, "{");
    sb_append_json_int(sb, "totalLost", lostCount, 1);
    sb_append_json_int(sb, "totalFound", foundCount, 1);
    sb_append_json_int(sb, "itemsReturned", returnedItems, 1);
    sb_append_json_int(sb, "pendingClaims", pendingClaims, 1);
    sb_append_json_int(sb, "activeLost", activeLost, 1);
    sb_append_json_int(sb, "resolvedLost", resolvedLost, 1);
    sb_append_json_int(sb, "availableFound", availableFound, 1);
    sb_append_json_int(sb, "claimedFound", claimedFound, 1);
    sb_append_json_int(sb, "approvedClaims", approvedClaims, 1);
    sb_append_json_int(sb, "rejectedClaims", rejectedClaims, 1);
    sb_append_json_int(sb, "completedClaims", completedClaims, 0);
    sb_append(sb, "}");
}

void items_build_admin_reports_json(StrBuf *sb) {
    const char *categories[8] = {
        "Electronics", "ID Cards", "Books and Notes", "Bags",
        "Accessories", "Water Bottles", "Keys", "Other"
    };

    Item lost[MAX_ITEMS], found[MAX_ITEMS];
    Claim claims[MAX_CLAIMS];
    int lostCount = storage_load_items(0, lost, MAX_ITEMS);
    int foundCount = storage_load_items(1, found, MAX_ITEMS);
    int claimCount = storage_load_claims(claims, MAX_CLAIMS);

    int returnedCount = 0;
    for (int i = 0; i < foundCount; i++) {
        if (str_equals_ci(found[i].status, "Returned")) returnedCount++;
    }

    int recoveryPercent = (foundCount > 0) ? (returnedCount * 100) / foundCount : 0;

    sb_append(sb, "{");
    sb_append_json_int(sb, "totalLost", lostCount, 1);
    sb_append_json_int(sb, "totalFound", foundCount, 1);
    sb_append_json_int(sb, "totalClaims", claimCount, 1);
    sb_append_json_int(sb, "returnedCount", returnedCount, 1);
    sb_append_json_int(sb, "recoveryRatePercent", recoveryPercent, 1);

    sb_append(sb, "\"categoryBreakdown\":[");
    for (int c = 0; c < 8; c++) {
        int lCat = 0, fCat = 0;
        for (int i = 0; i < lostCount; i++) {
            if (str_equals_ci(lost[i].category, categories[c])) lCat++;
        }
        for (int i = 0; i < foundCount; i++) {
            if (str_equals_ci(found[i].category, categories[c])) fCat++;
        }
        sb_append(sb, "{");
        sb_append_json_str(sb, "category", categories[c], 1);
        sb_append_json_int(sb, "lostCount", lCat, 1);
        sb_append_json_int(sb, "foundCount", fCat, 0);
        sb_append(sb, "}");
        if (c < 7) sb_append(sb, ",");
    }
    sb_append(sb, "],");

    /* Recent activity feed constructed from newest stored records */
    sb_append(sb, "\"recentActivity\":[");
    int first = 1;
    int maxShow = 4;
    for (int i = foundCount - 1; i >= 0 && i >= foundCount - maxShow; i--) {
        if (!first) sb_append(sb, ",");
        first = 0;
        sb_append(sb, "{");
        sb_append_json_str(sb, "type", "Found Item", 1);
        sb_append_json_str(sb, "id", found[i].itemId, 1);
        sb_append_json_str(sb, "title", found[i].itemName, 1);
        sb_append_json_str(sb, "status", found[i].status, 1);
        sb_append_json_str(sb, "timestamp", found[i].createdAt, 0);
        sb_append(sb, "}");
    }
    for (int i = lostCount - 1; i >= 0 && i >= lostCount - maxShow; i--) {
        if (!first) sb_append(sb, ",");
        first = 0;
        sb_append(sb, "{");
        sb_append_json_str(sb, "type", "Lost Report", 1);
        sb_append_json_str(sb, "id", lost[i].itemId, 1);
        sb_append_json_str(sb, "title", lost[i].itemName, 1);
        sb_append_json_str(sb, "status", lost[i].status, 1);
        sb_append_json_str(sb, "timestamp", lost[i].createdAt, 0);
        sb_append(sb, "}");
    }
    for (int i = claimCount - 1; i >= 0 && i >= claimCount - maxShow; i--) {
        if (!first) sb_append(sb, ",");
        first = 0;
        sb_append(sb, "{");
        sb_append_json_str(sb, "type", "Recovery Claim", 1);
        sb_append_json_str(sb, "id", claims[i].claimId, 1);
        sb_append_json_str(sb, "title", claims[i].itemName, 1);
        sb_append_json_str(sb, "status", claims[i].claimStatus, 1);
        sb_append_json_str(sb, "timestamp", claims[i].createdAt, 0);
        sb_append(sb, "}");
    }
    sb_append(sb, "]");
    sb_append(sb, "}");
}
