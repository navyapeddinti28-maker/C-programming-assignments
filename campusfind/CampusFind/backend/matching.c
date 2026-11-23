#include "matching.h"
#include "storage.h"
#include "items.h"
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Split text into lowercase tokens (>= 3 chars, ignoring common stop words) */
static int is_stop_word(const char *w) {
    const char *stops[] = {
        "the", "and", "for", "with", "near", "from", "that", "this",
        "was", "are", "has", "have", "had", "lost", "found", "item", "campus"
    };
    int count = (int)(sizeof(stops) / sizeof(stops[0]));
    for (int i = 0; i < count; i++) {
        if (strcmp(w, stops[i]) == 0) return 1;
    }
    return 0;
}

static int tokenize_words(const char *text, char words[][32], int maxWords) {
    char buf[384];
    str_to_lower(buf, text, sizeof(buf));
    int count = 0;
    int i = 0;
    while (buf[i] != '\0' && count < maxWords) {
        while (buf[i] != '\0' && !isalnum((unsigned char)buf[i])) i++;
        if (buf[i] == '\0') break;
        char token[32];
        int t = 0;
        while (buf[i] != '\0' && isalnum((unsigned char)buf[i]) && t < 31) {
            token[t++] = buf[i++];
        }
        token[t] = '\0';
        if (t >= 3 && !is_stop_word(token)) {
            int dup = 0;
            for (int k = 0; k < count; k++) {
                if (strcmp(words[k], token) == 0) {
                    dup = 1;
                    break;
                }
            }
            if (!dup) {
                safe_strcpy(words[count++], token, 32);
            }
        }
    }
    return count;
}

static int compute_token_overlap_score(const char *a, const char *b, int maxWeight) {
    if (!a || !b || a[0] == '\0' || b[0] == '\0') return 0;
    if (str_equals_ci(a, b)) return maxWeight;
    if (str_contains_ci(a, b) || str_contains_ci(b, a)) return (maxWeight * 85) / 100;

    char wordsA[24][32];
    char wordsB[24][32];
    int nA = tokenize_words(a, wordsA, 24);
    int nB = tokenize_words(b, wordsB, 24);
    if (nA == 0 || nB == 0) return 0;

    int hits = 0;
    for (int i = 0; i < nA; i++) {
        for (int j = 0; j < nB; j++) {
            if (strcmp(wordsA[i], wordsB[j]) == 0 ||
                (strlen(wordsA[i]) >= 4 && strlen(wordsB[j]) >= 4 &&
                 (strstr(wordsA[i], wordsB[j]) || strstr(wordsB[j], wordsA[i])))) {
                hits++;
                break;
            }
        }
    }

    int denom = nA < nB ? nA : nB;
    if (denom == 0) return 0;
    int score = (hits * maxWeight) / denom;
    if (score > maxWeight) score = maxWeight;
    return score;
}

static int parse_date_days(const char *dateStr) {
    if (!dateStr || strlen(dateStr) != 10) return -1;
    int y = atoi(dateStr);
    int m = atoi(dateStr + 5);
    int d = atoi(dateStr + 8);
    if (y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) return -1;
    return y * 365 + m * 30 + d;
}

static int compute_date_score(const char *d1, const char *d2) {
    int days1 = parse_date_days(d1);
    int days2 = parse_date_days(d2);
    if (days1 < 0 || days2 < 0) return 0;
    int diff = days1 - days2;
    if (diff < 0) diff = -diff;

    if (diff == 0) return WEIGHT_DATE;      /* Same day: 10 pts */
    if (diff <= 3) return 7;                /* Within 3 days: 7 pts */
    if (diff <= 7) return 4;                /* Within 1 week: 4 pts */
    if (diff <= 14) return 2;               /* Within 2 weeks: 2 pts */
    return 0;
}

