# 🌐 AWS Deployment Guide

Esta guía te ayudará a deployar el experimento de failover en AWS usando EC2 con **instancias completamente separadas**.

## 🏗️ Arquitectura de Deployment

### Arquitectura de Producción (Requerida)
Cada componente debe ejecutarse en su propia instancia EC2 para simular un verdadero entorno distribuido:

```
Internet Gateway
       │
   Load Balancer (Opcional)
       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EC2 Instance  │    │   EC2 Instance  │    │   EC2 Instance  │    │   EC2 Instance  │
│    FRONTEND     │    │     PRIMARY     │    │     BACKUP      │    │     HEALTH      │
│                 │    │     BACKEND     │    │     BACKEND     │    │     CHECKER     │
│                 │    │                 │    │                 │    │                 │
│ PARTE 1:        │    │ PARTE 1:        │    │ PARTE 2:        │    │ PARTE 2:        │
│ • Frontend      │    │ • Backend Simple│    │ • Backend Backup│    │ • Health Monitor│
│   Port: 3000    │    │   Port: 3001    │    │   Port: 4001    │    │   Port: 4001    │
│                 │    │                 │    │                 │    │                 │
│ PARTE 2:        │    │ PARTE 2:        │    │                 │    │                 │
│ • Frontend Adv  │    │ • Backend Prim  │    │                 │    │                 │
│   Port: 4000    │    │   Port: 4001    │    │                 │    │                 │
│                 │    │                 │    │                 │    │                 │
│   Public IP     │    │   Private IP    │    │   Private IP    │    │   Private IP    │
│   (Web Access)  │    │   (Internal)    │    │   (Internal)    │    │   (Internal)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Importante**: Tanto la Parte 1 como la Parte 2 usan instancias completamente separadas:

- **Parte 1 (Simple)**: Frontend en instancia separada + Backend en instancia separada  
- **Parte 2 (Avanzado)**: Frontend + Primary Backend + Backup Backend + Health Checker (4 instancias)

**Nota**: La instancia Frontend sirve ambas interfaces (Parte 1 y 2) y la instancia Primary Backend sirve ambos backends (Parte 1 y 2) para eficiencia de recursos.

## 🚀 Setup Paso a Paso

### Paso 1: Crear 4 Instancias EC2 Separadas

#### Especificaciones de Instancias
```
Instancia 1 - Frontend (Ambas Partes):
- Nombre: failover-frontend
- Función: Sirve interfaces web de Parte 1 y Parte 2
- Puertos: 3000 (Parte 1), 4000 (Parte 2)
- AMI: Ubuntu Server 22.04 LTS
- Instance Type: t2.micro (Free tier) o t3.small
- Key Pair: tu-key-pair.pem
- Security Group: frontend-sg

Instancia 2 - Backend Primary (Ambas Partes):  
- Nombre: failover-backend-primary
- Función: Backend principal para Parte 1 y Parte 2
- Puertos: 3001 (Parte 1), 4001 (Parte 2)
- AMI: Ubuntu Server 22.04 LTS
- Instance Type: t2.micro (Free tier) o t3.small  
- Key Pair: tu-key-pair.pem
- Security Group: backend-primary-sg

Instancia 3 - Backend Backup (Solo Parte 2):
- Nombre: failover-backend-backup
- Función: Servidor de respaldo solo para Parte 2
- Puertos: 4001 (Parte 2 únicamente)
- AMI: Ubuntu Server 22.04 LTS
- Instance Type: t2.micro (Free tier) o t3.small
- Key Pair: tu-key-pair.pem  
- Security Group: backend-backup-sg

Instancia 4 - Health Checker (Solo Parte 2):
- Nombre: failover-health-checker
- Función: Monitoreo y control de failover para Parte 2
- Puertos: 4001 (API de health checking)
- AMI: Ubuntu Server 22.04 LTS
- Instance Type: t2.micro (Free tier) o t3.small
- Key Pair: tu-key-pair.pem
- Security Group: health-checker-sg
```

#### Security Groups

**Frontend Security Group (frontend-sg)**
```bash
Inbound Rules:
- Type: HTTP, Port: 80, Source: 0.0.0.0/0 (acceso público web)
- Type: Custom TCP, Port: 3000, Source: 0.0.0.0/0 (Parte 1 - Frontend Simple)
- Type: Custom TCP, Port: 4000, Source: 0.0.0.0/0 (Parte 2 - Frontend Advanced)  
- Type: SSH, Port: 22, Source: Tu IP pública

