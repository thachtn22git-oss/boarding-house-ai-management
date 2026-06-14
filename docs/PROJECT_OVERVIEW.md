# Project Overview

Boarding House AI Management is a multi-portal management system for boarding house operations.

## Applications

- `apps/web-admin`: React, TypeScript, Vite web portal for admin, owner, and tenant users.
- `apps/mobile-owner`: Expo React Native mobile app with owner and tenant role flows.
- `apps/mobile-tenant`: Expo React Native tenant-focused mobile app kept for compatibility/testing.
- `services/ai-server`: FastAPI AI server for feedback classification and dashboard demos.

## Core Modules

- Authentication and role-based routing
- Owner dashboard, room, tenant, contract, invoice, utility, feedback, analytics, notifications, chat, and AI Assistant
- Tenant home, room, contract, invoice, utility, feedback, notifications, and chat
- Admin dashboard, users, owners, tenants, notifications, analytics, and system overview
- Demo VietQR payment for invoices and utility bills
- AI feedback classification and persistent AI Assistant conversations

## Data Stores

Firebase Firestore:

- `users`
- `rooms`
- `tenants`
- `contracts`
- `invoices`
- `utilityReadings`
- `feedbacks`
- `notifications`

Supabase:

- `chat_rooms`
- `chat_messages`
- `ai_conversations`
- `ai_messages`
- `ai_usage_logs`

AI server local files:

- `services/ai-server/datasets/feedback_dataset.csv`
- trained model files under `services/ai-server/app/models`

## Integration Principles

- Firebase Auth is the identity source.
- Firestore stores management CRUD and notification data.
- Supabase stores realtime chat and AI Assistant history.
- Mobile and web share the same Firebase and Supabase data models.
- Payment flows are demo-only and never process real money.