static MatchResult score_pair(const Item *sourceItem, const Item *candidateItem) {
    MatchResult res;
    memset(&res, 0, sizeof(res));
    res.foundItem = *candidateItem;

    res.nameScore = compute_token_overlap_score(sourceItem->itemName, candidateItem->itemName, WEIGHT_NAME);
    res.categoryScore = str_equals_ci(sourceItem->category, candidateItem->category) ? WEIGHT_CATEGORY : 0;
    res.descriptionScore = compute_token_overlap_score(sourceItem->description, candidateItem->description, WEIGHT_DESCRIPTION);
    res.locationScore = compute_token_overlap_score(sourceItem->location, candidateItem->location, WEIGHT_LOCATION);
    res.dateScore = compute_date_score(sourceItem->date, candidateItem->date);

    res.totalScore = res.nameScore + res.categoryScore + res.descriptionScore + res.locationScore + res.dateScore;
    if (res.totalScore > 100) res.totalScore = 100;

    if (res.totalScore >= 80) {
        safe_strcpy(res.tier, "High Similarity", sizeof(res.tier));
    } else if (res.totalScore >= 50) {
        safe_strcpy(res.tier, "Moderate Similarity", sizeof(res.tier));
    } else {
        safe_strcpy(res.tier, "Low Similarity", sizeof(res.tier));
    }

    /* Build plain-language explanation of why these items matched */
    char reasons[REASON_LEN];
    reasons[0] = '\0';
    if (res.nameScore >= 15) strcat(reasons, "Similar item name; ");
    if (res.categoryScore == WEIGHT_CATEGORY) strcat(reasons, "Exact category match; ");
    if (res.locationScore >= 10) strcat(reasons, "Matching campus location; ");
    if (res.descriptionScore >= 8) strcat(reasons, "Shared description keywords; ");
    if (res.dateScore >= 7) strcat(reasons, "Reported within 3 days; ");

    size_t rlen = strlen(reasons);
    if (rlen >= 2) {
        reasons[rlen - 2] = '\0'; /* remove trailing "; " */
    } else {
        safe_strcpy(reasons, "Partial attribute overlap", sizeof(reasons));
    }
    safe_strcpy(res.reasons, reasons, sizeof(res.reasons));
    return res;
}

static void sort_matches_desc(MatchResult *arr, int count) {
    for (int i = 0; i < count - 1; i++) {
        for (int j = 0; j < count - i - 1; j++) {
            if (arr[j].totalScore < arr[j + 1].totalScore) {
                MatchResult tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }
}

int matching_find_for_lost(const Item *lostItem, MatchResult *outMatches, int maxMatches) {
    Item foundItems[MAX_ITEMS];
    int foundCount = storage_load_items(1, foundItems, MAX_ITEMS);
    int matchCount = 0;

    for (int i = 0; i < foundCount && matchCount < maxMatches; i++) {
        if (str_equals_ci(foundItems[i].status, "Returned")) continue;
        MatchResult m = score_pair(lostItem, &foundItems[i]);
        if (m.totalScore >= 25) {
            outMatches[matchCount++] = m;
        }
    }
    sort_matches_desc(outMatches, matchCount);
    return matchCount;
}

int matching_find_for_found(const Item *foundItem, MatchResult *outMatches, int maxMatches) {
    Item lostItems[MAX_ITEMS];
    int lostCount = storage_load_items(0, lostItems, MAX_ITEMS);
    int matchCount = 0;

    for (int i = 0; i < lostCount && matchCount < maxMatches; i++) {
        if (str_equals_ci(lostItems[i].status, "Resolved")) continue;
        MatchResult m = score_pair(foundItem, &lostItems[i]);
        if (m.totalScore >= 25) {
            outMatches[matchCount++] = m;
        }
    }
    sort_matches_desc(outMatches, matchCount);
    return matchCount;
}

void matching_results_to_json(StrBuf *sb, const MatchResult *matches, int count, int includePrivate) {
    sb_append(sb, "[");
    for (int i = 0; i < count; i++) {
        const MatchResult *m = &matches[i];
        sb_append(sb, "{");
        sb_append(sb, "\"item\":");
        items_append_json(sb, &m->foundItem, includePrivate);
        sb_append(sb, ",");
        sb_append_json_int(sb, "totalScore", m->totalScore, 1);
        sb_append_json_int(sb, "nameScore", m->nameScore, 1);
        sb_append_json_int(sb, "categoryScore", m->categoryScore, 1);
        sb_append_json_int(sb, "descriptionScore", m->descriptionScore, 1);
        sb_append_json_int(sb, "locationScore", m->locationScore, 1);
        sb_append_json_int(sb, "dateScore", m->dateScore, 1);
        sb_append_json_str(sb, "tier", m->tier, 1);
        sb_append_json_str(sb, "reasons", m->reasons, 0);
        sb_append(sb, "}");
        if (i < count - 1) sb_append(sb, ",");
    }
    sb_append(sb, "]");
}
