# CampusFind — College Capstone Project Documentation

## 1. Project Abstract
Lost belongings on college campuses—such as calculators, notebooks, ID cards, keys, and water bottles—are typically reported across disconnected notice boards or messaging groups. **CampusFind** provides a centralized web platform backed by a **C Programming HTTP/1.1 Server** and **binary `.dat` file persistence**. Students can report lost or found items, search and filter records, inspect automated 100-point smart match suggestions, and submit ownership claims verified by an authorized campus administrator.

---

## 2. System Architecture

```
+-------------------------------+       HTTP/JSON (Fetch API)      +------------------------------------+
|       Web Browser (UI)        |  ----------------------------->  |   Port 3000 Reverse Proxy & UI     |
|  Home / Browse / Report /     |  <-----------------------------  |      (Vite + Express Wrapper)      |
|  Claims / About / Admin       |                                  +------------------------------------+
+-------------------------------+                                                    |
                                                                      HTTP/1.1 /api/*| (127.0.0.1:8080)
                                                                                     v
                                                                   +------------------------------------+
                                                                   |     CampusFind C11 HTTP Server     |
                                                                   |   (server.c, auth.c, items.c,      |
                                                                   |    search.c, matching.c, claims.c) |
                                                                   +------------------------------------+
                                                                                     |
                                                                      fopen/fread/   |
                                                                      fwrite/rename  v
                                                                   +------------------------------------+
                                                                   |     Binary File Storage (.dat)     |
                                                                   |  lost.dat | found.dat | claims.dat |
                                                                   |  admin.dat                         |
                                                                   +------------------------------------+
```

---

## 3. Application Flowchart

```
[Start] --> [Home Dashboard] (GET /api/dashboard/stats from C)
   |
   +--> [Report Lost] --> Validate --> Save to lost.dat --> Run C Smart Matcher --> Display Matches
   |
   +--> [Report Found] --> Validate --> Mask ID Card Info --> Save to found.dat --> Match Lost Reports
   |
   +--> [Browse & Search] --> Filter Category/Location/Sort --> View Details --> [Submit Claim]
   |
   +--> [My Claims] --> Submit Proof (POST /api/claims) OR Track by Student ID (GET /api/claims)
   |
   +--> [Admin Login / First-Run Setup] --> Verify Salted SHA-256 (admin.dat) --> Bearer Token
           |
           +--> [Admin Dashboard] --> Edit/Delete Records | Approve/Reject Claims | Mark Returned
```

---

## 4. CSA02 C Programming Syllabus Mapping

| Syllabus Unit | Concepts Implemented | Files |
| :--- | :--- | :--- |
| **Unit I: Introduction to C** | Variables, data types, operators, `if/else`, `switch`, loops, input length & date format validation | `items.c`, `claims.c`, `server.c` |
| **Unit II: Arrays** | 1D arrays of `Item`, `Claim`, and `MatchResult` records, linear search, multi-filter, bubble sort | `search.c`, `matching.c` |
| **Unit III: Functions & Pointers** | Modular `.h`/`.c` prototypes, pointer arguments, custom string tokenization, bounded copy helpers | `json_util.c`, `matching.c`, `items.c` |
| **Unit IV: Structures** | `Student` nested inside `Item`, `Claim`, `AdminRecord`, `MatchResult`, `StrBuf` | `models.h`, `json_util.h` |
| **Unit V: Files & Operations** | Binary `fopen`, `fclose`, `fread`, `fwrite`, magic-header validation, atomic `.tmp` + `rename()` | `storage.c` |

---

## 5. Smart Item Matching Formula (C Rule-Based Engine)

Implemented in `CampusFind/backend/matching.c`:
- **Item Name Similarity (30 points):** Exact match = 30; substring match = 25; token overlap proportional up to 30.
- **Category Match (20 points):** Case-insensitive exact category match = 20.
- **Description Keyword Similarity (20 points):** Lowercase tokenization ignoring stop words, scoring shared meaningful keywords >= 3 chars.
- **Campus Location Similarity (20 points):** Exact or shared building/room keyword overlap.
- **Date Proximity (10 points):** Same day = 10, <= 3 days = 7, <= 7 days = 4, <= 14 days = 2.

**Tiers:** `80–100` High Similarity · `50–79` Moderate Similarity · `< 50` Low Similarity.

---

## 6. Test Cases & Verification Checklist

1. **Report Lost Item (`POST /api/lost`):** Generates `LOST-XXXX`, persists to `lost.dat`, returns immediate Smart Matches.
2. **Report Found Item (`POST /api/found`):** Generates `FND-XXXX`, persists to `found.dat`, masks ID card descriptions publicly.
3. **Search & Filter (`GET /api/search`):** Filters by keyword, category, location, and date sort order from `.dat` records.
4. **Smart Match (`GET /api/matches/{lostId}`):** Computes weighted score out of 100 with human-readable reasons.
5. **Duplicate Claim Prevention (`POST /api/claims`):** Rejects duplicate active claim for same `studentId` + `itemId` with HTTP `409`.
6. **Unauthorized Admin Block:** Calling `PUT/DELETE /api/found/{id}` or `PUT /api/claims/{id}` without a valid Bearer token returns HTTP `401`.
7. **Admin Claim Completion (`PUT /api/claims/{id}`):** Marking a claim `Completed` automatically updates the linked found item to `Returned`.
8. **Server Restart Persistence:** Restarting the C server preserves all records in `lost.dat`, `found.dat`, `claims.dat`, and `admin.dat`.

---

## 7. Security Safeguards & Prototype Limitations

- **Implemented:** Salted 2048-round SHA-256 password hashing in `auth.c`, Bearer tokens held in memory (not `localStorage`), bounded string operations (`safe_strcpy`), public masking of reporter contact info and ID card details.
- **Limitations for Production:** Local HTTP should be placed behind an HTTPS/TLS reverse proxy; student identity lookup should integrate with campus SSO/OAuth2; single-process binary `.dat` files should migrate to PostgreSQL/SQLite for concurrent multi-worker scaling.
