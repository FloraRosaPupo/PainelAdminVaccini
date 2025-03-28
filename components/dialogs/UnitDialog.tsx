import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "@/components/ui/multi-select"
import { Unit, HealthPlan, UnitSchedule } from '../../types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PlusCircle, X } from "lucide-react"

interface UnitDialogProps {
  unit: Unit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  healthPlans: HealthPlan[]
}

interface OriginalCepRange {
  cep_inicial?: string;
  cep_final?: string;
  cep_base?: string;
  faixa_excluida?: string;
}

interface CepRange {
  id?: number;
  cep_inicial: string;
  cep_final: string;
  faixa_excluida: string;
  cep_base?: string;
  original?: OriginalCepRange;
}

const DAYS = [
  { name: 'Domingo', field: 'domingo' },
  { name: 'Segunda', field: 'segunda_feira' },
  { name: 'Terça', field: 'terca_feira' },
  { name: 'Quarta', field: 'quarta_feira' },
  { name: 'Quinta', field: 'quinta_feira' },
  { name: 'Sexta', field: 'sexta_feira' },
  { name: 'Sábado', field: 'sabado' }
] as const

export function UnitDialog({ open, onOpenChange, unit, onSuccess, healthPlans }: UnitDialogProps) {
  const [newUnit, setNewUnit] = useState<Unit>({
    id: 0,
    nome: '',
    nome_interno: '',
    email: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    status: true,
    atende_aplicativo: true,
    mostra_precos_unidades: true,
    qtd_agendamento_por_faixa: 0,
    qtd_vacinas_por_faixa: 0,
    cep_ranges: [],
    blocked_ceps: []
  })

  const [schedules, setSchedules] = useState<UnitSchedule>({
    id: 0,
    unit_id: 0,
    dia_da_semana: '',
    horario_inicio: '',
    horario_fim: ''
  })

  const [cepRanges, setCepRanges] = useState<CepRange[]>([])
  const [newBlockedCep, setNewBlockedCep] = useState('')
  const [blockedCeps, setBlockedCeps] = useState<string[]>([])

  useEffect(() => {
    if (unit?.id) {
      console.log('Carregando dados da unidade para edição:', unit.id)
      setNewUnit(unit)
      fetchCepRanges(unit.id)
    } else {
      setCepRanges([])
    }
  }, [unit])

  useEffect(() => {
    console.log('newUnit:', newUnit)
  }, [newUnit])

  const handleNewUnitChange = (field: keyof Unit, value: any) => {
    setNewUnit((prev: Unit) => ({ ...prev, [field]: value }))
  }

  const handleScheduleChange = (field: keyof UnitSchedule, value: string | null) => {
    setSchedules(prev => ({ ...prev, [field]: value }))
  }

  const handleAddCepRange = () => {
    setCepRanges([...cepRanges, { 
      cep_inicial: '', 
      cep_final: '', 
      faixa_excluida: '',
      cep_base: ''
    }])
  }

  const handleRemoveCepRange = async (index: number, id?: number) => {
    try {
      // Se tem ID, remove do banco
      if (id) {
        const range = cepRanges[index]
        
        // Verifica se é um CEP atendido ou não atendido
        if (range.cep_inicial && range.cep_final) {
          // Remove da tabela de CEPs atendidos
          const { error } = await supabase
            .from('unidade_ceps_atende')
            .delete()
            .eq('id', id)
            
          if (error) {
            console.error('Erro ao remover CEP atendido:', error)
            return
          }
        } else if (range.cep_base && range.faixa_excluida) {
          // Remove da tabela de CEPs não atendidos
          const { error } = await supabase
            .from('unidade_ceps_nao_atende')
            .delete()
            .eq('id', id)
            
          if (error) {
            console.error('Erro ao remover CEP não atendido:', error)
            return
          }
        }
      }

      // Remove do estado local
      const newRanges = [...cepRanges]
      newRanges.splice(index, 1)
      setCepRanges(newRanges)
    } catch (error) {
      console.error('Erro ao remover CEP:', error)
    }
  }

  const handleAddBlockedCep = () => {
    if (newBlockedCep.length === 8) {
      setBlockedCeps([...blockedCeps, newBlockedCep])
      setNewBlockedCep('')
    }
  }

  const handleRemoveBlockedCep = (index: number, cep: string) => {
    const newCeps = blockedCeps.filter((c) => c !== cep)
    setBlockedCeps(newCeps)
  }

  const fetchCepRanges = async (unitId: number) => {
    try {
      console.log('Buscando CEPs da unidade:', unitId)
      
      // Busca as faixas de CEP que a unidade atende
      const { data: cepRangesData, error: cepRangesError } = await supabase
        .from('unidade_ceps_atende')
        .select('id, cep_inicial, cep_final, unidade_id')
        .eq('unidade_id', unitId)

      if (cepRangesError) {
        console.error('Erro ao buscar CEPs:', cepRangesError.message)
        return
      }

      // Busca as faixas não atendidas
      const { data: cepsNaoAtendeData, error: cepsNaoAtendeError } = await supabase
        .from('unidade_ceps_nao_atende')
        .select('id, cep_base, faixa_excluida, unidade_id')
        .eq('unidade_id', unitId)

      if (cepsNaoAtendeError) {
        console.error('Erro ao buscar CEPs não atendidos:', cepsNaoAtendeError.message)
        return
      }

      let formattedRanges: CepRange[] = []

      // Formata os CEPs atendidos
      if (cepRangesData) {
        formattedRanges = cepRangesData.map(range => ({
          id: range.id,
          cep_inicial: range.cep_inicial || '',
          cep_final: range.cep_final || '',
          faixa_excluida: '',
          cep_base: '',
          tipo: 'atende'
        }))
      }

      // Adiciona os CEPs não atendidos
      if (cepsNaoAtendeData) {
        const rangesNaoAtende = cepsNaoAtendeData.map(naoAtende => ({
          id: naoAtende.id,
          cep_inicial: '',
          cep_final: '',
          faixa_excluida: naoAtende.faixa_excluida || '',
          cep_base: naoAtende.cep_base || '',
          tipo: 'nao_atende'
        }))
        formattedRanges = [...formattedRanges, ...rangesNaoAtende]
      }

      console.log('CEPs formatados:', formattedRanges)
      setCepRanges(formattedRanges)
    } catch (error) {
      console.error('Erro completo:', error)
      setCepRanges([])
    }
  }

  const fetchBlockedCeps = async (unitId: number) => {
    const { data, error } = await supabase
      .from('unit_blocked_ceps')
      .select('*')
      .eq('unit_id', unitId)

    if (!error && data) {
      setBlockedCeps(data.map(item => item.cep))
    }
  }

  const handleSave = async () => {
    try {
      let unitId: number;

      // 1. Primeiro salva/atualiza a unidade
      if (newUnit.id) {
        const { error } = await supabase
          .from('unidade')
          .update({
            nome: newUnit.nome,
            nome_interno: newUnit.nome_interno,
            email: newUnit.email,
            telefone: newUnit.telefone,
            cep: newUnit.cep,
            logradouro: newUnit.logradouro,
            numero: newUnit.numero,
            complemento: newUnit.complemento,
            bairro: newUnit.bairro,
            cidade: newUnit.cidade,
            estado: newUnit.estado,
            status: newUnit.status,
            atende_aplicativo: newUnit.atende_aplicativo,
            mostra_precos_unidades: newUnit.mostra_precos_unidades,
            qtd_agendamento_por_faixa: newUnit.qtd_agendamento_por_faixa,
            qtd_vacinas_por_faixa: newUnit.qtd_vacinas_por_faixa
          })
          .eq('id', newUnit.id)

        if (error) throw error
        unitId = newUnit.id
      } else {
        const { data, error } = await supabase
          .from('unidade')
          .insert({
            nome: newUnit.nome,
            nome_interno: newUnit.nome_interno,
            email: newUnit.email,
            telefone: newUnit.telefone,
            cep: newUnit.cep,
            logradouro: newUnit.logradouro,
            numero: newUnit.numero,
            complemento: newUnit.complemento,
            bairro: newUnit.bairro,
            cidade: newUnit.cidade,
            estado: newUnit.estado,
            status: newUnit.status,
            atende_aplicativo: newUnit.atende_aplicativo,
            mostra_precos_unidades: newUnit.mostra_precos_unidades,
            qtd_agendamento_por_faixa: newUnit.qtd_agendamento_por_faixa,
            qtd_vacinas_por_faixa: newUnit.qtd_vacinas_por_faixa
          })
          .select()
          .single()

        if (error) throw error
        unitId = data.id
      }

      // 2. Processa as faixas de CEP
      if (cepRanges.length > 0) {
        // Primeiro processa os CEPs atendidos para ter os IDs
        const cepsAtendidos = cepRanges
          .filter(range => range.cep_inicial && range.cep_final)
          .map(range => ({
            ...range,
            unidade_id: unitId,
            cep_inicial: range.cep_inicial.padStart(5, '0').slice(0, 5),
            cep_final: range.cep_final.padStart(5, '0').slice(0, 5)
          }))

        // Processa os CEPs atendidos primeiro para obter os IDs
        for (const cep of cepsAtendidos) {
          try {
            if (cep.id) {
              // Se tem ID, faz update
              const { error } = await supabase
                .from('unidade_ceps_atende')
                .update({
                  cep_inicial: cep.cep_inicial,
                  cep_final: cep.cep_final,
                  unidade_id: unitId
                })
                .eq('id', cep.id)

              if (error) {
                console.error('Erro ao atualizar CEP atendido:', error)
                throw error
              }
            } else {
              // Se não tem ID, faz insert e guarda o ID retornado
              const { data, error } = await supabase
                .from('unidade_ceps_atende')
                .insert({
                  unidade_id: unitId,
                  cep_inicial: cep.cep_inicial,
                  cep_final: cep.cep_final
                })
                .select()
                .single()

              if (error) {
                console.error('Erro ao inserir novo CEP atendido:', error)
                throw error
              }

              // Atualiza o ID no objeto local
              cep.id = data.id
            }
          } catch (error) {
            console.error('Erro ao processar CEP atendido:', error)
            throw error
          }
        }

        // Agora processa os CEPs não atendidos
        const cepsNaoAtendidos = cepRanges
          .filter(range => range.cep_base && range.faixa_excluida)
          .map(range => {
            // Encontra o CEP atendido correspondente baseado no cep_base
            const cepBase = range.cep_base || ''
            const cepAtendido = cepsAtendidos.find(cep => 
              parseInt(cep.cep_inicial) <= parseInt(cepBase) && 
              parseInt(cep.cep_final) >= parseInt(cepBase)
            )

            if (!cepAtendido) {
              console.error('CEP atendido não encontrado para o CEP base:', cepBase)
            }

            return {
              ...range,
              unidade_id: unitId,
              cep_base: cepBase.padStart(5, '0').slice(0, 5),
              faixa_excluida: (range.faixa_excluida || '').padStart(3, '0').slice(0, 3),
              cep_atende_id: cepAtendido?.id
            }
          })

        // Processa os CEPs não atendidos
        for (const cep of cepsNaoAtendidos) {
          try {
            if (!cep.cep_atende_id) {
              console.error('CEP não atendido sem vínculo com CEP atendido:', cep)
              continue
            }

            if (cep.id) {
              // Se tem ID, faz update
              const { error } = await supabase
                .from('unidade_ceps_nao_atende')
                .update({
                  cep_base: cep.cep_base,
                  faixa_excluida: cep.faixa_excluida,
                  unidade_id: unitId,
                  cep_atende_id: cep.cep_atende_id
                })
                .eq('id', cep.id)

              if (error) {
                console.error('Erro ao atualizar CEP não atendido:', error)
                throw error
              }
            } else {
              // Se não tem ID, faz insert
              const { error } = await supabase
                .from('unidade_ceps_nao_atende')
                .insert({
                  unidade_id: unitId,
                  cep_base: cep.cep_base,
                  faixa_excluida: cep.faixa_excluida,
                  cep_atende_id: cep.cep_atende_id
                })

              if (error) {
                console.error('Erro ao inserir novo CEP não atendido:', error)
                throw error
              }
            }
          } catch (error) {
            console.error('Erro ao processar CEP não atendido:', error)
            throw error
          }
        }
      }

      toast({
        title: "Sucesso",
        description: newUnit.id ? "Unidade atualizada com sucesso" : "Unidade criada com sucesso",
      })

      // Recarrega os dados após salvar
      if (unitId) {
        await fetchCepRanges(unitId)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Erro completo ao salvar:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar unidade e CEPs",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={newUnit.nome}
                onChange={(e) => handleNewUnitChange('nome', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nome_interno">Nome Interno</Label>
              <Input
                id="nome_interno"
                value={newUnit.nome_interno}
                onChange={(e) => handleNewUnitChange('nome_interno', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={newUnit.email}
                onChange={(e) => handleNewUnitChange('email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={newUnit.telefone}
                onChange={(e) => handleNewUnitChange('telefone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={newUnit.cep}
                onChange={(e) => handleNewUnitChange('cep', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input
                id="logradouro"
                value={newUnit.logradouro}
                onChange={(e) => handleNewUnitChange('logradouro', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={newUnit.numero}
                onChange={(e) => handleNewUnitChange('numero', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={newUnit.complemento}
                onChange={(e) => handleNewUnitChange('complemento', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={newUnit.bairro}
                onChange={(e) => handleNewUnitChange('bairro', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={newUnit.cidade}
                onChange={(e) => handleNewUnitChange('cidade', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={newUnit.estado}
                onChange={(e) => handleNewUnitChange('estado', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="qtd_agendamento_por_faixa">Agendamentos por Faixa</Label>
              <Input
                id="qtd_agendamento_por_faixa"
                type="number"
                value={newUnit.qtd_agendamento_por_faixa || 0}
                onChange={(e) => handleNewUnitChange('qtd_agendamento_por_faixa', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="qtd_vacinas_por_faixa">Vacinas por Faixa</Label>
              <Input
                id="qtd_vacinas_por_faixa"
                type="number"
                value={newUnit.qtd_vacinas_por_faixa || 0}
                onChange={(e) => handleNewUnitChange('qtd_vacinas_por_faixa', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="status"
                checked={newUnit.status}
                onCheckedChange={(checked: boolean) => handleNewUnitChange('status', checked === true)}
              />
              <Label htmlFor="status">Ativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="atende_aplicativo"
                checked={newUnit.atende_aplicativo}
                onCheckedChange={(checked: boolean) => handleNewUnitChange('atende_aplicativo', checked === true)}
              />
              <Label htmlFor="atende_aplicativo">Atende Aplicativo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mostra_precos_unidades"
                checked={newUnit.mostra_precos_unidades}
                onCheckedChange={(checked: boolean) => handleNewUnitChange('mostra_precos_unidades', checked === true)}
              />
              <Label htmlFor="mostra_precos_unidades">Mostra Preços</Label>
            </div>
          </div>

          {/* Faixas de CEP atendidas */}
          <div>
            <h2 className="text-lg font-bold mb-4">CEPs atendidos</h2>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              {cepRanges.map((range, index) => (
                <div key={range.id} className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Faixa {index + 1}</span>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveCepRange(index, range.id)}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label>CEP Inicial</Label>
                        <Input
                          value={range.cep_inicial}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                            const newRanges = [...cepRanges]
                            newRanges[index] = {
                              ...newRanges[index],
                              cep_inicial: value
                            }
                            setCepRanges(newRanges)
                          }}
                          maxLength={5}
                          placeholder="00000"
                        />
                      </div>
                      <div>
                        <Label>CEP Final</Label>
                        <Input
                          value={range.cep_final}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                            const newRanges = [...cepRanges]
                            newRanges[index] = {
                              ...newRanges[index],
                              cep_final: value
                            }
                            setCepRanges(newRanges)
                          }}
                          maxLength={5}
                          placeholder="00000"
                        />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold mb-2">Faixa que não atende no CEP:</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CEP Base</Label>
                        <Input
                          value={range.cep_base || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                            const newRanges = [...cepRanges]
                            newRanges[index] = {
                              ...newRanges[index],
                              cep_base: value
                            }
                            setCepRanges(newRanges)
                          }}
                          maxLength={5}
                          placeholder="00000"
                        />
                      </div>
                      <div>
                        <Label>Faixa Excluída</Label>
                        <Input
                          value={range.faixa_excluida}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                            const newRanges = [...cepRanges]
                            newRanges[index] = {
                              ...newRanges[index],
                              faixa_excluida: value
                            }
                            setCepRanges(newRanges)
                          }}
                          maxLength={3}
                          placeholder="000"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button 
                type="button"
                variant="ghost" 
                className="w-full flex items-center justify-center gap-2 text-gray-600"
                onClick={handleAddCepRange}
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Faixa de CEP
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSave}>
              {unit ? 'Salvar Alterações' : 'Criar Unidade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}