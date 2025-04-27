# Microblog Platform

A lightweight, modern microblog platform with a clean interface and solid fundamentals. This project powers [maxua.com](https://maxua.com) and can be adapted to run your own personal blog.

## Features

- 🚀 Clean, minimal design focused on content
- 📝 Markdown rendering for posts
- 🏷️ Topic-based organization
- 💬 Built-in comments system
- 🔍 Search functionality
- 📊 Basic analytics
- 📱 Responsive design that works on all devices
- 🌐 SEO optimized
- 📬 Email subscription system
- 🔄 Social media integration (Telegram, Bluesky)
- 🔌 API for headless usage

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Frontend**: Vanilla JavaScript with minimal dependencies
- **Templates**: Handlebars for server-side rendering
- **Deployment**: Ready for deployment on Fly.io

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/microblog.git
   cd microblog
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a PostgreSQL database:
   ```bash
   createdb microblog
   ```

4. Copy `.env.example` to `.env` and configure your environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

5. Run database migrations:
   ```bash
   npm run migrate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Visit `http://localhost:8080` in your browser

### Configuration

The main configuration is done through environment variables in the `.env` file:

- `DATABASE_URL`: PostgreSQL connection string
- `ADMIN_PASSWORD`: Password for the admin dashboard
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment mode (development/production)

Additional integrations:
- `TELEGRAM_BOT_TOKEN`: For Telegram sharing
- `RESEND_API_KEY`: For email delivery
- `BLUESKY_USERNAME` and `BLUESKY_PASSWORD`: For Bluesky integration

## Deployment

### Fly.io Deployment

The project includes a `fly.toml` configuration for easy deployment to Fly.io:

```bash
flyctl deploy
```

### Manual Deployment

For other platforms, ensure:
1. Environment variables are properly set
2. Database migrations are run
3. Node.js server can start with `npm start`

## Project Structure

- `server/`: Backend code
  - `routes/`: API routes
  - `middleware/`: Express middleware
  - `templates/`: Handlebars templates
- `public/`: Static assets
  - `css/`: Stylesheets
  - `js/`: Client-side JavaScript
  - `images/`: Image assets
- `migrations/`: Database migrations
- `scripts/`: Utility scripts

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Originally created by [Max Ischenko](https://maxua.com)
- Inspired by minimalist blogging platforms and the idea that content should be the focus
