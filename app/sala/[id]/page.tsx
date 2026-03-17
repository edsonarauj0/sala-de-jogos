"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { use, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useGameProgress } from "@/components/hooks/GameState";
import confetti from "canvas-confetti";
import { FloatingFaces } from "@/components/ui/FloatingFaces";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const codigoSala = resolvedParams.id;

  const { state, updateState, isLoaded, removeState } = useGameProgress(codigoSala);
  const [sala, setSala] = useState<any>(null);
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [perguntaAtualIndex, setPerguntaAtualIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [top3Jujubas, setTop3Jujubas] = useState<any[]>([]);

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  useEffect(() => {
    if (state.step === 'finished' && sala?.mostrar_resultado_jujubas) {
      fireConfetti();
    }
  }, [state.step, fireConfetti, sala]);

  useEffect(() => {
    const fetchDados = async () => {
      const { data: salaData } = await supabase.from("salas").select("*").eq("codigo", codigoSala).single();

      if (salaData) {
        setSala(salaData);

        const { data: perguntasData } = await supabase.from("perguntas").select("*").eq("sala_id", salaData.id).order("created_at", { ascending: true });
        if (perguntasData) setPerguntas(perguntasData);

        const { data: candidatosData } = await supabase.from("candidatos").select("*").eq("sala_id", salaData.id).order("created_at", { ascending: true });
        if (candidatosData) setCandidatos(candidatosData);

        if (salaData.mostrar_resultado_jujubas && salaData.resposta_jujubas) {
          const { data: palpitesData } = await supabase.from("palpites_jujubas").select("*").eq("sala_id", salaData.id);
          if (palpitesData && palpitesData.length > 0) {
            const gabarito = salaData.resposta_jujubas;
            const ranking = [...palpitesData].sort((a, b) => Math.abs(a.palpite - gabarito) - Math.abs(b.palpite - gabarito));
            setTop3Jujubas(ranking.slice(0, 3));
          }
        }
      }
    };

    fetchDados();
  }, [codigoSala]);

  useEffect(() => {
    const verificarParticipante = async () => {
      if (isLoaded && sala && state.name && state.step !== 'name') {
        const { data: participanteExiste } = await supabase
          .from("participantes")
          .select("id")
          .eq("sala_id", sala.id)
          .eq("nome", state.name)
          .maybeSingle();

        if (!participanteExiste) {
          updateState({ step: 'name', name: '', jujubaGuess: '', maisProvavelAnswers: {} });
          removeState();
        }
      }
    };

    verificarParticipante();
  }, [isLoaded, sala, state.name, state.step, updateState, removeState]);

  if (!isLoaded || !sala) return <div className="flex h-screen items-center justify-center">Carregando os jogos...</div>;

  const handleSaveNameAndContinue = async () => {
    if (!state.name.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from("participantes").insert([{ sala_id: sala.id, nome: state.name }]);
      if (sala.jogo_jujubas_ativo) {
        updateState({ step: 'jujubas' });
      } else if (sala.jogo_provavel_ativo) {
        updateState({ step: 'mais_provavel' });
      } else {
        updateState({ step: 'finished' });
      }
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const handleSaveJujubaGuess = async () => {
    if (!state.jujubaGuess) return;
    setIsSaving(true);
    try {
      await supabase.from("palpites_jujubas").insert([{ sala_id: sala.id, nome: state.name, palpite: parseInt(state.jujubaGuess) }]);
      updateState({ step: sala.jogo_provavel_ativo ? 'mais_provavel' : 'finished' });
    } catch (error) { console.error(error); } finally { setIsSaving(false); }
  };

  const handleFinishQuiz = async () => {
    setIsSaving(true);
    try {
      const votosParaSalvar = Object.entries(state.maisProvavelAnswers).map(([perguntaId, voto]) => ({
        sala_id: sala.id,
        pergunta_id: perguntaId,
        nome_eleitor: state.name,
        voto: voto
      }));

      console.log("Votos a salvar:", JSON.stringify(votosParaSalvar, null, 2));

      if (votosParaSalvar.length > 0) {
        const { data, error } = await supabase.from("votos_provavel").insert(votosParaSalvar).select();
        if (error) {
          console.error("Erro ao salvar votos:", JSON.stringify(error, null, 2));
        } else {
          console.log("Votos salvos com sucesso:", data);
        }
      }
      updateState({ step: 'finished' });
    } catch (error) { console.error("Erro inesperado:", error); } finally { setIsSaving(false); }
  };

  const perguntaAtual = perguntas[perguntaAtualIndex];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <FloatingFaces />
      {state.step === 'name' && (
        <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300 z-100">
          <CardHeader><CardTitle>Como podemos te chamar?</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input value={state.name} onChange={(e) => updateState({ name: e.target.value })} placeholder="Seu nome" disabled={isSaving} />
            <Button disabled={!state.name || isSaving} onClick={handleSaveNameAndContinue}>{isSaving ? "Entrando..." : "Continuar"}</Button>
          </CardContent>
        </Card>
      )}

      {state.step === 'jujubas' && (
        <Card className="w-full max-w-md animate-in slide-in-from-right-4 duration-300 z-100">
          <CardHeader><CardTitle>Jogo 1: Quantas jujubas tem no pote?</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input type="number" value={state.jujubaGuess} onChange={(e) => updateState({ jujubaGuess: e.target.value })} placeholder="Dê seu palpite..." disabled={isSaving} />
            <Button disabled={!state.jujubaGuess || isSaving} onClick={handleSaveJujubaGuess}>{isSaving ? "Enviando..." : "Próximo Jogo"}</Button>
          </CardContent>
        </Card>
      )}

      {state.step === 'mais_provavel' && (
        <Card className="w-full max-w-md animate-in slide-in-from-right-4 duration-300 z-100">
          <CardHeader>
            <CardTitle>Jogo 2: Quem é mais provável?</CardTitle>
            {perguntas.length > 0 ? (
              <p className="text-sm font-medium text-zinc-700 mt-2">{perguntaAtualIndex + 1}. {perguntaAtual?.texto}</p>
            ) : (
              <p className="text-sm text-zinc-500">Nenhuma pergunta cadastrada.</p>
            )}
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {perguntas.length > 0 && candidatos.length > 0 ? (
              <>
                {/* LISTA DINÂMICA DE CANDIDATOS */}
                <div className="grid grid-cols-2 gap-3">
                  {candidatos.map((candidato) => (
                    <Button
                      key={candidato.id}
                      variant={state.maisProvavelAnswers[perguntaAtual.id] === candidato.nome ? 'default' : 'outline'}
                      className="w-full py-6 whitespace-normal h-auto"
                      onClick={() => updateState({ maisProvavelAnswers: { ...state.maisProvavelAnswers, [perguntaAtual.id]: candidato.nome } })}
                    >
                      {candidato.nome}
                    </Button>
                  ))}
                </div>

                {perguntaAtualIndex < perguntas.length - 1 ? (
                  <Button disabled={!state.maisProvavelAnswers[perguntaAtual.id]} onClick={() => setPerguntaAtualIndex((prev) => prev + 1)} className="mt-4">
                    Próxima Pergunta
                  </Button>
                ) : (
                  <Button disabled={!state.maisProvavelAnswers[perguntaAtual.id] || isSaving} onClick={handleFinishQuiz} className="mt-4">
                    {isSaving ? "Finalizando..." : "Finalizar"}
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm text-zinc-500 mb-4">Aguardando configurações do jogo...</p>
                <Button onClick={() => updateState({ step: 'finished' })}>Finalizar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state.step === 'finished' && (
        <Card className="w-full max-w-md text-center py-8 z-100">
          <CardHeader>
            <CardTitle className="text-3xl">🎉</CardTitle>
            <CardTitle>Respostas salvas!</CardTitle>
            <p className="text-zinc-500">Aproveite a festa, {state.name}!</p>

            {sala.mostrar_resultado_jujubas && (
              <div className="mt-6 animate-in fade-in zoom-in duration-500 space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 uppercase tracking-wide">O pote tinha</p>
                  <p className="text-4xl font-bold text-green-600 mt-1">{sala.resposta_jujubas} unidades</p>
                </div>

                {top3Jujubas.length > 0 && (
                  <div className="space-y-2">
                    {top3Jujubas.map((item, index) => {
                      const medals = ["🥇", "🥈", "🥉"];
                      const bgColors = ["bg-yellow-50 border-yellow-200", "bg-zinc-50 border-zinc-200", "bg-amber-50 border-amber-200"];
                      const textColors = ["text-yellow-500", "text-zinc-400", "text-amber-700"];
                      const nameColors = ["text-yellow-700", "text-zinc-700", "text-amber-800"];
                      const diferenca = Math.abs(item.palpite - (sala.resposta_jujubas || 0));

                      return (
                        <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg border shadow-sm ${bgColors[index]}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm">{medals[index]}</span>
                            <span className={`font-bold text-sm ${nameColors[index]}`}>{item.nome}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`font-bold text-sm ${textColors[index]}`}>{item.palpite} <span className="text-[10px] text-zinc-500 font-medium">({diferenca} de dif.)</span></span>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {perguntas.length > 0 && Object.keys(state.maisProvavelAnswers).length > 0 && (
              <div className="mt-6 text-left animate-in fade-in duration-500">
                <details className="group">
                  <summary className="cursor-pointer list-none flex items-center justify-between p-3 bg-zinc-100 rounded-lg border hover:bg-zinc-200 transition-colors">
                    <span className="font-semibold text-sm text-zinc-700">📋 Suas Respostas — Quem é mais provável?</span>
                    <span className="text-zinc-400 text-xs group-open:rotate-180 transition-transform duration-200">▼</span>
                  </summary>
                  <div className="mt-2 space-y-2">
                    {perguntas.map((pergunta, index) => {
                      const resposta = state.maisProvavelAnswers[pergunta.id];
                      if (!resposta) return null;
                      return (
                        <div key={pergunta.id} className="flex flex-col p-3 bg-white rounded-lg border shadow-sm">
                          <span className="text-xs text-zinc-500 font-medium">{index + 1}. {pergunta.texto}</span>
                          <span className="text-sm font-bold text-primary mt-1">→ {resposta}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            )}
          </CardHeader>
        </Card>
      )}

    </div>
  );
}