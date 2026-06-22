   import {Pool, PoolConfig} from 'pg';
   import config from './env';

const poolConfig: PoolConfig = {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password:config.database.password,
    database: config.database.name,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);
pool.on('connect', () => {
    console.log('PostgreSQL conectado');
});

pool.on('error', (err) => {
    console.error('Erro no Banco de dados', err);
    process.exit(-1);
});

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
	console.error('Falha ao Conectar o Banco de dados:', err.message);
    }
    else{
	console.log('Banco de dados online:', res.rows[0].now);
    }
});

export default pool;
