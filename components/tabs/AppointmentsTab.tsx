'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "@/components/ui/use-toast"
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CirclePlus, Edit, Trash2 } from "lucide-react"
import { Unit, Patient, Appointment, UnitSchedule, PaymentMethod } from '@/types'

export function AppointmentsTab() {
  const [units, setUnits] = useState<Unit[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedUnit, setSelectedUnit] = useState<number>(0)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<UnitSchedule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number>(0)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number>(0)

  // 🔥 Busca unidades disponíveis
  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from('unidade')
      .select('*')
      .eq('status', true)

    if (error) {
      console.error('Erro ao buscar unidades:', error)
      return
    }
    setUnits(data || [])
  }

  // 🔥 Busca pacientes ativos
  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .is('user_role_id', null)
      .eq('is_active', true)

    if (error) {
      console.error('Erro ao buscar pacientes:', error)
      return
    }

    console.log('pacientes', data)

    setPatients(data || [])
  }

  // 🔥 Busca os horários disponíveis
  const fetchAvailableTimeSlots = async (unit_id: number, date: Date) => {
    try {
      const diasSemana: Record<number, string> = {
        0: 'Domingo',
        1: 'Segunda',
        2: 'Terca',
        3: 'Quarta',
        4: 'Quinta',
        5: 'Sexta',
        6: 'Sabado'
      }

      const dayOfWeek = diasSemana[date.getDay()]

      console.log(dayOfWeek)
      console.log(unit_id)

      const { data: schedules, error } = await supabase
        .from('unit_schedules')
        .select('*')
        .eq('unit_id', unit_id)
        .eq('dia_da_semana', dayOfWeek)

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao buscar horários"
        })
        return
      }

      if (!schedules?.length) {
        toast({
          title: "Aviso",
          description: "Nenhum horário disponível neste dia"
        })
        setAvailableTimeSlots([])
        return
      }

      setAvailableTimeSlots(schedules)

    } catch (err) {
      console.error(err)
      toast({
        title: "Erro",
        description: "Erro ao buscar horários"
      })
    }
  }

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('ref_formas_pagamento')
      .select('*')

    //setPaymentMethods(data || [])
    setPaymentMethods([{id: 1, nome: 'Pix'}, {id: 2, nome: 'Cartão de crédito'}, {id: 3, nome: 'Cartão de débito'}, {id: 4, nome: 'Dinheiro'}])
  }

  useEffect(() => {
    fetchUnits()
    fetchPatients()
    fetchPaymentMethods()
  }, [])

  const handleScheduleAppointment = () => {
    console.log('Agendando consulta')
  }

  return (
    <div className="w-full h-full flex flex-col">
      <h2 className="text-2xl font-semibold mb-4">Agendamentos</h2>
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="schedule">Agendar</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <div className="space-y-4">
            <div>
              <Label htmlFor="unit">Unidade</Label>
              <Select 
                onValueChange={(value) => setSelectedUnit(parseInt(value))}
                value={selectedUnit.toString()}
              >
                <SelectTrigger id="unit">
                  <SelectValue placeholder="Selecione uma unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id.toString()}>
                      {unit.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUnit > 0 && (
              <div>
                <Label>Data</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      fetchAvailableTimeSlots(selectedUnit, date)
                    }
                  }}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>
            )}

            {availableTimeSlots.length > 0 && (
              <div>
                <Label>Horário</Label>
                <Select
                  onValueChange={(value) => setSelectedTimeSlot(parseInt(value))}
                  value={selectedTimeSlot.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id.toString()}>
                        {slot.horario_inicio} - {slot.horario_fim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {patients.length > 0 && selectedTimeSlot > 0 && (
              <div>
                <Label>Paciente</Label>
                <Select
                  onValueChange={(value) => setSelectedPatient(value)}
                  value={selectedPatient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.nome} {patient.sobrenome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentMethods.length > 0 && selectedPatient.length > 0 && (
              <div>
                <Label>Método de pagamento</Label>
                <Select
                  onValueChange={(value) => setSelectedPaymentMethod(parseInt(value))}
                  value={selectedPaymentMethod.toString()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((paymentMethod) => (
                      <SelectItem key={paymentMethod.id} value={paymentMethod.id.toString()}>
                        {paymentMethod.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              onClick={handleScheduleAppointment} 
              className="w-full"
              disabled={selectedUnit === 0 || selectedDate === undefined || selectedTimeSlot === 0 || selectedPatient === '' || selectedPaymentMethod === 0}
            > 
              <CirclePlus className="w-4 h-4 mr-2" /> Agendar Consulta
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      {patients.find(p => p.id === appointment.patient_id)?.name || appointment.patient_id}
                    </TableCell>
                    <TableCell>{format(new Date(appointment.scheduled_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{appointment.time_slot}</TableCell>
                    <TableCell>{appointment.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
