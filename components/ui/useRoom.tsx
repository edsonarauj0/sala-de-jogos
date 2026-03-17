import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRoom(id: string | string[] | undefined) {
  const [room, setRoom] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<any[]>([]);
  const [quizStats, setQuizStats] = useState<any[]>([]);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [jujubaActive, setJujubaActive] = useState<boolean>(false);
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [roomName, setRoomName] = useState("");
  const [partner1, setPartner1] = useState("");
  const [partner2, setPartner2] = useState("");
  const [targetValue, setTargetValue] = useState(0);
  const [newQuestion, setNewQuestion] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: r } = await supabase.from('rooms').select('*').eq('id', id).single();
      const { data: q } = await supabase.from('quiz_questions').select('*').eq('room_id', id);
      const { data: g } = await supabase.from('guesses').select('*').eq('room_id', id);
      const { data: a } = await supabase.from('quiz_answers').select('*').eq('room_id', id);

      if (r) {
        setRoom(r);
        setRoomName(r.name);
        setPartner1(r.partner_1);
        setPartner2(r.partner_2);
        setTargetValue(r.target_value);
        setIsRevealed(Boolean(r.is_revealed));
        setJujubaActive(Boolean(r.jujuba_active));
        setQuizActive(Boolean(r.quiz_active));
      }
      if (q) setQuestions(q);
      if (g) setGuesses(g);

      if (q && a && r) {
        const stats = q.map(quest => {
          const answers = a.filter(ans => ans.question_id === quest.id);
          const p1Count = answers.filter(ans => ans.selected_partner === r.partner_1).length;
          const p2Count = answers.filter(ans => ans.selected_partner === r.partner_2).length;
          return { ...quest, p1Count, p2Count, total: answers.length };
        });
        setQuizStats(stats);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateRoom = async (field: string, value: boolean | string | number) => {
    if (field === 'is_revealed') setIsRevealed(Boolean(value));
    if (field === 'jujuba_active') setJujubaActive(Boolean(value));
    if (field === 'quiz_active') setQuizActive(Boolean(value));

    setRoom((prev: any) => ({ ...prev, [field]: value }));

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ [field]: value })
        .eq('id', id)
        .select();

      if (error) throw error;
    } catch (error) {
      alert("Erro ao salvar no banco de dados. Verifique a conexão.");
      fetchData();
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      await supabase.from('quiz_questions').insert([{ room_id: id, question_text: newQuestion }]);
      setNewQuestion("");
      fetchData();
    } catch (error) {
      console.error('Erro ao adicionar pergunta:', error);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      await supabase.from('quiz_questions').delete().eq('id', questionId);
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar pergunta:', error);
    }
  };

  const copyToClipboard = () => {
    const url = `${window.location.origin}/room/${id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar URL', err);
    }
  };

  return {
    room,
    questions,
    guesses,
    quizStats,
    isRevealed,
    jujubaActive,
    quizActive,
    loading,
    roomName,
    partner1,
    partner2,
    targetValue,
    newQuestion,
    copied,
    setRoomName,
    setPartner1,
    setPartner2,
    setTargetValue,
    setNewQuestion,
    handleUpdateRoom,
    addQuestion,
    deleteQuestion,
    fetchData,
    copyToClipboard,
  };
}