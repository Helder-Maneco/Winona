import { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import pool from '../config/dataconnection';
import config from '../config/env';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

//=====================
// POST /api/v1/auth/register
//=====================

router.post('/register', async (req: Request, res: Response): Promise<void> => {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return;
    }

    const perfisValidos = ['admin', 'gestor', 'operador', 'cliente'];
    if (!perfisValidos.includes(perfil)) {
        res.status(400).json({ error: 'Perfil inválido' });
        return;
    }

    try {
        // Verifica se email já existe
        const existente = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (existente.rows.length > 0) {
            res.status(409).json({ error: 'Email já registado' });
            return;
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere utilizador
        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha, perfil)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, perfil, criado_em`,
            [nome, email, senhaHash, perfil]
        );

        const utilizador = resultado.rows[0];

        const jwtOptions: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
        const token = jwt.sign(
            { id: utilizador.id, email: utilizador.email, perfil: utilizador.perfil },
            config.jwt.secret,
            jwtOptions
        );

        res.status(201).json({ token, utilizador });

    } catch (error) {
        console.error('Erro no register:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// POST /api/v1/auth/login
//=====================

router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        res.status(400).json({ error: 'Email e senha são obrigatórios' });
        return;
    }

    try {
        const resultado = await pool.query(
            'SELECT id, nome, email, senha, perfil, ativo FROM usuarios WHERE email = $1',
            [email]
        );

        const utilizador = resultado.rows[0];

        if (!utilizador) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        if (!utilizador.ativo) {
            res.status(403).json({ error: 'Conta desactivada' });
            return;
        }

        const senhaCorrecta = await bcrypt.compare(senha, utilizador.senha);

        if (!senhaCorrecta) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }

        const jwtOptions: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
        const token = jwt.sign(
            { id: utilizador.id, email: utilizador.email, perfil: utilizador.perfil },
            config.jwt.secret,
            jwtOptions
        );

        // Nunca devolver a senha na resposta
        const { senha: _, ...utilizadorSemSenha } = utilizador;

        res.json({ token, utilizador: utilizadorSemSenha });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// GET /api/v1/auth/me
//=====================

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const resultado = await pool.query(
            'SELECT id, nome, email, perfil, criado_em FROM usuarios WHERE id = $1',
            [req.user!.id]
        );

        if (resultado.rows.length === 0) {
            res.status(404).json({ error: 'Utilizador não encontrado' });
            return;
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Erro no /me:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
