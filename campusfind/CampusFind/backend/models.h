#ifndef MODELS_H
#define MODELS_H

/*
 * CampusFind - Core Data Structures (CSA02 Unit IV: Structures & Nested Structures)
 * All fixed-width character arrays prevent pointer serialization issues in binary .dat files
 * and allow bounds-checked string handling to avoid buffer overflows.
 */

#define CF_MAGIC 0x43464E44u /* "CFND" */
#define CF_FILE_VERSION 1

#define MAX_ITEMS 500
#define MAX_CLAIMS 500
#define MAX_MATCHES 20

#define ID_LEN 24
#define NAME_LEN 96
#define CAT_LEN 40
#define DESC_LEN 320
#define LOC_LEN 96
#define DATE_LEN 16
#define STATUS_LEN 24
#define DEPT_LEN 64
#define CONTACT_LEN 80
#define REASON_LEN 160

/* Nested Student structure used inside Item and Claim workflows */
typedef struct {
    char studentId[ID_LEN];
    char name[NAME_LEN];
    char department[DEPT_LEN];
    char contact[CONTACT_LEN];
} Student;

/* Item structure stored in lost.dat and found.dat */
typedef struct {
    unsigned int magic;
    int version;
    int active; /* 1 = active record, 0 = soft-deleted */
    char itemId[ID_LEN];
    char itemName[NAME_LEN];
    char category[CAT_LEN];
    char description[DESC_LEN];
    char location[LOC_LEN];
    char date[DATE_LEN]; /* YYYY-MM-DD */
    char status[STATUS_LEN]; /* Lost: Active/Matched/Resolved; Found: Available/Claimed/Returned */
    char createdAt[32];
    Student reporter; /* Nested structure */
} Item;

/* Claim structure stored in claims.dat */
typedef struct {
    unsigned int magic;
    int version;
    int active;
    char claimId[ID_LEN];
    char itemId[ID_LEN];
    char itemName[NAME_LEN];
    char studentId[ID_LEN];
    char studentName[NAME_LEN];
    char department[DEPT_LEN];
    char contact[CONTACT_LEN];
    char ownershipProof[DESC_LEN];
    char claimStatus[STATUS_LEN]; /* Pending, Approved, Rejected, Completed */
    char adminNotes[DESC_LEN];
    char createdAt[32];
} Claim;

/* Admin credential record stored in admin.dat (salted SHA-256 hash, never plaintext) */
typedef struct {
    unsigned int magic;
    int version;
    int configured;
    char username[64];
    char saltHex[33];
    char passwordHashHex[65];
} AdminRecord;

/* Smart Item Matching result returned by matching.c */
typedef struct {
    Item foundItem;
    int totalScore;
    int nameScore;
    int categoryScore;
    int descriptionScore;
    int locationScore;
    int dateScore;
    char tier[32]; /* High Similarity, Moderate Similarity, Low Similarity */
    char reasons[REASON_LEN];
} MatchResult;

#endif
