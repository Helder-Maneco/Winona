import { Response, Router } from 'express';
import pool from '../config/dataconnection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

//=====================
// GET /api/v1/movimentacoes
// Lista movimentações (com filtros opcionais)
//=====================

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    const { produto_id, tipo, data_inicio, data_fim } = req.query;

    try {
        let query = `
            SELECT m.id, m.tipo, m.quantidade_movimentada,
                   m.custo_unitario, m.data, m.observacao,
                   p.nome AS produto_nome, p.ume,
                   u.nome AS usuario_nome
            FROM movimentacoes m
            JOIN produtos p ON p.id = m.produto_id
            JOIN usuarios u ON u.id = m.usuario_id
            WHERE 1=1
        `;
        const params: unknown[] = [];
        let i = 1;

        if (produto_id) {
            query += ` AND m.produto_id = $${i++}`;
            params.push(produto_id);
        }
        if (tipo) {
            query += ` AND m.tipo = $${i++}`;
            params.push(tipo);
        }
        if (data_inicio) {
            query += ` AND m.data >= $${i++}`;
            params.push(data_inicio);
        }
        if (data_fim) {
            query += ` AND m.data <= $${i++}`;
            params.push(data_fim);
        }

        query += ' ORDER BY m.data DESC LIMIT 500';

        const resultado = await pool.query(query, params);
        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao listar movimentações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// GET /api/v1/movimentacoes/produto/:id
// Histórico completo de um produto específico
//=====================

router.get('/produto/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const resultado = await pool.query(`
            SELECT m.id, m.tipo, m.quantidade_movimentada,
                   m.custo_unitario, m.data, m.observacao,
                   u.nome AS usuario_nome
            FROM movimentacoes m
            JOIN usuarios u ON u.id = m.usuario_id
            WHERE m.produto_id = $1
            ORDER BY m.data DESC
        `, [id]);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao buscar histórico do produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//=====================
// POST /api/v1/movimentacoes
// Regista entrada, saída ou ajuste (admin, gestor, operador)
//=====================

router.post('/', authorize('admin', 'gestor', 'operador'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { produto_id, tipo, quantidade_movimentada, custo_unitario, observacao } = req.body;

    if (!produto_id || !tipo || !quantidade_movimentada) {
        res.status(400).json({ error: 'produto_id, tipo e quantidade_movimentada são obrigatórios' });
        return;
    }

    const tiposValidos = ['entrada', 'saida', 'ajuste'];
    if (!tiposValidos.includes(tipo)) {
        res.status(400).json({ error: 'Tipo inválido. Use: entrada, saida ou ajuste' });
        return;
    }

    if (quantidade_movimentada <= 0) {
        res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Busca stock actual com lock para evitar race conditions
        const produtoRes = await client.query(
            'SELECT id, nome, quantidade_atual, ativo FROM produtos WHERE id = $1 FOR UPDATE',
            [produto_id]
        );

        if (produtoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Produto não encontrado' });
            return;
        }

        const produto = produtoRes.rows[0];

        if (!produto.ativo) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'Produto inactivo' });
            return;
        }

        // Calcula nova quantidade
        let novaQuantidade: number = produto.quantidade_atual;

        if (tipo === 'entrada') {
            novaQuantidade += quantidade_movimentada;
        } else if (tipo === 'saida') {
            if (produto.quantidade_atual < quantidade_movimentada) {
                await client.query('ROLLBACK');
                res.status(400).json({
                    error: 'Stock insuficiente',
                    disponivel: produto.quantidade_atual
                });
                return;
            }
            novaQuantidade -= quantidade_movimentada;
        } else {
            // ajuste — define directamente o valor absoluto
            novaQuantidade = quantidade_movimentada;
        }

        // Regista a movimentação
        const movRes = await client.query(`
            INSERT INTO movimentacoes (produto_id, tipo, quantidade_movimentada, custo_unitario, usuario_id, observacao)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [produto_id, tipo, quantidade_movimentada, custo_unitario ?? null, req.user!.id, observacao ?? null]
        );

        // Actualiza stock do produto
        await client.query(
            'UPDATE produtos SET quantidade_atual = $1 WHERE id = $2',
            [novaQuantidade, produto_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            movimentacao: movRes.rows[0],
            stock_anterior: produto.quantidade_atual,
            stock_actual: novaQuantidade
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao registar movimentação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

//=====================
// GET /api/v1/movimentacoes/resumo
// Totais de entradas e saídas por período
//=====================

router.get('/resumo', authorize('admin', 'gestor'), async (req: AuthRequest, res: Response): Promise<void> => {
    const { data_inicio, data_fim } = req.query;

    try {
        const resultado = await pool.query(`
            SELECT
                tipo,
                COUNT(*)                        AS total_movimentacoes,
                SUM(quantidade_movimentada)     AS total_quantidade,
                SUM(quantidade_movimentada * COALESCE(custo_unitario, 0)) AS valor_total
            FROM movimentacoes
            WHERE ($1::timestamp IS NULL OR data >= $1)
              AND ($2::timestamp IS NULL OR data <= $2)
            GROUP BY tipo
        `, [data_inicio ?? null, data_fim ?? null]);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
