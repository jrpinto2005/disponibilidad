# 🔬 AWS Failover Experiment

Este proyecto implementa un experimento completo de failover para demostrar alta disponibilidad en AWS. Consta de dos partes que aumentan en complejidad para evaluar diferentes escenarios de falla y recuperación.

## 📋 Estructura del Proyecto

```
aws-failover-experiment/
├── part1/                          # Experimento Simple
│   ├── frontend-simple/           # Frontend básico con medición de tiempo
│   └── backend-simple/            # Backend básico de respuesta
├── part2/                          # Experimento Avanzado
│   ├── frontend-advanced/         # Frontend con failover automático
│   ├── backend-primary/           # Backend principal
│   ├── backend-backup/            # Backend de respaldo
│   └── health-checker/            # Servicio de monitoreo
└── docs/                          # Documentación adicional
```

## 🎯 Objetivo del Experimento

### Parte 1: Comunicación Básica
- **Frontend Simple**: Interfaz con botón para realizar peticiones HTTP
- **Backend Simple**: Servicio que responde a las peticiones
- **Métricas**: Tiempo de respuesta, tasa de éxito/fallo

### Parte 2: Sistema de Failover
- **Frontend Avanzado**: Interfaz que maneja failover automático
- **Backend Principal**: Servicio primario con simulación de fallas
- **Backend Backup**: Servicio de respaldo automático
- **Health Checker**: Monitoreo continuo y decisiones de failover
- **Métricas**: Tiempo total incluyendo failover, cantidad de failovers, disponibilidad

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 14+ 
- npm o yarn
- 6 terminales abiertas para ejecutar cada servicio por separado
- Puertos disponibles: 3000-3001 para Parte 1, 4000-4003 para Parte 2

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd aws-failover-experiment

# Instalar dependencias manualmente cada servicio:
cd part1/frontend-simple && npm install && cd ../..
cd part1/backend-simple && npm install && cd ../..
cd part2/frontend-advanced && npm install && cd ../..
cd part2/backend-primary && npm install && cd ../..
cd part2/backend-backup && npm install && cd ../..
cd part2/health-checker && npm install && cd ../..
```

## 🧪 Ejecutar Experimentos

### Parte 1: Experimento Simple
```bash
# Terminal 1: Frontend Simple
cd part1/frontend-simple
npm start

# Terminal 2: Backend Simple  
cd part1/backend-simple
npm start
```

**Acceder a:**
- Frontend: http://ip:3000
- Backend API: http://ip:3001/api/test

### Parte 2: Experimento Avanzado
```bash
# Terminal 1: Frontend Avanzado
cd part2/frontend-advanced
npm start

# Terminal 2: Backend Principal
cd part2/backend-primary
npm start

# Terminal 3: Backend Backup
cd part2/backend-backup  
npm start

# Terminal 4: Health Checker
cd part2/health-checker
npm start
```

**Acceder a:**
- Frontend: http://ip:4000
- Backend Principal: http://ip:4001/api/test
- Backend Backup: http://ip:4002/api/test
- Health Checker: http://ip:4003/api/status

## 🔧 Configuración

### Variables de Entorno

#### Parte 1
```bash
# Frontend Simple (Instancia 1)
PORT=3000
BACKEND_URL=http://[IP-PRIMARY]:3001

# Backend Simple (Instancia 2)
PORT=3001
SERVER_NAME=Backend-Simple
```

#### Parte 2
```bash
# Frontend Avanzado (Instancia 1)
PORT=4000
BACKEND_PRIMARY_URL=http://[IP-PRIMARY]:4001
BACKEND_BACKUP_URL=http://[IP-BACKUP]:4001
HEALTH_CHECKER_URL=http://[IP-HEALTH]:4001

# Backend Principal (Instancia 2)
PORT=4001
SERVER_NAME=Backend-Primary

# Backend Backup (Instancia 3)
PORT=4001
SERVER_NAME=Backend-Backup

# Health Checker (Instancia 4)
PORT=4001
SERVER_NAME=Health-Checker
PRIMARY_BACKEND_URL=http://[IP-PRIMARY]:4001
BACKUP_BACKEND_URL=http://[IP-BACKUP]:4001
CHECK_INTERVAL=5000
```

## 📊 Funcionalidades

### Parte 1: Simple
- ✅ Medición de tiempo de respuesta
- ✅ Contador de requests exitosos/fallidos
- ✅ Tiempo promedio de respuesta
- ✅ Historial de las últimas 10 peticiones
- ✅ Endpoint de estadísticas del servidor

### Parte 2: Avanzado
- ✅ Monitoreo automático de salud de servicios
- ✅ Failover automático cuando el principal falla
- ✅ Failback automático cuando el principal se recupera
- ✅ Dashboard en tiempo real del estado de los servicios
- ✅ Medición de tiempo total incluyendo failover
- ✅ Log detallado de eventos
- ✅ Simulación de fallas para testing
- ✅ API para control manual del health checker

## 🧪 Simulación Manual de Fallas

### Para simular falla del Backend Principal (Parte 2):

#### Opción 1: Detener proceso manualmente
```bash
# En la terminal donde corre el backend principal, presionar Ctrl+C
# O encontrar el PID y matarlo:
lsof -ti:4001
kill -9 [PID]
```

#### Opción 2: Usar endpoints de simulación (opcional)
```bash
# Simular falla temporal (30 segundos)
curl -X POST http://localhost:4001/api/simulate-failure -H "Content-Type: application/json" -d '{"duration": 30000}'

