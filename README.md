# MediQ Backend

## Description

The MediQ Backend is a Node.js and Express-based application designed to manage and facilitate the online sale and distribution of medicines. It provides a comprehensive set of APIs for user authentication, store management, medicine inventory, order processing, and location-based services. The backend integrates with MongoDB for data storage and utilizes Mongoose for schema modeling. It also integrates with external APIs like OpenFDA to provide comprehensive medicine information.

## Features

- **User Authentication and Authorization:** Secure user registration and login using JWT and bcrypt for password hashing. Role-based access control (RBAC) for different user roles (admin, store-owner, customer).
- **Store Management:** APIs for managing store information, including creation, retrieval, and updates.
- **Medicine Management:** APIs for managing medicine information, including integration with external APIs like OpenFDA for comprehensive data.
- **Inventory Management:** APIs for managing store inventory, including adding, updating, and deleting medicines.
- **Order Management:** APIs for creating, retrieving, updating, and deleting orders.
- **Location-Based Services:** Geospatial queries to find nearby stores with specific medicines.
- **Request Management:** APIs for store-owner requests and admin approval workflow.
- **Comprehensive Error Handling:** Centralized error handling middleware for consistent error responses.

## Technologies Used

- Node.js
- Express
- Mongoose
- MongoDB
- JSON Web Tokens (JWT)
- bcrypt
- cors
- express-async-handler
- axios

## Setup Instructions

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd MediQBackend
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    - Create a `.env` file in the root directory.
    - Add the following environment variables:

      ```
      PORT=3000 # Or any other port
      MONGODB_URI=<your-mongodb-connection-string>
      JWT_SECRET=<your-jwt-secret>
      OPENFDA_API_KEY=<your-openfda-api-key> # Optional
      FRONTEND_URL=http://localhost:4000 # Replace with your frontend URL
      ```

      Replace the placeholder values with your actual configuration.

4.  **Run the application:**

    ```bash
    npm start
    ```

    This will start the server using nodemon, which automatically restarts the server on file changes.

## API Endpoints

The backend provides the following API endpoints:

- **/auth**: User registration and login
  - `POST /auth/register`: Register a new user
  - `POST /auth/login`: Login an existing user
- **/user**: User management
  - `GET /user`: Get user profile (requires authentication)
  - `PUT /user`: Update user profile (requires authentication)
  - `GET /user/store`: Get store details for authenticated store-owner (requires authentication)
  - `PUT /user/store`: Update store details for authenticated store-owner (requires authentication)
  - `GET /user/data`: Get all users (requires admin role)
  - `GET /user/:id`: Get a user by ID (requires admin role)
  - `PUT /user/:id`: Update a user by ID (requires admin role)
  - `DELETE /user/:id`: Delete a user by ID (requires admin role)
- **/medicine**: Medicine management
  - `GET /medicine`: Get all medicines (requires authentication)
  - `POST /medicine`: Create a new medicine (requires admin or store-owner role)
  - `GET /medicine/:id`: Get a medicine by ID (requires authentication)
  - `PUT /medicine/:id`: Update a medicine by ID (requires admin role)
- **/request**: Store request management
  - `GET /request`: Get all requests (requires admin role)
  - `POST /request`: Create a new request (requires admin or customer role)
  - `PUT /request/:id`: Update a request by ID (requires admin role)
  - `GET /request/check`: Get auth request (requires authentication)
- **/inventory**: Inventory management
  - `GET /inventory`: Get all inventory items for authenticated store-owner (requires authentication)
  - `POST /inventory`: Create a new inventory item for authenticated store-owner (requires authentication)
  - `PUT /inventory/:id`: Update an inventory item for authenticated store-owner (requires authentication)
  - `DELETE /inventory/:id`: Delete an inventory item for authenticated store-owner (requires authentication)
  - `GET /inventory/dev`: Get all inventory items (requires admin role)
  - `POST /inventory/dev`: Create a new inventory item (requires admin role)
  - `PUT /inventory/dev/:id`: Update an inventory item (requires admin role)
  - `DELETE /inventory/dev/:id`: Delete an inventory item (requires admin role)
  - `GET /inventory/stores-with-medicine-nearby`: Find nearby stores with a specific medicine (requires authentication)
- **/order**: Order management
  - `GET /order`: Get all orders for authenticated store-owner (requires authentication)
  - `POST /order`: Create a new order for authenticated store-owner (requires authentication)
  - `PUT /order/:id`: Update an order by ID (requires store-owner role)
  - `DELETE /order/:id`: Delete an order by ID (requires store-owner role)
  - `GET /order/dev`: Get all orders (requires admin role)
  - `POST /order/dev`: Add a new order (requires admin role)
- **/address**: Address management
  - `GET /address`: Get all addresses (requires admin role)
  - `POST /address`: Create a new address (requires admin role)
  - `GET /address/auth`: Get address for authenticated store-owner (requires authentication)
  - `PUT /address/auth`: Update address for authenticated store-owner (requires authentication)
  - `GET /address/:city`: Get addresses by city
  - `GET /address/:latitude/:longitude`: Get addresses by latitude and longitude
- **/search**: Medicine search
  - `GET /search`: Search medicines (from DB or OpenFDA)
  - `GET /search/:id`: Get medicine details by ID (from DB or OpenFDA)

## Models

The backend uses the following Mongoose models:

- [`User`](models/user.js): Represents a user account.
- [`Store`](models/store.js): Represents a store.
- [`Address`](models/address.js): Represents a store address.
- [`Medicine`](models/medicine.js): Represents a medicine.
- [`Inventory`](models/inventory.js): Represents the inventory of a store.
- [`Order`](models/orders.js): Represents an order.
- [`Request`](models/request.js): Represents a store request.

## Middleware

The backend uses the following middleware:

- `authcheck`: Authenticates users using JWT.
- `roles`: Authorizes users based on their role.
- `errorHandler`: Handles errors and returns consistent error responses.
