#include "auth.h"
#include "storage.h"
#include "json_util.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#ifdef _WIN32
#include <windows.h>
#include <wincrypt.h>
#endif

#define MAX_SESSIONS 32
#define SESSION_TTL_SEC (4 * 3600)

typedef struct {
    int active;
    char token[65];
    char username[64];
    time_t expiresAt;
} AdminSession;

static AdminSession g_sessions[MAX_SESSIONS];

/* --- Compact, standard SHA-256 implementation in pure C --- */
typedef struct {
    uint8_t data[64];
    uint32_t datalen;
    uint64_t bitlen;
    uint32_t state[8];
} Sha256Ctx;

static const uint32_t K256[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

#define ROTRIGHT(a,b) (((a) >> (b)) | ((a) << (32-(b))))
#define CH(x,y,z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x,y,z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x) (ROTRIGHT(x,2) ^ ROTRIGHT(x,13) ^ ROTRIGHT(x,22))
#define EP1(x) (ROTRIGHT(x,6) ^ ROTRIGHT(x,11) ^ ROTRIGHT(x,25))
#define SIG0(x) (ROTRIGHT(x,7) ^ ROTRIGHT(x,18) ^ ((x) >> 3))
#define SIG1(x) (ROTRIGHT(x,17) ^ ROTRIGHT(x,19) ^ ((x) >> 10))

static void sha256_transform(Sha256Ctx *ctx, const uint8_t data[]) {
    uint32_t a, b, c, d, e, f, g, h, i, j, t1, t2, m[64];
    for (i = 0, j = 0; i < 16; ++i, j += 4)
        m[i] = ((uint32_t)data[j] << 24) | ((uint32_t)data[j+1] << 16) | ((uint32_t)data[j+2] << 8) | ((uint32_t)data[j+3]);
    for (; i < 64; ++i)
        m[i] = SIG1(m[i-2]) + m[i-7] + SIG0(m[i-15]) + m[i-16];

    a = ctx->state[0]; b = ctx->state[1]; c = ctx->state[2]; d = ctx->state[3];
    e = ctx->state[4]; f = ctx->state[5]; g = ctx->state[6]; h = ctx->state[7];

    for (i = 0; i < 64; ++i) {
        t1 = h + EP1(e) + CH(e,f,g) + K256[i] + m[i];
        t2 = EP0(a) + MAJ(a,b,c);
        h = g; g = f; f = e; e = d + t1;
        d = c; c = b; b = a; a = t1 + t2;
    }
    ctx->state[0] += a; ctx->state[1] += b; ctx->state[2] += c; ctx->state[3] += d;
    ctx->state[4] += e; ctx->state[5] += f; ctx->state[6] += g; ctx->state[7] += h;
}

static void sha256_init(Sha256Ctx *ctx) {
    ctx->datalen = 0;
    ctx->bitlen = 0;
    ctx->state[0] = 0x6a09e667; ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372; ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f; ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab; ctx->state[7] = 0x5be0cd19;
}

static void sha256_update(Sha256Ctx *ctx, const uint8_t data[], size_t len) {
    for (size_t i = 0; i < len; ++i) {
        ctx->data[ctx->datalen] = data[i];
        ctx->datalen++;
        if (ctx->datalen == 64) {
            sha256_transform(ctx, ctx->data);
            ctx->bitlen += 512;
            ctx->datalen = 0;
        }
    }
}

static void sha256_final(Sha256Ctx *ctx, uint8_t hash[32]) {
    uint32_t i = ctx->datalen;
    if (ctx->datalen < 56) {
        ctx->data[i++] = 0x80;
        while (i < 56) ctx->data[i++] = 0x00;
    } else {
        ctx->data[i++] = 0x80;
        while (i < 64) ctx->data[i++] = 0x00;
        sha256_transform(ctx, ctx->data);
        memset(ctx->data, 0, 56);
    }
    ctx->bitlen += (uint64_t)ctx->datalen * 8;
    ctx->data[63] = (uint8_t)(ctx->bitlen);
    ctx->data[62] = (uint8_t)(ctx->bitlen >> 8);
    ctx->data[61] = (uint8_t)(ctx->bitlen >> 16);
    ctx->data[60] = (uint8_t)(ctx->bitlen >> 24);
    ctx->data[59] = (uint8_t)(ctx->bitlen >> 32);
    ctx->data[58] = (uint8_t)(ctx->bitlen >> 40);
    ctx->data[57] = (uint8_t)(ctx->bitlen >> 48);
    ctx->data[56] = (uint8_t)(ctx->bitlen >> 56);
    sha256_transform(ctx, ctx->data);
    for (i = 0; i < 4; ++i) {
        for (int j = 0; j < 8; ++j) {
            hash[i + j * 4] = (uint8_t)((ctx->state[j] >> (24 - i * 8)) & 0xff);
        }
    }
}

static void bytes_to_hex(const uint8_t *bytes, size_t len, char *outHex) {
    static const char hex[] = "0123456789abcdef";
    for (size_t i = 0; i < len; i++) {
        outHex[i * 2] = hex[(bytes[i] >> 4) & 0x0f];
        outHex[i * 2 + 1] = hex[bytes[i] & 0x0f];
    }
    outHex[len * 2] = '\0';
}

static void generate_random_bytes(uint8_t *buf, size_t len) {
#ifdef _WIN32
    HCRYPTPROV hProv = 0;
    if (CryptAcquireContextA(&hProv, NULL, NULL, PROV_RSA_FULL, CRYPT_VERIFYCONTEXT)) {
        CryptGenRandom(hProv, (DWORD)len, buf);
        CryptReleaseContext(hProv, 0);
        return;
    }
#else
    FILE *fp = fopen("/dev/urandom", "rb");
    if (fp) {
        size_t r = fread(buf, 1, len, fp);
        fclose(fp);
        if (r == len) return;
    }
#endif
    srand((unsigned int)(time(NULL) ^ (uintptr_t)buf));
    for (size_t i = 0; i < len; i++) {
        buf[i] = (uint8_t)(rand() & 0xff);
    }
}

/* Constant-time string compare to reduce timing leaks */
static int const_time_eq(const char *a, const char *b) {
    size_t la = strlen(a), lb = strlen(b);
    if (la != lb) return 0;
    unsigned char diff = 0;
    for (size_t i = 0; i < la; i++) {
        diff |= (unsigned char)(a[i] ^ b[i]);
    }
    return diff == 0;
}

static void hash_password_salted(const char *saltHex, const char *password, char *outHashHex) {
    uint8_t digest[32];
    Sha256Ctx ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, (const uint8_t *)saltHex, strlen(saltHex));
    sha256_update(&ctx, (const uint8_t *)":", 1);
    sha256_update(&ctx, (const uint8_t *)password, strlen(password));
    sha256_final(&ctx, digest);

    /* Key stretching: 2048 SHA-256 rounds */
    for (int r = 0; r < 2048; r++) {
        sha256_init(&ctx);
        sha256_update(&ctx, digest, 32);
        sha256_update(&ctx, (const uint8_t *)saltHex, strlen(saltHex));
        sha256_final(&ctx, digest);
    }
    bytes_to_hex(digest, 32, outHashHex);
}

