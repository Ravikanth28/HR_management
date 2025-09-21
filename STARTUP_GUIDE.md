# HR Management Portal - Startup Guide

This guide will help you get the HR Management Portal up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** - [Download here](https://www.mongodb.com/try/download/community) or use MongoDB Atlas
- **Git** (optional) - [Download here](https://git-scm.com/)

## Quick Start

### 1. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On Windows
   net start MongoDB
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update the `MONGODB_URI` in backend `.env` file

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # The .env file is already created with default values
   # Update MONGODB_URI if using MongoDB Atlas
   # Update JWT_SECRET for production
   ```

4. Initialize the database with default data:
   ```bash
   npm run setup
   ```
   This will create:
   - Default admin user (admin@hrportal.com / admin123)
   - Default HR user (hr@hrportal.com / hr123)
   - Sample job roles

5. Start the backend server:
   ```bash
   npm run dev
   ```
   The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## Default Login Credentials

### Admin Account
- **Email:** admin@hrportal.com
- **Password:** admin123
- **Permissions:** Full access to all features

### HR Staff Account
- **Email:** hr@hrportal.com
- **Password:** hr123
- **Permissions:** Standard HR operations

## Testing the Application

### 1. Login
1. Open `http://localhost:3000` in your browser
2. Use the admin credentials to log in
3. You should see the dashboard with sample data

### 2. Upload Test Resumes
1. Navigate to the "Upload" page
2. Upload some sample PDF, DOC, or DOCX resumes
3. The system will automatically parse and score them

### 3. Manage Job Roles
1. Go to "Job Roles" page
2. View the default job roles created during setup
3. Add, edit, or manage job roles as needed

### 4. Review Candidates
1. Visit the "Candidates" page
2. View uploaded candidates with their ATS scores
3. Filter and sort candidates by various criteria
4. Click on individual candidates to see detailed information

## Project Structure

```
hr-management-portal/
├── backend/                 # Node.js Express API
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API endpoints
│   ├── middleware/         # Authentication middleware
│   ├── utils/              # Utility functions (parsing, scoring)
│   ├── uploads/            # Uploaded resume files
│   ├── scripts/            # Setup and utility scripts
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript definitions
│   │   └── contexts/       # React contexts
│   └── public/
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Resume Upload
- `POST /api/upload/resume` - Upload single resume
- `POST /api/upload/bulk-resumes` - Bulk upload resumes

### Candidates
- `GET /api/candidates` - Get all candidates (with filters)
- `GET /api/candidates/:id` - Get single candidate
- `PATCH /api/candidates/:id/status` - Update candidate status
- `GET /api/candidates/:id/resume` - Download resume
- `GET /api/candidates/stats/dashboard` - Dashboard statistics

### Job Roles
- `GET /api/job-roles` - Get all job roles
- `POST /api/job-roles` - Create job role
- `PUT /api/job-roles/:id` - Update job role
- `DELETE /api/job-roles/:id` - Delete job role

## Features Overview

### 🔐 Authentication
- Secure JWT-based authentication
- Role-based access control (Admin/HR)
- User registration and login

### 📄 Resume Processing
- Support for PDF, DOC, DOCX formats
- Automatic text extraction
- Candidate data parsing (name, email, skills, experience)
- Bulk upload capability

### 🎯 ATS Scoring
- Keyword-based matching algorithm
- Weighted skill scoring
- Experience level bonuses
- Education bonuses
- Real-time score calculation

### 👥 Candidate Management
- Comprehensive candidate profiles
- Status tracking (new, reviewed, shortlisted, etc.)
- Advanced filtering and sorting
- Resume download functionality

### 💼 Job Role Management
- Dynamic job role creation
- Skill requirements with weights
- Experience level specifications
- Department categorization

### 📊 Dashboard & Analytics
- Overview statistics
- Candidate distribution charts
- Top job roles analysis
- Recent activity tracking

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the connection string in `.env`
   - Verify network connectivity for Atlas

2. **Port Already in Use**
   - Backend (5000): Change `PORT` in `.env`
   - Frontend (3000): Use `PORT=3001 npm start`

3. **Resume Upload Fails**
   - Check file format (PDF, DOC, DOCX only)
   - Verify file size (max 10MB)
   - Ensure uploads directory exists

4. **Build Errors**
   - Delete `node_modules` and run `npm install` again
   - Clear npm cache: `npm cache clean --force`

### Getting Help

1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure MongoDB is running and accessible
4. Check network connectivity

## Production Deployment

For production deployment:

1. **Environment Variables**
   - Set strong JWT_SECRET
   - Use production MongoDB URI
   - Set NODE_ENV=production

2. **Security**
   - Enable HTTPS
   - Set up proper CORS policies
   - Implement rate limiting
   - Use environment-specific configurations

3. **Performance**
   - Enable MongoDB indexing
   - Implement caching
   - Optimize file storage
   - Set up monitoring

## Next Steps

Once you have the application running:

1. **Customize Job Roles** - Add your organization's specific job roles
2. **Upload Test Data** - Try uploading various resume formats
3. **Configure Settings** - Adjust ATS scoring weights as needed
4. **User Management** - Create accounts for your HR team
5. **Integration** - Consider integrating with your existing HR systems

## Support

For questions or issues:
- Check the troubleshooting section above
- Review the API documentation
- Examine the console logs for detailed error messages

Happy hiring! 🎉