Outbound Rules:
- All traffic: 0.0.0.0/0
```

**Backend Primary Security Group (backend-primary-sg)**
```bash
Inbound Rules:
- Type: Custom TCP, Port: 3001, Source: frontend-sg (Parte 1 - Backend Simple)
- Type: Custom TCP, Port: 4001, Source: frontend-sg + health-checker-sg (Parte 2 - Backend Primary)
- Type: SSH, Port: 22, Source: Tu IP pública

Outbound Rules:
- All traffic: 0.0.0.0/0
```

**Backend Backup Security Group (backend-backup-sg)**
```bash
Inbound Rules:
- Type: Custom TCP, Port: 4001, Source: frontend-sg + health-checker-sg (Parte 2 - Backend Backup)
- Type: SSH, Port: 22, Source: Tu IP pública

Outbound Rules:
- All traffic: 0.0.0.0/0
```

**Health Checker Security Group (health-checker-sg)**  
```bash
Inbound Rules:
- Type: Custom TCP, Port: 4001, Source: frontend-sg (API de health checking)
- Type: SSH, Port: 22, Source: Tu IP pública

Outbound Rules:
- All traffic: 0.0.0.0/0 (necesario para conectar con backends)
```

### Paso 2: Configuración Base en Todas las Instancias Ubuntu

Ejecuta estos comandos en **TODAS las 4 instancias**:

```bash
# Conectar via SSH
ssh -i "tu-key.pem" ubuntu@[IP-DE-LA-INSTANCIA]

# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Verificar instalación
node --version  # Debe mostrar v18.x.x
npm --version   # Debe mostrar 9.x.x o superior

# 4. Instalar herramientas adicionales
sudo apt install -y git htop curl unzip

# 5. Crear usuario de aplicación (opcional pero recomendado)
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser

# 6. Crear directorios de trabajo
sudo mkdir -p /opt/failover-app
sudo chown -R ubuntu:ubuntu /opt/failover-app
cd /opt/failover-app
```

### Paso 3: Deployment por Instancia

## 📋 INSTANCIA 1: FRONTEND

```bash
# Conectar a la instancia frontend
ssh -i "tu-key.pem" ubuntu@[IP-FRONTEND]

# 1. Ir al directorio de trabajo
cd /opt/failover-app

# 2. Clonar el repositorio (o transferir archivos)
git clone https://github.com/jrpinto2005/disponibilidad.git .
# O transferir archivos: scp -i "tu-key.pem" -r aws-failover-experiment ubuntu@[IP]:/opt/failover-app

# 3. Configurar variables de entorno para Parte 1
cat > part1/frontend-simple/.env << EOF
PORT=3000
BACKEND_URL=http://[IP-BACKEND-PRIMARY]:3001
NODE_ENV=production
EOF

# 4. Configurar variables de entorno para Parte 2  
cat > part2/frontend-advanced/.env << EOF
PORT=4000
BACKEND_PRIMARY_URL=http://[IP-BACKEND-PRIMARY]:4001
BACKEND_BACKUP_URL=http://[IP-BACKEND-BACKUP]:4001
HEALTH_CHECKER_URL=http://[IP-HEALTH-CHECKER]:4001
NODE_ENV=production
EOF

# 5. Instalar dependencias
cd part1/frontend-simple && npm install --production
cd ../..
cd part2/frontend-advanced && npm install --production
cd ../..

# 6. Instalar PM2 globalmente
sudo npm install -g pm2

# 7. Crear archivos de configuración PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'frontend-simple',
      script: 'part1/frontend-simple/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'frontend-advanced',
      script: 'part2/frontend-advanced/server.js', 
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
EOF

# 8. Iniciar aplicaciones
pm2 start ecosystem.config.js

# 9. Configurar PM2 para autostart
pm2 startup
pm2 save

# 10. Verificar que está funcionando
pm2 status
curl localhost:3000  # Debe responder
curl localhost:4000  # Debe responder
```

## 📋 INSTANCIA 2: BACKEND PRIMARY

```bash
# Conectar a la instancia backend primary
ssh -i "tu-key.pem" ubuntu@[IP-BACKEND-PRIMARY]

