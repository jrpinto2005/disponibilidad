# 🔧 Parte 2: Experimento Avanzado de Failover

Este directorio implementa un sistema completo de alta disponibilidad con failover automático.

## 🏗️ Arquitectura

```
Part 2
├── frontend-advanced/      # Puerto 4000
│   ├── server.js          # Servidor Express
│   ├── package.json       
│   └── public/
│       └── index.html     # Dashboard de failover
├── backend-primary/       # Puerto 4001  
│   ├── server.js          # Servidor principal
│   └── package.json
├── backend-backup/        # Puerto 4002
│   ├── server.js          # Servidor de respaldo  
│   └── package.json
└── health-checker/        # Puerto 4003
    ├── server.js          # Monitor de salud
    └── package.json
```

## 🚀 Ejecución Rápida

```bash


# manualmente:
cd part2/backend-primary && npm start &
cd part2/backend-backup && npm start &
cd part2/health-checker && npm start &
cd part2/frontend-advanced && npm start &

## 🔧 Servicios

### Frontend Advanced (Puerto 4000)
- **Función**: Dashboard de control y monitoreo
- **Características**:
  - Monitoreo visual del estado de servicios
  - Pruebas automáticas con failover
  - Log en tiempo real de eventos
  - Métricas avanzadas (failovers, tiempos, disponibilidad)

### Backend Primary (Puerto 4001)
- **Función**: Servidor principal del sistema
- **Características**:
  - API principal `/api/test`
  - Simulación de fallas para testing
  - Health checks avanzados
  - Métricas de rendimiento

### Backend Backup (Puerto 4002)
- **Función**: Servidor de respaldo automático
- **Características**:
  - API idéntica al principal
  - Activación automática en caso de falla
  - Latencia ligeramente mayor (simulada)
  - Identificación clara como "backup"

### Health Checker (Puerto 4003)
- **Función**: Monitor y orquestador de failover
- **Características**:
  - Monitoreo continuo cada 5 segundos
  - Lógica de decisión de failover/failback
  - API para consultas de estado
  - Logs detallados de eventos

## 🔄 Lógica de Failover

### Criterios de Failover
1. **Primary Unhealthy + Backup Healthy** → Switch to Backup
2. **Primary Healthy + Current=Backup** → Failback to Primary  
3. **Both Unhealthy** → Keep current, log warning

### Proceso de Failover
1. Health Checker detecta falla en Primary
2. Verifica que Backup esté saludable
3. Actualiza recomendación a "backup"
4. Frontend recibe flag en próxima petición
5. Frontend cambia automáticamente a Backup
6. Se mide tiempo total incluyendo failover

## 📊 Métricas Avanzadas

### Tiempo Total
- **Caso Normal**: Tiempo de respuesta normal
- **Caso Failover**: Tiempo inicial + tiempo de detección + tiempo de backup

### Métricas del Dashboard
1. **Requests Exitosos**: Peticiones completadas con éxito
2. **Requests Fallidos**: Peticiones que fallaron completamente  
3. **Cantidad de Failovers**: Veces que se activó el backup
4. **Tiempo Promedio**: Media incluyendo failovers

### Métricas del Health Checker
- **Tiempo de Respuesta**: Latencia de health checks
- **Consecutive Failures**: Fallas consecutivas por servicio
- **Uptime**: Tiempo activo de cada servicio
- **Check Count**: Número total de verificaciones

## 🧪 Scenarios de Testing

### 1. Failover Básico
```bash
# Simular falla en Primary por 30 segundos
curl -X POST http://localhost:4001/api/simulate-failure \
  -H "Content-Type: application/json" \
  -d '{"duration": 30000}'

# Realizar petición durante la falla
# El frontend debe failover automáticamente
```

### 2. Falla Permanente
```bash
# Crash completo del Primary
curl -X POST http://localhost:4001/api/crash

# El sistema debe mantener funcionamiento con Backup
# Restart manual requerido para Primary
```

### 3. Falla de Ambos Servicios
```bash
# Simular falla en ambos
curl -X POST http://localhost:4001/api/simulate-failure
curl -X POST http://localhost:4002/api/simulate-failure

# El sistema debe reportar error completo
```

### 4. Control Manual del Health Checker
```bash
# Forzar uso del Backup
curl -X POST http://localhost:4003/api/set-recommendation \
  -H "Content-Type: application/json" \
  -d '{"recommendation": "backup"}'

# Forzar verificación inmediata
curl -X POST http://localhost:4003/api/force-check
```

## ⚙️ Configuración Avanzada

### Variables de Entorno

**Frontend Advanced**:
```bash
PORT=4000
BACKEND_PRIMARY_URL=http://localhost:4001
BACKEND_BACKUP_URL=http://localhost:4002  
HEALTH_CHECKER_URL=http://localhost:4003
```

**Backend Primary/Backup**:
```bash
PORT=4001/4002
SERVER_NAME=Backend-Primary/Backend-Backup
```

**Health Checker**:
```bash
PORT=4003
SERVER_NAME=Health-Checker
PRIMARY_BACKEND_URL=http://localhost:4001
BACKUP_BACKEND_URL=http://localhost:4002
CHECK_INTERVAL=5000  # 5 seconds
```

### Configuración para AWS

```bash
# Health Checker
PRIMARY_BACKEND_URL=http://[IP-PRIMARY]:4001
BACKUP_BACKEND_URL=http://[IP-BACKUP]:4002

# Frontend
BACKEND_PRIMARY_URL=http://[IP-PRIMARY]:4001
BACKEND_BACKUP_URL=http://[IP-BACKUP]:4002
HEALTH_CHECKER_URL=http://[IP-HEALTH-CHECKER]:4003
```

## 📈 Resultados Esperados

### Tiempo de Respuesta Normal
- **Primary Healthy**: 1-150ms
- **Backup Active**: 50-250ms (ligeramente más lento)

### Tiempo con Failover
- **Detección de Falla**: 0-5 segundos (intervalo de check)
- **Switch Time**: < 100ms
- **Total Failover Time**: 100ms - 5.1 segundos

### Disponibilidad
- **Sin Failover**: 99%+ 
- **Con Failover**: 99.9%+ (downtime solo durante detección)

## 📝 API Reference

### Health Checker

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/status` | Estado actual y recomendación |
| GET | `/api/health-report` | Reporte detallado de salud |
| POST | `/api/force-check` | Forzar verificación inmediata |
| POST | `/api/set-recommendation` | Cambiar recomendación manual |

### Backend Primary/Backup

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/test` | Endpoint principal del experimento |
| GET | `/health` | Health check |
| GET | `/api/stats` | Estadísticas del servidor |
| POST | `/api/simulate-failure` | Simular falla temporal |
| POST | `/api/toggle-health` | Cambiar estado de salud |
| POST | `/api/crash` | Crash completo (testing) |

## 🔍 Monitoring y Debugging

### Logs en Tiempo Real
```bash
# Ver logs de todos los servicios
tail -f logs/frontend-advanced.log
tail -f logs/backend-primary.log  
tail -f logs/backend-backup.log
tail -f logs/health-checker.log
```

### Health Check Manual
```bash
# Verificar estado de todos los servicios
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:4003/health

# Ver reporte completo
curl http://localhost:4003/api/health-report | jq
```

### Dashboard del Health Checker
Acceder a `http://localhost:4003/api/health-report` para ver:
- Estado de cada servicio
- Tiempo de uptime
- Número de checks realizados  
- Historial de fallas
- Recomendación actual
