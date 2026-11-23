#include "storage.h"
#include "json_util.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
#include <direct.h>
#define MKDIR(d) _mkdir(d)
#else
#include <sys/stat.h>
#define MKDIR(d) mkdir(d, 0755)
#endif

static char g_data_dir[256] = "../data";

void storage_set_data_dir(const char *dirPath) {
    if (dirPath && dirPath[0] != '\0') {
        safe_strcpy(g_data_dir, dirPath, sizeof(g_data_dir));
    }
}

const char *storage_get_data_dir(void) {
    return g_data_dir;
}

static void build_path(const char *filename, char *outPath, size_t outSize) {
    snprintf(outPath, outSize, "%s/%s", g_data_dir, filename);
}

static const char *item_filename(int isFound) {
    return isFound ? "found.dat" : "lost.dat";
}

void storage_current_timestamp(char *outBuf, size_t outSize) {
    time_t now = time(NULL);
    struct tm *tmInfo = localtime(&now);
    if (tmInfo) {
        strftime(outBuf, outSize, "%Y-%m-%d %H:%M", tmInfo);
    } else {
        safe_strcpy(outBuf, "2026-01-01 00:00", outSize);
    }
}

static int file_exists(const char *path) {
    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;
    fclose(fp);
    return 1;
}

static void seed_initial_records(void) {
    char lostPath[320], foundPath[320], claimsPath[320];
    build_path("lost.dat", lostPath, sizeof(lostPath));
    build_path("found.dat", foundPath, sizeof(foundPath));
    build_path("claims.dat", claimsPath, sizeof(claimsPath));

    if (!file_exists(lostPath)) {
        FILE *fp = fopen(lostPath, "wb");
        if (fp) {
            Item samples[3];
            memset(samples, 0, sizeof(samples));

            samples[0].magic = CF_MAGIC;
            samples[0].version = CF_FILE_VERSION;
            samples[0].active = 1;
            safe_strcpy(samples[0].itemId, "LOST-1001", ID_LEN);
            safe_strcpy(samples[0].itemName, "Casio Scientific Calculator fx-991EX", NAME_LEN);
            safe_strcpy(samples[0].category, "Electronics", CAT_LEN);
            safe_strcpy(samples[0].description, "Black Casio fx-991EX ClassWiz calculator with small initials AR etched on the back sliding cover.", DESC_LEN);
            safe_strcpy(samples[0].location, "Main Library 2nd Floor", LOC_LEN);
            safe_strcpy(samples[0].date, "2026-11-20", DATE_LEN);
            safe_strcpy(samples[0].status, "Active", STATUS_LEN);
            safe_strcpy(samples[0].createdAt, "2026-11-20 14:20", 32);
            safe_strcpy(samples[0].reporter.studentId, "CS2026041", ID_LEN);
            safe_strcpy(samples[0].reporter.name, "Ananya Rao", NAME_LEN);
            safe_strcpy(samples[0].reporter.department, "Computer Science", DEPT_LEN);
            safe_strcpy(samples[0].reporter.contact, "ananya.rao@campus.edu", CONTACT_LEN);

            samples[1].magic = CF_MAGIC;
            samples[1].version = CF_FILE_VERSION;
            samples[1].active = 1;
            safe_strcpy(samples[1].itemId, "LOST-1002", ID_LEN);
            safe_strcpy(samples[1].itemName, "Navy Blue Spiral Data Structures Notebook", NAME_LEN);
            safe_strcpy(samples[1].category, "Books and Notes", CAT_LEN);
            safe_strcpy(samples[1].description, "Thick A4 navy spiral notebook containing handwritten C pointers and linked list lecture notes.", DESC_LEN);
            safe_strcpy(samples[1].location, "Engineering Block B Room 204", LOC_LEN);
            safe_strcpy(samples[1].date, "2026-11-21", DATE_LEN);
            safe_strcpy(samples[1].status, "Active", STATUS_LEN);
            safe_strcpy(samples[1].createdAt, "2026-11-21 11:05", 32);
            safe_strcpy(samples[1].reporter.studentId, "CS2026088", ID_LEN);
            safe_strcpy(samples[1].reporter.name, "Rohan Kulkarni", NAME_LEN);
            safe_strcpy(samples[1].reporter.department, "Computer Science", DEPT_LEN);
            safe_strcpy(samples[1].reporter.contact, "rohan.k@campus.edu", CONTACT_LEN);

            samples[2].magic = CF_MAGIC;
            samples[2].version = CF_FILE_VERSION;
            samples[2].active = 1;
            safe_strcpy(samples[2].itemId, "LOST-1003", ID_LEN);
            safe_strcpy(samples[2].itemName, "Silver Insulated Water Bottle", NAME_LEN);
            safe_strcpy(samples[2].category, "Water Bottles", CAT_LEN);
            safe_strcpy(samples[2].description, "750ml brushed stainless steel flask with a small blue mountain sticker near the base.", DESC_LEN);
            safe_strcpy(samples[2].location, "Student Union Cafeteria", LOC_LEN);
            safe_strcpy(samples[2].date, "2026-11-19", DATE_LEN);
            safe_strcpy(samples[2].status, "Resolved", STATUS_LEN);
            safe_strcpy(samples[2].createdAt, "2026-11-19 16:40", 32);
            safe_strcpy(samples[2].reporter.studentId, "EC2026019", ID_LEN);
            safe_strcpy(samples[2].reporter.name, "Meera Nair", NAME_LEN);
            safe_strcpy(samples[2].reporter.department, "Electronics", DEPT_LEN);
            safe_strcpy(samples[2].reporter.contact, "meera.n@campus.edu", CONTACT_LEN);

            fwrite(samples, sizeof(Item), 3, fp);
            fclose(fp);
        }
    }

    if (!file_exists(foundPath)) {
        FILE *fp = fopen(foundPath, "wb");
        if (fp) {
            Item samples[4];
            memset(samples, 0, sizeof(samples));

            samples[0].magic = CF_MAGIC;
            samples[0].version = CF_FILE_VERSION;
            samples[0].active = 1;
            safe_strcpy(samples[0].itemId, "FND-1001", ID_LEN);
            safe_strcpy(samples[0].itemName, "Casio fx-991EX Scientific Calculator", NAME_LEN);
            safe_strcpy(samples[0].category, "Electronics", CAT_LEN);
            safe_strcpy(samples[0].description, "Found on silent study desk near window; black ClassWiz model with protective cover.", DESC_LEN);
            safe_strcpy(samples[0].location, "Main Library 2nd Floor", LOC_LEN);
            safe_strcpy(samples[0].date, "2026-11-20", DATE_LEN);
            safe_strcpy(samples[0].status, "Available", STATUS_LEN);
            safe_strcpy(samples[0].createdAt, "2026-11-20 17:10", 32);
            safe_strcpy(samples[0].reporter.studentId, "ME2026012", ID_LEN);
            safe_strcpy(samples[0].reporter.name, "Siddharth Verma", NAME_LEN);
            safe_strcpy(samples[0].reporter.department, "Mechanical", DEPT_LEN);
            safe_strcpy(samples[0].reporter.contact, "siddharth.v@campus.edu", CONTACT_LEN);

            samples[1].magic = CF_MAGIC;
            samples[1].version = CF_FILE_VERSION;
            samples[1].active = 1;
            safe_strcpy(samples[1].itemId, "FND-1002", ID_LEN);
            safe_strcpy(samples[1].itemName, "Dark Blue Engineering Notebook", NAME_LEN);
            safe_strcpy(samples[1].category, "Books and Notes", CAT_LEN);
            safe_strcpy(samples[1].description, "Spiral-bound notebook left under bench with C programming pointers and array diagrams.", DESC_LEN);
            safe_strcpy(samples[1].location, "Engineering Block B Room 204", LOC_LEN);
            safe_strcpy(samples[1].date, "2026-11-21", DATE_LEN);
            safe_strcpy(samples[1].status, "Available", STATUS_LEN);
            safe_strcpy(samples[1].createdAt, "2026-11-21 13:30", 32);
            safe_strcpy(samples[1].reporter.studentId, "CS2026104", ID_LEN);
            safe_strcpy(samples[1].reporter.name, "Kavya Menon", NAME_LEN);
            safe_strcpy(samples[1].reporter.department, "Computer Science", DEPT_LEN);
            safe_strcpy(samples[1].reporter.contact, "kavya.m@campus.edu", CONTACT_LEN);

            samples[2].magic = CF_MAGIC;
            samples[2].version = CF_FILE_VERSION;
            samples[2].active = 1;
            safe_strcpy(samples[2].itemId, "FND-1003", ID_LEN);
            safe_strcpy(samples[2].itemName, "Brass Hostel Keychain (3 Keys)", NAME_LEN);
            safe_strcpy(samples[2].category, "Keys", CAT_LEN);
            safe_strcpy(samples[2].description, "Three metal keys on a round brass keyring with a small navy woven lanyard tag.", DESC_LEN);
            safe_strcpy(samples[2].location, "Central Sports Complex", LOC_LEN);
            safe_strcpy(samples[2].date, "2026-11-22", DATE_LEN);
            safe_strcpy(samples[2].status, "Available", STATUS_LEN);
            safe_strcpy(samples[2].createdAt, "2026-11-22 09:15", 32);
            safe_strcpy(samples[2].reporter.studentId, "CE2026033", ID_LEN);
            safe_strcpy(samples[2].reporter.name, "Dev Patel", NAME_LEN);
            safe_strcpy(samples[2].reporter.department, "Civil Engineering", DEPT_LEN);
            safe_strcpy(samples[2].reporter.contact, "dev.p@campus.edu", CONTACT_LEN);

            samples[3].magic = CF_MAGIC;
            samples[3].version = CF_FILE_VERSION;
            samples[3].active = 1;
            safe_strcpy(samples[3].itemId, "FND-1004", ID_LEN);
            safe_strcpy(samples[3].itemName, "University Student ID Card", NAME_LEN);
            safe_strcpy(samples[3].category, "ID Cards", CAT_LEN);
            safe_strcpy(samples[3].description, "Campus smart ID card turned in at the cafeteria counter. Personal details protected until verified.", DESC_LEN);
            safe_strcpy(samples[3].location, "Student Union Cafeteria", LOC_LEN);
            safe_strcpy(samples[3].date, "2026-11-21", DATE_LEN);
            safe_strcpy(samples[3].status, "Available", STATUS_LEN);
            safe_strcpy(samples[3].createdAt, "2026-11-21 18:05", 32);
            safe_strcpy(samples[3].reporter.studentId, "CS2026071", ID_LEN);
            safe_strcpy(samples[3].reporter.name, "Priya Sharma", NAME_LEN);
            safe_strcpy(samples[3].reporter.department, "Computer Science", DEPT_LEN);
            safe_strcpy(samples[3].reporter.contact, "priya.s@campus.edu", CONTACT_LEN);

            fwrite(samples, sizeof(Item), 4, fp);
            fclose(fp);
        }
    }

    if (!file_exists(claimsPath)) {
        FILE *fp = fopen(claimsPath, "wb");
        if (fp) {
            fclose(fp);
        }
    }
}