# Cambiar estado de salud
curl -X POST http://localhost:4001/api/toggle-health
```

### Para detener todos los servicios:
```bash
# Encontrar todos los procesos en los puertos del experimento
lsof -ti:3000,3001,4000,4001,4002,4003

# Matarlos todos (reemplaza [PIDS] con los números obtenidos)
kill -9 [PID1] [PID2] [PID3] [PID4] [PID5] [PID6]
```

## 📈 Métricas y Monitoreo

### Endpoints de Métricas

#### Parte 1
- `GET /api/stats` - Estadísticas del servidor simple
- `GET /health` - Estado de salud

#### Parte 2  
- `GET /api/stats` - Estadísticas de cada backend
- `GET /api/status` - Estado recomendado por health checker
- `GET /api/health-report` - Reporte detallado de salud
- `GET /health` - Estado de salud individual

### Métricas Clave
1. **Tiempo de Respuesta**: Tiempo desde petición hasta respuesta
2. **Tiempo de Failover**: Tiempo adicional cuando se activa failover
3. **Tasa de Disponibilidad**: % de requests exitosos
4. **Cantidad de Failovers**: Número de veces que se activó el backup
5. **Tiempo de Recuperación**: Tiempo para volver al servicio principal

## 🌐 Deployment en AWS

### Arquitectura Distribuida (Producción)
El experimento está diseñado para ejecutarse en **4 instancias EC2 separadas**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EC2 Instance  │    │   EC2 Instance  │    │   EC2 Instance  │    │   EC2 Instance  │
│    FRONTEND     │    │     PRIMARY     │    │     BACKUP      │    │     HEALTH      │
│                 │    │     BACKEND     │    │     BACKEND     │    │     CHECKER     │
│                 │    │                 │    │                 │    │                 │
│ • Part1 Frontend│    │ • Part1 Backend │    │ • Part2 Backend │    │ • Health Monitor│
│ • Part2 Frontend│    │ • Part2 Primary │    │ • Backup Server │    │ • Failover Logic│
│                 │    │                 │    │                 │    │                 │
│   Public IP     │    │   Private IP    │    │   Private IP    │    │   Private IP    │
│   (Web Access)  │    │   (Internal)    │    │   (Internal)    │    │   (Internal)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Instancias Requeridas:**
- **Frontend**: Sirve ambas interfaces web (Parte 1 y 2)
- **Backend Primary**: Maneja requests principales (Parte 1 y 2)  
- **Backend Backup**: Servidor de respaldo para Parte 2
- **Health Checker**: Monitorea backends y controla failover

### Desarrollo Local vs Producción AWS

| Componente | Local | AWS Producción |
|-----------|-------|----------------|
| **PARTE 1** | | |
| Frontend Simple | `localhost:3000` | `[IP-FRONTEND]:3000` |
| Backend Simple | `localhost:3001` | `[IP-PRIMARY]:3001` |
| **PARTE 2** | | |
| Frontend Advanced | `localhost:4000` | `[IP-FRONTEND]:4000` |
| Backend Primary | `localhost:4001` | `[IP-PRIMARY]:4001` |
| Backend Backup | `localhost:4002` | `[IP-BACKUP]:4001` |
| Health Checker | `localhost:4003` | `[IP-HEALTH]:4001` |

**Nota Importante**: 
- **Local**: Todos los servicios corren en `localhost` con puertos diferentes
- **AWS**: Cada servicio corre en su **propia instancia EC2** con IP separada
- En AWS, Backend Backup y Health Checker usan el mismo puerto `4001` pero en **instancias diferentes**

**Importante**: En AWS, cada componente corre en su propia instancia EC2:
- **Parte 1**: Frontend (Instancia 1) + Backend (Instancia 2) = **2 instancias separadas**
- **Parte 2**: Frontend (Instancia 1) + Primary Backend (Instancia 2) + Backup Backend (Instancia 3) + Health Checker (Instancia 4) = **4 instancias separadas**
- **Total**: **4 instancias EC2** para el experimento completo

### Distribución de Instancias:
```
Instancia 1 (FRONTEND):    part1-frontend:3000  +  part2-frontend:4000
Instancia 2 (PRIMARY):     part1-backend:3001   +  part2-primary:4001  
Instancia 3 (BACKUP):      part2-backup:4001
Instancia 4 (HEALTH):      part2-health:4001
```

### Deployment Manual en AWS

Para deployar en AWS, sigue estos pasos en cada instancia EC2:

#### 1. Preparar Instancia EC2 (Ubuntu 22.04)
```bash
# Conectar a la instancia
ssh -i your-key.pem ubuntu@[IP-INSTANCIA]

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar repositorio
git clone [REPOSITORY-URL]
cd aws-failover-experiment
```

#### 2. Configurar cada instancia según su rol:

**Frontend Instance (Instancia 1):**
```bash
# Instalar dependencias
cd part1/frontend-simple && npm install && cd ../..
cd part2/frontend-advanced && npm install && cd ../..