void auth_init(void) {
    memset(g_sessions, 0, sizeof(g_sessions));
}

static const char *get_env_passcode(void) {
    const char *env = getenv("CAMPUSFIND_ADMIN_PASSCODE");
    if (env && env[0] != '\0') return env;
    return NULL;
}

int auth_is_configured(void) {
    if (get_env_passcode() != NULL) return 1;
    AdminRecord rec;
    return storage_load_admin(&rec);
}

int auth_setup_initial_admin(const char *username, const char *password, char *errBuf, size_t errSize) {
    if (auth_is_configured()) {
        safe_strcpy(errBuf, "Administrator account is already configured.", errSize);
        return 0;
    }
    if (!username || strlen(username) < 3) {
        safe_strcpy(errBuf, "Username must be at least 3 characters.", errSize);
        return 0;
    }
    if (!password || strlen(password) < 6) {
        safe_strcpy(errBuf, "Password must be at least 6 characters.", errSize);
        return 0;
    }

    AdminRecord rec;
    memset(&rec, 0, sizeof(rec));
    rec.magic = CF_MAGIC;
    rec.version = CF_FILE_VERSION;
    rec.configured = 1;
    safe_strcpy(rec.username, username, sizeof(rec.username));

    uint8_t saltBytes[16];
    generate_random_bytes(saltBytes, sizeof(saltBytes));
    bytes_to_hex(saltBytes, sizeof(saltBytes), rec.saltHex);
    hash_password_salted(rec.saltHex, password, rec.passwordHashHex);

    if (!storage_save_admin(&rec)) {
        safe_strcpy(errBuf, "Failed to persist admin credentials to admin.dat.", errSize);
        return 0;
    }
    return 1;
}

