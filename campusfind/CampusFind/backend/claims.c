#include "claims.h"
#include "storage.h"
#include <string.h>

void claims_append_json(StrBuf *sb, const Claim *c, int includePrivate) {
    sb_append(sb, "{");
    sb_append_json_str(sb, "claimId", c->claimId, 1);
    sb_append_json_str(sb, "itemId", c->itemId, 1);
    sb_append_json_str(sb, "itemName", c->itemName, 1);
    sb_append_json_str(sb, "studentId", c->studentId, 1);
    sb_append_json_str(sb, "studentName", c->studentName, 1);
    sb_append_json_str(sb, "department", c->department, 1);
    if (includePrivate) {
        sb_append_json_str(sb, "contact", c->contact, 1);
        sb_append_json_str(sb, "ownershipProof", c->ownershipProof, 1);
    } else {
        sb_append_json_str(sb, "contact", "Protected", 1);
        sb_append_json_str(sb, "ownershipProof", c->ownershipProof, 1);
    }
    sb_append_json_str(sb, "claimStatus", c->claimStatus, 1);
    sb_append_json_str(sb, "adminNotes", c->adminNotes, 1);
    sb_append_json_str(sb, "createdAt", c->createdAt, 0);
    sb_append(sb, "}");
}

void claims_array_to_json(StrBuf *sb, const Claim *claims, int count, int includePrivate) {
    sb_append(sb, "[");
    for (int i = 0; i < count; i++) {
        claims_append_json(sb, &claims[i], includePrivate);
        if (i < count - 1) sb_append(sb, ",");
    }
    sb_append(sb, "]");
}

int claims_create_from_json(const char *jsonBody, Claim *outClaim, char *errBuf, size_t errSize, int *outHttpCode) {
    *outHttpCode = 400;
    if (!jsonBody || jsonBody[0] == '\0') {
        safe_strcpy(errBuf, "Empty claim request body.", errSize);
        return 0;
    }

    Claim clm;
    memset(&clm, 0, sizeof(clm));
    clm.magic = CF_MAGIC;
    clm.version = CF_FILE_VERSION;
    clm.active = 1;

    json_get_string(jsonBody, "itemId", clm.itemId, sizeof(clm.itemId));
    json_get_string(jsonBody, "studentId", clm.studentId, sizeof(clm.studentId));
    json_get_string(jsonBody, "studentName", clm.studentName, sizeof(clm.studentName));
    json_get_string(jsonBody, "department", clm.department, sizeof(clm.department));
    json_get_string(jsonBody, "contact", clm.contact, sizeof(clm.contact));
    json_get_string(jsonBody, "ownershipProof", clm.ownershipProof, sizeof(clm.ownershipProof));

    trim_inplace(clm.itemId);
    trim_inplace(clm.studentId);
    trim_inplace(clm.studentName);
    trim_inplace(clm.department);
    trim_inplace(clm.contact);
    trim_inplace(clm.ownershipProof);

    if (strlen(clm.itemId) < 4) {
        safe_strcpy(errBuf, "Valid Found Item ID is required (e.g., FND-1001).", errSize);
        return 0;
    }
    if (strlen(clm.studentId) < 3) {
        safe_strcpy(errBuf, "Student ID is required.", errSize);
        return 0;
    }
    if (strlen(clm.studentName) < 2) {
        safe_strcpy(errBuf, "Student name is required.", errSize);
        return 0;
    }
    if (strlen(clm.contact) < 5) {
        safe_strcpy(errBuf, "Valid contact information is required.", errSize);
        return 0;
    }
    if (strlen(clm.ownershipProof) < 10) {
        safe_strcpy(errBuf, "Please provide specific ownership proof (at least 10 characters).", errSize);
        return 0;
    }
    if (clm.department[0] == '\0') {
        safe_strcpy(clm.department, "General Campus", sizeof(clm.department));
    }

    /* Verify found item exists and has not already been returned */
    Item foundItem;
    if (!storage_find_item_by_id(1, clm.itemId, &foundItem)) {
        *outHttpCode = 404;
        safe_strcpy(errBuf, "Found item ID not found. Please check the item ID.", errSize);
        return 0;
    }
    if (str_equals_ci(foundItem.status, "Returned")) {
        *outHttpCode = 409;
        safe_strcpy(errBuf, "This item has already been marked as Returned.", errSize);
        return 0;
    }

    /* Prevent duplicate active claims from the same student for the same item */
    Claim existing[MAX_CLAIMS];
    int total = storage_load_claims(existing, MAX_CLAIMS);
    for (int i = 0; i < total; i++) {
        if (str_equals_ci(existing[i].itemId, clm.itemId) &&
            str_equals_ci(existing[i].studentId, clm.studentId) &&
            (str_equals_ci(existing[i].claimStatus, "Pending") ||
             str_equals_ci(existing[i].claimStatus, "Approved"))) {
            *outHttpCode = 409;
            safe_strcpy(errBuf, "You already have an active claim for this item.", errSize);
            return 0;
        }
    }

    storage_generate_id("CLM", 0, 1, clm.claimId, sizeof(clm.claimId));
    safe_strcpy(clm.itemName, foundItem.itemName, sizeof(clm.itemName));
    safe_strcpy(clm.claimStatus, "Pending", sizeof(clm.claimStatus));
    safe_strcpy(clm.adminNotes, "Awaiting CampusFind Administrator verification.", sizeof(clm.adminNotes));
    storage_current_timestamp(clm.createdAt, sizeof(clm.createdAt));

    if (!storage_append_claim(&clm)) {
        *outHttpCode = 500;
        safe_strcpy(errBuf, "Failed to save claim to claims.dat.", errSize);
        return 0;
    }

    *outHttpCode = 201;
    *outClaim = clm;
    return 1;
}

