# Whatsapp Connector API

This project provides a headless, multi-session WhatsApp Gateway built with Node.js, Hono, and wa-multi-session. It is designed to be a backend service that exposes a secure API for other applications, such as a Frappe ERPNext site, to interact with.

## Prerequisites

- Node.js v18 or later

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Mazen-Almortada/whatsapp-connector-api.git
cd whatsapp-connector-api
```

2. Install dependencies:

```bash
npm install
```

## Configuration

Create a `.env` file in the root of the project by copying the `.env.example` file.

Fill in the required environment variables, especially `SERVICE_API_KEY`, which is required for client applications to authenticate.

```env
# Application Port
PORT=5001

# The secret API key that client applications (like Frappe) must provide
SERVICE_API_KEY=your-super-secret-key
```

## Running the Server

For development (with auto-reload):

```bash
npm run dev
```

For production:

```bash
npm run start
```

The API will be available at `http://localhost:5001`.