static void issue_session(const char *username, char *outToken, size_t tokenSize) {
    uint8_t raw[24];
    generate_random_bytes(raw, sizeof(raw));
    char tokenHex[65];
    bytes_to_hex(raw, sizeof(raw), tokenHex);

    time_t now = time(NULL);
    int slot = 0;
    for (int i = 0; i < MAX_SESSIONS; i++) {
        if (!g_sessions[i].active || g_sessions[i].expiresAt < now) {
            slot = i;
            break;
        }
    }
    g_sessions[slot].active = 1;
    safe_strcpy(g_sessions[slot].token, tokenHex, sizeof(g_sessions[slot].token));
    safe_strcpy(g_sessions[slot].username, username, sizeof(g_sessions[slot].username));
    g_sessions[slot].expiresAt = now + SESSION_TTL_SEC;

    safe_strcpy(outToken, tokenHex, tokenSize);
}

int auth_login(const char *username, const char *password, char *outToken, size_t tokenSize, char *outUsername, size_t userSize) {
    if (!username || !password || username[0] == '\0' || password[0] == '\0') return 0;

    const char *envPass = get_env_passcode();
    if (envPass != NULL) {
        if (const_time_eq(password, envPass)) {
            issue_session(username, outToken, tokenSize);
            safe_strcpy(outUsername, username, userSize);
            return 1;
        }
        return 0;
    }

    AdminRecord rec;
    if (!storage_load_admin(&rec)) return 0;
    if (!str_equals_ci(username, rec.username)) return 0;

    char candidateHash[65];
    hash_password_salted(rec.saltHex, password, candidateHash);
    if (!const_time_eq(candidateHash, rec.passwordHashHex)) return 0;

    issue_session(rec.username, outToken, tokenSize);
    safe_strcpy(outUsername, rec.username, userSize);
    return 1;
}

static void extract_bearer(const char *authHeader, char *outToken, size_t outSize) {
    outToken[0] = '\0';
    if (!authHeader) return;
    const char *p = authHeader;
    while (*p == ' ') p++;
    if (strncmp(p, "Bearer ", 7) == 0 || strncmp(p, "bearer ", 7) == 0) {
        p += 7;
        while (*p == ' ') p++;
        safe_strcpy(outToken, p, outSize);
        trim_inplace(outToken);
    }
}

int auth_verify_bearer(const char *authHeader, char *outUsername, size_t userSize) {
    char token[65];
    extract_bearer(authHeader, token, sizeof(token));
    if (token[0] == '\0') return 0;

    time_t now = time(NULL);
    for (int i = 0; i < MAX_SESSIONS; i++) {
        if (g_sessions[i].active) {
            if (g_sessions[i].expiresAt < now) {
                g_sessions[i].active = 0;
                continue;
            }
            if (const_time_eq(g_sessions[i].token, token)) {
                if (outUsername && userSize > 0) {
                    safe_strcpy(outUsername, g_sessions[i].username, userSize);
                }
                return 1;
            }
        }
    }
    return 0;
}

void auth_logout(const char *authHeader) {
    char token[65];
    extract_bearer(authHeader, token, sizeof(token));
    if (token[0] == '\0') return;

    for (int i = 0; i < MAX_SESSIONS; i++) {
        if (g_sessions[i].active && const_time_eq(g_sessions[i].token, token)) {
            g_sessions[i].active = 0;
            memset(g_sessions[i].token, 0, sizeof(g_sessions[i].token));
        }
    }
}