# 1. Ir al directorio de trabajo
cd /opt/failover-app

# 2. Clonar el repositorio
git clone https://github.com/jrpinto2005/disponibilidad.git .

# 3. Configurar variables de entorno para Parte 1
cat > part1/backend-simple/.env << EOF
PORT=3001
SERVER_NAME=Backend-Simple-AWS
NODE_ENV=production
EOF

# 4. Configurar variables de entorno para Parte 2
cat > part2/backend-primary/.env << EOF
PORT=4001
SERVER_NAME=Backend-Primary-AWS
NODE_ENV=production
EOF

# 5. Instalar dependencias
cd part1/backend-simple && npm install --production
cd ../..
cd part2/backend-primary && npm install --production
cd ../..

# 6. Instalar PM2
sudo npm install -g pm2

# 7. Crear configuración PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'backend-simple',
      script: 'part1/backend-simple/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVER_NAME: 'Backend-Simple-AWS'
      }
    },
    {
      name: 'backend-primary',
      script: 'part2/backend-primary/server.js',
      instances: 1, 
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        SERVER_NAME: 'Backend-Primary-AWS'
      }
    }
  ]
};
EOF

# 8. Iniciar aplicaciones
pm2 start ecosystem.config.js

# 9. Configurar autostart
pm2 startup
pm2 save

# 10. Verificar funcionamiento
pm2 status
curl localhost:3001/health  # Debe responder con status healthy
curl localhost:4001/health  # Debe responder con status healthy
curl localhost:3001/api/test  # Debe responder con mensaje
curl localhost:4001/api/test  # Debe responder con mensaje
```

## 📋 INSTANCIA 3: BACKEND BACKUP

```bash
# Conectar a la instancia backend backup
ssh -i "tu-key.pem" ubuntu@[IP-BACKEND-BACKUP]

# 1. Ir al directorio de trabajo
cd /opt/failover-app

# 2. Clonar el repositorio
git clone https://github.com/jrpinto2005/disponibilidad.git .

# 3. Configurar variables de entorno
# Nota: Solo configuramos Part 2 ya que Part 1 no usa backup
cat > part2/backend-backup/.env << EOF
PORT=4001
SERVER_NAME=Backend-Backup-AWS
NODE_ENV=production
EOF

# 4. Instalar dependencias
cd part2/backend-backup && npm install --production
cd ../..

# 5. Instalar PM2
sudo npm install -g pm2

# 6. Crear configuración PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'backend-backup',
      script: 'part2/backend-backup/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        SERVER_NAME: 'Backend-Backup-AWS'
      }
    }
  ]
};
EOF

# 7. Iniciar aplicación
pm2 start ecosystem.config.js

# 8. Configurar autostart
pm2 startup
pm2 save

# 9. Verificar funcionamiento
pm2 status
curl localhost:4001/health  # Debe responder con status healthy
curl localhost:4001/api/test  # Debe responder con mensaje de backup
```

## 📋 INSTANCIA 4: HEALTH CHECKER

```bash
# Conectar a la instancia health checker
ssh -i "tu-key.pem" ubuntu@[IP-HEALTH-CHECKER]

# 1. Ir al directorio de trabajo
cd /opt/failover-app

# 2. Clonar el repositorio
git clone https://github.com/jrpinto2005/disponibilidad.git .

# 3. Configurar variables de entorno
cat > part2/health-checker/.env << EOF
PORT=4001
SERVER_NAME=Health-Checker-AWS
PRIMARY_BACKEND_URL=http://[IP-BACKEND-PRIMARY]:4001
BACKUP_BACKEND_URL=http://[IP-BACKEND-BACKUP]:4001
CHECK_INTERVAL=5000
NODE_ENV=production
EOF

# 4. Instalar dependencias
cd part2/health-checker && npm install --production
cd ../..

# 5. Instalar PM2
sudo npm install -g pm2

# 6. Crear configuración PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'health-checker',
      script: 'part2/health-checker/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        SERVER_NAME: 'Health-Checker-AWS',
        PRIMARY_BACKEND_URL: 'http://[IP-BACKEND-PRIMARY]:4001',
        BACKUP_BACKEND_URL: 'http://[IP-BACKEND-BACKUP]:4001',
        CHECK_INTERVAL: '5000'
      }
    }
  ]
};
EOF

