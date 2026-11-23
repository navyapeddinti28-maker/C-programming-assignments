#ifndef STORAGE_H
#define STORAGE_H

#include "models.h"
#include <stddef.h>

/* Directory and binary file paths */
void storage_set_data_dir(const char *dirPath);
const char *storage_get_data_dir(void);

/* Ensure data directory exists and initialize .dat files if absent */
int storage_init(void);

/* Generic Item binary file operations (lost.dat / found.dat) */
int storage_load_items(int isFound, Item *outArray, int maxCount);
int storage_append_item(int isFound, const Item *item);
int storage_update_item(int isFound, const char *itemId, const Item *updatedItem);
int storage_delete_item(int isFound, const char *itemId);
int storage_find_item_by_id(int isFound, const char *itemId, Item *outItem);

/* Claim binary file operations (claims.dat) */
int storage_load_claims(Claim *outArray, int maxCount);
int storage_append_claim(const Claim *claim);
int storage_update_claim(const char *claimId, const Claim *updatedClaim);
int storage_find_claim_by_id(const char *claimId, Claim *outClaim);

/* Admin binary file operations (admin.dat) */
int storage_load_admin(AdminRecord *outAdmin);
int storage_save_admin(const AdminRecord *admin);

/* Unique sequential record ID generator */
void storage_generate_id(const char *prefix, int isFound, int isClaim, char *outId, size_t outSize);
void storage_current_timestamp(char *outBuf, size_t outSize);

#endif
