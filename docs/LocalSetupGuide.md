# Emergent Agent System: Local Setup Guide

This guide will walk you through the process of setting up and running the Emergent Agent System on your local machine for development and testing purposes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.9+**: Required for the backend
- **Node.js 18+**: Required for the frontend
- **Yarn**: Package manager for the frontend
- **MongoDB 5.0+**: Database for the system
- **Git**: For cloning the repository

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/emergent-agent-system.git
cd emergent-agent-system
```

## Step 2: Set Up the Backend

Navigate to the backend directory and set up a Python virtual environment:

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the backend directory with the following content:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="emergent_agent"
```

## Step 3: Set Up the Frontend

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend

# Install dependencies
yarn install
```

Create a `.env` file in the frontend directory with the following content:

```
REACT_APP_BACKEND_URL=http://localhost:8001/api
```

## Step 4: Start MongoDB

Ensure MongoDB is running on your local machine:

```bash
# Start MongoDB (command may vary depending on your installation method)
mongod --dbpath=/path/to/data/directory
```

## Step 5: Start the Backend

In a new terminal window, navigate to the backend directory and start the FastAPI server:

```bash
cd backend
source venv/bin/activate  # On Windows, use: venv\Scripts\activate

# Start the backend server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

You should see output indicating that the server is running at http://0.0.0.0:8001.

## Step 6: Start the Frontend

In another terminal window, navigate to the frontend directory and start the React development server:

```bash
cd frontend

# Start the frontend development server
yarn start
```

The React app should automatically open in your default browser at http://localhost:3000.

## Step 7: Verify the Setup

To ensure everything is working correctly:

1. The frontend should be accessible at http://localhost:3000
2. The backend API should be accessible at http://localhost:8001/api
3. MongoDB should be running and accessible by the backend

## Using Supervisor for Process Management (Optional)

For convenience, you can use Supervisor to manage all processes. Create a file named `supervisord.conf` with the following content:

```ini
[program:mongodb]
command=mongod --bind_ip 0.0.0.0
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/mongodb.err.log
stdout_logfile=/var/log/supervisor/mongodb.out.log

[program:backend]
command=/path/to/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
directory=/path/to/emergent-agent-system/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log

[program:frontend]
command=yarn start
directory=/path/to/emergent-agent-system/frontend
autostart=true
autorestart=true
environment=PORT=3000,WDS_SOCKET_PORT=0
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
```

Then start Supervisor:

```bash
supervisord -c supervisord.conf
```

## Troubleshooting

### Backend Issues

- **Database Connection Error**: Ensure MongoDB is running and accessible.
- **Missing Dependencies**: Verify all Python packages are installed with `pip install -r requirements.txt`.
- **Port Conflicts**: If port 8001 is already in use, change it in the uvicorn command and update the frontend's `.env` file.

### Frontend Issues

- **API Connection Errors**: Verify the backend is running and the `REACT_APP_BACKEND_URL` is correctly set.
- **Missing Node Modules**: Run `yarn install` to ensure all dependencies are installed.
- **Build Errors**: Check the console for specific error messages.

### MongoDB Issues

- **Connection Refused**: Ensure MongoDB is running and listening on the default port (27017).
- **Authentication Errors**: If you've set up MongoDB with authentication, update the `MONGO_URL` in the backend `.env` file.

## Next Steps

After setting up your local environment, you can:

- Explore the agent interface at http://localhost:3000
- Review and modify the codebase to add new features
- Develop new tools for the agent to use
- Test the system's performance and responsiveness

For production deployment, refer to the hosting guide.