# IMPORTANTE: Reemplazar [IP-BACKEND-PRIMARY] y [IP-BACKEND-BACKUP] con las IPs reales
sed -i 's/\[IP-BACKEND-PRIMARY\]/[IP-REAL-PRIMARY]/g' ecosystem.config.js
sed -i 's/\[IP-BACKEND-BACKUP\]/[IP-REAL-BACKUP]/g' ecosystem.config.js

# 7. Iniciar aplicación
pm2 start ecosystem.config.js

# 8. Configurar autostart
pm2 startup
pm2 save

# 9. Verificar funcionamiento
pm2 status
curl localhost:4001/health  # Debe responder con status healthy
curl localhost:4001/api/status  # Debe responder con el estado de los backends
curl localhost:4001/api/health-report  # Debe mostrar reporte completo
```

### Paso 4: Verificación y Testing del Deployment

## 🧪 Testing Completo del Sistema Distribuido

### 1. Verificar Conectividad Entre Instancias

Desde tu máquina local, verifica que cada instancia responda:

```bash
# Verificar Frontend (debe ser accesible públicamente)
curl http://[IP-FRONTEND-PUBLICA]:3000
curl http://[IP-FRONTEND-PUBLICA]:4000

# Verificar Backends (desde dentro de la VPC o con IPs públicas temporales)
curl http://[IP-BACKEND-PRIMARY]:3001/health
curl http://[IP-BACKEND-PRIMARY]:4001/health  
curl http://[IP-BACKEND-BACKUP]:4001/health

# Verificar Health Checker  
curl http://[IP-HEALTH-CHECKER]:4001/health
curl http://[IP-HEALTH-CHECKER]:4001/api/status
```

### 2. Test de la Parte 1 (Simple)

```bash
# Desde tu navegador o curl
# Abrir: http://[IP-FRONTEND-PUBLICA]:3000
# Hacer clic en "Probar Backend"

# Test con curl directo
curl http://[IP-FRONTEND-PUBLICA]:3000/api/config
# Debe responder: {"backendUrl":"http://[IP-BACKEND-PRIMARY]:3001"}

curl http://[IP-BACKEND-PRIMARY]:3001/api/test
# Debe responder con mensaje del backend
```

### 3. Test de la Parte 2 (Failover Avanzado)

```bash
# 1. Verificar que health checker vea ambos backends
curl http://[IP-HEALTH-CHECKER]:4001/api/health-report

# 2. Abrir dashboard web
# http://[IP-FRONTEND-PUBLICA]:4000

# 3. Verificar estado inicial (ambos backends healthy)
curl http://[IP-HEALTH-CHECKER]:4001/api/status
# Debe mostrar: "recommendation": "primary"

# 4. Probar petición normal
curl http://[IP-FRONTEND-PUBLICA]:4000/api/config
# Debe responder con configuración de backends
```

### 4. Test de Failover Real

```bash
# 1. Simular falla en Backend Primary
ssh -i "tu-key.pem" ubuntu@[IP-BACKEND-PRIMARY]
curl -X POST localhost:4001/api/simulate-failure \
  -H "Content-Type: application/json" \
  -d '{"duration": 30000}'

# 2. Desde tu máquina, verificar que health checker detecta falla
sleep 10
curl http://[IP-HEALTH-CHECKER]:4001/api/status
# Debe mostrar: "recommendation": "backup", "shouldUseBackup": true

# 3. Ir al navegador y probar failover
# http://[IP-FRONTEND-PUBLICA]:4000
# Hacer clic en "Probar con Failover"
# Debe cambiar automáticamente al backup

# 4. Ver logs del health checker
ssh -i "tu-key.pem" ubuntu@[IP-HEALTH-CHECKER]  
pm2 logs health-checker
```

### 5. Test de Falla Completa de Instancia

```bash
# 1. Detener completamente Backend Primary
ssh -i "tu-key.pem" ubuntu@[IP-BACKEND-PRIMARY]
sudo systemctl stop network-manager  # Simula falla de red
# O directamente: sudo shutdown -h now

# 2. El health checker debe detectar la falla en 5-10 segundos
curl http://[IP-HEALTH-CHECKER]:4001/api/status

