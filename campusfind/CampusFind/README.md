# CampusFind — Campus Lost and Found Management System

**Tagline:** Lost Something? Find It. Found Something? Return It.

CampusFind is a full-stack web application powered by a modular **C11 HTTP Backend** (`CampusFind/backend/`) and **C Binary File Storage** (`CampusFind/data/*.dat`).

---

## 1. Folder Structure

```
CampusFind/
├── backend/
│   ├── main.c          # Entry point, environment config & startup
│   ├── server.c / .h   # Cross-platform TCP HTTP/1.1 server (Winsock2 & POSIX)
│   ├── storage.c / .h  # Binary .dat persistence (fopen, fread, fwrite)
│   ├── items.c / .h    # Lost & Found validation, privacy redaction, statistics
│   ├── search.c / .h   # Array filtering, substring search & date sorting
│   ├── matching.c / .h # 100-point weighted rule-based smart matching engine
│   ├── claims.c / .h   # Claim submission, duplicate checks & admin workflow
│   ├── auth.c / .h     # Salted SHA-256 admin auth & Bearer token sessions
│   ├── json_util.c / .h# Safe JSON parsing, escaping & URL query decoding
│   ├── models.h        # Unit IV C structures (Student, Item, Claim, MatchResult)
│   └── Makefile        # Cross-platform GCC build script
├── data/
│   ├── lost.dat        # Binary Lost Item records
│   ├── found.dat       # Binary Found Item records
│   ├── claims.dat      # Binary Recovery Claim records
│   └── admin.dat       # Salted SHA-256 Admin credentials
└── docs/
    └── CAPSTONE_DOCUMENTATION.md
```

---

## 2. Running the C Backend on Windows 11 (VS Code + GCC / MinGW-w64)

1. Install **MSYS2 / MinGW-w64 GCC** (`gcc --version` should work in terminal).
2. Open a terminal inside `CampusFind/backend/`.
3. Compile the C backend linking Winsock2 (`-lws2_32`):
   ```bash
   gcc -Wall -Wextra -std=c11 -O2 main.c server.c storage.c items.c search.c matching.c claims.c auth.c json_util.c -o campusfind_server.exe -lws2_32
   ```
4. Run the C HTTP server:
   ```bash
   ./campusfind_server.exe ../data
   ```
5. The C backend listens on `http://127.0.0.1:8080` and creates/updates binary `.dat` files in `CampusFind/data/`.

### Linux / macOS Compilation
```bash
cd CampusFind/backend
make
./campusfind_server ../data
```

---

## 3. Running the Full Web Preview (Port 3000)

From the workspace root:
```bash
npm install
npm run dev
```
`server.ts` automatically compiles/launches `campusfind_server` on `127.0.0.1:8080` and forwards every `/api/*` request directly to the C backend while serving the Vite frontend on `http://localhost:3000`.
