import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';

// Extende o tipo Request do Express para incluir o utilizador autenticado
export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        perfil: string;
    };
}

// Verifica se o token JWT é válido
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token não fornecido' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as AuthRequest['user'];
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}

export function authorize(...perfis: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Não autenticado' });
            return;
        }

        if (!perfis.includes(req.user.perfil)) {
            res.status(403).json({ error: 'Sem permissão para aceder a este recurso' });
            return;
        }

        next();
    };
}
