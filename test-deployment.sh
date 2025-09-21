#!/bin/bash

# HR Management Portal - Test Deployment Script
# This script tests the deployment and functionality of the HR Management Portal

echo "🚀 HR Management Portal - Test Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version is too old. Please install Node.js v16 or higher."
    exit 1
fi

print_status "Node.js $(node -v) is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi

print_status "npm $(npm -v) is installed"

# Check if MongoDB is running (optional check)
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.runCommand('ping')" --quiet &> /dev/null; then
        print_status "MongoDB is running"
    else
        print_warning "MongoDB might not be running locally. Make sure MongoDB is accessible."
    fi
else
    print_warning "MongoDB shell not found. Make sure MongoDB is installed and running."
fi

echo ""
echo "Setting up Backend..."
echo "===================="

# Navigate to backend directory
cd backend || { print_error "Backend directory not found"; exit 1; }

# Install backend dependencies
echo "Installing backend dependencies..."
if npm install; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found in backend directory"
    exit 1
fi

print_status ".env file found"

# Run database setup
echo "Setting up database..."
if npm run setup; then
    print_status "Database setup completed"
else
    print_error "Database setup failed"
    exit 1
fi

# Start backend server in background
echo "Starting backend server..."
npm run dev &
BACKEND_PID=$!
sleep 5

# Test backend health
if curl -s http://localhost:5000/api/health > /dev/null; then
    print_status "Backend server is running on port 5000"
else
    print_error "Backend server failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "Setting up Frontend..."
echo "====================="

# Navigate to frontend directory
cd ../frontend || { print_error "Frontend directory not found"; kill $BACKEND_PID; exit 1; }

# Install frontend dependencies
echo "Installing frontend dependencies..."
if npm install; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    kill $BACKEND_PID
    exit 1
fi

# Build frontend (test compilation)
echo "Testing frontend build..."
if npm run build; then
    print_status "Frontend build successful"
else
    print_error "Frontend build failed"
    kill $BACKEND_PID
    exit 1
fi

# Start frontend server in background
echo "Starting frontend development server..."
npm start &
FRONTEND_PID=$!
sleep 10

# Test frontend
if curl -s http://localhost:3000 > /dev/null; then
    print_status "Frontend server is running on port 3000"
else
    print_error "Frontend server failed to start"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "Running API Tests..."
echo "==================="

# Test authentication endpoint
echo "Testing authentication..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrportal.com","password":"admin123"}')

if echo "$AUTH_RESPONSE" | grep -q "token"; then
    print_status "Authentication test passed"
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    print_error "Authentication test failed"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Test job roles endpoint
echo "Testing job roles API..."
JOB_ROLES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/job-roles)

if echo "$JOB_ROLES_RESPONSE" | grep -q "jobRoles"; then
    print_status "Job roles API test passed"
else
    print_error "Job roles API test failed"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Test candidates endpoint
echo "Testing candidates API..."
CANDIDATES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/candidates)

if echo "$CANDIDATES_RESPONSE" | grep -q "candidates"; then
    print_status "Candidates API test passed"
else
    print_error "Candidates API test failed"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Deployment Test Completed Successfully!"
echo "=========================================="
echo ""
echo "Application URLs:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo ""
echo "Default Login Credentials:"
echo "Admin:    admin@hrportal.com / admin123"
echo "HR Staff: hr@hrportal.com / hr123"
echo ""
echo "The servers are running in the background."
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for user input to stop servers
trap 'echo ""; echo "Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Keep script running
while true; do
    sleep 1
done
