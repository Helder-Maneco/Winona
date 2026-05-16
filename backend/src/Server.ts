 import express, {Application, Request, Response, NextFunction} from 'express';
 import cors from 'cors';
 import config from './config/env';
 import pool from './config/dataconnection';
import { version } from 'os';

 const app: Application = express();
 //=====================
 //Middleware
 //=====================
 
 //cors
 app.use(cors({
     origin: config.cors.origin,
     credentials: true
 }));

 //Body Parser-JSON
 app.use(express.json());
 app.use(express.ulencoded({extended: true}));

 //Log de Requisicoes
 

app.use((req: Resquest, res: Response, nest: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

//============
//Rotas
//==========

//Rota raiz
app.get('/', (req: Request, res: Response) => {
    res.json({
	message: 'Winona Stock API',
	version: '0.0.1',
	status: 'Online',
	endpoints: {
	    health: '/health',
	    api: '/api/v0'
	}
    });
});

//Health check - Banco de Dados
app.get('/health', async (req: Resquest, res: Response) => {
    //continuar ... 
})
