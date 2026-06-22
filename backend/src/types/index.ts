/*==========================
||       TIPOS PRINCIPAIS ||
============================*/

// Campo dos Usuarios 
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha: string;
  perfil: 'admin' | 'gestor' | 'operador' | 'cliente'; // ← Faltava 'admin'
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date; 
}

// Campo dos Produtos
export interface Produto {
  id: number;
  ume: string;
  nome: string;
  categoria: string;
  fornecedor: string; // ← minúscula (padrão)
  preco_compra: number;
  preco_venda: number;
  estoque_minimo: number;
  estoque_maximo: number;
  lead_time_dias: number;
  quantidade_atual: number;
  possui_validade: boolean;  
  dias_validade?: number; // ← opcional (nem todo produto tem)
  ativo: boolean;
}

// Campo da Movimentacao dos Produtos
export interface Movimentacao {
  id: number;
  produto_id: number;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade_movimentada: number;
  custo_unitario?: number; // ← opcional (ajustes não têm custo)
  usuario_id: number;
  data: Date;
  observacao?: string;
}

export interface Alerta { // ← singular (cada alerta)
  produto_id: number;
  ume: string;
  nome: string;
  tipo: 'ruptura' | 'excesso' | 'produtos_parados' | 'reposicao_necessaria' | 'produtos_com_estoque_baixo' | 'alta_demanda';
  mensagem: string;
  prioridade: 'alta' | 'media' | 'baixa';
  dias_parado?: number; // ← opcional
  status: 'critico' | 'baixo';
  valor_parado?: number;
}

/*=========================
||PERMISSÕES POR PERFIL   ||
===========================*/

export type Permissoes = { 
  admin: {
    ver_dashboard: true; // ← corrigido typo
    ver_relatorios: true;
    editar_preco_venda: true;
    configurar_sistema: true;
    gerenciar_usuarios: true;
    ver_custos: true;
    editar_custos: true;
    ver_estoque: true;
    ver_produtos: true;
    editar_produtos: true;
    ver_inventario: true;
    registrar_movimentacao: true;
  };
  gestor: {
    ver_dashboard: true;
    ver_relatorios: true;
    editar_preco_venda: true;
    configurar_sistema: true;
    gerenciar_usuarios: true;
    ver_custos: true;
    editar_produtos: true;
    registrar_movimentacao: true;
  };
  operador: {
    registrar_movimentacao: true;
    fazer_inventario: true;
    ver_estoque: true;
    ver_custos: true;
    ver_preco_venda: true;
    editar_produtos: false;
  };
  cliente: {
    ver_produtos: true;
    ver_quantidade_disponivel: true;
    ver_preco_venda: true;
    ver_custos: false;
    editar_produtos: false;
    registrar_movimentacao: false;
  };
};

/*=========================
|| JWT PAYLOAD            ||
===========================*/

export interface JWTPayload {
  usuario_id: number;
  email: string;
  perfil: 'admin' | 'gestor' | 'operador' | 'cliente';
}
