# CareSync Backend

The backend service for **CareSync** — a healthcare platform for medicine discovery, pharmacy/store inventory management, order processing, and location-based store search.

Built with **Node.js** and **Express**, backed by **MongoDB/Mongoose**, with JWT-based authentication and role-based access control (admin, store-owner, customer). Integrates with the **OpenFDA API** for enriched medicine data.

> Companion repository: [CareSyncFrontend](https://github.com/Giyuu57/CareSyncFrontend)

---

## Features

- **Authentication & Authorization** — JWT-based auth, bcrypt password hashing, and role-based access control (admin / store-owner / customer).
- **Store Management** — create, retrieve, and update store profiles.
- **Medicine Catalog** — manage medicine records, enriched via the OpenFDA API.
- **Inventory Management** — per-store CRUD for stock, plus an admin-level (`/dev`) view across all stores.
- **Order Management** — create, update, and track orders per store.
- **Location-Based Search** — geospatial queries to find nearby stores carrying a specific medicine.
- **Store-Owner Request Workflow** — customers/store-owners submit requests, admins approve or reject.
- **Centralized Error Handling** — consistent JSON error responses across all routes.

## Tech Stack

| Layer          | Technology                                  |
|----------------|----------------------------------------------|
| Runtime        | Node.js (ES Modules)                        |
| Framework      | Express 4                                    |
| Database       | MongoDB with Mongoose                        |
| Auth           | JSON Web Tokens (JWT), bcrypt                |
| External APIs  | OpenFDA (medicine data), Google Auth Library |
| Dev tooling    | nodemon                                      |

## Project Structure

```
CareSyncBackend/
├── config/          # DB connection and app configuration
├── controllers/      # Route handler logic
├── middleware/        # Auth checks, role checks, error handling
├── models/            # Mongoose schemas (User, Store, Medicine, Order, etc.)
├── routes/            # Express route definitions
├── utils/             # Shared helper functions
├── app.js             # Application entry point
└── package.json
```

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A **MongoDB** instance — local, or a hosted connection string (e.g. MongoDB Atlas)
- *(Optional)* An **OpenFDA API key** for higher rate limits on medicine lookups
- *(Optional)* **Google OAuth credentials** if using Google sign-in

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Giyuu57/CareSyncBackend.git
cd CareSyncBackend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-jwt-secret>
OPENFDA_API_KEY=<your-openfda-api-key>       # Optional
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>  # Optional, required for Google sign-in
url=http://localhost:4000                     # URL of the CareSyncFrontend app (for CORS)
```

> `PORT` must match the port your frontend expects the backend on, and `url` must match the origin your frontend actually runs from — mismatches here are the most common source of CORS errors during local setup.

### 4. Run the application

```bash
# Development (auto-restarts on file changes via nodemon)
npm run dev

# Production
npm start
```

By default the API will be available at `http://localhost:3000`.

## API Reference

All endpoints are prefixed with the base URL (e.g. `http://localhost:3000`).

### Auth — `/auth`
| Method | Endpoint         | Description             |
|--------|------------------|--------------------------|
| POST   | `/auth/register` | Register a new user     |
| POST   | `/auth/login`    | Log in an existing user |

### User — `/user`
| Method | Endpoint          | Access          | Description                          |
|--------|-------------------|-----------------|---------------------------------------|
| GET    | `/user`           | Authenticated   | Get current user profile              |
| PUT    | `/user`           | Authenticated   | Update current user profile           |
| GET    | `/user/store`     | Store-owner     | Get authenticated store's details     |
| PUT    | `/user/store`     | Store-owner     | Update authenticated store's details  |
| GET    | `/user/data`      | Admin           | List all users                        |
| GET    | `/user/:id`       | Admin           | Get a user by ID                      |
| PUT    | `/user/:id`       | Admin           | Update a user by ID                   |
| DELETE | `/user/:id`       | Admin           | Delete a user by ID                   |

### Medicine — `/medicine`
| Method | Endpoint            | Access                | Description                  |
|--------|---------------------|------------------------|-------------------------------|
| GET    | `/medicine`         | Authenticated          | List all medicines            |
| POST   | `/medicine`         | Admin / Store-owner    | Create a new medicine record  |
| GET    | `/medicine/:id`     | Authenticated          | Get a medicine by ID          |
| PUT    | `/medicine/:id`     | Admin                  | Update a medicine by ID       |

### Requests — `/request`
| Method | Endpoint          | Access                 | Description                    |
|--------|-------------------|-------------------------|----------------------------------|
| GET    | `/request`        | Admin                   | List all requests                |
| POST   | `/request`        | Admin / Customer        | Create a new request              |
| PUT    | `/request/:id`    | Admin                   | Update a request by ID            |
| GET    | `/request/check`  | Authenticated           | Get the current auth request      |

### Inventory — `/inventory`
| Method | Endpoint                                   | Access         | Description                              |
|--------|---------------------------------------------|-----------------|---------------------------------------------|
| GET    | `/inventory`                                | Authenticated   | List inventory for authenticated store       |
| POST   | `/inventory`                                | Authenticated   | Add an inventory item for authenticated store|
| PUT    | `/inventory/:id`                            | Authenticated   | Update an inventory item                     |
| DELETE | `/inventory/:id`                            | Authenticated   | Delete an inventory item                     |
| GET    | `/inventory/dev`                            | Admin           | List inventory across all stores             |
| POST   | `/inventory/dev`                            | Admin           | Add an inventory item (any store)            |
| PUT    | `/inventory/dev/:id`                        | Admin           | Update an inventory item (any store)         |
| DELETE | `/inventory/dev/:id`                        | Admin           | Delete an inventory item (any store)         |
| GET    | `/inventory/stores-with-medicine-nearby`    | Authenticated   | Find nearby stores stocking a medicine       |

### Orders — `/order`
| Method | Endpoint       | Access        | Description                          |
|--------|----------------|----------------|----------------------------------------|
| GET    | `/order`       | Authenticated  | List orders for authenticated store    |
| POST   | `/order`       | Authenticated  | Create an order for authenticated store|
| PUT    | `/order/:id`   | Store-owner    | Update an order by ID                  |
| DELETE | `/order/:id`   | Store-owner    | Delete an order by ID                  |
| GET    | `/order/dev`   | Admin          | List all orders                        |
| POST   | `/order/dev`   | Admin          | Create an order (any store)            |

### Address — `/address`
| Method | Endpoint                        | Access        | Description                              |
|--------|----------------------------------|----------------|--------------------------------------------|
| GET    | `/address`                      | Admin          | List all addresses                          |
| POST   | `/address`                      | Admin          | Create a new address                        |
| GET    | `/address/auth`                 | Authenticated  | Get address for authenticated store         |
| PUT    | `/address/auth`                 | Authenticated  | Update address for authenticated store      |
| GET    | `/address/:city`                | Public         | Get addresses by city                       |
| GET    | `/address/:latitude/:longitude` | Public         | Get addresses near given coordinates        |

### Search — `/search`
| Method | Endpoint        | Description                                  |
|--------|------------------|------------------------------------------------|
| GET    | `/search`       | Search medicines (local DB, falls back to OpenFDA)|
| GET    | `/search/:id`   | Get medicine details by ID (local DB or OpenFDA)  |

## Data Models

| Model       | Description                          |
|-------------|----------------------------------------|
| `User`      | A user account (customer, store-owner, or admin) |
| `Store`     | A pharmacy/medical store profile        |
| `Address`   | A store's physical address & geolocation|
| `Medicine`  | A medicine record                       |
| `Inventory` | Stock held by a store                   |
| `Order`     | A customer/store order                  |
| `Request`   | A store-owner or customer request       |

## Middleware

- `authcheck` — validates the JWT and attaches the authenticated user to the request.
- `roles` — restricts a route to one or more user roles.
- `errorHandler` — catches thrown/async errors and returns a consistent JSON error shape.

## Testing the API

Sample requests are provided in [`Api Testing.txt`](./Api%20Testing.txt) — import these into Postman/Insomnia or adapt them into a formal collection.

## Deployment Notes

- Set `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `url` (the deployed frontend origin) as environment variables on your host (Render, Railway, Fly.io, etc.).
- Use `npm start` as the production start command — do not rely on nodemon in production.
- Ensure your MongoDB instance allows connections from your deployment host's IP (or use `0.0.0.0/0` with a strong password for platforms with dynamic egress IPs).

## Roadmap

- Automated test suite (unit + integration)
- API rate limiting and request validation middleware
- Swagger/OpenAPI documentation
- Refresh token support

## Author

**Gouransh Sattavan** — [@Giyuu57](https://github.com/Giyuu57)

## License

No license file is currently published for this repository. Add a `LICENSE` file (e.g. MIT) if you intend for this project to be reused by others.

## Disclaimer

CareSync is built for educational and project-demonstration purposes. It is not intended as a substitute for professional medical advice, diagnosis, or treatment.