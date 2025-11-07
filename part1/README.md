# 📝 Parte 1: Experimento Simple

Este directorio contiene la implementación básica del experimento de tiempo de respuesta.

## 🏗️ Arquitectura

```
Part 1
├── frontend-simple/     # Puerto 3000
│   ├── server.js       # Servidor Express
│   ├── package.json    
│   └── public/
│       └── index.html  # Interfaz web
└── backend-simple/     # Puerto 3001
    ├── server.js       # API de respuesta
    └── package.json
```

## 🚀 Ejecución Rápida

```bash
# Desde la raíz del proyecto
./scripts/start-part1.sh

# O manualmente:
cd part1/backend-simple && npm start &
cd part1/frontend-simple && npm start &
```

## 🔧 Servicios

### Frontend Simple (Puerto 3000)
- **Función**: Interfaz para medir tiempo de respuesta
- **Características**:
  - Botón para enviar peticiones al backend
  - Medición precisa de tiempo de respuesta
  - Estadísticas en tiempo real (éxito/fallo/promedio)
  - Historial de últimas 10 peticiones

### Backend Simple (Puerto 3001)
- **Función**: API básica de respuesta
- **Características**:
  - Endpoint `/api/test` para peticiones del experimento
  - Endpoint `/health` para verificación de estado
  - Endpoint `/api/stats` para estadísticas del servidor
  - Simulación opcional de tiempo de procesamiento

## 📊 Métricas Medidas

1. **Tiempo de Respuesta**: Desde click hasta respuesta (ms)
2. **Tasa de Éxito**: Porcentaje de peticiones exitosas
3. **Tiempo Promedio**: Media de todos los tiempos de respuesta
4. **Contador de Requests**: Total de peticiones realizadas

## 🧪 Testing

```bash
# Test manual del backend
curl http://localhost:3001/api/test

# Verificar estado
curl http://localhost:3001/health

# Ver estadísticas
curl http://localhost:3001/api/stats
```

## ⚙️ Configuración

### Variables de Entorno

**Frontend Simple**:
```bash
PORT=3000                    # Puerto del frontend
BACKEND_URL=http://localhost:3001  # URL del backend
```

**Backend Simple**:
```bash
PORT=3001                    # Puerto del backend
SERVER_NAME=Backend-Simple   # Nombre del servidor
```

### Configuración para AWS

Para deployment en AWS, cambiar las URLs:

```bash
# Frontend
BACKEND_URL=http://[IP-BACKEND]:3001

# O usar variables de entorno en EC2
export BACKEND_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4):3001
```

## 📈 Resultados Esperados

- **Tiempo de respuesta típico**: 1-100ms en localhost
- **Tiempo de respuesta AWS**: 10-200ms dependiendo de la región
- **Disponibilidad esperada**: 99%+ en condiciones normales

## 🔍 Troubleshooting

### Problemas Comunes

1. **CORS Error**: Verificar que el backend esté ejecutándose en puerto 3001
2. **Connection Refused**: Verificar firewall y que ambos servicios estén iniciados
3. **Timeouts**: Verificar latencia de red entre frontend y backend

### Logs
```bash
# Ver logs del frontend
tail -f logs/frontend-simple.log

# Ver logs del backend
tail -f logs/backend-simple.log
```

## 🔄 Flujo de Datos

1. Usuario hace click en "Probar Backend"
2. Frontend registra timestamp inicial
3. Frontend envía GET request a `/api/test`
4. Backend procesa request (tiempo variable)
5. Backend responde con JSON
6. Frontend registra timestamp final
7. Frontend calcula y muestra tiempo total
8. Frontend actualiza estadísticas

## 📝 Endpoints API

### Backend Simple

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/test` | Endpoint principal del experimento |
| GET | `/health` | Estado de salud del servidor |
| GET | `/api/stats` | Estadísticas del servidor |
| POST | `/api/crash` | Simular crash del servidor (testing) |

### Frontend Simple

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Interfaz principal |
| GET | `/api/config` | Configuración del backend |
