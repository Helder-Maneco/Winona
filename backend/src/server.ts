import express, {Application, Request, Response, NextFunction} from 'express';
import cors from 'cors';
import config from './config/env';
import pool from './config/dataconnection';
import authRoutes from './routes/auth';
import produtosRoutes from './routes/produtos';
import categoriasRoutes from './routes/categorias';
import movimentacoesRoutes from './routes/movimentos';
import lojasRoutes from './routes/lojas';

const app: Application = express();
app.use('/api/v1/categorias', categoriasRoutes);
//=====================
// MIDDLEWARE
//=====================

// CORS - Permite frontend acessar
app.use(cors({
    origin: config.cors.origin,
    credentials: true
}));

// Body Parser - Lê JSON das requisições
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Log de requisições (desenvolvimento)
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

//=====================
// ROTAS
//=====================

// Rota raiz
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Winona Stock API',
        version: '1.0.0',
        status: 'online',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            produtos: '/api/v1/produtos',
            movimentacoes: '/api/v1/movimentacoes'
        }
    });
});

// API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/produtos', produtosRoutes);
app.use('/api/v1/movimentacoes', movimentacoesRoutes);
app.use('/api/v1/armazens', lojasRoutes);

// Health check - Verifica conexão com banco
app.get('/health', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            database: 'connected',
            timestamp: result.rows[0].now,
            environment: config.server.env
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

//=====================
// TRATADOR DE ERROS
//=====================

// 404 - Rota não encontrada
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
    });
});

// Manipulador de erros global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('❌ Erro:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: config.server.env === 'development' ? err.message : 'Erro desconhecido'
    });
});

//=====================
// INICIAR SERVIDOR
//=====================

const PORT = config.server.port;

app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════');
    console.log(`🚀 Servidor: http://localhost:${PORT}`);
    console.log(`📍 Ambiente: ${config.server.env}`);
    console.log(`🗄️  Banco: winona (PostgreSQL)`);
    console.log('═══════════════════════════════════\n');
});

export default app;
