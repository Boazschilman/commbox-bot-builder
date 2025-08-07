# 🤖 Commbox Bot Builder

Convert Draw.io diagrams to Commbox bot XML format automatically!

## 🌟 Features

- **Upload Draw.io Files**: Drag and drop or select `.drawio` or `.xml` files
- **Automatic Conversion**: Converts Draw.io flow diagrams to Commbox XML format
- **Node Recognition**: Automatically detects special nodes:
  - מעבר לנציג (Transfer to agent)
  - לא ידוע (Unknown)
  - שגיאה (Error)
  - סיום (End)
  - קלט (Input)
- **Beautiful UI**: Modern, responsive interface with Hebrew support
- **Cloud Deployment**: Frontend on Vercel, Backend on Render

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ (for local development)
- GitHub account
- Vercel account (free)
- Render account (free)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/commbox-bot-builder.git
cd commbox-bot-builder
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Set up environment variables**

Backend `.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Frontend `.env.local`:
```env
VITE_API_URL=http://localhost:5000
```

### Development

Run both frontend and backend:

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health check: http://localhost:5000/health

## 📁 Project Structure

```
commbox-bot-builder/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx        # Main application component
│   │   └── ...
│   └── package.json
├── backend/               # Node.js + Express API
│   ├── src/
│   │   └── index.js      # API server with all logic
│   └── package.json
└── README.md
```

## 🌐 Deployment

### Backend on Render

1. Connect GitHub repository to Render
2. Set root directory: `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variable: `FRONTEND_URL`

### Frontend on Vercel

1. Import GitHub repository to Vercel
2. Set root directory: `frontend`
3. Framework preset: Vite
4. Add environment variable: `VITE_API_URL` (your Render URL)

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/converter/convert` | POST | Convert Draw.io to Commbox XML |
| `/api/test` | GET | Test endpoint |

## 📝 Usage

1. **Create a Draw.io diagram**
   - Use Draw.io to create your bot flow
   - Include special nodes (transfer, error, etc.)
   - Export as XML

2. **Upload to the converter**
   - Visit your deployed frontend
   - Upload the Draw.io file
   - Click "Process"

3. **Download Commbox XML**
   - Review the generated XML
   - Download the file
   - Import to Commbox

## 🛠️ Technologies

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, Pako, XML2JS
- **Deployment**: Vercel (Frontend), Render (Backend)

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Known Issues

- Large files (>10MB) are not supported
- Complex Draw.io diagrams may need manual adjustments
- Some special characters in node names may cause issues

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ for Commbox# commbox-bot-builder
