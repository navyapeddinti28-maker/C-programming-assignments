#ifndef AUTH_H
#define AUTH_H

#include <stddef.h>

void auth_init(void);

/* Check if admin is configured (either via CAMPUSFIND_ADMIN_PASSCODE env or admin.dat) */
int auth_is_configured(void);

/* One-time initial admin setup (only allowed when not yet configured) */
int auth_setup_initial_admin(const char *username, const char *password, char *errBuf, size_t errSize);

/* Verify login and issue a session token */
int auth_login(const char *username, const char *password, char *outToken, size_t tokenSize, char *outUsername, size_t userSize);

/* Validate Authorization: Bearer <token> header */
int auth_verify_bearer(const char *authHeader, char *outUsername, size_t userSize);

/* Invalidate a Bearer token */
void auth_logout(const char *authHeader);

#endif