int storage_init(void) {
    MKDIR(g_data_dir);
    seed_initial_records();
    return 1;
}

int storage_load_items(int isFound, Item *outArray, int maxCount) {
    char path[320];
    build_path(item_filename(isFound), path, sizeof(path));

    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;

    int count = 0;
    Item temp;
    while (count < maxCount && fread(&temp, sizeof(Item), 1, fp) == 1) {
        if (temp.magic == CF_MAGIC && temp.version == CF_FILE_VERSION && temp.active == 1) {
            outArray[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int storage_append_item(int isFound, const Item *item) {
    char path[320];
    build_path(item_filename(isFound), path, sizeof(path));

    FILE *fp = fopen(path, "ab");
    if (!fp) return 0;

    size_t written = fwrite(item, sizeof(Item), 1, fp);
    fclose(fp);
    return written == 1;
}

int storage_update_item(int isFound, const char *itemId, const Item *updatedItem) {
    char path[320], tempPath[336];
    build_path(item_filename(isFound), path, sizeof(path));
    snprintf(tempPath, sizeof(tempPath), "%s.tmp", path);

    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen(tempPath, "wb");
    if (!tfp) {
        fclose(fp);
        return 0;
    }

    int found = 0;
    Item rec;
    while (fread(&rec, sizeof(Item), 1, fp) == 1) {
        if (rec.magic != CF_MAGIC || rec.version != CF_FILE_VERSION) {
            continue; /* Skip corrupted records safely */
        }
        if (rec.active == 1 && strcmp(rec.itemId, itemId) == 0) {
            fwrite(updatedItem, sizeof(Item), 1, tfp);
            found = 1;
        } else {
            fwrite(&rec, sizeof(Item), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (!found) {
        remove(tempPath);
        return 0;
    }
    remove(path);
    rename(tempPath, path);
    return 1;
}

int storage_delete_item(int isFound, const char *itemId) {
    char path[320], tempPath[336];
    build_path(item_filename(isFound), path, sizeof(path));
    snprintf(tempPath, sizeof(tempPath), "%s.tmp", path);

    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen(tempPath, "wb");
    if (!tfp) {
        fclose(fp);
        return 0;
    }

    int deleted = 0;
    Item rec;
    while (fread(&rec, sizeof(Item), 1, fp) == 1) {
        if (rec.magic != CF_MAGIC || rec.version != CF_FILE_VERSION) {
            continue;
        }
        if (rec.active == 1 && strcmp(rec.itemId, itemId) == 0) {
            deleted = 1;
            continue; /* Omit deleted record from rewritten file */
        }
        fwrite(&rec, sizeof(Item), 1, tfp);
    }
    fclose(fp);
    fclose(tfp);

    if (!deleted) {
        remove(tempPath);
        return 0;
    }
    remove(path);
    rename(tempPath, path);
    return 1;
}

int storage_find_item_by_id(int isFound, const char *itemId, Item *outItem) {
    Item items[MAX_ITEMS];
    int count = storage_load_items(isFound, items, MAX_ITEMS);
    for (int i = 0; i < count; i++) {
        if (strcmp(items[i].itemId, itemId) == 0) {
            if (outItem) *outItem = items[i];
            return 1;
        }
    }
    return 0;
}

int storage_load_claims(Claim *outArray, int maxCount) {
    char path[320];
    build_path("claims.dat", path, sizeof(path));
    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;

    int count = 0;
    Claim temp;
    while (count < maxCount && fread(&temp, sizeof(Claim), 1, fp) == 1) {
        if (temp.magic == CF_MAGIC && temp.version == CF_FILE_VERSION && temp.active == 1) {
            outArray[count++] = temp;
        }
    }
    fclose(fp);
    return count;
}

int storage_append_claim(const Claim *claim) {
    char path[320];
    build_path("claims.dat", path, sizeof(path));
    FILE *fp = fopen(path, "ab");
    if (!fp) return 0;

    size_t written = fwrite(claim, sizeof(Claim), 1, fp);
    fclose(fp);
    return written == 1;
}

int storage_update_claim(const char *claimId, const Claim *updatedClaim) {
    char path[320], tempPath[336];
    build_path("claims.dat", path, sizeof(path));
    snprintf(tempPath, sizeof(tempPath), "%s.tmp", path);

    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;
    FILE *tfp = fopen(tempPath, "wb");
    if (!tfp) {
        fclose(fp);
        return 0;
    }

    int found = 0;
    Claim rec;
    while (fread(&rec, sizeof(Claim), 1, fp) == 1) {
        if (rec.magic != CF_MAGIC || rec.version != CF_FILE_VERSION) {
            continue;
        }
        if (rec.active == 1 && strcmp(rec.claimId, claimId) == 0) {
            fwrite(updatedClaim, sizeof(Claim), 1, tfp);
            found = 1;
        } else {
            fwrite(&rec, sizeof(Claim), 1, tfp);
        }
    }
    fclose(fp);
    fclose(tfp);

    if (!found) {
        remove(tempPath);
        return 0;
    }
    remove(path);
    rename(tempPath, path);
    return 1;
}

int storage_find_claim_by_id(const char *claimId, Claim *outClaim) {
    Claim claims[MAX_CLAIMS];
    int count = storage_load_claims(claims, MAX_CLAIMS);
    for (int i = 0; i < count; i++) {
        if (strcmp(claims[i].claimId, claimId) == 0) {
            if (outClaim) *outClaim = claims[i];
            return 1;
        }
    }
    return 0;
}

int storage_load_admin(AdminRecord *outAdmin) {
    char path[320];
    build_path("admin.dat", path, sizeof(path));
    FILE *fp = fopen(path, "rb");
    if (!fp) return 0;

    AdminRecord rec;
    size_t n = fread(&rec, sizeof(AdminRecord), 1, fp);
    fclose(fp);

    if (n == 1 && rec.magic == CF_MAGIC && rec.version == CF_FILE_VERSION && rec.configured == 1) {
        if (outAdmin) *outAdmin = rec;
        return 1;
    }
    return 0;
}

int storage_save_admin(const AdminRecord *admin) {
    char path[320], tempPath[336];
    build_path("admin.dat", path, sizeof(path));
    snprintf(tempPath, sizeof(tempPath), "%s.tmp", path);

    FILE *fp = fopen(tempPath, "wb");
    if (!fp) return 0;
    size_t n = fwrite(admin, sizeof(AdminRecord), 1, fp);
    fclose(fp);

    if (n != 1) {
        remove(tempPath);
        return 0;
    }
    remove(path);
    rename(tempPath, path);
    return 1;
}

void storage_generate_id(const char *prefix, int isFound, int isClaim, char *outId, size_t outSize) {
    int maxNum = 1000;
    if (isClaim) {
        Claim claims[MAX_CLAIMS];
        int count = storage_load_claims(claims, MAX_CLAIMS);
        for (int i = 0; i < count; i++) {
            const char *dash = strchr(claims[i].claimId, '-');
            if (dash) {
                int num = atoi(dash + 1);
                if (num > maxNum) maxNum = num;
            }
        }
    } else {
        Item items[MAX_ITEMS];
        int count = storage_load_items(isFound, items, MAX_ITEMS);
        for (int i = 0; i < count; i++) {
            const char *dash = strchr(items[i].itemId, '-');
            if (dash) {
                int num = atoi(dash + 1);
                if (num > maxNum) maxNum = num;
            }
        }
    }
    snprintf(outId, outSize, "%s-%d", prefix, maxNum + 1);
}
