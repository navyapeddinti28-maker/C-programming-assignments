#ifndef CLAIMS_H
#define CLAIMS_H

#include "models.h"
#include "json_util.h"

void claims_append_json(StrBuf *sb, const Claim *claim, int includePrivate);
void claims_array_to_json(StrBuf *sb, const Claim *claims, int count, int includePrivate);

/* Create a claim with duplicate-claim prevention and item verification */
int claims_create_from_json(const char *jsonBody, Claim *outClaim, char *errBuf, size_t errSize, int *outHttpCode);

/* Admin-only status update (Approved, Rejected, Completed) */
int claims_update_status(const char *claimId, const char *jsonBody, Claim *outClaim, char *errBuf, size_t errSize);

#endif
