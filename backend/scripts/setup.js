const mongoose = require('mongoose');
const User = require('../models/User');
const JobRole = require('../models/JobRole');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const setupDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Create default admin user
    const existingAdmin = await User.findOne({ email: 'admin@hrportal.com' });
    if (!existingAdmin) {
      const adminUser = new User({
        username: 'admin',
        email: 'admin@hrportal.com',
        password: 'admin123',
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Default admin user created');
      console.log('   Email: admin@hrportal.com');
      console.log('   Password: admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create default HR user
    const existingHR = await User.findOne({ email: 'hr@hrportal.com' });
    if (!existingHR) {
      const hrUser = new User({
        username: 'hrstaff',
        email: 'hr@hrportal.com',
        password: 'hr123',
        role: 'hr'
      });
      await hrUser.save();
      console.log('✅ Default HR user created');
      console.log('   Email: hr@hrportal.com');
      console.log('   Password: hr123');
    } else {
      console.log('ℹ️  HR user already exists');
    }

    // Create default job roles
    const existingJobRoles = await JobRole.countDocuments();
    if (existingJobRoles === 0) {
      const defaultJobRoles = [
        {
          title: 'Software Engineer',
          description: 'Develop and maintain software applications using modern technologies',
          requiredSkills: [
            { skill: 'JavaScript', weight: 3 },
            { skill: 'React', weight: 2 },
            { skill: 'Node.js', weight: 2 },
            { skill: 'Git', weight: 1 },
            { skill: 'SQL', weight: 1 }
          ],
          experienceLevel: 'mid',
          department: 'Engineering'
        },
        {
          title: 'Data Analyst',
          description: 'Analyze data to provide business insights and recommendations',
          requiredSkills: [
            { skill: 'Python', weight: 3 },
            { skill: 'SQL', weight: 3 },
            { skill: 'Excel', weight: 2 },
            { skill: 'Data Analysis', weight: 2 },
            { skill: 'Tableau', weight: 1 }
          ],
          experienceLevel: 'mid',
          department: 'Analytics'
        },
        {
          title: 'HR Executive',
          description: 'Manage human resources operations and employee relations',
          requiredSkills: [
            { skill: 'Communication', weight: 3 },
            { skill: 'Leadership', weight: 2 },
            { skill: 'Project Management', weight: 2 },
            { skill: 'Excel', weight: 1 }
          ],
          experienceLevel: 'mid',
          department: 'Human Resources'
        },
        {
          title: 'UI/UX Designer',
          description: 'Design user interfaces and user experiences for digital products',
          requiredSkills: [
            { skill: 'Figma', weight: 3 },
            { skill: 'UI/UX', weight: 3 },
            { skill: 'Design', weight: 2 },
            { skill: 'Photoshop', weight: 1 },
            { skill: 'Illustrator', weight: 1 }
          ],
          experienceLevel: 'mid',
          department: 'Design'
        },
        {
          title: 'Marketing Manager',
          description: 'Develop and execute marketing strategies to promote products and services',
          requiredSkills: [
            { skill: 'Marketing', weight: 3 },
            { skill: 'SEO', weight: 2 },
            { skill: 'Content Writing', weight: 2 },
            { skill: 'Social Media', weight: 2 },
            { skill: 'Analytics', weight: 1 }
          ],
          experienceLevel: 'senior',
          department: 'Marketing'
        }
      ];

      for (const jobRoleData of defaultJobRoles) {
        const jobRole = new JobRole(jobRoleData);
        await jobRole.save();
      }
      console.log('✅ Default job roles created');
    } else {
      console.log('ℹ️  Job roles already exist');
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nYou can now start the application:');
    console.log('Backend: npm run dev');
    console.log('Frontend: npm start');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

setupDatabase();