# Editar configuración para production IPs
# Editar part1/frontend-simple/public/index.html - cambiar BACKEND_URL a [IP-PRIMARY]:3001
# Editar part2/frontend-advanced/public/index.html - cambiar URLs a IPs de producción

# Iniciar servicios
cd part1/frontend-simple && npm start &   # Puerto 3000
cd part2/frontend-advanced && npm start & # Puerto 4000
```

**Primary Backend Instance (Instancia 2):**
```bash
# Instalar dependencias
cd part1/backend-simple && npm install && cd ../..
cd part2/backend-primary && npm install && cd ../..

# Iniciar servicios
cd part1/backend-simple && npm start &    # Puerto 3001 (Para Parte 1)
cd part2/backend-primary && npm start &   # Puerto 4001 (Para Parte 2)
```

**Backup Backend Instance (Instancia 3):**
```bash
# Instalar dependencias
cd part2/backend-backup && npm install

# Iniciar servicio
cd part2/backend-backup && npm start &    # Puerto 4001 (Solo Parte 2)
```

**Health Checker Instance (Instancia 4):**
```bash
# Instalar dependencias
cd part2/health-checker && npm install

# Editar configuración 
# PRIMARY_BACKEND_URL=http://[IP-PRIMARY]:4001
# BACKUP_BACKEND_URL=http://[IP-BACKUP]:4001

# Iniciar servicio
cd part2/health-checker && npm start &    # Puerto 4001 (Solo Parte 2)
```


## 🛠️ Comandos de Utilidad

```bash
# Desarrollo Local - Comandos Manuales
# Instalar dependencias en cada servicio:
cd part1/frontend-simple && npm install && cd ../..
cd part1/backend-simple && npm install && cd ../..
cd part2/frontend-advanced && npm install && cd ../..
cd part2/backend-primary && npm install && cd ../..
cd part2/backend-backup && npm install && cd ../..
cd part2/health-checker && npm install && cd ../..

# Iniciar servicios individualmente:
cd part1/frontend-simple && npm start    # Terminal 1
cd part1/backend-simple && npm start     # Terminal 2
cd part2/frontend-advanced && npm start  # Terminal 3
cd part2/backend-primary && npm start    # Terminal 4
cd part2/backend-backup && npm start     # Terminal 5
cd part2/health-checker && npm start     # Terminal 6

# Detener todos los servicios:
lsof -ti:3000,3001,4000,4001,4002,4003   # Encontrar PIDs
kill -9 [PID1] [PID2] [PID3] [PID4] [PID5] [PID6]  # Matar procesos

# Testing manual:
# Parte 1: Ir a http://localhost:3000 y hacer clic en "Test Backend"
# Parte 2: Ir a http://localhost:4000 y hacer clic en "Test with Failover"
# Simular falla: Ctrl+C en terminal del backend principal
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Puerto en uso**: Usar `lsof -ti:[PUERTO]` para encontrar PID y `kill -9 [PID]` para liberarlo
2. **CORS errors**: Verificar que todos los servicios estén ejecutándose en sus terminales
3. **Health checker no funciona**: Verificar URLs de backends en configuración
4. **Failover no ocurre**: Verificar logs en la consola del health checker
5. **Servicios no inician**: Verificar que las dependencias estén instaladas con `npm install`

### Ver Logs
```bash
# Los logs aparecen directamente en las terminales donde ejecutaste npm start
# Para debugging adicional, puedes usar:
curl http://localhost:[PUERTO]/health  # Verificar estado de salud
curl http://localhost:[PUERTO]/api/stats  # Ver estadísticas del servicio
```

## 📝 API Reference

Ver [docs/api-reference.md](docs/api-reference.md) para documentación completa de endpoints.

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 🙋‍♂️ Contacto

- Proyecto: AWS Failover Experiment
- Documentación: [docs/](docs/)

---

⭐ Si este proyecto te fue útil, por favor dale una estrella!
