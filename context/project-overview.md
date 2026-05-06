# Agility Travels

## Overview

Agility Travels is a premium travel management platform for a Lahore-based agency specializing in Umrah, Haj, Visa services, and domestic Pakistan tours. It provides a high-end interface for travelers to browse and book packages, while offering a robust administrative dashboard for inventory and fulfillment management.

## Goals

1. Provide a seamless, premium booking experience for religious and domestic travelers.
2. Centralize package management, including real-time inventory and pricing updates.
3. Automate booking fulfillment workflows for administrators.
4. Maintain a secure and scalable infrastructure using Firebase.

## Core User Flow

1. **Discovery**: User lands on the home page and explores featured packages.
2. **Authentication**: User signs in using Google Login.
3. **Selection**: User filters or searches for a specific package (e.g., Umrah 14 Days).
4. **Booking**: User enters passenger details and submits a booking request.
5. **Tracking**: User monitors booking status from their personal dashboard.
6. **Management (Admins)**: Admin reviews bookings, updates status, and manages catalog.

## Features

### Traveler Side
- Professional landing page with category-based exploration.
- Advanced package filtering (Umrah, Haj, Domestic, Private).
- Secure Google Authentication.
- User profile and booking history dashboard.

### Admin Dashboard
- Real-time revenue and inventory analytics.
- Full catalog management with multiple image uploads (Firebase Storage).
- Booking fulfillment workflow (Pending, Confirmed, Completed).
- User directory management.

## Scope

### In Scope
- Core booking engine for Umrah and Domestic packages.
- Admin dashboard for inventory and fulfillment.
- Firebase integration (Auth, Firestore, Storage).
- Responsive, premium UI design.

### Out of Scope
- Direct local payment gateway integration (currently manual/bank transfer).
- Real-time chat (planned for V2).
- AI Itinerary generator.

## Success Criteria

1. A user can find and book a package within 3 minutes.
2. Administrators can update the entire catalog without manual database edits.
3. The platform survives high-traffic periods (e.g., Ramadan prep) via Firebase scalability.
