# Emergent Agent System: Hosting Guide

This guide provides detailed instructions for deploying the Emergent Agent System to various production environments. Follow these steps to host the application securely and efficiently.

## Hosting Options

The Emergent Agent System can be deployed in several ways:

1. **Traditional VPS/Dedicated Server**: Using services like DigitalOcean, Linode, AWS EC2, etc.
2. **Docker/Container Orchestration**: Using Docker and Kubernetes
3. **Platform as a Service (PaaS)**: Using services like Heroku, Render, Railway, etc.

This guide will focus primarily on the first two options, which offer more flexibility.

## Option 1: Traditional VPS Deployment

### Prerequisites

- A Linux VPS (Ubuntu 20.04+ recommended)
- SSH access to the server
- Domain name (optional but recommended)
- Basic understanding of Linux, Nginx, and server configuration

### Step 1: Server Preparation

Update your server and install required dependencies:

```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nodejs npm git nginx supervisor

# Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod

# Install Yarn
npm install -g yarn
```

### Step 2: Clone the Repository

```bash
# Create a directory for the application
mkdir -p /var/www/emergent-agent
cd /var/www/emergent-agent

# Clone the repository
git clone https://github.com/yourusername/emergent-agent-system.git .
```

### Step 3: Set Up the Backend

```bash
cd /var/www/emergent-agent/backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn
```

Create a `.env` file for the backend:

```bash
echo 'MONGO_URL="mongodb://localhost:27017"' > .env
echo 'DB_NAME="emergent_agent"' >> .env
echo 'JWT_SECRET="your-very-secure-secret-key"' >> .env
```

### Step 4: Set Up the Frontend

```bash
cd /var/www/emergent-agent/frontend

# Install dependencies
yarn install

# Create production build
yarn build
```

Create a `.env` file for the frontend (this is for production build):

```bash
echo 'REACT_APP_BACKEND_URL=/api' > .env
```

### Step 5: Configure Supervisor

Create a supervisor configuration file:

```bash
sudo nano /etc/supervisor/conf.d/emergent-agent.conf
```

Add the following content:

```ini
[program:emergent-agent-backend]
command=/var/www/emergent-agent/backend/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app -b 0.0.0.0:8001
directory=/var/www/emergent-agent/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/emergent-agent-backend.err.log
stdout_logfile=/var/log/supervisor/emergent-agent-backend.out.log
```

Update supervisor to load the new configuration:

```bash
sudo supervisorctl reread
sudo supervisorctl update
```

### Step 6: Configure Nginx

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/emergent-agent
```

Add the following content (replace yourdomain.com with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        root /var/www/emergent-agent/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/emergent-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Set Up SSL (Optional but Recommended)

Install Certbot to obtain and configure an SSL certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 8: Firewall Configuration

Configure a firewall to allow only necessary traffic:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

## Option 2: Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- Basic understanding of Docker concepts
- A server to host your Docker containers

### Step 1: Create Docker Files

Create a `Dockerfile` for the backend:

```bash
cd /path/to/emergent-agent-system/backend
nano Dockerfile
```

Add the following content:

```dockerfile
FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

Create a `Dockerfile` for the frontend:

```bash
cd /path/to/emergent-agent-system/frontend
nano Dockerfile
```

Add the following content:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create an Nginx configuration file for the frontend:

```bash
cd /path/to/emergent-agent-system/frontend
nano nginx.conf
```

Add the following content:

```nginx
server {
    listen 80;
    
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 2: Create Docker Compose File

Create a `docker-compose.yml` file in the root directory:

```bash
cd /path/to/emergent-agent-system
nano docker-compose.yml
```

Add the following content:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: emergent-agent-mongodb
    volumes:
      - mongo-data:/data/db
    networks:
      - emergent-network
    restart: always

  backend:
    build: ./backend
    container_name: emergent-agent-backend
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=emergent_agent
      - JWT_SECRET=your-very-secure-secret-key
    depends_on:
      - mongodb
    networks:
      - emergent-network
    restart: always

  frontend:
    build: ./frontend
    container_name: emergent-agent-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - emergent-network
    restart: always

networks:
  emergent-network:
    driver: bridge

volumes:
  mongo-data:
```

### Step 3: Deploy with Docker Compose

Run the following command to build and start the containers:

```bash
docker-compose up -d
```

### Step 4: Set Up SSL with Docker (Optional)

For SSL with Docker, you can use a reverse proxy like Traefik or Nginx Proxy Manager, or modify the Nginx container to include SSL certificates.

## Option 3: Kubernetes Deployment

For larger scale deployments, Kubernetes offers advanced orchestration capabilities. Here's a basic outline:

1. Create Kubernetes deployment YAML files for each component
2. Set up a Kubernetes cluster (e.g., using GKE, EKS, AKS, or self-hosted)
3. Deploy the application using `kubectl apply`
4. Configure Ingress for routing external traffic

Detailed Kubernetes deployment instructions are beyond the scope of this guide.

## Monitoring and Maintenance

Regardless of the deployment method, implement the following:

### Monitoring

- Set up monitoring using tools like Prometheus and Grafana
- Configure alerting for critical issues
- Monitor resource usage (CPU, memory, disk space)

### Backup Strategy

- Regularly backup the MongoDB database
- Set up automated backups for application data
- Store backups in a secure, off-site location

### Updates and Maintenance

- Implement a CI/CD pipeline for automated updates
- Schedule regular maintenance windows
- Keep the operating system and all packages updated

## Security Considerations

- Implement proper authentication and authorization
- Use strong, unique passwords for all accounts
- Keep all software updated to patch security vulnerabilities
- Configure firewalls to restrict access to necessary ports only
- Use HTTPS for all connections
- Implement rate limiting to prevent abuse
- Regularly audit system logs for suspicious activity

## Scaling

As your user base grows, consider:

- Horizontal scaling of backend services
- MongoDB replication for database redundancy
- CDN for static frontend assets
- Load balancing for distributing traffic

## Conclusion

This guide provides a foundation for deploying the Emergent Agent System in various environments. Choose the deployment method that best suits your needs, resources, and expertise. For production environments, always prioritize security, reliability, and performance.