# 3. El frontend debe failover automáticamente
# Ir al navegador y probar múltiples peticiones

# 4. Restaurar instancia (restart desde AWS Console)
# El sistema debe volver al primary automáticamente
```

## 🔧 Configuración de Load Balancer (Opcional pero Recomendado)

### Application Load Balancer Setup

```bash
# 1. Crear Target Groups
Target Group 1: backend-primary-tg
- Target: [IP-BACKEND-PRIMARY]:4001
- Health Check: /health

Target Group 2: backend-backup-tg  
- Target: [IP-BACKEND-BACKUP]:4001
- Health Check: /health

# 2. Crear ALB
- Scheme: Internet-facing (para frontend)
- Listeners: 
  - Port 80 → backend-primary-tg (weight 100)
  - Port 8080 → backend-backup-tg (weight 0)

# 3. Configurar Health Checks
Protocol: HTTP
Port: 4001
Path: /health
Interval: 5 seconds  
Timeout: 2 seconds
Healthy threshold: 2
Unhealthy threshold: 3
```

## 📊 Monitoreo de Producción

### Configurar CloudWatch Logs

En **cada instancia**:

```bash
# 1. Instalar CloudWatch agent
sudo apt install -y amazon-cloudwatch-agent awscli

# 2. Crear configuración
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/failover-app/logs/*.log",
            "log_group_name": "/aws/ec2/failover-experiment",
            "log_stream_name": "{instance_id}-{hostname}",
            "timestamp_format": "%Y-%m-%d %H:%M:%S"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "FailoverExperiment",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

```bash
# 3. Iniciar CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

# 4. Configurar PM2 para logging
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Custom Metrics Dashboard

Crear dashboard en CloudWatch con:

```bash
# Métricas por instancia:
- CPU Utilization
- Memory Usage  
- Network In/Out
- Response Time (custom metric)
- Request Count (custom metric)
- Failover Count (custom metric)

# Alarmas:
- High CPU (>80%)
- High Memory (>90%)
- Backend Unhealthy (custom)
- Multiple Consecutive Failovers
```

## � Estimación de Costos (4 Instancias Separadas)

### EC2 Instances
```bash
Instancia Frontend (t2.micro):
- Free Tier: 750 horas/mes gratis (primeros 12 meses)
- Post Free Tier: ~$8.50/mes

Instancia Backend Primary (t2.micro):  
- Free Tier: incluida en las 750 horas
- Post Free Tier: ~$8.50/mes

Instancia Backend Backup (t2.micro):
- Free Tier: incluida en las 750 horas  
- Post Free Tier: ~$8.50/mes

Instancia Health Checker (t2.micro):
- Free Tier: incluida en las 750 horas
- Post Free Tier: ~$8.50/mes

Total EC2: $0/mes (Free Tier) → $34/mes (Post Free Tier)
```

### Otros Servicios
```bash
Data Transfer:
- Inbound: Gratis
- Outbound: Primeros 1GB gratis/mes, luego $0.09/GB
- Inter-AZ: $0.01/GB (entre instancias)

EBS Storage (8GB por instancia):
- Free Tier: 30GB gratis
- Post Free Tier: ~$3.20/mes (32GB total)

Load Balancer (opcional):
- Application LB: ~$16/mes + $0.008/LCU-hour

Total estimado:
- Con Free Tier: ~$0-5/mes
- Sin Free Tier: ~$40-60/mes
- Con Load Balancer: ~$55-80/mes
```

## 🔐 Seguridad de Producción

### Network Security
```bash
# 1. VPC Configuration
Crear VPC privada con:
- Public Subnet: Solo Frontend
- Private Subnets: Backends, Health Checker  
- NAT Gateway: Para acceso saliente de private subnets

# 2. Security Groups Refinados
Frontend SG:
- Inbound: 80, 443, 22 desde Internet
- Outbound: 4001 hacia Backend SGs solamente

Backend SG:
- Inbound: 4001 desde Frontend SG únicamente
- Outbound: Internet para updates

Health Checker SG:  
- Inbound: 4001 desde Frontend SG
- Outbound: 4001 hacia Backend SGs

# 3. NACLs (Network ACLs)
Configurar NACLs adicionales para defense in depth
```

### Application Security
```bash
# 1. Configurar HTTPS con certificados SSL
sudo apt install -y nginx certbot python3-certbot-nginx

# Frontend instance - configurar Nginx reverse proxy
sudo nano /etc/nginx/sites-available/failover-frontend

server {
    listen 80;
    server_name [tu-dominio.com];
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /part2 {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/failover-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtener certificado SSL
sudo certbot --nginx -d [tu-dominio.com]

# 2. Configurar firewall UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'  # Frontend only
sudo ufw allow 4001          # Backend instances only
```

## 🚨 Troubleshooting Distribuido

### Problemas Comunes

#### 1. Backend No Alcanzable desde Frontend
```bash
# Verificar Security Groups
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Test conectividad desde frontend
ssh -i "tu-key.pem" ubuntu@[IP-FRONTEND]
curl -v http://[IP-BACKEND]:4001/health

# Verificar logs del backend  
ssh -i "tu-key.pem" ubuntu@[IP-BACKEND]
pm2 logs backend-primary
```

#### 2. Health Checker No Detecta Backends
```bash
# Verificar configuración
ssh -i "tu-key.pem" ubuntu@[IP-HEALTH-CHECKER]
cat part2/health-checker/.env

# Verificar logs
pm2 logs health-checker

# Test manual de conectividad
curl http://[IP-BACKEND-PRIMARY]:4001/health
curl http://[IP-BACKEND-BACKUP]:4001/health
```

#### 3. Failover No Ocurre
```bash
# 1. Verificar estado del health checker
curl http://[IP-HEALTH-CHECKER]:4001/api/status

# 2. Forzar verificación
curl -X POST http://[IP-HEALTH-CHECKER]:4001/api/force-check

# 3. Ver logs detallados
ssh -i "tu-key.pem" ubuntu@[IP-HEALTH-CHECKER]
pm2 logs health-checker --lines 50

# 4. Verificar configuración del frontend
curl http://[IP-FRONTEND]:4000/api/config
```

#### 4. Performance Issues
```bash
# Verificar recursos de instancia
ssh -i "tu-key.pem" ubuntu@[IP-INSTANCIA]
htop
iostat -x 1
free -h

# Verificar latencia de red entre instancias
ping [IP-BACKEND]
traceroute [IP-BACKEND]

# Optimizar PM2 para producción
pm2 restart all --update-env
pm2 set pm2:autodump true
pm2 set pm2:deep-monitoring true
```

### Comandos de Monitoreo

```bash
# Script para verificar estado completo
cat > check-all-services.sh << 'EOF'
#!/bin/bash

echo "=== FRONTEND STATUS ==="
curl -s http://[IP-FRONTEND]:3000/api/config | jq
curl -s http://[IP-FRONTEND]:4000/api/config | jq

echo -e "\n=== BACKEND PRIMARY STATUS ==="
curl -s http://[IP-BACKEND-PRIMARY]:3001/health | jq
curl -s http://[IP-BACKEND-PRIMARY]:4001/health | jq

echo -e "\n=== BACKEND BACKUP STATUS ==="  
curl -s http://[IP-BACKEND-BACKUP]:4001/health | jq

echo -e "\n=== HEALTH CHECKER STATUS ==="
curl -s http://[IP-HEALTH-CHECKER]:4001/api/status | jq

echo -e "\n=== HEALTH CHECKER REPORT ==="
curl -s http://[IP-HEALTH-CHECKER]:4001/api/health-report | jq '.services'
EOF

chmod +x check-all-services.sh
./check-all-services.sh
```

## 📋 Checklist de Deployment Distribuido

### Pre-Deployment
- [ ] 4 Instancias EC2 creadas y corriendo
- [ ] Security Groups configurados correctamente  
- [ ] Key Pairs configurados para acceso SSH
- [ ] Nombres de instancias claros (frontend, primary, backup, health)

### Deployment por Instancia
- [ ] **Frontend**: Node.js instalado, código deployado, PM2 configurado
- [ ] **Backend Primary**: Node.js instalado, código deployado, PM2 configurado
- [ ] **Backend Backup**: Node.js instalado, código deployado, PM2 configurado
- [ ] **Health Checker**: Node.js instalado, código deployado, PM2 configurado

### Variables de Entorno
- [ ] Frontend configurado con IPs correctas de backends
- [ ] Health Checker configurado con IPs correctas de ambos backends
- [ ] Todas las variables NODE_ENV=production

### Testing
- [ ] Conectividad básica probada (curl health endpoints)
- [ ] Parte 1 funciona (frontend simple → backend simple)
- [ ] Parte 2 funciona (frontend advanced → todos los servicios)
- [ ] Failover funciona (simulación de falla + detección automática)
- [ ] Failback funciona (recuperación automática)

### Monitoreo
- [ ] CloudWatch Logs configurado
- [ ] PM2 logs funcionando
- [ ] Métricas custom enviándose
- [ ] Alarmas configuradas

### Seguridad
- [ ] HTTPS configurado (producción)
- [ ] Security Groups mínimos
- [ ] UFW/firewall configurado
- [ ] Acceso SSH restringido

¡Con esta guía tendrás un experimento de failover completamente distribuido funcionando en AWS! 🚀

## 🧪 Testing en AWS

### Comandos de prueba
```bash
# Desde tu máquina local, probar endpoints públicos
curl http://[IP-FRONTEND]:3000
curl http://[IP-FRONTEND]:4000

# Probar APIs directamente
curl http://[IP-BACKEND]:3001/api/test
curl http://[IP-PRIMARY]:4001/api/test
curl http://[IP-BACKUP]:4002/api/test
curl http://[IP-HEALTH]:4003/api/status

# Simular failover
curl -X POST http://[IP-PRIMARY]:4001/api/simulate-failure \
  -H "Content-Type: application/json" \
  -d '{"duration": 30000}'
```

### Simular falla de instancia completa
```bash
# SSH a la instancia primary
ssh -i "tu-key.pem" ec2-user@[IP-PRIMARY]

# Detener servicio
pm2 stop backend-primary
# sudo systemctl stop backend-primary

# El health checker debe detectar la falla y cambiar a backup
```

## 💰 Estimación de Costos

### EC2 Instances (4 x t2.micro)
- **Free Tier**: 750 horas/mes gratis primeros 12 meses
- **Post Free Tier**: ~$8/mes por instancia = $32/mes total

### Data Transfer
- **Inbound**: Gratis
- **Outbound**: Primeros 1GB gratis, luego $0.09/GB

### Total estimado: $32-40/mes (sin free tier)

## 🔐 Seguridad

### Best Practices
1. **Nunca exponer puertos de backend directamente**
2. **Usar Load Balancer como frontend**
3. **Implementar HTTPS con certificados SSL**
4. **Configurar Security Groups restrictivos**
5. **Actualizar regularmente el sistema**
6. **Usar IAM roles apropiados**

### Configurar HTTPS
```bash
# Instalar Certbot
sudo yum install -y certbot

# Obtener certificado (requiere dominio)
sudo certbot certonly --standalone -d tu-dominio.com

# Configurar Nginx como proxy reverso con SSL
sudo yum install -y nginx

# Configurar nginx.conf
sudo nano /etc/nginx/nginx.conf
```

## 🚨 Troubleshooting

### Problemas comunes

1. **Timeouts entre servicios**
   - Verificar Security Groups
   - Verificar que servicios estén running
   - Revisar logs: `pm2 logs` o `journalctl -u [service-name]`

2. **Health checker no funciona**
   - Verificar URLs en configuración
   - Verificar conectividad de red
   - Revisar logs del health checker

3. **Frontend no conecta con backend**
   - Verificar CORS configuration
   - Verificar variables de entorno
   - Verificar que backend esté accesible

### Comandos útiles
```bash
# Ver logs en tiempo real
pm2 logs --lines 100

# Verificar puertos
sudo netstat -tlnp

# Verificar conectividad
telnet [IP] [PORT]

# Restart servicios
pm2 restart all
# sudo systemctl restart [service-name]

# Ver métricas del sistema
htop
iostat
```

## 📋 Checklist de Deployment

- [ ] Instancias EC2 creadas
- [ ] Security Groups configurados
- [ ] Node.js instalado en todas las instancias
- [ ] Código transferido
- [ ] Dependencias instaladas
- [ ] Variables de entorno configuradas
- [ ] Servicios configurados como daemons
- [ ] Health checks funcionando
- [ ] Testing básico completado
- [ ] Monitoreo configurado
- [ ] Backups configurados

¡Con esto tendrás tu experimento de failover funcionando en AWS! 🚀
