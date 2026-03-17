"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Settings, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FallingLeaves } from "@/components/ui/FallingLeaves";

interface Sala {
  id: string;
  codigo: string;
  nome: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [salas, setSalas] = useState<Sala[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSalaId, setCurrentSalaId] = useState<string | null>(null);
  const [nomeSala, setNomeSala] = useState("");

  const fetchSalas = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("salas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro detalhado do Supabase:", JSON.stringify(error, null, 2), error.message, error.hint);
      alert(`Erro ao buscar salas: ${error.message}`);
    } else {
      setSalas(data || []);
    }
    setIsLoading(false);
  };

  const handleLogin = () => {
    if (password === "123") {
      setIsAuthenticated(true);
      fetchSalas();
    } else {
      alert("Senha incorreta");
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentSalaId(null);
    setNomeSala("");
    setIsModalOpen(true);
  };

  const openEditModal = (sala: Sala) => {
    setIsEditing(true);
    setCurrentSalaId(sala.id);
    setNomeSala(sala.nome);
    setIsModalOpen(true);
  };

  const handleSaveSala = async () => {
    if (!nomeSala.trim()) return;

    if (isEditing && currentSalaId) {
      const { error } = await supabase
        .from("salas")
        .update({ nome: nomeSala })
        .eq("id", currentSalaId);

      if (error) console.error("Erro ao atualizar:", error);
    } else {
      const codigoGerado = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase
        .from("salas")
        .insert([{ nome: nomeSala, codigo: codigoGerado }]);

      if (error) console.error("Erro ao criar:", error);
    }

    setIsModalOpen(false);
    fetchSalas();
  };

  const handleDeleteSala = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta sala?")) {
      const { error } = await supabase.from("salas").delete().eq("id", id);
      if (error) {
        console.error("Erro ao deletar:", error);
      } else {
        fetchSalas();
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-green-200/10">
        <FallingLeaves count={40} />
        <Card className="w-full max-w-md text-center z-100">
          <CardHeader><CardTitle>Acesso administrador</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
            <Button onClick={handleLogin}>Entrar no Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Dashboard Admin</h1>
        <Button onClick={openCreateModal}>Nova Sala</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-zinc-500">Carregando salas...</div>
          ) : salas.length === 0 ? (
            <div className="text-center py-4 text-zinc-500">Nenhuma sala cadastrada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salas.map((sala) => (
                  <TableRow key={sala.id}>
                    <TableCell>
                      {/* O nome agora é clicável e redireciona para o dashboard da sala */}
                      <button
                        onClick={() => router.push(`/admin/sala/${sala.id}`)}
                        className="font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        {sala.nome}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono">{sala.codigo}</TableCell>
                    <TableCell>{new Date(sala.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditModal(sala)}
                          title="Editar Nome da Sala"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => router.push(`/admin/sala/${sala.id}`)}
                          title="Configurar Jogos"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteSala(sala.id)}
                          title="Excluir Sala"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Sala" : "Criar Nova Sala"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">
                Nome da Sala
              </Label>
              <Input
                id="nome"
                value={nomeSala}
                onChange={(e) => setNomeSala(e.target.value)}
                className="col-span-3"
                placeholder="Ex: Chá do Edson"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSala}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}