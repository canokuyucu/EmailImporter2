# EmailImporter2

EmailImporter2 is an open-source automation project for processing EİDS authorization emails and turning incoming email data into a structured, searchable workflow.

The project combines email parsing, Google Sheets synchronization, Telegram notifications, and scheduled background tasks to reduce repetitive manual work.

## ✨ What it does

- 📧 Connects to Gmail via IMAP and scans EİDS-related messages
- 🔎 Extracts authorization/property reference numbers, names, dates, and email timestamps
- 📊 Stores structured records in Google Sheets
- 🤖 Provides a Telegram bot for search, status checks, listings, and notifications
- ⏰ Calculates authorization status and highlights records approaching expiration
- 🔔 Sends notifications when new authorization records are detected
- ☁️ Supports environment-based credentials for deployment
- 🧩 Includes TypeScript/Node.js workspace components for extending the project

## 🏗️ Main components

- `eids.py` — Gmail parsing, EİDS record processing, Google Sheets synchronization, and Telegram commands
- `telegram_bot.py` — Telegram-based system and record management utilities
- `main.py` — application entry point
- `artifacts/` and `lib/` — workspace applications and shared libraries
- `scripts/` — utility scripts

## 🔐 Security

Credentials and tokens should be supplied through environment variables or deployment secrets.

Do not commit Gmail passwords, Google service-account files, Telegram bot tokens, API keys, or other private credentials to the repository.

If a credential is accidentally exposed, revoke and rotate it immediately.

## 🚀 Project goals

The project is being developed as a practical open-source automation tool. Future work focuses on:

- improving email parsing reliability
- better validation and error handling
- cleaner configuration and deployment
- automated testing
- improved documentation
- richer Telegram workflows
- more robust Google Sheets synchronization

## 🤝 Contributing

Issues, suggestions, and pull requests are welcome. The project is intended to evolve through real-world usage and iterative open-source development.

## 📄 License

License information will be added as the project matures.
