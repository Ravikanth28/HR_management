# HR Management Portal

A full-stack web application for managing resumes, job roles, and candidate evaluation using ATS (Applicant Tracking System) scoring.

## Features

### Core Features
- **Resume Upload**: Support for bulk upload of resumes in PDF, DOC, and DOCX formats
- **Resume Parsing**: Automatic extraction of candidate data (name, contact info, education, work experience, skills)
- **Job Roles Management**: Predefined job roles with ability to add new roles dynamically
- **ATS Scoring**: Keyword-based scoring algorithm that matches resumes with job requirements
- **Resume Sorting**: Automatic categorization and ranking of candidates by job role and ATS score
- **Dashboard**: Admin interface with comprehensive candidate management

### Additional Features
- **Authentication**: Secure login system for HR staff
- **Search & Filter**: Advanced filtering by skills, job role, score, and status
- **Resume Download**: Direct download of candidate resumes
- **Bulk Operations**: Process multiple resumes simultaneously
- **Real-time Statistics**: Dashboard with candidate and job role analytics

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Router** for navigation

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **PDF-Parse** for PDF text extraction
- **Mammoth** for DOCX text extraction

## Project Structure

```
hr-management-portal/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── public/
│   └── package.json
├── backend/                 # Node.js backend API
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   ├── uploads/            # Uploaded resume files
│   └── server.js           # Main server file
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/hr-management-portal
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Database Setup
1. Make sure MongoDB is running on your system
2. The application will automatically create the necessary collections
3. Use the API endpoint `/api/job-roles/initialize-defaults` to create default job roles

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Resume Upload
- `POST /api/upload/resume` - Upload single resume
- `POST /api/upload/bulk-resumes` - Bulk upload resumes

### Candidates
- `GET /api/candidates` - Get all candidates (with filtering)
- `GET /api/candidates/:id` - Get single candidate
- `PATCH /api/candidates/:id/status` - Update candidate status
- `GET /api/candidates/:id/resume` - Download candidate resume
- `DELETE /api/candidates/:id` - Delete candidate
- `GET /api/candidates/grouped/by-job-role` - Get candidates grouped by job roles
- `GET /api/candidates/stats/dashboard` - Get dashboard statistics

### Job Roles
- `GET /api/job-roles` - Get all job roles
- `GET /api/job-roles/:id` - Get single job role
- `POST /api/job-roles` - Create new job role
- `PUT /api/job-roles/:id` - Update job role
- `DELETE /api/job-roles/:id` - Delete job role
- `POST /api/job-roles/initialize-defaults` - Initialize default job roles

## Default Job Roles

The application comes with predefined job roles:
- **Software Engineer**: JavaScript, React, Node.js, Git, SQL
- **Data Analyst**: Python, SQL, Excel, Data Analysis, Tableau
- **HR Executive**: Communication, Leadership, Project Management, Excel
- **UI/UX Designer**: Figma, UI/UX, Design, Photoshop, Illustrator

## ATS Scoring Algorithm

The ATS scoring system evaluates candidates based on:

1. **Skill Matching (0-80 points)**: Weighted matching of required skills
2. **Experience Level (0-10 points)**: Bonus for matching experience requirements
3. **Education (0-10 points)**: Bonus for relevant educational background

### Scoring Breakdown
- **Direct Skill Match**: Skills explicitly listed in resume
- **Text Match**: Skills mentioned in resume content
- **Experience Bonus**: Based on years of experience vs. job requirements
- **Education Bonus**: Relevant degree or certification

## Usage

### For HR Administrators
1. **Login**: Use your credentials to access the dashboard
2. **Upload Resumes**: Use single or bulk upload for candidate resumes
3. **Manage Job Roles**: Add, edit, or deactivate job roles as needed
4. **Review Candidates**: View candidates sorted by ATS scores
5. **Update Status**: Track candidate progress through hiring pipeline
6. **Download Resumes**: Access original resume files for detailed review

### For System Administrators
1. **User Management**: Create accounts for HR staff
2. **Job Role Configuration**: Set up and maintain job role requirements
3. **System Monitoring**: Monitor upload statistics and system performance

## Development

### Adding New Features
1. **Backend**: Add new routes in the `routes/` directory
2. **Frontend**: Create new components in the `components/` directory
3. **Database**: Define new schemas in the `models/` directory

### Customizing ATS Scoring
Modify the scoring algorithm in `backend/utils/atsScoring.js` to adjust:
- Skill weight calculations
- Experience level bonuses
- Education scoring criteria

## Security Considerations

- JWT tokens for authentication
- File type validation for uploads
- Input sanitization and validation
- Secure file storage
- Environment variable configuration

## Future Enhancements

- **Interview Scheduling**: Calendar integration for interview management
- **Email Integration**: Automated candidate communication
- **Advanced Analytics**: Detailed reporting and insights
- **Machine Learning**: Enhanced resume parsing and scoring
- **Integration APIs**: Connect with external HR systems
- **Mobile App**: Mobile interface for on-the-go access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository or contact the development team.
