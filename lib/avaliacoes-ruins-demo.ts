import type { AlertaAvaliacao } from "./avaliacoes-ruins";

// Alertas inventados para o modo demonstração (sem Supabase). Nenhum nome, nota ou texto é de cliente real.
export function alertasDeDemonstracao(clienteIds: string[]): AlertaAvaliacao[] {
  const [a, b] = clienteIds;
  if (!a) return [];
  const base = { review_id: null, avaliada_em: "2026-11-15", tratada_em: null, tratada_por: null, desfecho: null };
  return [
    {
      ...base,
      id: "demo-alerta-1",
      cliente_id: a,
      avaliador: "Pessoa de exemplo 1",
      estrelas: 1,
      texto: "Texto de exemplo de uma avaliação com reclamação sobre o atendimento.",
      motivo: "nota_e_comentario",
      motivo_detalhe: "Reclama do atendimento",
      situacao: "nova",
      detectada_em: "2026-11-16T05:40:00Z",
    },
    {
      ...base,
      id: "demo-alerta-2",
      cliente_id: b ?? a,
      avaliador: "Pessoa de exemplo 2",
      estrelas: 5,
      texto: "Texto de exemplo: nota alta, mas o comentário cita um problema com a cobrança.",
      motivo: "comentario",
      motivo_detalhe: "Cita problema com cobrança",
      situacao: "nova",
      detectada_em: "2026-11-16T05:40:00Z",
    },
    {
      ...base,
      id: "demo-alerta-3",
      cliente_id: a,
      avaliador: "Pessoa de exemplo 3",
      estrelas: 2,
      texto: null,
      motivo: "nota",
      motivo_detalhe: null,
      situacao: "tratada",
      detectada_em: "2026-11-10T05:40:00Z",
      tratada_em: "2026-11-12T14:00:00Z",
      tratada_por: "equipe@exemplo.com",
      desfecho: "Denunciada ao Google como avaliação falsa.",
    },
  ];
}
