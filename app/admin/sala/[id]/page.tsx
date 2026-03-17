"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { QRCodeSVG } from "qrcode.react";

import { ArrowLeft, Trash2, Edit, Plus, Share2, Copy, Check, BarChart2, Users, Settings, Candy, HelpCircle, LayoutDashboard, Trophy, UserPlus, Download } from "lucide-react";

import { SidebarInset, SidebarProvider, SidebarTrigger, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface Sala {
    id: string;
    codigo: string;
    nome: string;
    jogo_jujubas_ativo: boolean;
    jogo_provavel_ativo: boolean;
    mostrar_resultado_jujubas: boolean;
    resposta_jujubas: number;
}

interface Pergunta { id: string; texto: string; }
interface Candidato { id: string; nome: string; }
interface Palpite { id: string; nome: string; palpite: number; }
interface Participante { id: string; nome: string; }

export default function AdminSalaDashboard({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const roomId = resolvedParams.id;
    const router = useRouter();

    const [sala, setSala] = useState<Sala | null>(null);
    const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
    const [candidatos, setCandidatos] = useState<Candidato[]>([]);

    const [participantes, setParticipantes] = useState<Participante[]>([]);
    const [palpitesJujubas, setPalpitesJujubas] = useState<Palpite[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<"geral" | "jujubas" | "provavel">("geral");

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const [isPerguntaModalOpen, setIsPerguntaModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPerguntaId, setCurrentPerguntaId] = useState<string | null>(null);
    const [textoPergunta, setTextoPergunta] = useState("");

    const [isCandidatoModalOpen, setIsCandidatoModalOpen] = useState(false);
    const [currentCandidatoId, setCurrentCandidatoId] = useState<string | null>(null);
    const [nomeCandidato, setNomeCandidato] = useState("");

    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [chartPerguntaTexto, setChartPerguntaTexto] = useState("");

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('sala_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participantes', filter: `sala_id=eq.${roomId}` }, (payload) => { setParticipantes((prev) => [...prev, payload.new as Participante]); })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'palpites_jujubas', filter: `sala_id=eq.${roomId}` }, (payload) => { setPalpitesJujubas((prev) => [...prev, payload.new as Palpite]); })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const fetchData = async () => {
        setIsLoading(true);
        const { data: salaData } = await supabase.from("salas").select("*").eq("id", roomId).single();
        if (salaData) setSala(salaData);

        const { data: perguntasData } = await supabase.from("perguntas").select("*").eq("sala_id", roomId).order("created_at", { ascending: true });
        if (perguntasData) setPerguntas(perguntasData);

        const { data: candidatosData } = await supabase.from("candidatos").select("*").eq("sala_id", roomId).order("created_at", { ascending: true });
        if (candidatosData) setCandidatos(candidatosData);

        const { data: participantesData } = await supabase.from("participantes").select("*").eq("sala_id", roomId).order("created_at", { ascending: true });
        if (participantesData) setParticipantes(participantesData);

        const { data: palpitesData } = await supabase.from("palpites_jujubas").select("*").eq("sala_id", roomId);
        if (palpitesData) setPalpitesJujubas(palpitesData);

        setIsLoading(false);
    };

    const toggleConfig = async (field: keyof Sala, value: boolean) => {
        if (!sala) return;
        setSala({ ...sala, [field]: value } as Sala);
        await supabase.from("salas").update({ [field]: value }).eq("id", roomId);
    };

    const updateTextConfig = async (field: keyof Sala, value: string | number) => {
        if (!sala) return;
        await supabase.from("salas").update({ [field]: value }).eq("id", roomId);
    };

    const getRankingCompleto = () => {
        if (!sala || palpitesJujubas.length === 0) return [];
        const gabarito = sala.resposta_jujubas || 0;
        return [...palpitesJujubas].sort((a, b) => Math.abs(a.palpite - gabarito) - Math.abs(b.palpite - gabarito));
    };
    const rankingAtual = getRankingCompleto();

    const handleDeleteParticipante = async (nome: string) => {
        if (!confirm(`Excluir TODOS os dados de "${nome}"? (nome, palpites e votos)`)) return;

        await supabase.from("votos_provavel").delete().eq("sala_id", roomId).eq("nome_eleitor", nome);
        await supabase.from("palpites_jujubas").delete().eq("sala_id", roomId).eq("nome", nome);
        await supabase.from("participantes").delete().eq("sala_id", roomId).eq("nome", nome);

        fetchData();
    };

    const handleSavePergunta = async () => {
        if (!textoPergunta.trim()) return;
        if (isEditing && currentPerguntaId) {
            await supabase.from("perguntas").update({ texto: textoPergunta }).eq("id", currentPerguntaId);
        } else {
            await supabase.from("perguntas").insert([{ sala_id: roomId, texto: textoPergunta }]);
        }
        setIsPerguntaModalOpen(false);
        fetchData();
    };

    const handleDeletePergunta = async (id: string) => {
        if (confirm("Deletar esta pergunta?")) { await supabase.from("perguntas").delete().eq("id", id); fetchData(); }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentPerguntaId(null);
        setTextoPergunta("");
        setIsPerguntaModalOpen(true);
    };

    const handleSaveCandidato = async () => {
        if (!nomeCandidato.trim()) return;
        if (currentCandidatoId) {
            await supabase.from("candidatos").update({ nome: nomeCandidato }).eq("id", currentCandidatoId);
        } else {
            await supabase.from("candidatos").insert([{ sala_id: roomId, nome: nomeCandidato }]);
        }
        setIsCandidatoModalOpen(false);
        fetchData();
    };

    const handleDeleteCandidato = async (id: string) => {
        if (confirm("Remover esta pessoa da berlinda?")) { await supabase.from("candidatos").delete().eq("id", id); fetchData(); }
    };

    const openChartModal = async (pergunta: Pergunta) => {
        if (!sala) return;

        setChartPerguntaTexto(pergunta.texto);

        const votosPorCandidato = candidatos.map(c => ({
            name: c.nome,
            votos: 0,
            eleitores: [] as string[]
        }));
        setChartData(votosPorCandidato);
        setIsChartModalOpen(true);

        const { data: votosData, error } = await supabase
            .from("votos_provavel")
            .select("voto, nome_eleitor")
            .eq("sala_id", roomId)
            .eq("pergunta_id", pergunta.id);

        if (error) {
            console.error("Erro ao buscar votos:", JSON.stringify(error, null, 2));
        }

        if (votosData && votosData.length > 0) {
            const contagemReal = candidatos.map(c => ({
                name: c.nome,
                votos: 0,
                eleitores: [] as string[]
            }));

            votosData.forEach((v: any) => {
                const candidatoEncontrado = contagemReal.find(c => c.name === v.voto);
                if (candidatoEncontrado) {
                    candidatoEncontrado.votos += 1;
                    candidatoEncontrado.eleitores.push(v.nome_eleitor);
                }
            });

            setChartData(contagemReal);
        }
    };

    const inviteUrl = typeof window !== 'undefined' && sala ? `${window.location.origin}/sala/${sala.codigo}` : '';

    const copyToClipboard = () => {
        if (!inviteUrl) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inviteUrl).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }).catch(err => console.error('Erro ao copiar URL:', err));
        } else {
            const textArea = document.createElement("textarea"); textArea.value = inviteUrl; document.body.appendChild(textArea); textArea.select();
            try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); } catch (err) { console.error('Fallback falhou ao copiar', err); }
            document.body.removeChild(textArea);
        }
    };

    const downloadQRCode = () => {
        const svgElement = document.getElementById("qr-code-svg");
        if (!svgElement) return;

        const serializer = new XMLSerializer();
        let svgData = serializer.serializeToString(svgElement);
        if (!svgData.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            svgData = svgData.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new window.Image();

        img.onload = () => {
            canvas.width = img.width || 220;
            canvas.height = img.height || 220;
            if (ctx) {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            }
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `qrcode_${sala?.codigo || 'sala'}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        const encodedData = window.btoa(unescape(encodeURIComponent(svgData)));
        img.src = "data:image/svg+xml;base64," + encodedData;
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando painel da sala...</div>;
    if (!sala) return <div className="flex h-screen items-center justify-center">Sala não encontrada.</div>;

    const getBreadcrumbTitle = () => {
        switch (activeView) {
            case "geral": return "Visão Geral";
            case "jujubas": return "Jogo das Jujubas";
            case "provavel": return "Quem é Mais Provável?";
            default: return "";
        }
    };

    const chartColors = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

    return (
        <>
            <ThemeToggle />
            <SidebarProvider>
                <Sidebar variant="inset">
                    <SidebarHeader className="border-b pb-4 pt-6 px-4">
                        <div className="flex items-center gap-3">
                            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><LayoutDashboard className="size-5" /></div>
                            <div className="flex flex-col gap-0.5 leading-none">
                                <span className="font-bold text-lg">{sala.nome}</span>
                                <span className="text-sm text-muted-foreground font-mono">Cód: {sala.codigo}</span>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="pt-4 px-2">
                        <SidebarGroup>
                            <SidebarMenu className="gap-2">
                                <SidebarMenuItem>
                                    <SidebarMenuButton className="transition-colors hover:bg-foreground hover:text-background data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground" isActive={activeView === "geral"} onClick={() => setActiveView("geral")}>
                                        <Settings className="size-4" /><span>Visão Geral</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton className="transition-colors hover:bg-foreground hover:text-background data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground" isActive={activeView === "jujubas"} onClick={() => setActiveView("jujubas")}>
                                        <Candy className="size-4" /><span>Jogo das Jujubas</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton className="transition-colors hover:bg-foreground hover:text-background data-[active=true]:bg-foreground/10 data-[active=true]:text-foreground" isActive={activeView === "provavel"} onClick={() => setActiveView("provavel")}>
                                        <HelpCircle className="size-4" /><span>Quem é Mais Provável?</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="p-4 border-t">
                        <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/admin")}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Salas</Button>
                    </SidebarFooter>
                </Sidebar>

                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" /><Separator orientation="vertical" className="mr-2 h-4" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="#" onClick={() => setActiveView("geral")}>Dashboard</BreadcrumbLink></BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem><BreadcrumbPage className="font-semibold text-primary">{getBreadcrumbTitle()}</BreadcrumbPage></BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        <Button onClick={() => setIsShareModalOpen(true)} size="sm" className="bg-primary hover:bg-primary/90"><Share2 className="h-4 w-4 mr-2 hidden sm:inline" />Compartilhar</Button>
                    </header>

                    <div className="flex-1 p-4 md:p-8 bg-muted/30">

                        {/* VIEW: GERAL */}
                        {activeView === "geral" && (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Participantes</CardTitle>
                                            <CardDescription>Pessoas prontas na sala aguardando os jogos.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="bg-primary/5 p-8 rounded-xl text-center border border-primary/10 shadow-sm mb-4">
                                                <p className="text-7xl font-bold text-primary">{participantes.length}</p>
                                                <p className="text-sm text-muted-foreground mt-2 font-medium tracking-wide">CONVIDADOS CONECTADOS</p>
                                            </div>
                                            {participantes.length > 0 && (
                                                <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar">
                                                    {participantes.map((p) => (
                                                        <div key={p.id} className="flex items-center justify-between p-3 bg-card rounded-lg border shadow-sm hover:border-red-200 transition-colors group">
                                                            <span className="font-medium text-foreground">{p.nome}</span>
                                                            <button
                                                                onClick={() => handleDeleteParticipante(p.nome)}
                                                                className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                title={`Excluir todos os dados de ${p.nome}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-zinc-700" />Controle da Festa</CardTitle>
                                            <CardDescription>Ative/desative o que os convidados podem acessar agora.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm transition-all hover:border-primary/50">
                                                <div><Label className="text-base font-bold">Jogo: Jujubas</Label><p className="text-xs text-muted-foreground">Abre a tela de palpites no celular.</p></div>
                                                <Switch checked={sala.jogo_jujubas_ativo} onCheckedChange={(val) => toggleConfig('jogo_jujubas_ativo', val)} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm transition-all hover:border-primary/50">
                                                <div><Label className="text-base font-bold">Jogo: Mais Provável</Label><p className="text-xs text-muted-foreground">Libera as perguntas do quiz.</p></div>
                                                <Switch checked={sala.jogo_provavel_ativo} onCheckedChange={(val) => toggleConfig('jogo_provavel_ativo', val)} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* VIEW: JUJUBAS */}
                        {activeView === "jujubas" && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                                {!sala.jogo_jujubas_ativo && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm mb-4 flex items-center">
                                        <div className="mr-3 h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div><strong>Atenção:</strong> O jogo das Jujubas está desativado. Vá em "Visão Geral" para ativá-lo.
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 space-y-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Configurações do Pote</CardTitle>
                                                <CardDescription>Ajuste o gabarito e a revelação do ganhador.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-card rounded-lg border shadow-sm">
                                                    <div className="w-full">
                                                        <Label className="text-base font-bold text-foreground">Gabarito (Total Real de Jujubas)</Label>
                                                        <p className="text-xs text-muted-foreground mb-2">Digite o valor exato para o sistema calcular o Ranking.</p>
                                                        <Input
                                                            type="number"
                                                            className="max-w-[200px]"
                                                            value={sala.resposta_jujubas}
                                                            onChange={(e) => setSala({ ...sala, resposta_jujubas: parseInt(e.target.value) || 0 })}
                                                            onBlur={(e) => updateTextConfig('resposta_jujubas', parseInt(e.target.value) || 0)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-base font-bold">Mostrar Ganhador</Label>
                                                        <p className="text-xs text-muted-foreground">Revela o resultado na tela final do convidado.</p>
                                                    </div>
                                                    <Switch checked={sala.mostrar_resultado_jujubas} onCheckedChange={(val) => toggleConfig('mostrar_resultado_jujubas', val)} disabled={!sala.jogo_jujubas_ativo} />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader><CardTitle>Indicador de Palpites</CardTitle></CardHeader>
                                            <CardContent>
                                                <div className="bg-muted/50 p-8 rounded-xl flex items-center justify-between border">
                                                    <div>
                                                        <p className="text-lg font-medium text-foreground">Total Recebido</p>
                                                        <p className="text-sm text-muted-foreground">Palpites enviados até o momento</p>
                                                    </div>
                                                    <p className="text-5xl font-bold text-primary">{palpitesJujubas.length}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card className="lg:col-span-1 scroll-m-2.5 max-h-[400px] overflow-y-auto ">
                                        <CardHeader>
                                            <CardTitle className="text-xl">Ranking</CardTitle>
                                            <CardDescription>Todos os palpites ordenados</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pr-2 custom-scrollbar">
                                            {rankingAtual.length === 0 ? (
                                                <div className="text-center text-sm text-muted-foreground py-8">Nenhum palpite recebido ainda.</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {rankingAtual.map((item, index) => {
                                                        const isTop3 = index < 3;
                                                        const colors = ["text-yellow-500", "text-zinc-400", "text-amber-700"];
                                                        const bgColors = ["bg-yellow-50 border-yellow-200", "bg-zinc-50 border-zinc-200", "bg-amber-50 border-amber-200"];
                                                        const gabarito = sala.resposta_jujubas || 0;
                                                        const diferenca = Math.abs(item.palpite - gabarito);

                                                        return (
                                                            <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg border shadow-sm transition-all ${isTop3 ? bgColors[index] : 'bg-white border-zinc-100'}`}>
                                                                <div className="flex items-center gap-3">
                                                                    {isTop3 ? (
                                                                        <Trophy className={`h-4 w-4 ${colors[index]}`} />
                                                                    ) : (
                                                                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium">{index + 1}</span>
                                                                    )}
                                                                    <span className={`font-medium ${isTop3 ? 'text-zinc-800' : 'text-zinc-600'}`}>{item.nome}</span>
                                                                </div>
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`font-bold ${isTop3 ? 'text-primary' : 'text-zinc-700'}`}>{item.palpite}</span>
                                                                    <span className="text-[10px] text-zinc-500 font-medium">({diferenca} de dif.)</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* VIEW: PROVÁVEL */}
                        {activeView === "provavel" && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                                {!sala.jogo_provavel_ativo && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm mb-4 flex items-center">
                                        <div className="mr-3 h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div><strong>Atenção:</strong> O jogo "Quem é mais provável" está desativado. Vá em "Visão Geral" para ativá-lo.
                                    </div>
                                )}

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                                        <div>
                                            <CardTitle>Participantes da Berlinda</CardTitle>
                                            <CardDescription>Quais pessoas podem receber votos nas perguntas?</CardDescription>
                                        </div>
                                        <Button onClick={() => { setNomeCandidato(""); setCurrentCandidatoId(null); setIsCandidatoModalOpen(true); }}>
                                            <UserPlus className="h-4 w-4 mr-2" /> Adicionar Pessoa
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {candidatos.length === 0 ? (
                                            <div className="text-center py-6 text-muted-foreground bg-muted rounded-lg border border-dashed">Cadastre as pessoas que vão participar do jogo!</div>
                                        ) : (
                                            <div className="flex flex-wrap gap-3">
                                                {candidatos.map((candidato) => (
                                                    <div key={candidato.id} className="flex items-center gap-2 bg-card border shadow-sm px-4 py-2 rounded-full">
                                                        <span className="font-medium text-foreground">{candidato.nome}</span>
                                                        <div className="flex gap-1 ml-2 border-l pl-2">
                                                            <button onClick={() => { setNomeCandidato(candidato.nome); setCurrentCandidatoId(candidato.id); setIsCandidatoModalOpen(true); }} className="text-zinc-400 hover:text-blue-500"><Edit className="h-3.5 w-3.5" /></button>
                                                            <button onClick={() => handleDeleteCandidato(candidato.id)} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                                        <div>
                                            <CardTitle>Banco de Perguntas</CardTitle>
                                            <CardDescription>Gerencie as perguntas que aparecerão no quiz.</CardDescription>
                                        </div>
                                        <Button onClick={openCreateModal}><Plus className="h-4 w-4 mr-2" /> Adicionar Pergunta</Button>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {perguntas.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground bg-muted rounded-lg border border-dashed">Nenhuma pergunta cadastrada. Comece adicionando a primeira!</div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted"><TableHead className="font-semibold text-foreground">Pergunta</TableHead><TableHead className="text-right font-semibold text-foreground">Ações</TableHead></TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {perguntas.map((pergunta) => (
                                                        <TableRow key={pergunta.id} className="group">
                                                            <TableCell className=" py-4">{pergunta.texto}</TableCell>
                                                            <TableCell className="text-right whitespace-nowrap py-4">
                                                                <Button variant="outline" size="sm" className="mr-3 border-primary/50 text-primary hover:bg-primary/10 transition-colors" onClick={() => openChartModal(pergunta)}><BarChart2 className="h-4 w-4 mr-2" />Ver Resultados</Button>
                                                                <Button variant="ghost" size="icon" onClick={() => { setIsEditing(true); setCurrentPerguntaId(pergunta.id); setTextoPergunta(pergunta.texto); setIsPerguntaModalOpen(true); }}><Edit className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 transition-colors" /></Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDeletePergunta(pergunta.id)}><Trash2 className="h-4 w-4 text-zinc-400 group-hover:text-red-600 transition-colors" /></Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </SidebarInset>

                {/* MODAIS */}
                <Dialog open={isChartModalOpen} onOpenChange={setIsChartModalOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-center text-3xl font-bold text-zinc-900 pb-2">Resultados</DialogTitle>
                            <DialogDescription className="text-center text-lg font-medium text-zinc-700">"{chartPerguntaTexto}"</DialogDescription>
                        </DialogHeader>
                        <div className="h-80 w-full mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis dataKey="name" hide />
                                    <YAxis />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                if (data.votos === 0) return null;

                                                const corIndex = candidatos.findIndex(c => c.nome === data.name);
                                                const cor = chartColors[corIndex >= 0 ? corIndex % chartColors.length : 0];

                                                return (
                                                    <div className="bg-card p-3 rounded-xl shadow-xl border border-border min-w-[150px] max-w-[260px] sm:max-w-[320px] pointer-events-none whitespace-normal break-words">
                                                        <p className="font-bold text-foreground mb-2 border-b pb-1">Votantes por Pessoa:</p>
                                                        <div className="mb-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                                                                <span className="font-semibold text-foreground">{data.name}: {data.votos} voto(s)</span>
                                                            </div>
                                                            {data.eleitores && data.eleitores.length > 0 && (
                                                                <div className="flex flex-wrap pl-5 gap-1">
                                                                    {data.eleitores.map((nome: string, i: number) => (
                                                                        <span key={i} className="inline-block bg-primary/10 text-primary font-bold text-[10px] uppercase px-2 py-0.5 rounded">{nome}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="votos" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: '#52525b', fontSize: 16, fontWeight: 'bold' }}>
                                        {chartData.map((entry, index) => {
                                            const corIndex = candidatos.findIndex(c => c.nome === entry.name);
                                            const cor = chartColors[corIndex >= 0 ? corIndex % chartColors.length : 0];
                                            return <Cell key={`cell-${index}`} fill={cor} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-6 mt-4">
                            {candidatos.map((c, index) => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                                    <span className="font-semibold">{c.nome}</span>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal Pergunta */}
                <Dialog open={isPerguntaModalOpen} onOpenChange={setIsPerguntaModalOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{isEditing ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle></DialogHeader>
                        <div className="py-4"><Label htmlFor="pergunta">Ex: Quem demora mais para se arrumar?</Label><Input id="pergunta" value={textoPergunta} onChange={(e) => setTextoPergunta(e.target.value)} className="mt-2" placeholder="Digite a pergunta..." /></div>
                        <DialogFooter><Button variant="outline" onClick={() => setIsPerguntaModalOpen(false)}>Cancelar</Button><Button onClick={handleSavePergunta}>Salvar</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal Candidato */}
                <Dialog open={isCandidatoModalOpen} onOpenChange={setIsCandidatoModalOpen}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader><DialogTitle>{currentCandidatoId ? "Editar Pessoa" : "Adicionar Pessoa"}</DialogTitle></DialogHeader>
                        <div className="py-4"><Label>Nome da pessoa</Label><Input value={nomeCandidato} onChange={(e) => setNomeCandidato(e.target.value)} className="mt-2" placeholder="Ex: Felipe" /></div>
                        <DialogFooter><Button variant="outline" onClick={() => setIsCandidatoModalOpen(false)}>Cancelar</Button><Button onClick={handleSaveCandidato}>Salvar</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle className="text-center text-2xl">Convide o Pessoal!</DialogTitle></DialogHeader>
                        <div className="flex flex-col items-center justify-center space-y-6 py-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border"><QRCodeSVG id="qr-code-svg" value={inviteUrl} size={220} level="H" includeMargin={true} /></div>
                            <Button variant="outline" onClick={downloadQRCode} className="w-full max-w-[220px] font-bold text-primary border-primary/20 hover:bg-primary/5 transition-colors">
                                <Download className="h-4 w-4 mr-2" /> Baixar QR Code
                            </Button>
                            <div className="flex w-full items-center space-x-2"><Input readOnly value={inviteUrl} className="bg-zinc-100 font-mono text-sm" /><Button size="icon" onClick={copyToClipboard} className="shrink-0">{isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div>
                        </div>
                    </DialogContent>
                </Dialog>
            </SidebarProvider>
        </>
    );
}