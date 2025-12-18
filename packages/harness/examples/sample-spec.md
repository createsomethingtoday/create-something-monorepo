# User Dashboard Project

## Overview

Build a modern user dashboard with authentication, analytics, and settings management. The dashboard should follow CREATE SOMETHING's Canon design system and be deployable to Cloudflare Pages.

## Features

### Authentication
- Login with email and password
  - Form validation
  - Error handling
  - Loading states
- Magic link authentication
  - Email sending integration
  - Token verification
- Session management
  - JWT token storage
  - Automatic refresh
  - Logout functionality

### Dashboard Home
- Overview statistics cards
  - Total users count
  - Active sessions
  - Recent activity metrics
- Recent activity feed
  - Chronological list
  - Filter by type
  - Pagination
- Quick action buttons
  - Create new item
  - View reports
  - Settings shortcut

### User Profile
- Profile information display
  - Name, email, avatar
  - Account creation date
- Edit profile form
  - Input validation
  - Image upload
  - Success/error feedback
- Account deletion
  - Confirmation modal
  - Data export option

### Settings
- Notification preferences
  - Email notifications toggle
  - Push notifications toggle
  - Notification frequency
- Theme settings
  - Light/dark mode toggle
  - System preference detection
- Security settings
  - Change password
  - Two-factor authentication setup

### Analytics
- Usage charts
  - Line chart for trends
  - Bar chart for comparisons
- Data table with filtering
  - Column sorting
  - Search functionality
  - Export to CSV
- Date range picker
  - Preset ranges
  - Custom range selection

## Technical Requirements

- SvelteKit with TypeScript
- Canon design system tokens
- Cloudflare D1 for database
- Responsive layout (mobile-first)
- Accessibility (WCAG 2.1 AA)
