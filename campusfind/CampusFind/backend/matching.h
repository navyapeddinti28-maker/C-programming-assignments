#ifndef MATCHING_H
#define MATCHING_H

#include "models.h"
#include "json_util.h"

/* Configurable matching weights (Sum = 100 points) */
#define WEIGHT_NAME 30
#define WEIGHT_CATEGORY 20
#define WEIGHT_DESCRIPTION 20
#define WEIGHT_LOCATION 20
#define WEIGHT_DATE 10

/* Compute smart matches for a given Lost item against Found items */
int matching_find_for_lost(const Item *lostItem, MatchResult *outMatches, int maxMatches);

/* Compute smart matches for a given Found item against Lost items */
int matching_find_for_found(const Item *foundItem, MatchResult *outMatches, int maxMatches);

/* Serialize match results array into JSON */
void matching_results_to_json(StrBuf *sb, const MatchResult *matches, int count, int includePrivate);

#endif
