# Agility Travels - Development Blueprint & Documentation

## 1. Executive Summary
**Agility Travels** is a premium, full-stack travel management platform designed for a Lahore-based agency. It specializes in Umrah, Haj, Visa services, and Domestic Pakistan tours. The application provides a seamless experience for both travelers (booking and tracking) and administrators (inventory and fulfillment management).

---

## 2. Technical Stack
- **Frontend**: React 18+ with Vite (TypeScript).
- **Styling**: Tailwind CSS with custom design recipes (Orange/Slate theme).
- **Animations**: `motion/react` for fluid layout transitions.
- **Backend / Database**: Firebase Cloud Firestore.
- **Authentication**: Firebase Auth (Google Login with RBAC).
- **Storage**: Firebase Storage (Package assets & Passport copies).
- **Analytics**: Recharts for Administrative data visualization.

---

## 3. Data Architecture (Firestore)

### Core Entities
| Entity | Path | Description |
| :--- | :--- | :--- |
| **User** | `/users/{uid}` | Profile data, contact info, and role (`user` | `admin`). |
| **Package** | `/packages/{id}` | Travel offerings (Umrah, Haj, Domestic) with pricing and inventory. |
| **Booking** | `/bookings/{id}` | Transaction records linking users to specific packages. |
| **VisaRequest**| `/visaRequests/{id}`| Specialized workflow for visa service applications. |
| **Admin** | `/admins/{uid}` | Strict security marker for administrative privilege verification. |

### Relationships
- **One-to-Many**: A `User` can have multiple `Bookings`.
- **One-to-Many**: A `Package` can be associated with many `Bookings`.
- **Relational Integrity**: Bookings store a snapshot of `packageName` and `price` to preserve historical accuracy even if the base package is updated.

---

## 4. Key Features & Workflows

### A. Authentication & Security
- **Identity Provider**: Exclusively uses Google OAuth for verified identity.
- **Admin Lock**: The email `almalikaewan@gmail.com` is hardcoded as the root administrator in both Firestore Rules and the Frontend logic.
- **Security Rules**: 
    - Users can only read/write their own profiles and bookings.
    - Public can read Packages.
    - Only Admins can modify the Package catalog and update Booking statuses.

### B. Traveler Journey
- **Discovery**: Responsive landing page with featured Umrah and trending domestic packages.
- **Reservation**: Multi-step booking process including passenger details.
- **Dashboard**: Personal area to track booking status (Pending -> Confirmed -> Completed).

### C. Admin Intelligence Suite
- **Analytics Dashboard**: Real-time revenue tracking and inventory health bars.
- **Catalog Management**: Full CRUD operations for travel packages with Firebase Storage integration for multiple images.
- **Fulfillment Center**: Centralized list to approve/cancel bookings and manage client records.

---

## 5. Development & Deployment

### Environment Setup
1. Create a `.env` file based on `.env.example`.
2. Configure `firebase-applet-config.json` with your Firebase project credentials.
3. Enable **Google Sign-in** and **Firebase Storage** in the Firebase Console.

### Seeding Data
- Use the **"Seed Data"** button in the Admin Dashboard to populate the database with professional sample packages and synthetic records.

### Build & Deploy
```bash
npm run build   # Compiles the SPA to /dist
npm run lint    # Checks for type safety and code quality
```

---

## 6. Future Roadmap
- [ ] **AI Itinerary Generator**: Smart suggestions based on traveler history.
- [ ] **Payment Gateway**: Integration with local wallets (EasyPaisa/JazzCash).
- [ ] **Real-time Chat**: Direct support line between travelers and agents.