int claims_update_status(const char *claimId, const char *jsonBody, Claim *outClaim, char *errBuf, size_t errSize) {
    Claim existing;
    if (!storage_find_claim_by_id(claimId, &existing)) {
        safe_strcpy(errBuf, "Claim record not found.", errSize);
        return 0;
    }

    char newStatus[STATUS_LEN];
    char notes[DESC_LEN];
    newStatus[0] = '\0';
    notes[0] = '\0';

    json_get_string(jsonBody, "claimStatus", newStatus, sizeof(newStatus));
    if (newStatus[0] == '\0') {
        json_get_string(jsonBody, "status", newStatus, sizeof(newStatus));
    }
    json_get_string(jsonBody, "adminNotes", notes, sizeof(notes));
    trim_inplace(newStatus);
    trim_inplace(notes);

    if (!str_equals_ci(newStatus, "Pending") &&
        !str_equals_ci(newStatus, "Approved") &&
        !str_equals_ci(newStatus, "Rejected") &&
        !str_equals_ci(newStatus, "Completed")) {
        safe_strcpy(errBuf, "Invalid claim status. Use Pending, Approved, Rejected, or Completed.", errSize);
        return 0;
    }

    /* Normalize status casing */
    if (str_equals_ci(newStatus, "Pending")) safe_strcpy(existing.claimStatus, "Pending", sizeof(existing.claimStatus));
    else if (str_equals_ci(newStatus, "Approved")) safe_strcpy(existing.claimStatus, "Approved", sizeof(existing.claimStatus));
    else if (str_equals_ci(newStatus, "Rejected")) safe_strcpy(existing.claimStatus, "Rejected", sizeof(existing.claimStatus));
    else safe_strcpy(existing.claimStatus, "Completed", sizeof(existing.claimStatus));

    if (notes[0] != '\0') {
        safe_strcpy(existing.adminNotes, notes, sizeof(existing.adminNotes));
    } else {
        if (str_equals_ci(existing.claimStatus, "Approved")) {
            safe_strcpy(existing.adminNotes, "Ownership verified by Admin. Ready for pickup at Lost & Found Desk.", sizeof(existing.adminNotes));
        } else if (str_equals_ci(existing.claimStatus, "Rejected")) {
            safe_strcpy(existing.adminNotes, "Ownership details did not match item records.", sizeof(existing.adminNotes));
        } else if (str_equals_ci(existing.claimStatus, "Completed")) {
            safe_strcpy(existing.adminNotes, "Item physically returned to owner.", sizeof(existing.adminNotes));
        }
    }

    if (!storage_update_claim(claimId, &existing)) {
        safe_strcpy(errBuf, "Failed to update claims.dat.", errSize);
        return 0;
    }

    /* Sync linked found item status safely */
    Item foundItem;
    if (storage_find_item_by_id(1, existing.itemId, &foundItem)) {
        if (str_equals_ci(existing.claimStatus, "Completed")) {
            safe_strcpy(foundItem.status, "Returned", sizeof(foundItem.status));
            storage_update_item(1, foundItem.itemId, &foundItem);
        } else if (str_equals_ci(existing.claimStatus, "Approved")) {
            safe_strcpy(foundItem.status, "Claimed", sizeof(foundItem.status));
            storage_update_item(1, foundItem.itemId, &foundItem);
        } else if (str_equals_ci(existing.claimStatus, "Rejected") && str_equals_ci(foundItem.status, "Claimed")) {
            safe_strcpy(foundItem.status, "Available", sizeof(foundItem.status));
            storage_update_item(1, foundItem.itemId, &foundItem);
        }
    }

    if (outClaim) *outClaim = existing;
    return 1;
}
