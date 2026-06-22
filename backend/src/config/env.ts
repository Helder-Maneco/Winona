import dotenv from 'dotenv';
dotenv.config();

interface EnvConfig {
    database: {
	host: string;
	port: number;
	user: string;
	password: string;
	name: string;
    };
    server: {
	port: number;
	env: string;
    };
    jwt: {
	secret: string;
	expiresIn: string;
    };
    cors: {
	origin: string;
    };
}

function getRequiredEnv(key: string): string{
    const value = process.env[key];
    if (!value){
	throw new Error(`Erro Variavel obrigatoria "${key} nao configurou"`)
    }
    return value;
}

const config: EnvConfig = {
    database: {
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT||'5432'),
	user: process.env.DB_USER || 'postgres',
	password: getRequiredEnv('DB_PASSWORD'),
	name: process.env.DB_NAME || 'winona'
    },
    server: {
	port: parseInt(process.env.PORT||'3000'),
	env: process.env.NODE_ENV || 'development',
    },
    jwt: {
	secret: getRequiredEnv('JWT_SECRET'),
	expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    cors: {
	origin: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
};
export default config;
