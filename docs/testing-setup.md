# Testing Setup — In-Memory MongoDB

The backend test suite now runs **database-backed tests with zero external
setup**, using [`mongodb-memory-server`](https://github.com/nodkz/mongodb-memory-server).
Previously the README promised an in-memory test database, but the dependency
and wiring were missing, so any DB-backed test was skipped unless you manually
provided `TEST_MONGODB_URI`. That gap is now closed.

---

## How it works

`tests/helpers/mongoTest.js` exposes `setupMongoTest()` / `cleanupMongoTest()`:

- If **`TEST_MONGODB_URI`** is set (e.g. a real MongoDB in CI), it connects to
  that.
- Otherwise it **spins up an ephemeral in-memory MongoDB** (downloaded and
  cached automatically on first run) and points Mongoose at it.

`cleanupMongoTest()` clears collections, disconnects, and stops the server.

```js
const { setupMongoTest, cleanupMongoTest } = require('../helpers/mongoTest');

let mongoServer;
beforeAll(async () => { mongoServer = await setupMongoTest(); });
afterAll(async () => { await cleanupMongoTest(mongoServer); });
```

---

## Running the tests

```bash
cd backend
npm test                 # full suite (unit + DB-backed)
npx jest tests/models    # just the model tests
```

> First run downloads the MongoDB binary (one-time, cached under the OS temp
> dir). Subsequent runs are fast and fully offline.

Two test styles coexist:
- **Unit tests** (`notificationEvents`, `passwordReset`) — mock models/services,
  no DB.
- **DB-backed tests** (`user.model`, `scholarshipReport`) — real Mongoose against
  the in-memory server.

---

## Files changed / added

- **`tests/helpers/mongoTest.js`** — in-memory server fallback (was: threw
  without `TEST_MONGODB_URI`).
- **`tests/models/user.model.test.js`** — always runs now (removed the
  skip-unless-`TEST_MONGODB_URI` guard).
- **`tests/modules/scholarshipReport.test.js`** *(new)* — DB-backed coverage for
  CSV export, PDF export, and application-status stats.
- **`mongodb-memory-server`** added to `backend` devDependencies.

---

## Current status
`npm test` → **5 suites, 19 tests passing** (health, notification events,
password reset, user model, scholarship reporting).
