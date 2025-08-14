# Overview

This is a modern full-stack taxi booking application built with React, Express, and Firebase. The system supports two types of users: regular users who can book rides and taxi owners who can manage their fleet. The application features real-time messaging, interactive maps with Google Maps integration, user authentication, and a responsive UI built with shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Single-page application with conditional rendering based on authentication state

## Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM configured for PostgreSQL with schema migrations
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development
- **API Structure**: RESTful API with `/api` prefix for all endpoints
- **Development Setup**: Vite middleware integration for hot module replacement

## Authentication System
- **Provider**: Firebase Authentication for user management
- **Authorization**: Role-based access control with 'user' and 'owner' roles
- **Session Management**: Firebase auth state persistence with real-time auth state changes

## Database Schema
The application uses a PostgreSQL database with three main entities:
- **Users**: Stores user authentication data and roles
- **Taxis**: Contains taxi information including location, availability, and owner relationships
- **Messages**: Enables real-time messaging between users and taxi owners

## Real-time Features
- **Messaging**: Firebase Firestore for real-time chat functionality between users and taxi owners
- **Location Updates**: Live taxi location tracking and availability status
- **Authentication State**: Real-time authentication state synchronization across components

# External Dependencies

## Third-Party Services
- **Firebase**: Complete authentication and real-time database solution
  - Firebase Auth for user authentication
  - Firestore for real-time messaging and data synchronization
- **Google Maps API**: Interactive maps for taxi location display and route planning
- **Neon Database**: PostgreSQL hosting service for production database

## Key Libraries
- **Drizzle ORM**: Type-safe database queries and migrations
- **TanStack React Query**: Server state management and caching
- **Radix UI**: Accessible component primitives for the design system
- **React Hook Form**: Form validation and submission handling
- **Zod**: Runtime type validation and schema definitions

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds